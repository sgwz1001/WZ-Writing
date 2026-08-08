/**
 * 大模型提供商与型号清单（2026-08 核实版）
 *
 * 统一按「OpenAI 兼容」的 /chat/completions 协议对接 —— 目前国内主流厂商
 * （DeepSeek、通义百炼、智谱、Kimi、豆包方舟、千帆、MiniMax、百川、零一、Gemini）
 * 都提供了 OpenAI 兼容网关，前端只写一套适配层即可。
 *
 * 用户自填 API Key；baseUrl 给默认值但允许覆盖（自建网关 / 第三方中转）。
 *
 * ⚠️ 已下线模型清理记录（2026-07 ~ 2026-08）：
 *  - DeepSeek：deepseek-chat / deepseek-reasoner 于 2026-07-24 停止服务，
 *    全量迁移至 deepseek-v4-pro / deepseek-v4-flash。
 *    baseUrl 官方为 https://api.deepseek.com（旧版误写 /v1 会 404）。
 *  - 智谱：glm-4-plus / glm-4-air / glm-4-flash 退役，现役为 GLM-5 / 4.7 系。
 *  - 豆包：doubao-pro-32k / lite-32k 退役，现役为 doubao-seed-2.x 系（带日期后缀）。
 *  - 通义：qwen-max / qwen-turbo / qwen2.5-* 退役，现役为 qwen3-max / qwen3.6 系。
 *  - Kimi：moonshot-v1-* / kimi-k2 退役，现役为 kimi-k3 / k2.7 / k2.6。
 *  - MiniMax：abab6.5 系退役，现役为 MiniMax-M2.5。
 */

export interface ModelInfo {
  id: string
  label: string
  /** 上下文窗口描述，展示用 */
  ctx?: string
  /** 能力标签：推理 / 快速 / 长文 / 免费 / 视觉 */
  tags?: string[]
  /** 一句话定位，鼠标悬停展示 */
  desc?: string
}

export interface ProviderInfo {
  id: string
  name: string
  /** OpenAI 兼容的默认 baseUrl（不含末尾 /chat/completions） */
  baseUrl: string
  /** 获取 API Key 的控制台地址 */
  console?: string
  /** 提供商备注（写作场景适配建议） */
  note?: string
  models: ModelInfo[]
}

