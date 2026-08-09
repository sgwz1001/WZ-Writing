import { PROVIDERS as BASE_PROVIDERS } from './models'

export interface AiModelDefinition {
  id: string
  name: string
  description: string
  tags: string[]
  contextWindow: number
  recommended?: boolean
}

export interface AiProviderDefinition {
  id: string
  name: string
  icon: string
  defaultBaseUrl: string
  defaultModel: string
  models: AiModelDefinition[]
}

const TAGS: Record<string, string> = {
  reasoning: '推理',
  general: '通用',
  writing: '写作',
  cheap: '性价比',
  free: '免费',
}

function deriveTags(modelId: string): string[] {
  const id = modelId.toLowerCase()
  const tags: string[] = []
  if (id.includes('reasoner') || id.includes('o3') || id.includes('k2')) tags.push(TAGS.reasoning)
  if (id.includes('flash') || id.includes('speed') || id.includes('lite')) tags.push(TAGS.cheap)
  if (id.includes('free')) tags.push(TAGS.free)
  if (id.includes('turbo')) tags.push(TAGS.cheap)
  if (tags.length === 0) tags.push(TAGS.general)
  if (id.includes('chat') || id.includes('plus') || id.includes('pro')) tags.push(TAGS.writing)
  return tags
}

function deriveDesc(modelId: string): string {
  const id = modelId.toLowerCase()
  if (id.includes('reasoner') || id.includes('o3') || id.includes('k2')) return '擅长长思维链与复杂推理'
  if (id.includes('flash') || id.includes('speed') || id.includes('lite')) return '响应快、成本低'
  if (id.includes('pro') || id.includes('max')) return '旗舰模型，综合能力最强'
  return '均衡可靠，适合日常写作'
}

export const AI_PROVIDERS: AiProviderDefinition[] = BASE_PROVIDERS.map((p) => ({
  id: p.id,
  name: p.name,
  icon: '',
  defaultBaseUrl: p.baseUrl,
  defaultModel: p.models[0]?.id || '',
  models: p.models.map((m, idx) => ({
    id: m.id,
    name: m.label,
    description: deriveDesc(m.id),
    tags: deriveTags(m.id),
    contextWindow: 8192,
    recommended: idx === 0,
  })),
}))

// 补充「自定义」厂商
AI_PROVIDERS.push({
  id: 'custom',
  name: '自定义',
  icon: '',
  defaultBaseUrl: '',
  defaultModel: '',
  models: [
    {
      id: 'custom',
      name: '自定义模型',
      description: '手动填写模型 ID',
      tags: ['自定义'],
      contextWindow: 8192,
      recommended: true,
    },
  ],
})

export function getAiProvider(id: string): AiProviderDefinition | undefined {
  return AI_PROVIDERS.find((p) => p.id === id)
}
