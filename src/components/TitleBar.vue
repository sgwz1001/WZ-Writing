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
  <header class="titlebar drag-region">
    <div class="titlebar-left">
      <span class="brand">文载 Writing</span>
      <span class="brand-sep" />
      <span class="slogan-mini">文以载道</span>
    </div>

    <div class="titlebar-center">
      <button class="wz-icon-btn" title="切换明暗" @click="toggleMode">
        <svg width="15" height="15" viewBox="0 0 24 24" fill="none">
          <template v-if="appearance.mode === 'night'">
            <circle cx="12" cy="12" r="4.5" stroke="currentColor" stroke-width="1.6" />
            <path
              d="M12 2v2.5M12 19.5V22M2 12h2.5M19.5 12H22M4.6 4.6l1.8 1.8M17.6 17.6l1.8 1.8M19.4 4.6l-1.8 1.8M6.4 17.6l-1.8 1.8"
              stroke="currentColor"
              stroke-width="1.6"
              stroke-linecap="round"
            />
          </template>
          <template v-else>
            <path
              d="M20 14.5A8 8 0 1 1 9.5 4a6.3 6.3 0 0 0 10.5 10.5Z"
              stroke="currentColor"
              stroke-width="1.6"
              stroke-linejoin="round"
            />
          </template>
        </svg>
      </button>
    </div>

    <div class="titlebar-right">
      <button class="wz-icon-btn" title="最小化" @click="minimize">
        <svg width="12" height="12" viewBox="0 0 12 12">
          <rect y="5" width="12" height="2" fill="currentColor" />
        </svg>
      </button>
      <button class="wz-icon-btn" :title="isMaximized ? '还原' : '最大化'" @click="toggleMaximize">
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
      <button class="wz-icon-btn wz-icon-btn--close" title="关闭" @click="closeWindow">
        <svg width="12" height="12" viewBox="0 0 12 12">
          <path
            d="M2 2l8 8M10 2L2 10"
            stroke="currentColor"
            stroke-width="1.5"
            fill="none"
            stroke-linecap="round"
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
  /* 底部一道极淡的 accent 高光，呼应面板框架语言 */
  box-shadow: inset 0 -1px 0 0 var(--c-accent-soft);
  user-select: none;
  -webkit-user-select: none;
}

.titlebar-left,
.titlebar-center,
.titlebar-right {
  display: flex;
  align-items: center;
  gap: var(--space-2);
}

.brand {
  font-family: var(--font-display);
  font-size: 15px;
  font-weight: 700;
  color: var(--c-text-base);
  letter-spacing: 0.12em;
}

.brand-sep {
  width: 1px;
  height: 14px;
  background: var(--c-border-strong);
}

.slogan-mini {
  font-size: 11px;
  color: var(--c-text-tertiary);
  letter-spacing: 0.18em;
}

/* 关闭按钮：hover 时危险色，但保留圆形 hover 背景 */
.wz-icon-btn--close:hover {
  background: var(--c-danger) !important;
  color: #fff !important;
}
</style>
