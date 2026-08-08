/**
 * 一键取标题（第四块 · 功能一）
 *
 * 根据正文，用大模型生成多种风格的候选标题；未配置 API Key 时回落到本地启发式。
 * 风格对应需求文档：中国网文 / 日式轻小说 / 欧美传统文学 / 古典章回体。
 */
import { chat } from './ai'
import { useSettingsStore } from '../stores/settings'

export type TitleStyle = 'webnovel' | 'lightnovel' | 'western' | 'classic' | 'foreign'

export const TITLE_STYLES: { key: TitleStyle; label: string; hint: string }[] = [
  { key: 'webnovel', label: '中国网文', hint: '爽点前置、悬念吸睛' },
  { key: 'lightnovel', label: '日式轻小说', hint: '轻飘、带角色感' },
  { key: 'western', label: '欧美文学', hint: '凝练、象征' },
  { key: 'classic', label: '古典章回体', hint: '对仗回目、七言八字' },
  { key: 'foreign', label: '外国文学', hint: '英文原名 + 括号中文释义' },
]

const STYLE_PROMPT: Record<TitleStyle, string> = {
  webnovel: '中国网络小说风格：爽点前置、有悬念、能勾起点击欲，可用夸张或反差。',
  lightnovel: '日本轻小说风格：轻飘飘、带角色情绪或设定感，可带“物语”味。',
  western: '欧美传统文学风格：凝练、有象征与诗意，不浮夸。',
  classic: '中国古典章回体风格：对仗回目体，七言或八字句式，文雅含蓄。',
  foreign:
    '外国文学名作风：给出英文原名（现代英语，简洁有力，可含隐喻），并在其后加括号中文释义。' +
    '格式必须严格为「英文标题（中文释义）」，例如：The Old Man and the Sea（老人与海）、One Hundred Years of Solitude（百年孤独）。',
}

/** 把编辑器 HTML 正文转纯文本（仅在浏览器/Tauri 环境调用，依赖 document）。 */
export function htmlToText(html: string): string {
  const el = document.createElement('div')
  el.innerHTML = html || ''
  return (el.textContent || '').replace(/\s+/g, ' ').trim()
}

/**
 * 生成候选标题。优先走大模型；无 Key 或调用失败则回落本地兜底。
 * @param html 编辑器正文 HTML
 * @param style 标题风格
 * @param count 候选数量
 */
export async function suggestTitles(html: string, style: TitleStyle, count = 5): Promise<string[]> {
  const text = htmlToText(html).slice(0, 1600)
  const { ai } = useSettingsStore()

  if (!ai.apiKey) return localTitles(text, style, count)

  const sys = `你是中文写作助手。根据用户正文，按以下风格生成 ${count} 个标题/章节名候选，每行一个，不要编号、不要解释、不要引号、不要 Markdown。风格要求：${STYLE_PROMPT[style]}`
  const user = `正文片段：\n${text}\n\n请直接输出 ${count} 个候选标题，每行一个。`
  try {
    const out = await chat(
      [
        { role: 'system', content: sys },
        { role: 'user', content: user },
      ],
      { temperature: 0.9 },
    )
    const parsed = parseTitles(out, count)
    return parsed.length ? parsed : localTitles(text, style, count)
  } catch {
    return localTitles(text, style, count)
  }
}

function parseTitles(out: string, count: number): string[] {
  return out
    .split(/\n+/)
    .map((s) => s.replace(/^[0-9]+[.、)）\s]*/, '').replace(/^["'""'‘’]/, '').replace(/["'""'‘’]$/, '').trim())
    .filter(Boolean)
    .slice(0, count)
}

/** 无 Key / 失败时的本地兜底：基于首句做风格化改写。 */
function localTitles(text: string, style: TitleStyle, count: number): string[] {
  const sentences = text
    .split(/[。！？!?\n]/)
    .map((s) => s.trim())
    .filter((s) => s.length >= 4)
  const first = sentences[0] || '未命名章节'
  const map: Record<TitleStyle, string[]> = {
    webnovel: [`震惊！${first.slice(0, 12)}`, `${first.slice(0, 10)}的逆袭`, `${first.slice(0, 8)}：我的天才之路`],
    lightnovel: [`关于${first.slice(0, 8)}的物语`, `${first.slice(0, 10)}的日常`, `我的${first.slice(0, 6)}不可能这么可爱`],
    western: [`${first.slice(0, 10)}`, `沉默的${first.slice(0, 6)}`, `风与${first.slice(0, 6)}`],
    classic: [`${first.slice(0, 7)}（本地生成）`, `话说${first.slice(0, 6)}`, `且听${first.slice(0, 6)}`],
    foreign: [`The Echo of ${toEnglish(first.slice(0, 4))}（回声）`, `A Quiet ${toEnglish(first.slice(0, 4))}（宁静）`, `The Last ${toEnglish(first.slice(0, 4))}（最后的守望）`],
  }
  return (map[style] || map.webnovel).slice(0, count)
}

/** 本地兜底：把中文片段粗转成英文单词，只作占位（无 Key 时的降级） */
function toEnglish(s: string): string {
  const dict: Record<string, string> = {
    风: 'Wind', 雨: 'Rain', 雪: 'Snow', 月: 'Moon', 星: 'Star', 海: 'Sea', 山: 'Mountain',
    火: 'Fire', 光: 'Light', 夜: 'Night', 城: 'City', 梦: 'Dream', 路: 'Road', 桥: 'Bridge',
    花: 'Flower', 鸟: 'Bird', 云: 'Cloud', 河: 'River', 春: 'Spring', 秋: 'Autumn',
  }
  const letters = [...s].map((c) => dict[c] || c).join(' ').trim()
  return letters || 'Days'
}
