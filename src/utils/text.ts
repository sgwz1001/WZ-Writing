/**
 * 文本处理工具集
 *
 * 字数统计、段落拆分、HTML↔纯文本转换等。
 * 全部在 JS 侧完成，不依赖后端。
 */

const CJK_PUNCT = /[\u3000-\u303F\uFF00-\uFFEF。，、；：？！“”‘’（）《》【】…—～·「」『』〖〗【】]/gu
const WESTERN_PUNCT = /[.,;:!?'"()\[\]{}\-/\\@#$%&*+=_<>|]/gu
const SENTENCE_END = /[。！？；.!?]/gu
const PARAGRAPH_SPLIT = /\n{2,}|\r\n{2,}/g

export interface TextStats {
  /** 含标点、含标题 */
  totalChars: number
  /** 不含标点、含标题 */
  charsNoPunct: number
  /** 含标点、不含标题 */
  charsNoTitle: number
  /** 不含标点、不含标题 */
  charsNoPunctNoTitle: number
  /** 仅标点数量 */
  punctCount: number
  /** 标题字数 */
  titleChars: number
  /** 段落数（按空行） */
  paragraphCount: number
  /** 句子数 */
  sentenceCount: number
  /** 行数 */
  lineCount: number
  /** 总字节数（UTF-8 估算） */
  byteSize: number
}

export interface SplitOptions {
  /** 0 = 最激进（每句一段），100 = 最保守（尽量不分） */
  level: number
  /** 是否保留原文的换行段落 */
  respectParagraphs?: boolean
}

export interface ParagraphChunk {
  /** 段落在原文中的起始字符位置 */
  start: number
  /** 长度 */
  length: number
  /** 段落文本 */
  text: string
  /** 是否来自原文的硬换行 */
  fromHardBreak: boolean
}

/**
 * 把 HTML 转成纯文本。
 * 只处理常见标签，保留段落/换行结构。
 */
export function htmlToPlainText(html: string): string {
  if (!html) return ''
  return html
    .replace(/<\/?p[^>]*>/gi, '\n\n')
    .replace(/<br\s*\/?>/gi, '\n')
    .replace(/<\/?h[1-6][^>]*>/gi, '\n\n')
    .replace(/<li[^>]*>/gi, '• ')
    .replace(/<\/li>/gi, '\n')
    .replace(/<[^>]+>/g, '')
    .replace(/&nbsp;/g, ' ')
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/\n{3,}/g, '\n\n')
    .trim()
}

/**
 * 把纯文本转成简单 Markdown。
 */
export function plainTextToMarkdown(text: string, title?: string): string {
  const lines = text.split(/\n/).map((l) => l.trim())
  const head = title ? `# ${title}\n\n` : ''
  return head + lines.join('\n\n')
}

/**
 * 计算字数统计。
 *
 * 中文/日文/韩文字符算 1 字；西文字母按连续单词算 1 词（近似）。
 * 标题长度从传入的 title 计算；正文中出现的首个 heading 不计入「标题」开关。
 */
export function computeStats(html: string, title = ''): TextStats {
  const plain = htmlToPlainText(html)
  const titleChars = countCjkAndWords(title)
  const totalChars = countCjkAndWords(plain) + titleChars
  const punctCount = countPunctuation(plain)
  const charsNoPunct = Math.max(0, countCjkAndWords(removePunctuation(plain)) + titleChars)
  const charsNoTitle = countCjkAndWords(plain)
  const charsNoPunctNoTitle = Math.max(0, countCjkAndWords(removePunctuation(plain)))

  return {
    totalChars,
    charsNoPunct,
    charsNoTitle,
    charsNoPunctNoTitle,
    punctCount,
    titleChars,
    paragraphCount: plain.split(PARAGRAPH_SPLIT).filter(Boolean).length || (plain ? 1 : 0),
    sentenceCount: (plain.match(SENTENCE_END) || []).length || (plain ? 1 : 0),
    lineCount: plain.split(/\n/).filter(Boolean).length || 0,
    byteSize: new Blob([plain]).size,
  }
}

function countCjkAndWords(text: string): number {
  if (!text) return 0
  // CJK 统一表意文字 + 扩展 A/B/C/D/E/F，以及谚文、假名
  const cjk = text.match(/[\u4E00-\u9FFF\u3400-\u4DBF\u{20000}-\u{2A6DF}\u{2A700}-\u{2B73F}\u{2B740}-\u{2B81F}\u{2B820}-\u{2CEAF}\u{2CEB0}-\u{2EBEF}\u3005\u3007\u3021-\u3029\u303B\uAC00-\uD7AF\u3040-\u309F\u30A0-\u30FF]/gu) || []
  const words = text
    .replace(/[\u4E00-\u9FFF\u3400-\u4DBF]/g, '')
    .match(/[a-zA-Z0-9_'-]+/g) || []
  return cjk.length + words.length
}

function countPunctuation(text: string): number {
  return (text.match(CJK_PUNCT) || []).length + (text.match(WESTERN_PUNCT) || []).length
}

function removePunctuation(text: string): string {
  return text.replace(CJK_PUNCT, '').replace(WESTERN_PUNCT, '')
}

/**
 * 段落拆分。
 *
 * level 0-100：
 * - 0   每遇到一个句末标点就分一段（最激进）。
 * - 50  按「目标长度」组合句子，目标长度居中。
 * - 100 尽量保持原段落，只在超长段落处拆分（最保守）。
 *
 * respectParagraphs=true 时，优先尊重原文的空行段落，只在段落内部再按策略拆分。
 */
export function splitParagraphs(text: string, options: SplitOptions): ParagraphChunk[] {
  const level = Math.max(0, Math.min(100, options.level))
  const raw = (text || '').replace(/\r\n/g, '\n').trim()
  if (!raw) return []

  // 保守 → 激进：目标段落长度从 500 降到 30
  const targetLen = Math.round(500 - (level / 100) * 470)
  const maxLen = Math.round(targetLen * 1.6)

  const hardParagraphs = options.respectParagraphs !== false
    ? raw.split(/\n{2,}/)
    : [raw]

  const out: ParagraphChunk[] = []
  let cursor = 0

  for (const para of hardParagraphs) {
    const start = raw.indexOf(para, cursor)
    cursor = start + para.length

    if (level >= 85) {
      // 保守：基本保持原段落，仅当超过 maxLen 时才按句子切
      if (para.length <= maxLen) {
        out.push({ start, length: para.length, text: para, fromHardBreak: true })
        continue
      }
    }

    const sentences = splitSentences(para)
    let buffer = ''
    let bufStart = start

    const flush = () => {
      if (!buffer) return
      out.push({
        start: bufStart,
        length: buffer.length,
        text: buffer,
        fromHardBreak: false,
      })
      bufStart += buffer.length
      buffer = ''
    }

    for (const s of sentences) {
      // 单句已经超长：直接作为一段
      if (s.length > maxLen) {
        flush()
        out.push({
          start: bufStart,
          length: s.length,
          text: s,
          fromHardBreak: false,
        })
        bufStart += s.length
        continue
      }

      const projected = buffer + s
      if (buffer && projected.length > targetLen) {
        flush()
      }
      buffer += s
    }
    flush()
  }

  return out
}

function splitSentences(text: string): string[] {
  // 按句末标点切分，但保留标点在句尾
  const parts = text.split(/([。！？；.!?]+)/gu)
  const sentences: string[] = []
  for (let i = 0; i < parts.length; i += 2) {
    const body = parts[i]
    const punct = parts[i + 1] || ''
    if (body || punct) {
      sentences.push(body + punct)
    }
  }
  return sentences.filter(Boolean)
}
