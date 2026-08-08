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
  /** 背景图蒙版浓度：0 = 图片完全露出，1 = 完全被底色盖住 */
  const bgVeil = ref<number>(Number(localStorage.getItem('wenzai:bg-veil') ?? '0.62'))
  /** 身份小火苗：标出最近常写的身份，点一下直达上次写到的地方 */
  const flameHint = ref<boolean>(localStorage.getItem('wenzai:flame-hint') !== 'false')

  function applyAttrs() {
    const el = document.documentElement
    el.setAttribute('data-skin', skin.value)
    el.setAttribute('data-mode', mode.value)
    el.setAttribute('data-anim', animations.value ? 'on' : 'off')
    el.style.setProperty('--user-blur', `${blur.value}px`)

    // 自定义背景：图片铺在最底层，上面压一层可调浓度的底色蒙版，
    // 保证正文在任何图片上都读得清。
    if (bgImage.value) {
      el.setAttribute('data-has-bg', 'true')
      el.style.setProperty('--user-bg', `url("${bgImage.value}")`)
      el.style.setProperty('--user-bg-veil', String(bgVeil.value))
    } else {
      el.removeAttribute('data-has-bg')
      el.style.removeProperty('--user-bg')
    }
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

  /**
   * 设置背景图。传 dataURL 存下，传 null 清除。
   * 上传前已在组件里压到 1600px / JPEG，避免撑爆 localStorage。
   */
  function setBgImage(dataUrl: string | null) {
    bgImage.value = dataUrl
    if (dataUrl) localStorage.setItem('wenzai:bg-image', dataUrl)
    else localStorage.removeItem('wenzai:bg-image')
    applyAttrs()
  }

  function setBgVeil(v: number) {
    bgVeil.value = Math.max(0, Math.min(1, v))
    localStorage.setItem('wenzai:bg-veil', String(bgVeil.value))
    applyAttrs()
  }

  function setFlameHint(next: boolean) {
    flameHint.value = next
    localStorage.setItem('wenzai:flame-hint', String(next))
  }

  watch([skin, mode, blur], applyAttrs, { immediate: true })

  return {
    skin,
    mode,
    blur,
    bgImage,
    bgVeil,
    customFont,
    reduceMotion,
    animations,
    flameHint,
    setSkin,
    setMode,
    toggleMode,
    setBlur,
    setAnimations,
    setBgImage,
    setBgVeil,
    setFlameHint,
  }
})
