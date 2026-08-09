import { defineStore } from 'pinia'
import { ref, watch } from 'vue'
import { open } from '@tauri-apps/plugin-dialog'
import { readFile } from '@tauri-apps/plugin-fs'

export type Skin = 'genshin' | 'star' | 'zenless'
export type Mode = 'day' | 'night'
export type BgFit = 'cover' | 'tile' | 'center'

const SKIN_KEY = 'wenzai:skin'
const MODE_KEY = 'wenzai:mode'

function loadNum(key: string, fallback: number) {
  const v = localStorage.getItem(key)
  return v ? Number(v) : fallback
}

export const useAppearanceStore = defineStore('appearance', () => {
  const skin = ref<Skin>((localStorage.getItem(SKIN_KEY) as Skin) || 'star')
  const mode = ref<Mode>((localStorage.getItem(MODE_KEY) as Mode) || 'night')
  const blur = ref<number>(loadNum('wenzai:blur', 12))
  const bgImage = ref<string | null>(localStorage.getItem('wenzai:bg-image'))
  const bgFit = ref<BgFit>((localStorage.getItem('wenzai:bg-fit') as BgFit) || 'cover')
  const bgOpacity = ref<number>(loadNum('wenzai:bg-opacity', 0.25))
  const glassOpacity = ref<number>(loadNum('wenzai:glass-opacity', 0.2))
  const saturate = ref<number>(loadNum('wenzai:saturate', 120))
  const customFont = ref<string | null>(localStorage.getItem('wenzai:font'))
  const reduceMotion = ref<boolean>(localStorage.getItem('wenzai:reduce-motion') === 'true')
  // 动画总开关：默认开启；关闭后全局动效关闭（含转场/加载/脉冲，仅保留必要淡入）。
  const animations = ref<boolean>(localStorage.getItem('wenzai:animations') !== 'false')

  function applyAttrs() {
    document.documentElement.setAttribute('data-skin', skin.value)
    document.documentElement.setAttribute('data-mode', mode.value)
    document.documentElement.setAttribute('data-anim', animations.value ? 'on' : 'off')
    document.documentElement.style.setProperty('--user-blur', `${blur.value}px`)
    document.documentElement.style.setProperty('--user-bg-opacity', String(bgOpacity.value))
    document.documentElement.style.setProperty('--user-glass-opacity', String(glassOpacity.value))
    document.documentElement.style.setProperty('--user-saturate', `${saturate.value}%`)
    if (customFont.value) {
      document.documentElement.style.setProperty('--font-user-family', `"${customFont.value}"`)
    } else {
      document.documentElement.style.removeProperty('--font-user-family')
    }
    document.documentElement.style.setProperty('--user-bg-image', bgImage.value ? `url("${bgImage.value}")` : 'none')
    document.documentElement.style.setProperty('--user-bg-fit', bgFit.value)
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

  function setBgFit(v: BgFit) {
    bgFit.value = v
    localStorage.setItem('wenzai:bg-fit', v)
    applyAttrs()
  }

  function setBgOpacity(v: number) {
    bgOpacity.value = Math.max(0, Math.min(1, v))
    localStorage.setItem('wenzai:bg-opacity', String(bgOpacity.value))
    applyAttrs()
  }

  function setGlassOpacity(v: number) {
    glassOpacity.value = Math.max(0, Math.min(1, v))
    localStorage.setItem('wenzai:glass-opacity', String(glassOpacity.value))
    applyAttrs()
  }

  function setSaturate(v: number) {
    saturate.value = Math.max(100, Math.min(200, v))
    localStorage.setItem('wenzai:saturate', String(saturate.value))
    applyAttrs()
  }

  function setCustomFont(v: string | null) {
    customFont.value = v
    if (v) localStorage.setItem('wenzai:font', v)
    else localStorage.removeItem('wenzai:font')
    applyAttrs()
  }

  function setBgImage(v: string | null) {
    bgImage.value = v
    if (v) localStorage.setItem('wenzai:bg-image', v)
    else localStorage.removeItem('wenzai:bg-image')
    applyAttrs()
  }

  async function pickBgImage() {
    try {
      const selected = await open({
        multiple: false,
        directory: false,
        filters: [
          { name: '图片', extensions: ['png', 'jpg', 'jpeg', 'webp', 'gif', 'bmp'] },
        ],
      })
      if (!selected || Array.isArray(selected)) return
      const path = selected as string
      const bytes = await readFile(path)
      const blob = new Blob([bytes])
      const dataUrl = await new Promise<string>((resolve) => {
        const reader = new FileReader()
        reader.onloadend = () => resolve(reader.result as string)
        reader.readAsDataURL(blob)
      })
      setBgImage(dataUrl)
    } catch (e) {
      // eslint-disable-next-line no-console
      console.error('选择背景图失败', e)
    }
  }

  watch([skin, mode, blur, customFont, bgImage, bgFit, bgOpacity, glassOpacity, saturate], applyAttrs, { immediate: true })

  return {
    skin,
    mode,
    blur,
    bgImage,
    bgFit,
    bgOpacity,
    glassOpacity,
    saturate,
    customFont,
    reduceMotion,
    animations,
    setSkin,
    setMode,
    toggleMode,
    setBlur,
    setBgFit,
    setBgOpacity,
    setGlassOpacity,
    setSaturate,
    setAnimations,
    setCustomFont,
    setBgImage,
    pickBgImage,
  }
})
