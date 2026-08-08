/**
 * 大模型接入适配层（OpenAI 兼容 /chat/completions）
 *
 * 只做一件事：把「消息 + 当前设置」翻译成一次 fetch，返回助手文本。
 * 不在这里拼 prompt、不在这里做纠错逻辑 —— 那些是上层（深度纠错、取标题）的事。
 *
 * 联网点只有这里。API Key 用户自填，只存在本地数据库，绝不外传、绝不上云。
 */
import { useSettingsStore } from '../stores/settings'
import { getDefaultBase } from '../data/models'

export interface ChatMessage {
  role: 'system' | 'user' | 'assistant'
  content: string
}

export interface ChatOptions {
  temperature?: number
  signal?: AbortSignal
  /** 覆盖模型（默认用设置里的 model） */
  model?: string
}

/** 解析 endpoint：优先用设置里的 baseUrl，否则回落到厂商默认值。 */
function resolveBase(baseUrl: string, provider: string): string {
  const base = (baseUrl || getDefaultBase(provider)).trim().replace(/\/+$/, '')
  return base || 'https://api.openai.com/v1'
}

export async function chat(messages: ChatMessage[], opts: ChatOptions = {}): Promise<string> {
  const { ai } = useSettingsStore()
  if (!ai.apiKey) {
    throw new Error('尚未配置 API Key，请先在「AI 设置」里填写。')
  }
  const base = resolveBase(ai.baseUrl, ai.provider)
  const url = `${base}/chat/completions`
  const model = opts.model || ai.model || fallbackModel(ai.provider)

  const resp = await fetch(url, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${ai.apiKey}`,
    },
    body: JSON.stringify({
      model,
      messages,
      temperature: opts.temperature ?? 0.7,
      stream: false,
    }),
    signal: opts.signal,
  })

  if (!resp.ok) {
    const text = await resp.text().catch(() => '')
    throw new Error(`请求失败（${resp.status}）：${text.slice(0, 200)}`)
  }

  const data = await resp.json()
  const content: string | undefined = data?.choices?.[0]?.message?.content
  if (content == null) {
    throw new Error('模型返回了空内容，请检查模型名称或重试。')
  }
  return content
}

function fallbackModel(provider: string): string {
  // 极端兜底：设置里 model 为空时给一个大概能用的默认
  const map: Record<string, string> = {
    deepseek: 'deepseek-chat',
    openai: 'gpt-4o-mini',
    qwen: 'qwen-plus',
    glm: 'glm-4-air',
    kimi: 'moonshot-v1-8k',
    doubao: 'doubao-pro-32k',
  }
  return map[provider] ?? 'gpt-4o-mini'
}

/** 连线自检：发一条极短消息，验证 Key / endpoint / model 是否可用。 */
export async function testConnection(): Promise<string> {
  const out = await chat(
    [
      { role: 'system', content: 'You are a concise assistant. Reply in the same language.' },
      { role: 'user', content: '请只回复两个字母：ok' },
    ],
    { temperature: 0 },
  )
  return out.slice(0, 60)
}
