/**
 * 微信公众号排版（第四块 · 功能二）
 *
 * 把编辑器里的 TipTap HTML 转换成「公众号可直接粘贴」的内联样式 HTML。
 * 公众号编辑器只认内联 style，不认 <style>/class，所以这里逐标签把模板样式
 * 写进 style 属性，并保留原有属性（src/href 等）。
 *
 * 纯字符串处理，不依赖 document，方便在 Node 下做单元测试。
 */

export interface WeChatTemplate {
  key: string
  label: string
  desc: string
  /** 外层 section 的内联样式（不含 font-size / line-height，由面板注入） */
  root: string
  /** 标签名 -> 内联样式 */
  tag: Record<string, string>
}

export interface WeChatOptions {
  fontSize: number
  lineHeight: number
}

export const WECHAT_TEMPLATES: WeChatTemplate[] = [
  {
    key: 'minimal',
    label: '简约·素白',
    desc: '无衬线、克制留白，适合干货科普',
    root: 'font-family:"PingFang SC","Microsoft YaHei",sans-serif;color:#2b2b2b;letter-spacing:0.3px;',
    tag: {
      p: 'margin:1.2em 0;',
      h1: 'font-size:22px;font-weight:700;color:#1a1a1a;text-align:center;margin:1.4em 0 0.6em;',
      h2: 'font-size:19px;font-weight:700;color:#1a1a1a;margin:1.3em 0 0.5em;',
      h3: 'font-size:17px;font-weight:600;color:#1a1a1a;margin:1.2em 0 0.4em;',
      blockquote: 'margin:1.2em 0;padding:0.8em 1em;background:#f7f7f7;border-left:4px solid #ddd;color:#666;',
      ul: 'padding-left:1.4em;margin:1em 0;',
      ol: 'padding-left:1.4em;margin:1em 0;',
      li: 'margin:0.4em 0;',
      strong: 'color:#1a1a1a;font-weight:700;',
      em: 'font-style:italic;',
      a: 'color:#3b82f6;text-decoration:none;',
      img: 'max-width:100%;height:auto;display:block;margin:1em auto;border-radius:6px;',
      pre: 'background:#f5f5f5;padding:1em;overflow:auto;border-radius:6px;font-size:14px;color:#333;',
      code: 'background:#f0f0f0;padding:0.1em 0.4em;border-radius:4px;font-family:monospace;font-size:14px;',
      hr: 'border:none;border-top:1px solid #eee;margin:2em 0;',
      br: '',
    },
  },
  {
    key: 'ink',
    label: '文艺·墨痕',
    desc: '衬线宋体、墨色标题，适合随笔散文',
    root: 'font-family:"Songti SC","SimSun","Noto Serif SC",serif;color:#333333;letter-spacing:1px;',
    tag: {
      p: 'margin:1.3em 0;',
      h1: 'font-size:22px;font-weight:700;color:#5b4a3a;text-align:center;margin:1.5em 0 0.6em;letter-spacing:3px;',
      h2: 'font-size:19px;font-weight:700;color:#5b4a3a;margin:1.4em 0 0.5em;',
      h3: 'font-size:17px;font-weight:600;color:#5b4a3a;margin:1.2em 0 0.4em;',
      blockquote: 'margin:1.3em 0;padding:0.8em 1.1em;background:#faf6f0;border-left:3px solid #8a7a66;color:#6b5d4f;font-style:italic;',
      ul: 'padding-left:1.4em;margin:1em 0;',
      ol: 'padding-left:1.4em;margin:1em 0;',
      li: 'margin:0.4em 0;',
      strong: 'color:#5b4a3a;font-weight:700;',
      em: 'font-style:italic;color:#7a6a58;',
      a: 'color:#8a6d4b;text-decoration:none;border-bottom:1px solid #8a6d4b;',
      img: 'max-width:100%;height:auto;display:block;margin:1em auto;border-radius:2px;',
      pre: 'background:#f3efe8;padding:1em;overflow:auto;border-radius:4px;font-size:14px;color:#4a4036;',
      code: 'background:#ece6dc;padding:0.1em 0.4em;border-radius:3px;font-family:monospace;font-size:14px;',
      hr: 'border:none;border-top:1px solid #d8cdbd;margin:2em 0;',
      br: '',
    },
  },
  {
    key: 'tech',
    label: '科技·青蓝',
    desc: '冷色强调、深色代码块，适合技术教程',
    root: 'font-family:"PingFang SC","Microsoft YaHei",sans-serif;color:#1f2933;letter-spacing:0.3px;',
    tag: {
      p: 'margin:1.15em 0;',
      h1: 'font-size:22px;font-weight:700;color:#0b6e99;text-align:center;margin:1.4em 0 0.6em;',
      h2: 'font-size:19px;font-weight:700;color:#0b6e99;margin:1.3em 0 0.5em;border-bottom:2px solid #cfe8f3;padding-bottom:0.3em;',
      h3: 'font-size:17px;font-weight:600;color:#0b6e99;margin:1.2em 0 0.4em;',
      blockquote: 'margin:1.2em 0;padding:0.8em 1em;background:#eef6fb;border-left:4px solid #1d9bd1;color:#2c5f7a;',
      ul: 'padding-left:1.4em;margin:1em 0;',
      ol: 'padding-left:1.4em;margin:1em 0;',
      li: 'margin:0.4em 0;',
      strong: 'color:#0b6e99;font-weight:700;',
      em: 'font-style:italic;',
      a: 'color:#1d9bd1;text-decoration:none;',
      img: 'max-width:100%;height:auto;display:block;margin:1em auto;border-radius:8px;',
      pre: 'background:#1e293b;color:#e2e8f0;padding:1em;overflow:auto;border-radius:8px;font-size:14px;',
      code: 'background:#334155;color:#e2e8f0;padding:0.1em 0.4em;border-radius:4px;font-family:monospace;font-size:14px;',
      hr: 'border:none;border-top:1px solid #d6e4ec;margin:2em 0;',
      br: '',
    },
  },
  {
    key: 'magazine',
    label: '杂志·胭红',
    desc: '胭脂红标题、留白考究，适合生活方式',
    root: 'font-family:"Songti SC","Noto Serif SC",serif;color:#2b2b2b;letter-spacing:0.6px;',
    tag: {
      p: 'margin:1.25em 0;',
      h1: 'font-size:23px;font-weight:700;color:#b0303a;text-align:center;margin:1.5em 0 0.6em;letter-spacing:4px;',
      h2: 'font-size:19px;font-weight:700;color:#b0303a;margin:1.4em 0 0.5em;',
      h3: 'font-size:17px;font-weight:600;color:#9a2f38;margin:1.2em 0 0.4em;',
      blockquote: 'margin:1.3em 0;padding:0.8em 1.1em;background:#fbf2f3;border-left:3px solid #b0303a;color:#7a4a4f;',
      ul: 'padding-left:1.4em;margin:1em 0;',
      ol: 'padding-left:1.4em;margin:1em 0;',
      li: 'margin:0.4em 0;',
      strong: 'color:#b0303a;font-weight:700;',
      em: 'font-style:italic;',
      a: 'color:#b0303a;text-decoration:none;border-bottom:1px solid #b0303a;',
      img: 'max-width:100%;height:auto;display:block;margin:1em auto;border-radius:4px;',
      pre: 'background:#f6eef0;padding:1em;overflow:auto;border-radius:6px;font-size:14px;color:#5a3a3e;',
      code: 'background:#f0e2e4;padding:0.1em 0.4em;border-radius:4px;font-family:monospace;font-size:14px;',
      hr: 'border:none;border-top:1px solid #eccdd0;margin:2em 0;',
      br: '',
    },
  },
]

