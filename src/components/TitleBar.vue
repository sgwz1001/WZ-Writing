<script setup lang="ts">
import { ref, onMounted } from 'vue'
import { getCurrentWebviewWindow } from '@tauri-apps/api/webviewWindow'
import { useAppearanceStore } from '../stores/appearance'

const appearance = useAppearanceStore()
const appWindow = getCurrentWebviewWindow()
const isMaximized = ref(false)

onMounted(async () => {
  isMaximized.value = await appWindow.isMaximized()
})

async function toggleMaximize() {
  await appWindow.toggleMaximize()
  isMaximized.value = await appWindow.isMaximized()
}

function minimize() {
  appWindow.minimize()
}

function closeWindow() {
  appWindow.close()
}

function toggleMode() {
  appearance.toggleMode()
}
</script>

<template>
  <header class="titlebar" data-tauri-drag-region>
    <div class="titlebar-left">
      <span class="brand">文载 Writing</span>
      <span class="slogan-mini">文以载道</span>
    </div>

    <div class="titlebar-center">
      <button class="tool-btn" title="切换明暗" @click="toggleMode">
        {{ appearance.mode === 'night' ? '☀' : '☾' }}
      </button>
    </div>

    <div class="titlebar-right">
      <button class="win-btn" @click="minimize">
        <svg width="12" height="12" viewBox="0 0 12 12">
          <rect y="5" width="12" height="2" fill="currentColor" />
        </svg>
      </button>
      <button class="win-btn" @click="toggleMaximize">
        <svg width="12" height="12" viewBox="0 0 12 12">
          <rect
            x="1.5"
            y="1.5"
            width="9"
            height="9"
            fill="none"
            stroke="currentColor"
            stroke-width="1.5"
          />
        </svg>
      </button>
      <button class="win-btn close" @click="closeWindow">
        <svg width="12" height="12" viewBox="0 0 12 12">
          <path
            d="M2 2l8 8M10 2L2 10"
            stroke="currentColor"
            stroke-width="1.5"
            fill="none"
          />
        </svg>
      </button>
    </div>
  </header>
</template>

<style scoped>
.titlebar {
  height: var(--titlebar-h);
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 0 var(--space-4);
  background: var(--c-bg-sunken);
  border-bottom: 1px solid var(--c-border);
  user-select: none;
  -webkit-app-region: drag;
}

.titlebar-left,
.titlebar-center,
.titlebar-right {
  display: flex;
  align-items: center;
  gap: var(--space-3);
  -webkit-app-region: no-drag;
}

.brand {
  font-family: var(--font-display);
  font-size: 16px;
  font-weight: 700;
  color: var(--c-text-base);
  letter-spacing: 0.1em;
}

.slogan-mini {
  font-size: 11px;
  color: var(--c-text-tertiary);
  letter-spacing: 0.15em;
}

.tool-btn,
.win-btn {
  width: 32px;
  height: 26px;
  border: none;
  background: transparent;
  color: var(--c-text-secondary);
  display: grid;
  place-items: center;
  border-radius: var(--radius-sm);
  cursor: pointer;
  transition: background 0.15s ease, color 0.15s ease;
}

.tool-btn:hover,
.win-btn:hover {
  background: var(--c-surface-hover);
  color: var(--c-text-base);
}

.win-btn.close:hover {
  background: var(--c-danger);
  color: #fff;
}

.tool-btn {
  width: auto;
  padding: 0 var(--space-3);
  font-size: 13px;
}
</style>
