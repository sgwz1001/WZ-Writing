/**
 * 导出工具集
 *
 * 支持 TXT / Markdown / HTML / DOCX / CSV / Excel / 打印 PDF。
 * 文件写入通过 Tauri command 交给 Rust 侧原子完成，避免前端沙盒限制。
 */

import { invoke } from '@tauri-apps/api/core'
import { save, open } from '@tauri-apps/plugin-dialog'
import { Document, Packer, Paragraph, TextRun, HeadingLevel, AlignmentType } from 'docx'
// eslint-disable-next-line @typescript-eslint/ban-ts-comment
// @ts-ignore —— write-excel-file 无类型声明，由 src/types/vendor.d.ts 兜底
import writeXlsxFile from 'write-excel-file'
import { htmlToPlainText, plainTextToMarkdown } from './text'

export type ExportFormat = 'txt' | 'md' | 'html' | 'docx' | 'csv' | 'xlsx' | 'pdf'

export interface ExportDoc {
  id: string
  projectName: string
  title: string
  html: string
  updatedAt: string
}

export interface LogRow {
  time: string
  action: string
  project?: string
  document?: string
  detail?: string
}

const FORMAT_LABEL: Record<ExportFormat, string> = {
  txt: '纯文本 TXT',
  md: 'Markdown',
  html: '网页 HTML',
  docx: 'Word 文档',
  csv: 'CSV 表格',
  xlsx: 'Excel 表格',
  pdf: 'PDF（打印）',
}

const FORMAT_EXT: Record<ExportFormat, string> = {
  txt: 'txt',
  md: 'md',
  html: 'html',
  docx: 'docx',
  csv: 'csv',
  xlsx: 'xlsx',
  pdf: 'pdf',
}

function suggestFilename(docs: ExportDoc[], format: ExportFormat): string {
  if (docs.length === 1) {
    return `${docs[0].title}.${FORMAT_EXT[format]}`
  }
  const base = docs[0].projectName || '导出'
  return `${base} 等 ${docs.length} 篇.${FORMAT_EXT[format]}`
}

/**
 * 选择保存路径。取消返回 null。
 */
export async function pickExportPath(docs: ExportDoc[], format: ExportFormat): Promise<string | null> {
  const ext = FORMAT_EXT[format]
  return save({
    filters: [{ name: FORMAT_LABEL[format], extensions: [ext] }],
    defaultPath: suggestFilename(docs, format),
  })
}

/**
 * 选择要导入的文本文件。目前支持 txt / md / html。
 */
export async function pickImportPath(): Promise<string | null> {
  return open({
    filters: [
      { name: '文本/网页/Markdown', extensions: ['txt', 'md', 'markdown', 'html', 'htm'] },
      { name: '所有文件', extensions: ['*'] },
    ],
    multiple: false,
  })
}

/**
 * 导出单篇或多篇文档。
 */
export async function exportDocuments(docs: ExportDoc[], format: ExportFormat, path: string): Promise<void> {
  switch (format) {
    case 'txt':
      return invoke('write_text_file', { path, content: toTxt(docs) })
    case 'md':
      return invoke('write_text_file', { path, content: toMd(docs) })
    case 'html':
      return invoke('write_text_file', { path, content: toHtml(docs) })
    case 'docx':
      return toDocx(docs, path)
    case 'pdf':
      return printToPdf()
    default:
      throw new Error(`不支持的文档导出格式：${format}`)
  }
}

/**
 * 导出日志/统计表格。
 */
