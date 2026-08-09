import { defineStore } from 'pinia'
import { ref } from 'vue'

export interface LoadingOptions {
  label?: string
  cancellable?: boolean
  onCancel?: () => void
}

/**
 * 全局加载状态。
 * AI/API 调用、页面跳转等耗时操作期间置为 active，
 * 由 <LoadingOverlay> / <LoaderOverlay> 在界面顶层展示主题化加载动画。
 */
export const useLoadingStore = defineStore('loading', () => {
  const active = ref(false)
  const label = ref('')
  const cancellable = ref(false)
  const startAt = ref(0)
  const cancelFn = ref<(() => void) | undefined>()
  let timer: ReturnType<typeof setTimeout> | null = null

  function show(opts: LoadingOptions = {}) {
    if (timer) {
      clearTimeout(timer)
      timer = null
    }
    label.value = opts.label || ''
    cancellable.value = opts.cancellable ?? false
    cancelFn.value = opts.onCancel
    startAt.value = performance.now()
    active.value = true
    return () => hide()
  }

  function hide() {
    active.value = false
    label.value = ''
    cancellable.value = false
    cancelFn.value = undefined
  }

  function cancel() {
    cancelFn.value?.()
    hide()
  }

  /** 包一层异步函数：开始时显示、结束后隐藏（无论成败）。 */
  async function wrap<T>(text: string, fn: () => Promise<T>): Promise<T> {
    const hideFn = show({ label: text })
    try {
      return await fn()
    } finally {
      hideFn()
    }
  }

  return { active, label, cancellable, startAt, show, hide, cancel, wrap }
})
