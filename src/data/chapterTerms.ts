/**
 * 章节体系 · Chapter Terminology
 *
 * 每个写作身份拥有自己默认的层级与编号单位。
 * 编号规则固定为「前缀 + 数字 + 单位」，数字从 N 开始连续递增。
 * 用户可调整：起始值 N、单位词、是否显示前缀、标题。
 */

import type { IdentityId } from './wendao-lineage'

/** 一个层级单位，例如「卷」「章」「节」 */
export interface ChapterTerm {
  /** 单位标识，用于持久化 */
  id: string
  /** 显示名称 */
  label: string
  /** 固定前缀，如「第」；为空则不显示 */
  prefix: string
  /** 数字起始值 */
  start: number
  /** 数字样式 */
  numberStyle: 'arabic' | 'chinese' | 'lower-alpha' | 'upper-alpha' | 'roman'
  /** 该层级是否允许嵌套子层级 */
  nestable: boolean
}

/** 一个身份的完整章节层级配置 */
export interface ChapterHierarchy {
  /** 身份 ID */
  identityId: IdentityId
  /** 层级，从大到小 */
  levels: ChapterTerm[]
  /** 默认新建文档时所在的层级索引 */
  defaultLevelIndex: number
  /** 是否在标题中显示层级编号 */
  showNumber: boolean
}

const DEFAULT_TERM: ChapterTerm = {
  id: 'chapter',
  label: '章',
  prefix: '第',
  start: 1,
  numberStyle: 'chinese',
  nestable: false,
}

export const IDENTITY_HIERARCHIES: Record<IdentityId, ChapterHierarchy> = {
  general: {
    identityId: 'general',
    levels: [{ ...DEFAULT_TERM, id: 'chapter', label: '篇' }],
    defaultLevelIndex: 0,
    showNumber: true,
  },
  webnovel: {
    identityId: 'webnovel',
    levels: [
      { id: 'volume', label: '卷', prefix: '第', start: 1, numberStyle: 'chinese', nestable: true },
      { id: 'chapter', label: '章', prefix: '第', start: 1, numberStyle: 'chinese', nestable: true },
      { id: 'section', label: '节', prefix: '第', start: 1, numberStyle: 'chinese', nestable: false },
    ],
    defaultLevelIndex: 1,
    showNumber: true,
  },
  poet: {
    identityId: 'poet',
    levels: [
      { id: 'poem', label: '首', prefix: '第', start: 1, numberStyle: 'chinese', nestable: false },
    ],
    defaultLevelIndex: 0,
    showNumber: true,
  },
  official: {
    identityId: 'official',
    levels: [
      { id: 'document', label: '件', prefix: '', start: 1, numberStyle: 'arabic', nestable: false },
    ],
    defaultLevelIndex: 0,
    showNumber: false,
  },
  scholar: {
    identityId: 'scholar',
    levels: [
      { id: 'chapter', label: '章', prefix: '第', start: 1, numberStyle: 'arabic', nestable: true },
      { id: 'section', label: '节', prefix: '', start: 1, numberStyle: 'arabic', nestable: false },
    ],
    defaultLevelIndex: 0,
    showNumber: true,
  },
  nonfiction: {
    identityId: 'nonfiction',
    levels: [
      { id: 'chapter', label: '章', prefix: '第', start: 1, numberStyle: 'chinese', nestable: false },
    ],
    defaultLevelIndex: 0,
    showNumber: true,
  },
  editor: {
    identityId: 'editor',
    levels: [
      { id: 'chapter', label: '篇', prefix: '第', start: 1, numberStyle: 'chinese', nestable: false },
    ],
    defaultLevelIndex: 0,
    showNumber: true,
  },
  essayist: {
    identityId: 'essayist',
    levels: [
      { id: 'chapter', label: '篇', prefix: '第', start: 1, numberStyle: 'chinese', nestable: false },
    ],
    defaultLevelIndex: 0,
    showNumber: true,
  },
  screenwriter: {
    identityId: 'screenwriter',
    levels: [
      { id: 'act', label: '幕', prefix: '第', start: 1, numberStyle: 'chinese', nestable: true },
      { id: 'scene', label: '场', prefix: '第', start: 1, numberStyle: 'chinese', nestable: false },
    ],
    defaultLevelIndex: 1,
    showNumber: true,
  },
  planner: {
    identityId: 'planner',
    levels: [
      { id: 'case', label: '案', prefix: '第', start: 1, numberStyle: 'chinese', nestable: false },
    ],
    defaultLevelIndex: 0,
    showNumber: true,
  },
}

