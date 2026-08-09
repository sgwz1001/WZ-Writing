<script setup lang="ts">
import { computed, onMounted, ref } from 'vue'
import { useRoute } from 'vue-router'
import { getCurrentWebviewWindow } from '@tauri-apps/api/webviewWindow'
import TitleBar from './components/TitleBar.vue'
import LoadingOverlay from './components/LoadingOverlay.vue'
import SettingsPanel from './components/SettingsPanel.vue'
import NoiseOverlay from './components/theme/NoiseOverlay.vue'
import Scanlines from './components/theme/Scanlines.vue'
import ModeTransition from './components/ModeTransition.vue'
import { useAppearanceStore } from './stores/appearance'
import { useSkillLibraryStore } from './stores/skillLibrary'
import { useThemeTransition } from './composables/useThemeTransition'

const route = useRoute()
const appearance = useAppearanceStore()
const skillLibrary = useSkillLibraryStore()
const showTitlebar = import.meta.env.TAURI_ENV_PLATFORM !== 'mobile'

/** 常驻设置入口：除开机动画外，任何界面都能看到 */
const showSettings = ref(false)
const showGear = computed(() => route.name !== 'splash')

const transition = useThemeTransition(() => {
  appearance.toggleMode()
})

function onToggleMode(e: MouseEvent) {
  if (!appearance.animations) {
    appearance.toggleMode()
    return
  }
  transition.trigger(e, appearance.skin)
}

onMounted(async () => {
  // 预加载 Skill 库（异步，不阻塞 UI）
  skillLibrary.load().catch(() => {})

  //  splash 自己会负责显示窗口；工作室页需要在这里显示
  if (route.name !== 'splash') {
    await getCurrentWebviewWindow().show()
  }
})
</script>

<template>
  <div class="app-shell">
    <div class="app-bg" :data-bg-fit="appearance.bgFit" aria-hidden="true" />
    <div class="app-dim" aria-hidden="true" />
    <NoiseOverlay />
    <Scanlines v-if="appearance.skin === 'zenless'" />

    <TitleBar v-if="showTitlebar" />

    <main class="app-main">
      <RouterView v-slot="{ Component }">
        <Transition name="route" mode="out-in">
          <component :is="Component" />
        </Transition>
      </RouterView>
    </main>

    <!-- 常驻设置入口（右下角悬浮齿轮） -->
    <Transition name="gear">
      <button
        v-if="showGear"
        class="gear-fab"
        type="button"
        title="设置（外观 / 动效 / AI / 版本）"
        aria-label="打开设置"
        @click="showSettings = true"
      >
        <svg viewBox="0 0 24 24" width="19" height="19" fill="none" aria-hidden="true">
          <path
            d="M12 15.2a3.2 3.2 0 1 0 0-6.4 3.2 3.2 0 0 0 0 6.4Z"
            stroke="currentColor"
            stroke-width="1.6"
          />
          <path
            d="M19.4 13.6a1.7 1.7 0 0 0 .34 1.87l.06.06a2 2 0 1 1-2.83 2.83l-.06-.06a1.7 1.7 0 0 0-1.87-.34 1.7 1.7 0 0 0-1.03 1.56V20a2 2 0 1 1-4 0v-.11a1.7 1.7 0 0 0-1.11-1.56 1.7 1.7 0 0 0-1.87.34l-.06.06a2 2 0 1 1-2.83-2.83l.06-.06a1.7 1.7 0 0 0 .34-1.87 1.7 1.7 0 0 0-1.56-1.03H4a2 2 0 1 1 0-4h.11a1.7 1.7 0 0 0 1.56-1.11 1.7 1.7 0 0 0-.34-1.87l-.06-.06a2 2 0 1 1 2.83-2.83l.06.06a1.7 1.7 0 0 0 1.87.34H10a1.7 1.7 0 0 0 1.03-1.56V4a2 2 0 1 1 4 0v.11a1.7 1.7 0 0 0 1.03 1.56 1.7 1.7 0 0 0 1.87-.34l.06-.06a2 2 0 1 1 2.83 2.83l-.06.06a1.7 1.7 0 0 0-.34 1.87V10a1.7 1.7 0 0 0 1.56 1.03H20a2 2 0 1 1 0 4h-.11a1.7 1.7 0 0 0-1.56 1.03Z"
            stroke="currentColor"
            stroke-width="1.4"
            stroke-linecap="round"
            stroke-linejoin="round"
          />
        </svg>
      </button>
    </Transition>

    <SettingsPanel v-if="showSettings" @close="showSettings = false" @toggle-mode="onToggleMode" />

    <LoadingOverlay />

    <Transition
      :css="false"
      @before-enter="transition.beforeEnter"
      @enter="transition.enter"
      @leave="transition.leave"
    >
      <ModeTransition
        v-if="transition.animating.value"
        :origin="transition.origin.value"
        :skin="transition.skin.value"
      />
    </Transition>
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
  position: relative;
}