export const PROVIDERS: ProviderInfo[] = [
  {
    id: 'deepseek',
    name: 'DeepSeek 深度求索',
    baseUrl: 'https://api.deepseek.com',
    console: 'https://platform.deepseek.com/api_keys',
    note: '中文写作性价比首选。V4 系为当前在役模型，旧的 deepseek-chat / deepseek-reasoner 已于 2026-07-24 下线。',
    models: [
      {
        id: 'deepseek-v4-flash',
        label: 'DeepSeek-V4-Flash',
        ctx: '128K',
        tags: ['快速', '低价'],
        desc: '非思考模式，响应快，适合续写、改写、取标题等高频轻任务',
      },
      {
        id: 'deepseek-v4-pro',
        label: 'DeepSeek-V4-Pro',
        ctx: '128K',
        tags: ['推理', '深度'],
        desc: '思考模式，适合大纲推演、逻辑校对、深度润色',
      },
    ],
  },
  {
    id: 'glm',
    name: '智谱 GLM',
    baseUrl: 'https://open.bigmodel.cn/api/paas/v4',
    console: 'https://bigmodel.cn/usercenter/apikeys',
    note: '文风偏文雅，古典诗词与公文场景表现好。glm-4.7-flash 免费额度充足，适合本地纠错。',
    models: [
      {
        id: 'glm-5.2',
        label: 'GLM-5.2',
        ctx: '1M',
        tags: ['旗舰', '超长文'],
        desc: '百万上下文，可整本小说通读做一致性校对',
      },
      { id: 'glm-5.1', label: 'GLM-5.1', ctx: '256K', tags: ['旗舰'] },
      { id: 'glm-5', label: 'GLM-5', ctx: '256K', tags: ['通用'] },
      { id: 'glm-5-turbo', label: 'GLM-5-Turbo', ctx: '128K', tags: ['快速'] },
      { id: 'glm-4.7', label: 'GLM-4.7', ctx: '128K', tags: ['通用'] },
      {
        id: 'glm-4.7-flash',
        label: 'GLM-4.7-Flash',
        ctx: '128K',
        tags: ['免费', '快速'],
        desc: '官方免费，推荐作为默认纠错模型',
      },
      { id: 'glm-4.6', label: 'GLM-4.6', ctx: '128K', tags: ['稳定'] },
      { id: 'glm-4.5-air', label: 'GLM-4.5-Air', ctx: '128K', tags: ['轻量'] },
    ],
  },
  {
    id: 'doubao',
    name: '豆包 Doubao（火山方舟）',
    baseUrl: 'https://ark.cn-beijing.volces.com/api/v3',
    console: 'https://console.volcengine.com/ark',
    note: '方舟平台需先「开通模型」并可能需创建推理接入点；模型 ID 带日期后缀，务必与控制台一致。',
    models: [
      {
        id: 'doubao-seed-2-1-pro-260628',
        label: 'Doubao-Seed-2.1-Pro',
        ctx: '256K',
        tags: ['旗舰'],
        desc: '当前主力，长文续写稳定',
      },
      {
        id: 'doubao-seed-2-1-turbo-260628',
        label: 'Doubao-Seed-2.1-Turbo',
        ctx: '256K',
        tags: ['快速'],
      },
      {
        id: 'doubao-seed-2-0-pro-260215',
        label: 'Doubao-Seed-2.0-Pro',
        ctx: '256K',
        tags: ['稳定'],
      },
      {
        id: 'doubao-seed-2-0-lite-260215',
        label: 'Doubao-Seed-2.0-Lite',
        ctx: '256K',
        tags: ['低价'],
      },
      {
        id: 'doubao-seed-2-0-mini-260215',
        label: 'Doubao-Seed-2.0-Mini',
        ctx: '128K',
        tags: ['极速'],
      },
      { id: 'doubao-seed-1-6', label: 'Doubao-Seed-1.6', ctx: '256K', tags: ['兼容'] },
    ],
  },
  {
    id: 'qwen',
    name: '通义千问 Qwen（阿里百炼）',
    baseUrl: 'https://dashscope.aliyuncs.com/compatible-mode/v1',
    console: 'https://bailian.console.aliyun.com/?apiKey=1',
    note: '百炼与千问同一套 Key。qwen-long 支持超长文档，适合整书审校。',
    models: [
      {
        id: 'qwen3-max',
        label: 'Qwen3-Max',
        ctx: '256K',
        tags: ['旗舰'],
        desc: '万亿参数级，复杂结构化写作最强',
      },
      { id: 'qwen3.6-plus', label: 'Qwen3.6-Plus', ctx: '256K', tags: ['均衡'] },
      { id: 'qwen3.6-flash', label: 'Qwen3.6-Flash', ctx: '128K', tags: ['快速', '低价'] },
      { id: 'qwen-plus', label: 'Qwen-Plus（滚动版）', ctx: '128K', tags: ['稳定'] },
      { id: 'qwen-flash', label: 'Qwen-Flash（滚动版）', ctx: '128K', tags: ['快速'] },
      {
        id: 'qwen-long',
        label: 'Qwen-Long',
        ctx: '10M',
        tags: ['超长文'],
        desc: '千万字级上下文，整本书一致性检查',
      },
    ],
  },
  {
    id: 'kimi',
    name: '月之暗面 Kimi',
    baseUrl: 'https://api.moonshot.cn/v1',
    console: 'https://platform.moonshot.cn/console/api-keys',
    note: '长文理解与资料整合见长，纪实 / 学术场景推荐。海外站点为 api.moonshot.ai。',
    models: [
      {
        id: 'kimi-k3',
        label: 'Kimi-K3',
        ctx: '1M',
        tags: ['旗舰', '推理'],
        desc: '当前最强，自带思考链',
      },
      { id: 'kimi-k2.6', label: 'Kimi-K2.6', ctx: '256K', tags: ['通用', '视觉'] },
      { id: 'kimi-k2.7-code', label: 'Kimi-K2.7-Code', ctx: '256K', tags: ['结构化'] },
    ],
  },
  {
    id: 'openai',
    name: 'OpenAI',
    baseUrl: 'https://api.openai.com/v1',
    console: 'https://platform.openai.com/api-keys',
    note: '国内直连需自备网络环境，或改填第三方中转 baseUrl。',
    models: [
      { id: 'gpt-5.1', label: 'GPT-5.1', ctx: '400K', tags: ['旗舰'] },
      { id: 'gpt-5.1-mini', label: 'GPT-5.1-mini', ctx: '400K', tags: ['快速'] },
      { id: 'gpt-4.1', label: 'GPT-4.1', ctx: '1M', tags: ['长文'] },
      { id: 'gpt-4o', label: 'GPT-4o', ctx: '128K', tags: ['兼容'] },
    ],
  },
  {
    id: 'qianfan',
    name: '百度千帆 ERNIE',
    baseUrl: 'https://qianfan.baidubce.com/v2',
    console: 'https://console.bce.baidu.com/iam/#/iam/apikey/list',
    models: [
      { id: 'ernie-5.0', label: 'ERNIE-5.0', ctx: '128K', tags: ['旗舰'] },
      { id: 'ernie-4.5-turbo-128k', label: 'ERNIE-4.5-Turbo-128K', ctx: '128K', tags: ['均衡'] },
      { id: 'ernie-speed-128k', label: 'ERNIE-Speed-128K', ctx: '128K', tags: ['免费'] },
    ],
  },
  {
    id: 'minimax',
    name: 'MiniMax',
    baseUrl: 'https://api.minimax.chat/v1',
    console: 'https://platform.minimaxi.com/user-center/basic-information',
    note: '对话与人设扮演见长，适合小说人物对白打磨。',
    models: [{ id: 'MiniMax-M2.5', label: 'MiniMax-M2.5', ctx: '1M', tags: ['旗舰', '长文'] }],
  },
  {
    id: 'baichuan',
    name: '百川 Baichuan',
    baseUrl: 'https://api.baichuan-ai.com/v1',
    console: 'https://platform.baichuan-ai.com/console/apikey',
    models: [{ id: 'baichuan3-turbo', label: 'Baichuan3-Turbo', ctx: '32K', tags: ['通用'] }],
  },
  {
    id: 'gemini',
    name: 'Google Gemini',
    baseUrl: 'https://generativelanguage.googleapis.com/v1beta/openai/',
    console: 'https://aistudio.google.com/apikey',
    note: '国内直连需自备网络环境。',
    models: [
      { id: 'gemini-3-pro', label: 'Gemini-3-Pro', ctx: '2M', tags: ['旗舰', '超长文'] },
      { id: 'gemini-3-flash', label: 'Gemini-3-Flash', ctx: '1M', tags: ['快速'] },
      { id: 'gemini-2.5-pro', label: 'Gemini-2.5-Pro', ctx: '1M', tags: ['兼容'] },
    ],
  },
  {
    id: 'custom',
    name: '自定义 / 中转网关',
    baseUrl: '',
    note: '任何 OpenAI 兼容网关（one-api / new-api / 硅基流动 / 自建 vLLM）都可以填在这里，模型名手动输入。',
    models: [],
  },
]