export async function exportLogs(rows: LogRow[], format: 'csv' | 'xlsx', path: string): Promise<void> {
  if (format === 'csv') {
    const header = ['时间', '动作', '项目', '文档', '详情']
    const lines = rows.map((r) =>
      [r.time, r.action, r.project ?? '', r.document ?? '', r.detail ?? '']
        .map(escapeCsv)
        .join(','),
    )
    return invoke('write_text_file', { path, content: '\uFEFF' + [header, ...lines].join('\n') })
  }
  // xlsx
  const header = [{ value: '时间' }, { value: '动作' }, { value: '项目' }, { value: '文档' }, { value: '详情' }]
  const data = rows.map((r) => [
    { value: r.time, type: 'string' },
    { value: r.action, type: 'string' },
    { value: r.project || '', type: 'string' },
    { value: r.document || '', type: 'string' },
    { value: r.detail || '', type: 'string' },
  ])
  // eslint-disable-next-line @typescript-eslint/ban-ts-comment
  // @ts-ignore
  const blob: Blob = await writeXlsxFile([header, ...data], { fileName: 'logs.xlsx' })
  const arrayBuffer = await blob.arrayBuffer()
  return invoke('write_binary_file', { path, bytes: Array.from(new Uint8Array(arrayBuffer)) })
}

function toTxt(docs: ExportDoc[]): string {
  return docs
    .map((d) => `${d.title}\n${htmlToPlainText(d.html)}`)
    .join('\n\n――――――――――――――\n\n')
}

function toMd(docs: ExportDoc[]): string {
  return docs
    .map((d) => plainTextToMarkdown(htmlToPlainText(d.html), d.title))
    .join('\n\n---\n\n')
}

function toHtml(docs: ExportDoc[]): string {
  const style = `
    body{font-family:"Noto Serif SC",Georgia,serif;line-height:1.9;max-width:720px;margin:0 auto;padding:48px;color:#222;background:#fafaf9}
    h1{font-size:32px;margin-bottom:8px}
    .meta{color:#888;font-size:13px;margin-bottom:32px}
    hr{border:none;border-top:1px solid #ddd;margin:48px 0}
  `
  const items = docs
    .map(
      (d) => `
        <h1>${escapeHtml(d.title)}</h1>
        <div class="meta">${d.projectName} · ${d.updatedAt}</div>
        ${d.html}
      `,
    )
    .join('<hr />')
  return `<!doctype html><html lang="zh-CN"><head><meta charset="utf-8"><style>${style}</style></head><body>${items}</body></html>`
}

async function toDocx(docs: ExportDoc[], path: string): Promise<void> {
  const children: (Paragraph)[] = []
  docs.forEach((d, i) => {
    if (i > 0) children.push(new Paragraph({ text: '' }))
    children.push(
      new Paragraph({
        text: d.title,
        heading: HeadingLevel.HEADING_1,
        alignment: AlignmentType.CENTER,
      }),
    )
    children.push(
      new Paragraph({
        children: [
          new TextRun({ text: `${d.projectName} · ${d.updatedAt}`, color: '888888', size: 18 }),
        ],
        alignment: AlignmentType.CENTER,
      }),
    )
    htmlToPlainText(d.html)
      .split(/\n{2,}/)
      .filter(Boolean)
      .forEach((para) => {
        children.push(new Paragraph({ children: [new TextRun({ text: para, font: 'Noto Serif SC' })] }))
      })
  })

  const doc = new Document({
    sections: [{ properties: {}, children }],
  })
  const blob = await Packer.toBlob(doc)
  const arrayBuffer = await blob.arrayBuffer()
  return invoke('write_binary_file', { path, bytes: Array.from(new Uint8Array(arrayBuffer)) })
}

function printToPdf(): void {
  // 调用系统打印对话框，用户可选择「Microsoft Print to PDF」等虚拟打印机
  window.print()
}

function escapeHtml(s: string): string {
  return s
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
}

function escapeCsv(v: unknown): string {
  const s = String(v ?? '')
  if (/[",\n\r]/.test(s)) return `"${s.replace(/"/g, '""')}"`
  return s
}

/**
 * 读取用户选中的文件并返回文本内容。
 */
export async function importDocumentText(filePath: string): Promise<string> {
  return invoke('read_text_file', { path: filePath })
}

export { FORMAT_LABEL, FORMAT_EXT }
