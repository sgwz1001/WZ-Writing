/**
 * 全局设置层（持久化到 Rust 侧 SQLite）
 *
 * 目前主要承载「大模型接入」配置：provider / baseUrl / apiKey / model。
 * 用单个 JSON 字段 `ai.config` 存储，读写都简单。
 */
import { defineStore } from 'pinia'
import { reactive, ref, watch } from 'vue'
import { invoke } from '@tauri-apps/api/core'

export interface AiConfig {
  provider: string
  baseUrl: string
  apiKey: string
  model: string
}

const KEY = 'ai.config'

const DEFAULT: AiConfig = {
  provider: 'deepseek',
  baseUrl: '',
  apiKey: '',
  model: '',
}

export const useSettingsStore = defineStore('settings', () => {
  const ai = reactive<AiConfig>({ ...DEFAULT })
  const loaded = ref(false)

  async function load() {
    try {
      const raw = await invoke<string | null>('get_setting', { key: KEY })
      if (raw) {
        const parsed = JSON.parse(raw)
        Object.assign(ai, { ...DEFAULT, ...parsed })
      }
    } catch {
      /* 首次运行无配置，保持默认 */
    }
    loaded.value = true
  }

  async function save() {
    try {
      await invoke('set_setting', { key: KEY, value: JSON.stringify(ai) })
    } catch {
      /* 保存失败不应打断写作，记日志即可（由 Rust 侧负责） */
    }
  }

  watch(ai, () => {
    if (loaded.value) save()
  }, { deep: true })

  return { ai, loaded, load, save }
})