export function getProvider(id: string): ProviderInfo | undefined {
  return PROVIDERS.find((p) => p.id === id)
}

export function getDefaultBase(id: string): string {
  return getProvider(id)?.baseUrl ?? ''
}

export function getDefaultModel(id: string): string {
  return getProvider(id)?.models[0]?.id ?? ''
}

export function getModelInfo(providerId: string, modelId: string): ModelInfo | undefined {
  return getProvider(providerId)?.models.find((m) => m.id === modelId)
}

/**
 * 旧模型 ID → 新模型 ID 的迁移表。
 * 用户升级软件后，配置里存的老模型会被自动改写，避免「明明填了 Key 却 404」。
 */
export const LEGACY_MODEL_MAP: Record<string, { provider: string; model: string }> = {
  'deepseek-chat': { provider: 'deepseek', model: 'deepseek-v4-flash' },
  'deepseek-reasoner': { provider: 'deepseek', model: 'deepseek-v4-pro' },
  'glm-4-plus': { provider: 'glm', model: 'glm-5' },
  'glm-4-air': { provider: 'glm', model: 'glm-4.5-air' },
  'glm-4-flash': { provider: 'glm', model: 'glm-4.7-flash' },
  'doubao-pro-32k': { provider: 'doubao', model: 'doubao-seed-2-1-pro-260628' },
  'doubao-lite-32k': { provider: 'doubao', model: 'doubao-seed-2-0-lite-260215' },
  'qwen-max': { provider: 'qwen', model: 'qwen3-max' },
  'qwen-turbo': { provider: 'qwen', model: 'qwen-flash' },
  'qwen2.5-72b-instruct': { provider: 'qwen', model: 'qwen3.6-plus' },
  'kimi-k2': { provider: 'kimi', model: 'kimi-k3' },
  'moonshot-v1-8k': { provider: 'kimi', model: 'kimi-k2.6' },
  'moonshot-v1-32k': { provider: 'kimi', model: 'kimi-k2.6' },
  'abab6.5s-chat': { provider: 'minimax', model: 'MiniMax-M2.5' },
  'abab6.5t-chat': { provider: 'minimax', model: 'MiniMax-M2.5' },
  'ernie-4.0-8k': { provider: 'qianfan', model: 'ernie-5.0' },
  'ernie-speed-8k': { provider: 'qianfan', model: 'ernie-speed-128k' },
  'gemini-1.5-pro': { provider: 'gemini', model: 'gemini-3-pro' },
  'gemini-1.5-flash': { provider: 'gemini', model: 'gemini-3-flash' },
  'gpt-4o-mini': { provider: 'openai', model: 'gpt-5.1-mini' },
  'o3-mini': { provider: 'openai', model: 'gpt-5.1-mini' },
  'gpt-4-turbo': { provider: 'openai', model: 'gpt-4.1' },
  'yi-large': { provider: 'glm', model: 'glm-5' },
  'yi-medium': { provider: 'glm', model: 'glm-4.7' },
}

