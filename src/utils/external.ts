/**
 * 外链与剪贴板工具
 *
 * 为什么需要它：Tauri 的 WebView 里 `window.open()` 是被拦截的 ——
 * WebView2 会尝试新开一个 WebView 窗口，而 Tauri 默认不允许，
 * 结果就是「点了没反应」或直接抛错。这正是 v0.3.0「前往发布页报错」的根因。
 *
 * 正确做法：走 tauri-plugin-opener 的 openUrl，交给系统默认浏览器。
 * 浏览器环境（vite dev / 单页预览）下再回落到 window.open。
 */

/** 是否运行在 Tauri 壳内 */
export function isTauri(): boolean {
  return typeof window !== 'undefined' && '__TAURI_INTERNALS__' in window
}

/** 用系统默认浏览器打开链接。返回 true 表示成功交出去了。 */
export async function openExternal(url: string): Promise<boolean> {
  if (!url) return false
  if (isTauri()) {
    try {
      const { openUrl } = await import('@tauri-apps/plugin-opener')
      await openUrl(url)
      return true
    } catch (e) {
      console.warn('[external] openUrl 失败，回落 window.open', e)
    }
  }
  try {
    const w = window.open(url, '_blank', 'noopener,noreferrer')
    return !!w
  } catch {
    return false
  }
}

/** 复制文本到剪贴板，失败时用隐藏 textarea 兜底。 */
export async function copyText(text: string): Promise<boolean> {
  try {
    await navigator.clipboard.writeText(text)
    return true
  } catch {
    /* 继续兜底 */
  }
  try {
    const ta = document.createElement('textarea')
    ta.value = text
    ta.style.position = 'fixed'
    ta.style.opacity = '0'
    ta.style.pointerEvents = 'none'
    document.body.appendChild(ta)
    ta.select()
    const ok = document.execCommand('copy')
    document.body.removeChild(ta)
    return ok
  } catch {
    return false
  }
}

/** 带超时的 fetch —— 没有超时的网络请求在弱网下会一直转圈。 */
export async function fetchWithTimeout(
  url: string,
  init: RequestInit = {},
  ms = 8000,
): Promise<Response> {
  const ctrl = new AbortController()
  const timer = setTimeout(() => ctrl.abort(), ms)
  try {
    return await fetch(url, { ...init, signal: ctrl.signal })
  } finally {
    clearTimeout(timer)
  }
}
