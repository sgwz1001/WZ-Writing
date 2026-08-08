/**
 * 大模型接入适配层（OpenAI 兼容 /chat/completions）
 *
 * 只做一件事：把「消息 + 当前设置」翻译成一次 fetch，返回助手文本。
 * 不在这里拼 prompt、不在这里做纠错逻辑 —— 那些是上层（深度纠错、取标题）的事。
 *
 * 联网点只有这里。API Key 用户自填，只存在本地数据库，绝不外传、绝不上云。
 */
import { useSettingsStore } from '../stores/settings'
import { getDefaultBase, getProvider, LEGACY_MODEL_MAP } from '../data/models'

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

  let resp: Response
  try {
    resp = await fetch(url, {
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
  } catch (e: unknown) {
    if (e instanceof DOMException && e.name === 'AbortError') throw e
    throw new Error(
      `连不上服务器。请检查网络，以及「接口地址」是否正确：${url}\n` +
        `若使用海外模型（OpenAI / Gemini），需自备网络环境或改填中转网关地址。`,
    )
  }

  if (!resp.ok) {
    const text = await resp.text().catch(() => '')
    throw new Error(explainError(resp.status, text, ai.provider, model, url))
  }

  const data = await resp.json()
  const content: string | undefined = data?.choices?.[0]?.message?.content
  if (content == null) {
    throw new Error('模型返回了空内容，请检查模型名称或重试。')
  }
  return content
}

function fallbackModel(provider: string): string {
  // 极端兜底：设置里 model 为空时，取该厂商在役清单的第一个
  const p = getProvider(provider)
  if (p?.models.length) return p.models[0].id
  return 'deepseek-v4-flash'
}

/**
 * 把 HTTP 状态码翻译成「用户看得懂、知道下一步点哪」的中文提示。
 * 这是本次修复「API 根本没办法用」的关键 —— 原来只抛裸状态码，用户无从下手。
 */
function explainError(
  status: number,
  raw: string,
  provider: string,
  model: string,
  url: string,
): string {
  const p = getProvider(provider)
  const brand = p?.name || provider
  const tail = raw ? `\n\n原始返回：${raw.slice(0, 300)}` : ''
  const lower = raw.toLowerCase()

  // 模型不存在（各厂商措辞不一，统一识别）
  const modelGone =
    lower.includes('model_not_found') ||
    lower.includes('model not found') ||
    lower.includes('invalid model') ||
    lower.includes('does not exist') ||
    lower.includes('不存在') ||
    lower.includes('未开通')

  if (modelGone || (status === 404 && model)) {
    const legacy = LEGACY_MODEL_MAP[model]
    const advice = legacy
      ? `「${model}」已被官方下线，请在 AI 设置里改用「${legacy.model}」。`
      : `「${model}」在 ${brand} 当前清单中不可用，请在 AI 设置的模型下拉里重新选择。`
    const extra =
      provider === 'doubao'
        ? '\n提示：火山方舟需要先在控制台「开通模型」，部分账号还需创建推理接入点（ep-xxxx）并把接入点 ID 填为模型名。'
        : ''
    return `模型不可用（${status}）。${advice}${extra}${tail}`
  }

  switch (status) {
    case 401:
      return `API Key 无效或未授权（401）。请检查 ${brand} 控制台里的 Key 是否复制完整、是否已启用、是否绑定了正确的项目。${tail}`
    case 402:
      return `账户余额不足（402）。请到 ${brand} 控制台充值或领取免费额度后重试。${tail}`
    case 403:
      return `无权访问该模型（403）。多数是模型未开通或所在地域不匹配，请到 ${brand} 控制台确认已开通「${model}」。${tail}`
    case 404:
      return `接口地址不对（404）。当前请求的是：${url}\n请检查 AI 设置里的「接口地址」，${brand} 的官方地址是 ${getDefaultBase(provider) || '（自定义）'}。${tail}`
    case 429:
      return `请求过于频繁或超出配额（429）。稍等片刻再试，或到 ${brand} 控制台提升限速。${tail}`
    case 400:
      return `请求被拒绝（400）。常见原因是模型名拼写错误、内容触发了安全策略、或参数不被该模型支持。${tail}`
    default:
      if (status >= 500) {
        return `${brand} 服务端异常（${status}），通常是对方临时故障，稍后重试即可。${tail}`
      }
      return `请求失败（${status}）。${tail}`
  }
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