/** 旧 baseUrl → 新 baseUrl 修正（主要修 DeepSeek 多写的 /v1） */
export const LEGACY_BASE_MAP: Record<string, string> = {
  'https://api.deepseek.com/v1': 'https://api.deepseek.com',
  'https://api.lingyiwanwu.com/v1': 'https://open.bigmodel.cn/api/paas/v4',
}

/**
 * 迁移一份旧配置到当前在役模型。
 * @returns 迁移结果；changed 为 true 时说明发生了改写，UI 应提示用户。
 */
export function migrateModelConfig(cfg: { provider?: string; model?: string; baseUrl?: string }): {
  provider: string
  model: string
  baseUrl: string
  changed: boolean
  reason: string
} {
  let provider = cfg.provider || 'deepseek'
  let model = cfg.model || ''
  let baseUrl = cfg.baseUrl || ''
  let changed = false
  const reasons: string[] = []

  // 1) 已下线的提供商整体迁走
  if (!getProvider(provider)) {
    reasons.push(`提供商 ${provider} 已不在清单中`)
    provider = 'deepseek'
    model = ''
    baseUrl = ''
    changed = true
  }

  // 2) 老模型改写
  const hit = LEGACY_MODEL_MAP[model]
  if (hit) {
    reasons.push(`${model} 已下线，已切换为 ${hit.model}`)
    provider = hit.provider
    model = hit.model
    baseUrl = ''
    changed = true
  }

  // 3) baseUrl 修正
  if (baseUrl && LEGACY_BASE_MAP[baseUrl]) {
    reasons.push('接口地址已按官方文档修正')
    baseUrl = LEGACY_BASE_MAP[baseUrl]
    changed = true
  }

  // 4) 模型不属于当前提供商 → 回落到该提供商首个模型
  const p = getProvider(provider)
  if (p && p.id !== 'custom' && p.models.length && !p.models.some((m) => m.id === model)) {
    reasons.push(`${model || '(空)'} 不在 ${p.name} 的在役清单中，已改为 ${p.models[0].label}`)
    model = p.models[0].id
    changed = true
  }

  if (!baseUrl) baseUrl = getDefaultBase(provider)

  return { provider, model, baseUrl, changed, reason: reasons.join('；') }
}