.app-bg {
  position: absolute;
  inset: 0;
  background-image: var(--user-bg-image, none);
  background-position: center;
  opacity: var(--user-bg-opacity, 0.25);
  pointer-events: none;
  z-index: -2;
}

.app-bg[data-bg-fit='cover'],
.app-bg[data-bg-fit='center'] {
  background-size: cover;
}
.app-bg[data-bg-fit='tile'] {
  background-size: auto;
  background-repeat: repeat;
}

[data-anim='on'] .app-bg {
  transition: opacity var(--dur-base) var(--ease-out);
}

.app-dim {
  position: absolute;
  inset: 0;
  background: var(--c-bg-base);
  opacity: 0.72;
  pointer-events: none;
  z-index: -1;
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

/* 路由转场：页面切换时轻微上移淡入，配合加载层避免「硬切」 */
.route-enter-active,
.route-leave-active {
  transition:
    opacity var(--dur-base) var(--ease-out),
    transform var(--dur-base) var(--ease-out);
}
.route-enter-from {
  opacity: 0;
  transform: translateY(10px);
}
.route-leave-to {
  opacity: 0;
  transform: translateY(-10px);
}
[data-anim='off'] .route-enter-active,
[data-anim='off'] .route-leave-active {
  transition: none;
}

/* ── 常驻设置齿轮 ── */
.gear-fab {
  position: fixed;
  right: 20px;
  bottom: 20px;
  width: 42px;
  height: 42px;
  display: grid;
  place-items: center;
  border-radius: 50%;
  cursor: pointer;
  color: var(--c-text-secondary);
  background: var(--c-surface-elevated, var(--c-bg-raised));
  border: 1px solid var(--c-border-strong);
  box-shadow: 0 6px 20px rgba(0, 0, 0, 0.28);
  backdrop-filter: blur(10px);
  z-index: var(--z-sticky);
  transition:
    color var(--dur-fast) var(--ease-out),
    border-color var(--dur-fast) var(--ease-out),
    box-shadow var(--dur-fast) var(--ease-out),
    transform var(--dur-base) var(--ease-spring);
}
.gear-fab:hover {
  color: var(--c-accent);
  border-color: var(--c-accent);
  box-shadow: 0 6px 22px rgba(0, 0, 0, 0.3), 0 0 22px var(--c-accent-soft);
  transform: rotate(60deg);
}
.gear-fab:active {
  transform: rotate(60deg) scale(0.94);
}
.gear-fab:focus-visible {
  outline: 2px solid var(--c-accent);
  outline-offset: 2px;
}
[data-anim='off'] .gear-fab:hover,
[data-anim='off'] .gear-fab:active {
  transform: none;
}

.gear-enter-active,
.gear-leave-active {
  transition:
    opacity var(--dur-base) var(--ease-out),
    transform var(--dur-base) var(--ease-spring);
}
.gear-enter-from,
.gear-leave-to {
  opacity: 0;
  transform: scale(0.6) translateY(8px);
}
[data-anim='off'] .gear-enter-active,
[data-anim='off'] .gear-leave-active {
  transition: none;
}

</style>
