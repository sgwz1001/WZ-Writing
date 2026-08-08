/**
 * 深度纠错核心（纯函数，无任何运行时依赖）
 *
 * 与 deepCorrect.ts 的分工：
 *   · deepCore.ts —— 纯逻辑：分块、JSON 解析、文本块 ↔ 文档坐标映射。可单测。
 *   · deepCorrect.ts —— 网络编排：调 chat() 分批发给大模型，re-export 本模块全部能力。
 *
 * 依赖规则：本文件不 import 任何项目模块（除类型），保证能独立打包测试。
 */
import type { Node as PMNode } from '@tiptap/pm/model'
import type { Issue } from './correct'

/** 单批最多送入的字符数（中文约 1 token/字，给 4k 上下文内模型留足余量） */
export const DEEP_MAX_BATCH_CHARS = 2400
/** 单次深度纠错最多处理的字符数（超出截断，提示用户） */
export const DEEP_MAX_TOTAL_CHARS = 6000
/** 深度纠错结果单条建议的最长字符，防御模型胡编超长串 */
const MAX_SUGGEST_LEN = 40

export interface DeepSuggestion {
  original: string
  suggested: string
  /** 类型：搭配/用词/成语/语序/冗余/标点/其他 */
  type: string
  reason: string
  /** 0~1，越高越确信；解析失败时统一给 0.6 */
  confidence: number
}

export interface DeepBatchResult {
  batchIndex: number
  /** 本批在整篇文本中的起始偏移 */
  offset: number
  suggestions: DeepSuggestion[]
  /** 本批是否成功（false = 解析失败/网络错误，可重试） */
  ok: boolean
  /** 失败原因（ok=false 时） */
  error?: string
}

/** 解析失败后的返回（与成功分支同形，便于上层统一处理） */
export function failBatch(batchIndex: number, offset: number, error: string): DeepBatchResult {
  return { batchIndex, offset, suggestions: [], ok: false, error }
}

/**
 * 把纯文本切成「尽量均匀、每批 ≤ DEEP_MAX_BATCH_CHARS」的批次。
 * 切分点优先落在换行处，其次句子边界，实在没有才硬切，避免把一句话劈开。
 */
export function splitBatches(text: string, maxChars = DEEP_MAX_BATCH_CHARS): string[] {
  if (!text) return []
  const out: string[] = []
  let rest = text
  while (rest.length > maxChars) {
    // 在 [maxChars*0.55, maxChars] 区间内找最后一个换行/句号
    const head = rest.slice(0, maxChars)
    const lo = Math.floor(maxChars * 0.55)
    let cut = -1
    for (let i = maxChars - 1; i >= lo; i--) {
      const c = head[i]
      if (c === '\n' || c === '。' || c === '！' || c === '？' || c === '；') {
        cut = i + 1
        break
      }
    }
    if (cut === -1) cut = maxChars // 区间内没有自然断点，硬切
    out.push(rest.slice(0, cut))
    rest = rest.slice(cut)
  }
  if (rest) out.push(rest)
  return out
}

/** 提取 JSON（容错：模型可能用 ```json 围栏，或前后有闲话） */
function extractJson(raw: string): unknown {
  let s = raw.trim()
  // 去掉 ```json ... ``` 围栏
  const fence = s.match(/```(?:json)?\s*([\s\S]*?)```/)
  if (fence) s = fence[1].trim()
  // 若整段不是以 { 或 [ 开头，尝试截取第一个 { 到最后一个 } 之间
  if (!s.startsWith('{') && !s.startsWith('[')) {
    const a = s.indexOf('{')
    const b = s.lastIndexOf('}')
    if (a !== -1 && b > a) s = s.slice(a, b + 1)
  }
  try {
    return JSON.parse(s)
  } catch {
    // 极端情况：JSON 里混了注释/尾逗号 —— 交给上层按解析失败处理
    return null
  }
}

function norm(v: unknown): string {
  return typeof v === 'string' ? v.trim() : ''
}

/**
 * 解析模型返回文本 → DeepSuggestion[]。
 * 兼容两种形态：
 *   [ { original, suggested, type, reason, confidence } ]
 *   { issues: [ ... ] }
 */