const VOID_TAGS = new Set(['img', 'br', 'hr', 'input', 'meta', 'link', 'source'])

interface Token {
  type: 'text' | 'open' | 'close'
  tag: string
  attrs: string
  selfClose: boolean
}

/** 把 HTML 拆成 token 序列，兼容嵌套与自闭合标签。 */
function tokenize(html: string): Token[] {
  const tokens: Token[] = []
  const re = /<[^>]+>/g
  let last = 0
  let m: RegExpExecArray | null
  while ((m = re.exec(html))) {
    if (m.index > last) tokens.push({ type: 'text', tag: '', attrs: '', selfClose: false, value: html.slice(last, m.index) } as any)
    const inner = m[0].slice(1, -1)
    if (inner.startsWith('!')) {
      // 注释等：原样丢弃
      last = re.lastIndex
      continue
    }
    const isClose = inner.startsWith('/')
    let body = isClose ? inner.slice(1).trim() : inner
    const selfClose = body.endsWith('/') || /^(img|br|hr|input|meta|link|source)\b/i.test(body)
    body = body.replace(/\/$/, '').trim()
    const tag = body.split(/[\s/>]/)[0].toLowerCase()
    if (isClose) {
      tokens.push({ type: 'close', tag, attrs: '', selfClose: false })
    } else {
      const attrs = body.slice(tag.length).replace(/\/$/, '').trim()
      tokens.push({ type: 'open', tag, attrs: stripStyle(attrs), selfClose })
    }
    last = re.lastIndex
  }
  if (last < html.length) tokens.push({ type: 'text', tag: '', attrs: '', selfClose: false, value: html.slice(last) } as any)
  return tokens
}

/** 去掉原 style 属性，避免与模板样式冲突。 */
function stripStyle(attrs: string): string {
  return attrs.replace(/\s*style="[^"]*"/i, '').trim()
}

function build(tokens: Token[], idx: number, tmpl: WeChatTemplate, opts: WeChatOptions): { html: string; next: number } {
  let out = ''
  let i = idx
  while (i < tokens.length) {
    const t = tokens[i] as any
    if (t.type === 'text') {
      out += t.value
      i++
      continue
    }
    if (t.type === 'close') {
      return { html: out, next: i + 1 }
    }
    // open
    const style = styleFor(tmpl, t.tag)
    if (t.selfClose || VOID_TAGS.has(t.tag)) {
      out += `<${t.tag}${style}${t.attrs ? ' ' + t.attrs : ''}>`
      i++
      continue
    }
    const inner = build(tokens, i + 1, tmpl, opts)
    out += `<${t.tag}${style}${t.attrs ? ' ' + t.attrs : ''}>${inner.html}</${t.tag}>`
    i = inner.next
  }
  return { html: out, next: i }
}

function styleFor(tmpl: WeChatTemplate, tag: string): string {
  const base = tmpl.tag[tag] || tmpl.tag['*']
  if (!base) return ''
  return ` style="${base}"`
}

/**
 * 转换主入口。
 * @param html 编辑器正文 HTML（TipTap 片段）
 * @param template 选定模板
 * @param opts 字号 / 行距（注入到外层 section）
 */
export function formatWeChat(html: string, template: WeChatTemplate, opts: WeChatOptions): string {
  const rootStyle = `${template.root}font-size:${opts.fontSize}px;line-height:${opts.lineHeight};`
  if (!html || !html.trim()) return `<section style="${rootStyle}"></section>`
  const tokens = tokenize(html)
  const body = build(tokens, 0, template, opts).html
  return `<section style="${rootStyle}">${body}</section>`
}
