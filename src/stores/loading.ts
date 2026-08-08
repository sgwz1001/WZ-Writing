import { defineStore } from 'pinia'
import { ref } from 'vue'

/**
 * 全局加载状态。
 * AI/API 调用、页面跳转等耗时操作期间置为 active，
 * 由 <LoadingOverlay> 在界面顶层展示主题化加载动画。
 *
 * v0.4.0 修复「整页频闪」：
 *  1. 延迟显示（DELAY）—— 200ms 内完成的操作（绝大多数路由跳转）根本不弹遮罩，
 *     从源头消灭「一闪而过的全屏蒙层」。
 *  2. 最短驻留（MIN_VISIBLE）—— 一旦显示，至少停留 400ms，避免刚出现就消失造成的闪动。
 *  3. 安全兜底（MAX_ALIVE）—— 任何情况下 20s 后强制关闭，杜绝卡死遮罩。
 */
const DELAY = 200
const MIN_VISIBLE = 400
const MAX_ALIVE = 20000

export const useLoadingStore = defineStore('loading', () => {
  const active = ref(false)
  const label = ref('')

  let delayTimer: ReturnType<typeof setTimeout> | null = null
  let safetyTimer: ReturnType<typeof setTimeout> | null = null
  let shownAt = 0
  /** 并发计数：多个异步任务同时进行时，只有全部结束才收起遮罩 */
  let depth = 0

  function clearTimers() {
    if (delayTimer) {
      clearTimeout(delayTimer)
      delayTimer = null
    }
    if (safetyTimer) {
      clearTimeout(safetyTimer)
      safetyTimer = null
    }
  }

  function forceHide() {
    clearTimers()
    depth = 0
    shownAt = 0
    active.value = false
    label.value = ''
  }

  function show(text = '') {
    depth += 1
    label.value = text

    if (active.value) return
    if (delayTimer) return

    delayTimer = setTimeout(() => {
      delayTimer = null
      // 延迟到点时任务已经结束了，就别再弹了
      if (depth <= 0) return
      shownAt = Date.now()
      active.value = true
      safetyTimer = setTimeout(forceHide, MAX_ALIVE)
    }, DELAY)
  }

  function hide() {
    depth = Math.max(0, depth - 1)
    if (depth > 0) return

    // 还没真正显示出来 —— 直接取消，用户全程无感
    if (!active.value) {
      clearTimers()
      label.value = ''
      return
    }

    const elapsed = Date.now() - shownAt
    const rest = Math.max(0, MIN_VISIBLE - elapsed)
    clearTimers()
    if (rest === 0) {
      active.value = false
      label.value = ''
      shownAt = 0
    } else {
      safetyTimer = setTimeout(() => {
        safetyTimer = null
        if (depth <= 0) {
          active.value = false
          label.value = ''
          shownAt = 0
        }
      }, rest)
    }
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

  return { active, label, show, hide, wrap, forceHide }
})
