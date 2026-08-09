/**
 * 全局设置层（持久化到 Rust 侧 SQLite）
 *
 * 目前主要承载「大模型接入」配置：provider / baseUrl / apiKey / model。
 * 用单个 JSON 字段 `ai.config` 存储，读写都简单。
 */
import { defineStore } from 'pinia'
import { computed, reactive, ref, watch } from 'vue'
import { invoke } from '@tauri-apps/api/core'

export interface AiProviderConfig {
  id: string
  providerId: string
  name: string
  apiKey: string
  model: string
  baseUrl?: string
  temperature: number
  maxTokens: number
  timeoutSeconds: number
  contextRounds: number
  isDefault: boolean
}

/** @deprecated 旧版单配置，仅用于迁移 */
export interface AiConfig {
  provider: string
  baseUrl: string
  apiKey: string
  model: string
}

export interface EditorSettings {
  /** 撤销历史最大步数（以当前为锚点） */
  historyDepth: number
  /** 默认字号 px */
  defaultFontSize: number
  /** 默认行高 */
  defaultLineHeight: number
  /** 默认段距 px */
  defaultParagraphSpacing: number
  /** 默认首行缩进 em */
  defaultFirstLineIndent: number
}

const AI_KEY = 'ai.config'
const AI_CONFIGS_KEY = 'ai.configs'
const EDITOR_KEY = 'editor.settings'

const EDITOR_DEFAULT: EditorSettings = {
  historyDepth: 120,
  defaultFontSize: 17,
  defaultLineHeight: 1.9,
  defaultParagraphSpacing: 20,
  defaultFirstLineIndent: 2,
}

function makeDefaultConfig(): AiProviderConfig {
  return {
    id: 'default',
    providerId: 'deepseek',
    name: 'DeepSeek',
    apiKey: '',
    model: 'deepseek-chat',
    baseUrl: '',
    temperature: 0.7,
    maxTokens: 2048,
    timeoutSeconds: 30,
    contextRounds: 6,
    isDefault: true,
  }
}

export const useSettingsStore = defineStore('settings', () => {
  const ai = reactive<{
    configs: AiProviderConfig[]
    activeConfigId: string | null
    /** @deprecated */
    provider?: string
    /** @deprecated */
    baseUrl?: string
    /** @deprecated */
    apiKey?: string
    /** @deprecated */
    model?: string
  }>({
    configs: [makeDefaultConfig()],
    activeConfigId: 'default',
  })
  const editor = reactive<EditorSettings>({ ...EDITOR_DEFAULT })
  const loaded = ref(false)

  const activeConfig = computed(() => {
    return ai.configs.find((c) => c.id === ai.activeConfigId) ?? ai.configs[0] ?? makeDefaultConfig()
  })

  async function load() {
    // 先尝试读取新版多配置
    try {
      const raw = await invoke<string | null>('get_setting', { key: AI_CONFIGS_KEY })
      if (raw) {
        const parsed = JSON.parse(raw)
        if (parsed.configs && Array.isArray(parsed.configs)) {
          ai.configs = parsed.configs
          ai.activeConfigId = parsed.activeConfigId ?? parsed.configs[0]?.id ?? 'default'
        }
      } else {
        // 回退到旧版单配置并迁移
        const rawAi = await invoke<string | null>('get_setting', { key: AI_KEY })
        if (rawAi) {
          const old: AiConfig = JSON.parse(rawAi)
          const migrated: AiProviderConfig = {
            ...makeDefaultConfig(),
            providerId: old.provider || 'deepseek',
            name: getProviderName(old.provider || 'deepseek'),
            apiKey: old.apiKey,
            model: old.model || 'deepseek-chat',
            baseUrl: old.baseUrl || '',
          }
          ai.configs = [migrated]
          ai.activeConfigId = migrated.id
        }
      }
    } catch {
      /* 首次运行无配置，保持默认 */
    }

    try {
      const rawEditor = await invoke<string | null>('get_setting', { key: EDITOR_KEY })
      if (rawEditor) {
        const parsed = JSON.parse(rawEditor)
        Object.assign(editor, { ...EDITOR_DEFAULT, ...parsed })
      }
    } catch {
      /* 忽略 */
    }

    loaded.value = true
  }

  async function saveAiConfigs() {
    try {
      await invoke('set_setting', {
        key: AI_CONFIGS_KEY,
        value: JSON.stringify({ configs: ai.configs, activeConfigId: ai.activeConfigId }),
      })
    } catch {
      /* 保存失败不应打断写作 */
    }
  }

  async function saveEditor() {
    try {
      await invoke('set_setting', { key: EDITOR_KEY, value: JSON.stringify(editor) })
    } catch {
      /* 忽略 */
    }
  }

  watch(ai, () => {
    if (loaded.value) saveAiConfigs()
  }, { deep: true })

  watch(editor, () => {
    if (loaded.value) saveEditor()
  }, { deep: true })

  return { ai, editor, loaded, activeConfig, load }
})

function getProviderName(id: string): string {
  const map: Record<string, string> = {
    deepseek: 'DeepSeek',
    openai: 'OpenAI',
    qwen: '通义千问',
    glm: '智谱 GLM',
    kimi: 'Kimi',
    doubao: '豆包',
    qianfan: '百度千帆',
    minimax: 'MiniMax',
    baichuan: '百川',
    yi: '零一万物',
    gemini: 'Google Gemini',
    custom: '自定义',
  }
  return map[id] || id
}