/** 所有可选单位词，用户可自由切换 */
export const ALL_TERMS: ChapterTerm[] = [
  { id: 'chapter', label: '章', prefix: '第', start: 1, numberStyle: 'chinese', nestable: false },
  { id: 'volume', label: '卷', prefix: '第', start: 1, numberStyle: 'chinese', nestable: true },
  { id: 'section', label: '节', prefix: '第', start: 1, numberStyle: 'chinese', nestable: false },
  { id: 'poem', label: '首', prefix: '第', start: 1, numberStyle: 'chinese', nestable: false },
  { id: 'document', label: '件', prefix: '', start: 1, numberStyle: 'arabic', nestable: false },
  { id: 'act', label: '幕', prefix: '第', start: 1, numberStyle: 'chinese', nestable: true },
  { id: 'scene', label: '场', prefix: '第', start: 1, numberStyle: 'chinese', nestable: false },
  { id: 'article', label: '篇', prefix: '第', start: 1, numberStyle: 'chinese', nestable: false },
  { id: 'part', label: '部', prefix: '第', start: 1, numberStyle: 'chinese', nestable: true },
]

const cnDigits = ['零', '一', '二', '三', '四', '五', '六', '七', '八', '九']

export function formatNumber(n: number, style: ChapterTerm['numberStyle']): string {
  switch (style) {
    case 'arabic':
      return String(n)
    case 'chinese':
      return toChineseNumber(n)
    case 'lower-alpha':
      return String.fromCharCode(96 + ((n - 1) % 26) + 1)
    case 'upper-alpha':
      return String.fromCharCode(64 + ((n - 1) % 26) + 1)
    case 'roman':
      return toRoman(n)
    default:
      return String(n)
  }
}

function toChineseNumber(n: number): string {
  if (!Number.isFinite(n) || n < 1) return String(n)
  if (n > 999) return String(n)
  const units = ['', '十', '百']
  let s = ''
  const str = String(n)
  for (let i = 0; i < str.length; i++) {
    const d = Number(str[i])
    const pos = str.length - 1 - i
    if (d === 0) {
      if (s && !s.endsWith('零')) s += '零'
    } else {
      s += cnDigits[d] + units[pos]
    }
  }
  s = s.replace(/零+$/, '')
  s = s.replace(/^一十/, '十')
  return s || '零'
}

function toRoman(n: number): string {
  const map: Record<string, number> = {
    M: 1000, CM: 900, D: 500, CD: 400, C: 100,
    XC: 90, L: 50, XL: 40, X: 10, IX: 9, V: 5, IV: 4, I: 1,
  }
  let s = ''
  for (const [letter, value] of Object.entries(map)) {
    while (n >= value) {
      s += letter
      n -= value
    }
  }
  return s
}

/** 根据当前层级与已有数量，生成下一个编号 */
export function nextChapterLabel(
  term: ChapterTerm,
  existingCount: number,
): string {
  const n = term.start + existingCount
  const num = formatNumber(n, term.numberStyle)
  if (!term.prefix) return `${num}${term.label}`
  return `${term.prefix}${num}${term.label}`
}

/** 把「第N章」与标题组合成完整章节名 */
export function composeChapterTitle(label: string, title?: string): string {
  if (!title || !title.trim()) return label
  return `${label} ${title.trim()}`
}

export function getHierarchy(identityId: IdentityId): ChapterHierarchy {
  return IDENTITY_HIERARCHIES[identityId] ?? IDENTITY_HIERARCHIES.general
}
