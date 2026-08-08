import { defineStore } from 'pinia'
import { ref } from 'vue'

/**
 * 全局加载状态。
 * AI/API 调用、页面跳转等耗时操作期间置为 active，
 * 由 <LoadingOverlay> 在界面顶层展示主题化加载动画。
 */
export const useLoadingStore = defineStore('loading', () => {
  const active = ref(false)
  const label = ref('')
  let timer: ReturnType<typeof setTimeout> | null = null

  function show(text = '') {
    if (timer) {
      clearTimeout(timer)
      timer = null
    }
    label.value = text
    active.value = true
  }

  function hide() {
    active.value = false
    label.value = ''
  }

  /** 包一层异步函数：开始时显示、结束后隐藏（无论成败）。 */
  async function wrap<T>(text: string, fn: () => Promise<T>): Promise<T> {
    show(text)
    try {
      return await fn()
    } finally {
      hide()
    }
  }

  return { active, label, show, hide, wrap }
})
