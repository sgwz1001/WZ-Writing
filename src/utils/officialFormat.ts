import type { Editor } from '@tiptap/core'
import { DEFAULT_OFFICIAL_FORMAT, type OfficialFormat } from '../data/officialTemplates'

export { DEFAULT_OFFICIAL_FORMAT }

function ptToPx(pt: string): string {
  const n = parseInt(pt, 10)
  if (!Number.isFinite(n)) return '16'
  // 1pt ≈ 1.333px，取整
  return String(Math.round(n * 1.333))
}

/**
 * 一键套用 GB/T 9704 公文格式。
 *
 * - 正文：仿宋_GB2312、16pt、1.5 倍行距、首行缩进 2 字符、两端对齐
 * - 标题：方正小标宋、22pt、居中（仅处理第一个标题/heading）
 */
export function applyOfficialFormat(editor: Editor, format: OfficialFormat) {
  const bodySizePx = ptToPx(format.bodySize)
  const titleSizePx = ptToPx(format.titleSize)
  const indentEm = format.paragraphIndent.replace(/em$/, '')

  // 1. 全文套用正文格式
  editor
    .chain()
    .focus()
    .selectAll()
    .setFontFamily(format.bodyFont)
    .setFontSize(bodySizePx)
    .setLineHeight(String(format.lineHeight))
    .setFirstLineIndent(indentEm)
    .setTextAlign('justify')
    .run()

  // 2. 第一个标题块单独套用标题格式
  editor.commands.focus('start')
  editor
    .chain()
    .selectTextblockStart()
    .selectTextblockEnd()
    .setFontFamily(format.titleFont)
    .setFontSize(titleSizePx)
    .setTextAlign('center')
    .run()
}

/**
 * 根据文本行的前缀，识别公文层级编号并返回建议字体。
 */
export function detectOfficialNumbering(line: string): { level: number; font: string } | null {
  const rules = [
    { pattern: /^[一二三四五六七八九十]+、/, level: 1, font: "'SimHei', 'Noto Sans SC', 'Microsoft YaHei UI', sans-serif" },
    { pattern: /^（[一二三四五六七八九十]+）/, level: 2, font: "'KaiTi', 'STKaiti', serif" },
    { pattern: /^\d+\./, level: 3, font: "'FangSong_GB2312', 'FangSong', 'SimSun', serif" },
    { pattern: /^（\d+）/, level: 4, font: "'FangSong_GB2312', 'FangSong', 'SimSun', serif" },
  ]
  for (const rule of rules) {
    if (rule.pattern.test(line)) {
      return { level: rule.level, font: rule.font }
    }
  }
  return null
}
