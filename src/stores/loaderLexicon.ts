import { defineStore } from 'pinia'
import { computed, ref, watch } from 'vue'
import { BUILTIN_LOADER_WORDS, CATEGORY_LABELS, type LoaderWord, type LoaderWordCategory } from '../data/loaderLexicon'

const KEY = 'wenzai:loader-lexicon'

export const useLoaderLexiconStore = defineStore('loaderLexicon', () => {
  const words = ref<LoaderWord[]>([...BUILTIN_LOADER_WORDS])
  const enabledCategories = ref<LoaderWordCategory[]>([
    'literature',
    'linguistics',
    'philology',
    'phonology',
    'statistics',
  ])
  const rotationMs = ref<number>(Number(localStorage.getItem('wenzai:loader-rotation-ms') || '1600'))

  const activeWords = computed(() =>
    words.value.filter((w) => w.enabled && enabledCategories.value.includes(w.category)),
  )

  function load() {
    try {
      const raw = localStorage.getItem(KEY)
      if (raw) {
        const parsed = JSON.parse(raw)
        if (parsed.enabledCategories) enabledCategories.value = parsed.enabledCategories
        if (typeof parsed.rotationMs === 'number') rotationMs.value = parsed.rotationMs
        // 合并自定义词（预置词以代码为准，避免旧版本字段冲突）
        const customs: LoaderWord[] = (parsed.customWords || []).filter((w: LoaderWord) => !w.builtin)
        words.value = [...BUILTIN_LOADER_WORDS, ...customs]
      }
    } catch {
      // 首次使用或解析失败，保持默认
    }
  }

  function save() {
    try {
      const payload = {
        enabledCategories: enabledCategories.value,
        rotationMs: rotationMs.value,
        customWords: words.value.filter((w) => !w.builtin),
      }
      localStorage.setItem(KEY, JSON.stringify(payload))
    } catch {
      // 保存失败不中断体验
    }
  }

  function addWord(text: string, category: LoaderWordCategory) {
    const t = text.trim()
    if (!t) return
    words.value.push({
      id: `custom-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
      text: t,
      category,
      enabled: true,
      builtin: false,
    })
    save()
  }

  function removeWord(id: string) {
    words.value = words.value.filter((w) => w.id !== id)
    save()
  }

  function setRotationMs(v: number) {
    rotationMs.value = Math.max(600, Math.min(5000, v))
    localStorage.setItem('wenzai:loader-rotation-ms', String(rotationMs.value))
    save()
  }

  watch([enabledCategories, words], save, { deep: true })

  load()

  return {
    words,
    enabledCategories,
    rotationMs,
    activeWords,
    categoryLabels: CATEGORY_LABELS,
    addWord,
    removeWord,
    setRotationMs,
  }
})
