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
  // 动画总开关：默认开启；关闭后全局动效关闭（含转场/加载/脉冲，仅保留必要淡入）。
  const animations = ref<boolean>(localStorage.getItem('wenzai:animations') !== 'false')

  function applyAttrs() {
    document.documentElement.setAttribute('data-skin', skin.value)
    document.documentElement.setAttribute('data-mode', mode.value)
    document.documentElement.setAttribute('data-anim', animations.value ? 'on' : 'off')
    document.documentElement.style.setProperty('--user-blur', `${blur.value}px`)
  }

  function setAnimations(next: boolean) {
    animations.value = next
    localStorage.setItem('wenzai:animations', String(next))
    applyAttrs()
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
    animations,
    setSkin,
    setMode,
    toggleMode,
    setBlur,
    setAnimations,
  }
})
