<script setup lang="ts">
import { useLoadingStore } from '../stores/loading'

const loading = useLoadingStore()
</script>

<template>
  <Transition name="loading-fade">
    <div v-if="loading.active" class="loading-overlay" role="status" aria-live="polite">
      <div class="loading-card">
        <div class="wz-spinner" aria-hidden="true">
          <span class="spinner-core" />
        </div>
        <p v-if="loading.label" class="loading-label">{{ loading.label }}</p>
      </div>
    </div>
  </Transition>
</template>

<style scoped>
.loading-overlay {
  position: fixed;
  inset: 0;
  z-index: 800;
  display: grid;
  place-items: center;
  background: color-mix(in srgb, var(--c-bg-base) 55%, transparent);
  backdrop-filter: blur(var(--blur-sm));
  -webkit-backdrop-filter: blur(var(--blur-sm));
}

.loading-card {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: var(--space-4);
  padding: var(--space-7);
  border-radius: var(--radius-2xl);
  background: var(--c-surface);
  border: 1px solid var(--c-border-strong);
  box-shadow: var(--shadow-lg), 0 0 40px var(--c-accent-soft);
}

.loading-label {
  margin: 0;
  font-size: 13px;
  letter-spacing: 0.08em;
  color: var(--c-text-secondary);
}

/* 基础旋转环：accent 描边 + 拖尾高光 */
.wz-spinner {
  position: relative;
  width: 54px;
  height: 54px;
  display: grid;
  place-items: center;
  animation: wz-spin 1s linear infinite;
}
.wz-spinner::before {
  content: '';
  position: absolute;
  inset: 0;
  border-radius: 50%;
  border: 3px solid var(--c-border-strong);
  border-top-color: var(--c-accent);
  box-shadow: 0 0 14px var(--c-accent-soft);
}
.spinner-core {
  width: 10px;
  height: 10px;
  border-radius: 50%;
  background: var(--c-accent);
  box-shadow: 0 0 12px var(--c-accent);
}

@keyframes wz-spin {
  to {
    transform: rotate(360deg);
  }
}

/* ── 皮肤差异化 ────────────────────────────────
   星穹：干净的科技环（默认即细环 + 拖尾）
   原神：双环柔和旋转（外环 + 内点）
   绝区零：硬边方片旋转 + 霓虹闪烁 */
[data-skin='genshin'] .wz-spinner::before {
  border-width: 2px;
  border-top-color: var(--c-accent);
  border-right-color: var(--c-accent-2, var(--c-accent));
  box-shadow: 0 0 18px var(--c-accent-soft);
}
[data-skin='genshin'] .spinner-core {
  animation: wz-pulse 1.4s var(--ease-out) infinite;
}

[data-skin='zenless'] .wz-spinner {
  border-radius: var(--radius-sm);
  animation: wz-spin 0.7s steps(8) infinite;
}
[data-skin='zenless'] .wz-spinner::before {
  border-radius: var(--radius-sm);
  border: 2px solid var(--c-accent);
  border-right-color: transparent;
  border-bottom-color: transparent;
  box-shadow: 0 0 16px var(--c-accent);
  animation: wz-flicker 0.9s steps(2) infinite;
}
[data-skin='zenless'] .spinner-core {
  border-radius: 2px;
}

@keyframes wz-pulse {
  0%, 100% { transform: scale(1); opacity: 1; }
  50% { transform: scale(1.5); opacity: 0.6; }
}
@keyframes wz-flicker {
  0%, 100% { opacity: 1; }
  50% { opacity: 0.35; }
}

/* 转场淡入淡出 */
.loading-fade-enter-active,
.loading-fade-leave-active {
  transition: opacity var(--dur-base) var(--ease-out);
}
.loading-fade-enter-from,
.loading-fade-leave-to {
  opacity: 0;
}

/* 动画总开关关闭：仅静态显示，不旋转/不闪烁 */
[data-anim='off'] .wz-spinner,
[data-anim='off'] .wz-spinner::before,
[data-anim='off'] .spinner-core {
  animation: none !important;
}

@media (prefers-reduced-motion: reduce) {
  .wz-spinner,
  .wz-spinner::before,
  .spinner-core {
    animation-duration: 1.6s !important;
  }
}
</style>
