/**
 * 大模型提供商与型号清单
 *
 * 统一按「OpenAI 兼容」的 /chat/completions 协议对接 —— 目前国内主流厂商
 * （DeepSeek、通义、智谱、Kimi、豆包、千帆、MiniMax、百川、零一、Gemini）
 * 都提供了 OpenAI 兼容网关，前端只写一套适配层即可。
 *
 * 用户自填 API Key；baseUrl 给默认值但允许覆盖（自建网关 / 第三方中转）。
 */

export interface ModelInfo {
  id: string
  label: string
}

export interface ProviderInfo {
  id: string
  name: string
  /** OpenAI 兼容的默认 baseUrl（不含末尾 /chat/completions） */
  baseUrl: string
  models: ModelInfo[]
}

export const PROVIDERS: ProviderInfo[] = [
  {
    id: 'deepseek',
    name: 'DeepSeek',
    baseUrl: 'https://api.deepseek.com/v1',
    models: [
      { id: 'deepseek-chat', label: 'DeepSeek-V3 (deepseek-chat)' },
      { id: 'deepseek-reasoner', label: 'DeepSeek-R1 (deepseek-reasoner)' },
    ],
  },
  {
    id: 'openai',
    name: 'OpenAI',
    baseUrl: 'https://api.openai.com/v1',
    models: [
      { id: 'gpt-4o', label: 'GPT-4o' },
      { id: 'gpt-4o-mini', label: 'GPT-4o mini' },
      { id: 'o3-mini', label: 'o3-mini' },
      { id: 'gpt-4-turbo', label: 'GPT-4 Turbo' },
    ],
  },
  {
    id: 'qwen',
    name: '通义千问 Qwen',
    baseUrl: 'https://dashscope.aliyuncs.com/compatible-mode/v1',
    models: [
      { id: 'qwen-max', label: 'Qwen-Max' },
      { id: 'qwen-plus', label: 'Qwen-Plus' },
      { id: 'qwen-turbo', label: 'Qwen-Turbo' },
      { id: 'qwen2.5-72b-instruct', label: 'Qwen2.5-72B' },
    ],
  },
  {
    id: 'glm',
    name: '智谱 GLM',
    baseUrl: 'https://open.bigmodel.cn/api/paas/v4',
    models: [
      { id: 'glm-4-plus', label: 'GLM-4-Plus' },
      { id: 'glm-4-air', label: 'GLM-4-Air' },
      { id: 'glm-4-flash', label: 'GLM-4-Flash (免费)' },
    ],
  },
  {
    id: 'kimi',
    name: '月之暗面 Kimi',
    baseUrl: 'https://api.moonshot.cn/v1',
    models: [
      { id: 'kimi-k2', label: 'Kimi-K2' },
      { id: 'moonshot-v1-32k', label: 'Moonshot-v1-32K' },
      { id: 'moonshot-v1-8k', label: 'Moonshot-v1-8K' },
    ],
  },
  {
    id: 'doubao',
    name: '豆包 Doubao',
    baseUrl: 'https://ark.cn-beijing.volces.com/api/v3',
    models: [
      { id: 'doubao-pro-32k', label: 'Doubao-Pro-32K' },
      { id: 'doubao-lite-32k', label: 'Doubao-Lite-32K' },
    ],
  },
  {
    id: 'qianfan',
    name: '百度千帆 ERNIE',
    baseUrl: 'https://qianfan.baidubce.com/v2',
    models: [
      { id: 'ernie-4.0-8k', label: 'ERNIE-4.0-8K' },
      { id: 'ernie-speed-8k', label: 'ERNIE-Speed-8K (免费)' },
    ],
  },
  {
    id: 'minimax',
    name: 'MiniMax',
    baseUrl: 'https://api.minimax.chat/v1',
    models: [
      { id: 'abab6.5s-chat', label: 'ABAB6.5S' },
      { id: 'abab6.5t-chat', label: 'ABAB6.5T' },
    ],
  },
  {
    id: 'baichuan',
    name: '百川 Baichuan',
    baseUrl: 'https://api.baichuan-ai.com/v1',
    models: [{ id: 'baichuan3-turbo', label: 'Baichuan3-Turbo' }],
  },
  {
    id: 'yi',
    name: '零一万物 Yi',
    baseUrl: 'https://api.lingyiwanwu.com/v1',
    models: [
      { id: 'yi-large', label: 'Yi-Large' },
      { id: 'yi-medium', label: 'Yi-Medium' },
    ],
  },
  {
    id: 'gemini',
    name: 'Google Gemini',
    baseUrl: 'https://generativelanguage.googleapis.com/v1beta/openai/',
    models: [
      { id: 'gemini-1.5-pro', label: 'Gemini-1.5-Pro' },
      { id: 'gemini-1.5-flash', label: 'Gemini-1.5-Flash' },
    ],
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
