<script setup lang="ts">
import { onMounted } from 'vue'
import { useRoute } from 'vue-router'
import { getCurrentWebviewWindow } from '@tauri-apps/api/webviewWindow'
import TitleBar from './components/TitleBar.vue'

const route = useRoute()
const showTitlebar = import.meta.env.TAURI_ENV_PLATFORM !== 'mobile'

onMounted(async () => {
  //  splash 自己会负责显示窗口；工作室页需要在这里显示
  if (route.name !== 'splash') {
    await getCurrentWebviewWindow().show()
  }
})
</script>

<template>
  <div class="app-shell">
    <TitleBar v-if="showTitlebar" />

    <main class="app-main">
      <RouterView />
    </main>

    <!-- 日夜切换时全屏叠一层淡入淡出，避免元素各自动画导致花屏 -->
    <div class="mode-transition" aria-hidden="true" />
  </div>
</template>

<style scoped>
.app-shell {
  width: 100vw;
  height: 100vh;
  display: flex;
  flex-direction: column;
  background: var(--c-bg-base);
  color: var(--c-text-base);
  overflow: hidden;
}

.app-main {
  flex: 1;
  min-height: 0;
  position: relative;
  display: flex;
  flex-direction: column;
  overflow: hidden;
}

.app-main > * {
  flex: 1;
  min-height: 0;
  min-width: 0;
}

.mode-transition {
  pointer-events: none;
  position: fixed;
  inset: 0;
  z-index: 9998;
  opacity: 0;
  background: var(--c-bg-base);
  transition: opacity 0.45s ease;
}

[data-mode-flipping] .mode-transition {
  opacity: 1;
}
</style>