export function parseSuggestions(raw: string): DeepSuggestion[] {
  const data = extractJson(raw)
  if (!data) return []
  const list: unknown[] = Array.isArray(data) ? data : Array.isArray((data as any)?.issues) ? (data as any).issues : []
  const out: DeepSuggestion[] = []
  for (const it of list) {
    if (!it || typeof it !== 'object') continue
    const o = norm((it as any).original ?? (it as any).wrong ?? (it as any).text)
    const s = norm((it as any).suggested ?? (it as any).fix ?? (it as any).correct ?? (it as any).revision)
    if (!o || !s || o === s) continue
    if (o.length > 60 || s.length > MAX_SUGGEST_LEN) continue
    out.push({
      original: o,
      suggested: s,
      type: norm((it as any).type) || '用词',
      reason: norm((it as any).reason) || `建议将「${o}」改为「${s}」`,
      confidence: Math.min(1, Math.max(0, Number((it as any).confidence) || 0.6)),
    })
  }
  return out
}

/** 供 prompt 展示的类型枚举（模型用中文返回，我们归类展示） */
export const DEEP_TYPES = ['搭配', '用词', '成语', '语序', '冗余', '标点', '其他'] as const
export type DeepType = (typeof DEEP_TYPES)[number]

export function isValidType(t: string): boolean {
  return (DEEP_TYPES as readonly string[]).includes(t)
}

/**
 * 把建议映射成 Issue（供编辑器标线与侧栏复用），并对原文做双重校验：
 *   1. original 必须逐字出现在文本中（否则是模型幻觉，丢弃并计数）
 *   2. 与本地规则已标区间重叠的丢弃（两套引擎独立，互不覆盖）
 * 返回 { issues, hallucinatedCount, overlappedCount } 便于面板展示「本次跳过多少条」。
 * 注意：本函数用于「纯文本坐标」场景（不涉及 PM 文档坐标）。
 */
export function mapSuggestionsToIssues(
  text: string,
  suggestions: DeepSuggestion[],
  localIssues: Issue[],
): { issues: Issue[]; hallucinatedCount: number; overlappedCount: number } {
  const issues: Issue[] = []
  let hallucinatedCount = 0
  let overlappedCount = 0

  // 本地已标区间（用于去重叠）
  const localRanges = localIssues.map((i) => [i.from, i.to] as [number, number])

  for (const s of suggestions) {
    const idx = text.indexOf(s.original)
    if (idx === -1) {
      hallucinatedCount++
      continue
    }
    const from = idx
    const to = idx + s.original.length
    if (localRanges.some(([ls, le]) => from < le && ls < to)) {
      overlappedCount++
      continue
    }
    issues.push({
      from,
      to,
      index: from,
      length: s.original.length,
      original: s.original,
      revised: s.suggested,
      category: isValidType(s.type) ? s.type : '其他',
      reason: `【AI】${s.reason}`,
      severity: 'warn', // AI 建议不搞「硬伤红」——红留给本地硬伤；AI 用独特紫色
    })
  }

  issues.sort((a, b) => a.from - b.from)
  return { issues, hallucinatedCount, overlappedCount }
}

// ─────────────────────────────────────────────
//  纯文本 ↔ ProseMirror 文档坐标映射
// ─────────────────────────────────────────────
//
// 深度纠错送给模型的文本必须与「定位映射用的文本」完全一致，否则建议的
// original 会定位失败。这里直接从 PM 文档构造纯文本，规则与 htmlToPlainText
// 对齐：
//   · 段落/标题/列表项等块级边界之间插入 \n\n（与 html 转文本的规则一致）
//   · 同一块内被样式拆分的文本节点之间不插入任何分隔符
// 同时建立「纯文本字符 → 文档坐标」映射表（分隔符字符无文档位置），
// 供 mapSuggestionsToDocIssues 把模型的 original 命中换算成文档 from/to。

export interface TextBlock {
  /** 文本节点内容 */
  text: string
  /** 该文本节点在 PM 文档中的起始位置（pos+1，即首个字符的 from） */
  docFrom: number
  /** 所属块级父节点（判断两个文本节点是否在同一块内） */
  parent: PMNode
}

/** 块级节点类型：块边界之间需要插入段落分隔符 */
function isBlockType(node: PMNode): boolean {
  return !!node && node.isBlock
}

