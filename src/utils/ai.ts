/**
 * 大模型接入适配层（OpenAI 兼容 /chat/completions）
 *
 * 只做一件事：把「消息 + 当前设置」翻译成一次 fetch，返回助手文本。
 * 不在这里拼 prompt、不在这里做纠错逻辑 —— 那些是上层（深度纠错、取标题）的事。
 *
 * 联网点只有这里。API Key 用户自填，只存在本地数据库，绝不外传、绝不上云。
 */
import { useSettingsStore } from '../stores/settings'
import { useLoadingStore } from '../stores/loading'
import { useSkillLibraryStore } from '../stores/skillLibrary'
import { renderSkill, type RenderedSkill } from '../skills/SkillRenderer'
import { matchSkill } from '../skills/SkillMatcher'
import type { SkillMatchRequest } from '../skills/types'
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
  /** 超时毫秒，默认 30000 */
  timeoutMs?: number
}

/** 解析 endpoint：优先用设置里的 baseUrl，否则回落到厂商默认值。 */
function resolveBase(baseUrl: string, provider: string): string {
  const base = (baseUrl || getDefaultBase(provider)).trim().replace(/\/+$/, '')
  return base || 'https://api.openai.com/v1'
}

export async function chat(messages: ChatMessage[], opts: ChatOptions = {}): Promise<string> {
  const settings = useSettingsStore()
  const cfg = settings.activeConfig
  if (!cfg.apiKey) {
    throw new Error('尚未配置 API Key，请先在「AI 设置」里填写。')
  }

  const loading = useLoadingStore()
  const ctrl = new AbortController()
  const hideLoader = loading.show({
    label: '正在思考…',
    cancellable: true,
    onCancel: () => ctrl.abort(),
  })

  try {
    return await rawChat(messages, opts, ctrl.signal, cfg)
  } finally {
    hideLoader()
  }
}

async function rawChat(
  messages: ChatMessage[],
  opts: ChatOptions,
  signal: AbortSignal,
  cfg: { providerId: string; apiKey: string; model: string; baseUrl?: string; timeoutSeconds?: number },
): Promise<string> {
  const base = resolveBase(cfg.baseUrl || '', cfg.providerId)
  const url = `${base}/chat/completions`
  const model = opts.model || cfg.model || fallbackModel(cfg.providerId)

  const timeoutMs = opts.timeoutMs ?? (cfg.timeoutSeconds || 30) * 1000
  const ctrl = new AbortController()
  const timer = setTimeout(() => ctrl.abort(), timeoutMs)

  // 外部取消与超时共享一个 signal
  const onAbort = () => ctrl.abort()
  signal.addEventListener('abort', onAbort, { once: true })

  let resp: Response
  try {
    resp = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${cfg.apiKey}`,
      },
      body: JSON.stringify({
        model,
        messages,
        temperature: opts.temperature ?? 0.7,
        stream: false,
      }),
      signal: ctrl.signal,
    })
  } catch (e) {
    clearTimeout(timer)
    if (e instanceof DOMException && e.name === 'AbortError') {
      // 先触发 abort 的可能是用户取消，也可能是超时
      if (signal.aborted) {
        throw new Error('请求已取消。')
      }
      throw new Error(`请求超时（${timeoutMs}ms）。请检查网络或接口地址是否可达。`)
    }
    throw e
  } finally {
    signal.removeEventListener('abort', onAbort)
  }
  clearTimeout(timer)

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

/** 渲染一个 Skill，不调用网络。 */
export function renderSkillOnly(skillId: string, vars: Record<string, unknown>): RenderedSkill {
  const lib = useSkillLibraryStore()
  const skill = lib.get(skillId)
  if (!skill) throw new Error('未找到 Skill：' + skillId)
  return renderSkill(skill, vars)
}

/** 运行指定 Skill：渲染 prompt → 调用 AI。 */
export async function runSkill(
  skillId: string,
  vars: Record<string, unknown>,
  opts: ChatOptions = {},
): Promise<string> {
  const { system, user } = renderSkillOnly(skillId, vars)
  const messages: ChatMessage[] = []
  if (system) messages.push({ role: 'system', content: system })
  messages.push({ role: 'user', content: user })
  return chat(messages, opts)
}

/** 按身份+任务自动匹配 Skill 并运行。 */
export async function matchAndRun(
  req: SkillMatchRequest,
  vars: Record<string, unknown> = {},
  opts: ChatOptions = {},
): Promise<{ result: string; skillId: string }> {
  const lib = useSkillLibraryStore()
  const skill = matchSkill(req, lib.getAll())
  if (!skill) throw new Error('没有可用的 Skill，请先在 Skill 管理中检查内置 Skill 是否启用。')
  const merged = { ...vars, selectedText: req.selectedText || '', userText: req.userText || '' }
  const result = await runSkill(skill.id, merged, opts)
  return { result, skillId: skill.id }
}
