import { defineStore } from 'pinia'
import { ref, watch } from 'vue'

export type Skin = 'genshin' | 'star' | 'zenless'
export type Mode = 'day' | 'night'

const SKIN_KEY = 'wenzai:skin'
const MODE_KEY = 'wenzai:mode'

export const useAppearanceStore = defineStore('appearance', () => {
  const skin = ref<Skin>((localStorage.getItem(SKIN_KEY) as Skin) || 'star')
  const mode = ref<Mode>((localStorage.getItem(MODE_KEY) as Mode) || 'night')
  const blur = ref<number>(Number(localStorage.getItem('wenzai:blur') || '12'))
  const bgImage = ref<string | null>(localStorage.getItem('wenzai:bg-image'))
  const customFont = ref<string | null>(localStorage.getItem('wenzai:font'))
  const reduceMotion = ref<boolean>(localStorage.getItem('wenzai:reduce-motion') === 'true')

  function applyAttrs() {
    document.documentElement.setAttribute('data-skin', skin.value)
    document.documentElement.setAttribute('data-mode', mode.value)
    document.documentElement.style.setProperty('--user-blur', `${blur.value}px`)
  }

  function setSkin(next: Skin) {
    skin.value = next
    localStorage.setItem(SKIN_KEY, next)
    applyAttrs()
  }

  function setMode(next: Mode) {
    mode.value = next
    localStorage.setItem(MODE_KEY, next)
    applyAttrs()
  }

  function toggleMode() {
    setMode(mode.value === 'night' ? 'day' : 'night')
  }

  function setBlur(v: number) {
    blur.value = Math.max(0, Math.min(48, v))
    localStorage.setItem('wenzai:blur', String(blur.value))
    applyAttrs()
  }

  watch([skin, mode, blur], applyAttrs, { immediate: true })

  return {
    skin,
    mode,
    blur,
    bgImage,
    customFont,
    reduceMotion,
    setSkin,
    setMode,
    toggleMode,
    setBlur,
  }
})