/**
 * 遍历 PM 文档，收集全部文本节点及其 doc 起始位置与父块。
 * 拼接规则见模块注释 —— 由 buildPureTextWithMap 统一处理。
 */
export function collectTextBlocks(doc: PMNode): TextBlock[] {
  const blocks: TextBlock[] = []
  doc.descendants((node, pos, parent) => {
    if (node.isText && node.text) {
      blocks.push({ text: node.text, docFrom: pos + 1, parent: parent || doc })
    }
  })
  return blocks
}

export interface PureTextWithMap {
  /** 送给模型 / 用于 indexOf 的纯文本（块间含 \n\n） */
  pure: string
  /** 每个纯文本字符 → 文档坐标（分隔符字符为 null，不计入文本） */
  charDocPos: Array<number | null>
}

/**
 * 把文本块拼接成「模型可见纯文本」，并给出每个字符的文档坐标。
 * 相邻块若属于不同块级父节点，中间补 \n\n（纯文本字符，文档坐标为 null）。
 */
export function buildPureTextWithMap(blocks: TextBlock[]): PureTextWithMap {
  let pure = ''
  const charDocPos: Array<number | null> = []
  let prevParent: PMNode | null = null

  for (const b of blocks) {
    if (prevParent && isBlockType(prevParent) && isBlockType(b.parent) && prevParent !== b.parent) {
      // 块边界：补 \n\n，分隔符不映射文档坐标
      pure += '\n\n'
      charDocPos.push(null, null)
    }
    for (let i = 0; i < b.text.length; i++) {
      charDocPos.push(b.docFrom + i)
    }
    pure += b.text
    prevParent = b.parent
  }
  return { pure, charDocPos }
}

/**
 * 把模型建议映射为 Issue（含 PM 文档坐标 from/to）。
 *
 * 一致性保证：runDeepCorrection 送给模型的文本 = buildPureTextWithMap 的 pure，
 * 因此建议的 original 能直接在 pure 上 indexOf 定位；再经 charDocPos 换算成文档坐标。
 *
 * 双重校验：
 *   1. original 必须逐字出现在 pure 中（否则是模型幻觉，丢弃并计数）
 *   2. 与本地规则已标区间重叠的丢弃（两套引擎独立，互不覆盖）
 */
export function mapSuggestionsToDocIssues(
  blocks: TextBlock[],
  suggestions: DeepSuggestion[],
  localIssues: Issue[],
): { issues: Issue[]; hallucinatedCount: number; overlappedCount: number } {
  const { pure, charDocPos } = buildPureTextWithMap(blocks)

  // 本地已标区间（用于去重叠）
  const localRanges = localIssues.map((i) => [i.from, i.to] as [number, number])

  const issues: Issue[] = []
  let hallucinatedCount = 0
  let overlappedCount = 0

  for (const s of suggestions) {
    const idx = pure.indexOf(s.original)
    if (idx === -1) {
      hallucinatedCount++
      continue
    }
    const fromDoc = charDocPos[idx]
    // 原文若跨到分隔符（理论上模型不会这么答），或越界，判为无法定位
    if (fromDoc == null) {
      hallucinatedCount++
      continue
    }
    // 校验 original 覆盖的每个字符都有文档坐标（不允许跨段命中）
    let ok = true
    for (let i = 0; i < s.original.length; i++) {
      if (charDocPos[idx + i] == null) {
        ok = false
        break
      }
    }
    if (!ok) {
      hallucinatedCount++
      continue
    }
    const from = fromDoc
    const to = fromDoc + s.original.length
    if (localRanges.some(([ls, le]) => from < le && ls < to)) {
      overlappedCount++
      continue
    }
    issues.push({
      from,
      to,
      index: from,
      length: s.original.length,
      original: s.original,
      revised: s.suggested,
      category: isValidType(s.type) ? s.type : '其他',
      reason: `【AI】${s.reason}`,
      severity: 'warn', // AI 建议不搞「硬伤红」——红留给本地硬伤；AI 用独特紫色
    })
  }

  issues.sort((a, b) => a.from - b.from)
  return { issues, hallucinatedCount, overlappedCount }
}
