/**
 * 纠错模块状态层
 *
 * 负责两件事：
 *   1. 错词库 / 白名单的 CRUD（走 Rust 侧 SQLite）
 *   2. 当前文档的实时检测结果与「应用」动作（配合编辑器装饰插件）
 *
 * 检测器（utils/correct.ts）是纯函数；这里只管数据与动作。
 */
import { defineStore } from 'pinia'
import { computed, ref } from 'vue'
import { invoke } from '@tauri-apps/api/core'
import { editorRef } from './editorRef'
import type { Issue } from '../utils/correct'
import { useSettingsStore } from './settings'
import {
  runDeepCorrection,
  mapSuggestionsToDocIssues,
  collectTextBlocks,
  buildPureTextWithMap,
} from '../utils/deepCorrect'

export interface LexiconEntry {
  id: string
  wrong: string
  right: string
  category: string
  note: string
  enabled: boolean
}

export interface WhitelistEntry {
  id: string
  term: string
  projectId: string | null
  note: string
}

export interface LexiconInput {
  wrong: string
  right: string
  category?: string
  note?: string
}

export const useCorrectionStore = defineStore('correction', () => {
  const entries = ref<LexiconEntry[]>([])
  const whitelist = ref<WhitelistEntry[]>([])
  const rulesOn = ref(true)
  const lexiconOn = ref(true)
  const issues = ref<Issue[]>([])
  const loaded = ref(false)

  // ── 大模型深度纠错状态 ─────────────────────
  /** 深度纠错开关（默认关，需配好 API Key 才能用） */
  const deepOn = ref(false)
  /** 正在执行深度纠错 */
  const deepRunning = ref(false)
  /** 深度纠错得到的建议（与本地 issues 分开存，两套引擎并行展示） */
  const deepIssues = ref<Issue[]>([])
  /** 最近一次运行信息：建议数 / 跳过数 / 失败批次 / 错误 */
  const deepInfo = ref('')
  /** 深度纠错错误（无 Key / 网络 / 解析失败） */
  const deepError = ref('')

  // 被用户「忽略」的某类建议（按 原文→改文@类型 记忆，仅本次会话）
  const ignored = ref<Set<string>>(new Set())

  // 启用的错词 → 正确词，供编辑器实时标红
  const lexiconMap = computed<Record<string, string>>(() => {
    const m: Record<string, string> = {}
    for (const e of entries.value) if (e.enabled) m[e.wrong] = e.right
    return m
  })

  const whitelistTerms = computed<string[]>(() =>
    whitelist.value.map((w) => w.term).filter(Boolean),
  )

  const errorCount = computed(() => issues.value.filter((i) => i.severity === 'error').length)
  const warnCount = computed(() => issues.value.filter((i) => i.severity === 'warn').length)

  // ── 加载 ──────────────────────────────
  async function refreshAll() {
    await Promise.all([loadEntries(), loadWhitelist()])
    loaded.value = true
  }

  async function loadEntries() {
    try {
      entries.value = await invoke<LexiconEntry[]>('list_lexicon', { enabledOnly: false })
    } catch {
      entries.value = []
    }
  }

  async function loadWhitelist() {
    try {
      whitelist.value = await invoke<WhitelistEntry[]>('list_whitelist')
    } catch {
      whitelist.value = []
    }
  }

  // ── 错词库 CRUD ──────────────────────────
  async function addEntry(input: LexiconInput) {
    await invoke('add_lexicon', {
      wrong: input.wrong,
      right: input.right,
      category: input.category,
      note: input.note,
    })
    await loadEntries()
  }

  async function removeEntry(id: string) {
    await invoke('remove_lexicon', { id })
    await loadEntries()
  }

  async function setEntryEnabled(id: string, enabled: boolean) {
    await invoke('set_lexicon_enabled', { id, enabled })
    await loadEntries()
  }

  async function importEntries(list: LexiconInput[]): Promise<number> {
    const n = await invoke<number>('import_lexicon', { entries: list })
    await loadEntries()
    return n
  }

  // ── 白名单 CRUD ──────────────────────────
  async function addWhitelist(term: string, note = '') {
    await invoke('add_whitelist', { term, projectId: null, note })
    await loadWhitelist()
  }

  async function removeWhitelist(id: string) {
    await invoke('remove_whitelist', { id })
    await loadWhitelist()
  }

  // ── 编辑器实时结果 ────────────────────────
  function setIssues(list: Issue[]) {
    if (ignored.value.size) {
      issues.value = list.filter((i) => !ignored.value.has(issueKey(i)))
    } else {
      issues.value = list
    }
  }

  function ignoreSuggestion(issue: Issue) {
    ignored.value.add(issueKey(issue))
    issues.value = issues.value.filter((i) => !ignored.value.has(issueKey(i)))
  }

  function clearIgnore() {
    ignored.value = new Set()
  }

  // ── 应用纠正 ─────────────────────────────
  function applyIssue(issue: Issue) {
    const ed = editorRef.value
    if (!ed) return
    ed.chain()
      .focus()
      .insertContentAt({ from: issue.from, to: issue.to }, issue.revised)
      .run()
  }

  function applyAll(list: Issue[]) {
    const ed = editorRef.value
    if (!ed) return
    const sorted = [...list].sort((a, b) => b.from - a.from)
    const chain = ed.chain().focus()
    let prevFrom = Infinity
    for (const it of sorted) {
      // 与已处理项重叠则跳过，避免重复/错位
      if (it.to > prevFrom) continue
      chain.insertContentAt({ from: it.from, to: it.to }, it.revised)
      prevFrom = it.from
    }
    chain.run()
  }

  function issueKey(i: Issue): string {
    return `${i.original}->${i.revised}@${i.category}`
  }

  // ── 大模型深度纠错 ─────────────────────────
  /**
   * 用当前编辑器全文执行深度纠错。
   * 成功：建议写入 deepIssues；失败：错误写入 deepError。
   * 两套纠错互不干扰 —— 本地 issues 由装饰插件维护，这里只动 deepIssues。
   */
  async function runDeep() {
    const ed = editorRef.value
    if (!ed || ed.isDestroyed) return
    const settingsStore = useSettingsStore()
    if (!settingsStore.loaded) await settingsStore.load()
    if (!settingsStore.ai.apiKey) {
      deepError.value = '尚未配置 API Key：请在「设置 → AI 接入」里填写后重试。'
      deepInfo.value = ''
      deepIssues.value = []
      return
    }

    const blocks = collectTextBlocks(ed.state.doc)
    const { pure } = buildPureTextWithMap(blocks)
    if (!pure.trim()) {
      deepError.value = '当前没有可校对的内容。'
      deepInfo.value = ''
      deepIssues.value = []
      return
    }
    // 超长保护：只校对前 6000 字
    const LIMITED = 6000
    const target = pure.length > LIMITED ? pure.slice(0, LIMITED) : pure
    const truncated = pure.length > LIMITED

    deepRunning.value = true
    deepError.value = ''
    deepInfo.value = ''
    try {
      // 1) 分批发给大模型
      const result = await runDeepCorrection(target)
      // 2) 映射到文档坐标（与送模型的文本完全一致）
      const mapped = mapSuggestionsToDocIssues(
        blocks,
        result.suggestions,
        issues.value,
      )
      const { issues: mappedIssues, hallucinatedCount, overlappedCount } = mapped
      deepIssues.value = mappedIssues

      const parts: string[] = []
      if (mappedIssues.length) parts.push(`发现 ${mappedIssues.length} 处建议`)
      if (hallucinatedCount) parts.push(`跳过 ${hallucinatedCount} 条无法定位`)
      if (overlappedCount) parts.push(`跳过 ${overlappedCount} 条与本地规则重叠`)
      if (result.failures.length) parts.push(`${result.failures.length} 批请求失败`)
      if (truncated) parts.push(`超过 ${LIMITED} 字，仅校对前 ${LIMITED} 字`)
      deepInfo.value = parts.join(' · ') || '未发现明显问题'
      if (result.failures.length) {
        deepError.value = result.failures.map((f) => `第 ${f.batchIndex + 1} 批：${f.error}`).join('\n')
      }
    } catch (e: unknown) {
      deepError.value = (e as Error)?.message || String(e)
      deepIssues.value = []
    } finally {
      deepRunning.value = false
    }
  }

  /** 应用一条深度纠错建议（与本地一致：直接替换） */
  function applyDeepIssue(issue: Issue) {
    const ed = editorRef.value
    if (!ed) return
    ed.chain().focus().insertContentAt({ from: issue.from, to: issue.to }, issue.revised).run()
    // 应用后从列表移除（文本已变，位置失效）
    deepIssues.value = deepIssues.value.filter((i) => i !== issue)
  }

  /** 应用全部深度建议（从后往前替换，避免位置错乱） */
  function applyAllDeep(list: Issue[]) {
    const ed = editorRef.value
    if (!ed) return
    const sorted = [...list].sort((a, b) => b.from - a.from)
    const chain = ed.chain().focus()
    let prevFrom = Infinity
    for (const it of sorted) {
      if (it.to > prevFrom) continue
      chain.insertContentAt({ from: it.from, to: it.to }, it.revised)
      prevFrom = it.from
    }
    chain.run()
    deepIssues.value = []
  }

  /** 忽略一条深度建议（仅本次会话，本地 ignore 机制同样适用） */
  function ignoreDeep(issue: Issue) {
    ignored.value.add(issueKey(issue))
    deepIssues.value = deepIssues.value.filter((i) => !ignored.value.has(issueKey(i)))
  }

  return {
    entries,
    whitelist,
    rulesOn,
    lexiconOn,
    issues,
    loaded,
    ignored,
    lexiconMap,
    whitelistTerms,
    errorCount,
    warnCount,
    refreshAll,
    loadEntries,
    loadWhitelist,
    addEntry,
    removeEntry,
    setEntryEnabled,
    importEntries,
    addWhitelist,
    removeWhitelist,
    setIssues,
    ignoreSuggestion,
    clearIgnore,
    applyIssue,
    applyAll,
    // 深度纠错
    deepOn,
    deepRunning,
    deepIssues,
    deepInfo,
    deepError,
    runDeep,
    applyDeepIssue,
    applyAllDeep,
    ignoreDeep,
  }
})
