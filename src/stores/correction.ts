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
  }
})
