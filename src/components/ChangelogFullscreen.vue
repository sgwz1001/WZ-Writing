<script setup lang="ts">
/**
 * 全屏更新日志
 *
 * 用户反馈：版本信息挤在小弹窗里根本看不清。
 * 这里做成铺满整个应用窗口的独立层，并额外提供「铺满显示器」开关
 * （调用 Tauri 窗口 API 进入真正的全屏，退出时自动还原）。
 */
import { onBeforeUnmount, onMounted, ref } from 'vue'
import VersionTimeline from './VersionTimeline.vue'
import { CURRENT_VERSION, VERSIONS } from '../data/versions'
import { isTauri } from '../utils/external'

const emit = defineEmits<{ (e: 'close'): void }>()

const monitorFull = ref(false)
let wasFullscreen = false

async function getWin() {
  const { getCurrentWindow } = await import('@tauri-apps/api/window')
  return getCurrentWindow()
}

async function toggleMonitorFull() {
  if (!isTauri()) {
    // 浏览器环境退化为 Fullscreen API
    if (!document.fullscreenElement) {
      await document.documentElement.requestFullscreen().catch(() => {})
      monitorFull.value = true
    } else {
      await document.exitFullscreen().catch(() => {})
      monitorFull.value = false
    }
    return
  }
  try {
    const win = await getWin()
    const next = !monitorFull.value
    await win.setFullscreen(next)
    monitorFull.value = next
  } catch (e) {
    console.warn('[changelog] 切换全屏失败', e)
  }
}

async function restoreWindow() {
  if (!monitorFull.value) return
  try {
    if (isTauri()) {
      const win = await getWin()
      await win.setFullscreen(wasFullscreen)
    } else if (document.fullscreenElement) {
      await document.exitFullscreen().catch(() => {})
    }
  } catch {
    /* 忽略 */
  }
  monitorFull.value = false
}

async function close() {
  await restoreWindow()
  emit('close')
}

function onKey(e: KeyboardEvent) {
  if (e.key === 'Escape') {
    e.stopPropagation()
    close()
  }
}

onMounted(async () => {
  window.addEventListener('keydown', onKey, true)
  if (isTauri()) {
    try {
      const win = await getWin()
      wasFullscreen = await win.isFullscreen()
    } catch {
      wasFullscreen = false
    }
  }
})

onBeforeUnmount(() => {
  window.removeEventListener('keydown', onKey, true)
  void restoreWindow()
})
</script>

<template>
  <div class="cl-root">
    <header class="cl-bar" data-tauri-drag-region>
      <div class="cl-title">
        <span class="cl-mark">文载</span>
        <h2>更新日志</h2>
        <span class="cl-sub">v{{ CURRENT_VERSION }} · 共 {{ VERSIONS.length }} 个版本</span>
      </div>
      <div class="cl-actions">
        <button class="wz-btn wz-btn--ghost wz-btn--sm" @click="toggleMonitorFull">
          {{ monitorFull ? '退出满屏' : '铺满显示器' }}
        </button>
        <button class="wz-btn wz-btn--soft wz-btn--sm" @click="close">返回（Esc）</button>
      </div>
    </header>

    <div class="cl-body">
      <VersionTimeline fullscreen />
    </div>
  </div>
</template>

<style scoped>
.cl-root {
  position: fixed;
  inset: 0;
  z-index: 1200;
  display: flex;
  flex-direction: column;
  background: var(--c-bg-base);
  background-image: radial-gradient(
      120% 80% at 50% -10%,
      var(--c-accent-soft) 0%,
      transparent 60%
    ),
    var(--c-bg-gradient, none);
  animation: cl-in var(--dur-slow, 320ms) var(--ease-out, ease) both;
}
@keyframes cl-in {
  from {
    opacity: 0;
    transform: scale(0.985);
  }
  to {
    opacity: 1;
    transform: none;
  }
}

.cl-bar {
  flex: none;
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: var(--space-4);
  padding: var(--space-4) var(--space-7);
  border-bottom: 1px solid var(--c-border);
  background: color-mix(in srgb, var(--c-surface) 70%, transparent);
  backdrop-filter: blur(var(--blur-sm));
  -webkit-backdrop-filter: blur(var(--blur-sm));
}
.cl-title {
  display: flex;
  align-items: baseline;
  gap: var(--space-3);
  min-width: 0;
}
.cl-mark {
  font-size: 13px;
  letter-spacing: 0.32em;
  color: var(--c-accent);
  text-shadow: 0 0 16px var(--c-accent-soft);
}
.cl-title h2 {
  margin: 0;
  font-size: 20px;
  letter-spacing: 0.1em;
  color: var(--c-text-primary);
}
.cl-sub {
  font-size: 12px;
  color: var(--c-text-tertiary);
  white-space: nowrap;
}
.cl-actions {
  display: flex;
  gap: var(--space-2);
  flex: none;
}

.cl-body {
  flex: 1;
  min-height: 0;
  padding: var(--space-5) clamp(var(--space-5), 6vw, 96px) var(--space-6);
  display: flex;
  flex-direction: column;
}

@media (max-width: 720px) {
  .cl-bar {
    padding: var(--space-3) var(--space-4);
    flex-wrap: wrap;
  }
  .cl-body {
    padding: var(--space-4);
  }
}
</style>
