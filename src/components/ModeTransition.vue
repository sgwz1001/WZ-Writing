<script setup lang="ts">
import { computed } from 'vue'
import { useAppearanceStore } from '../stores/appearance'

const props = defineProps<{
  origin: { x: number; y: number }
  skin: 'genshin' | 'star' | 'zenless'
}>()

const appearance = useAppearanceStore()

const maxRadius = computed(() => Math.hypot(window.innerWidth, window.innerHeight))
const clipStyle = computed(() => ({
  clipPath: `circle(${maxRadius.value}px at ${props.origin.x}px ${props.origin.y}px)`,
}))

const isDay = computed(() => appearance.mode === 'day')
</script>

<template>
  <div
    class="mode-transition-layer"
    :class="[`skin-${skin}`, { 'is-day': isDay }]"
    :style="clipStyle"
    aria-hidden="true"
  />
</template>

<style scoped>
.mode-transition-layer {
  position: fixed;
  inset: 0;
  z-index: 9998;
  pointer-events: none;
}

.skin-genshin {
  background:
    radial-gradient(circle at 30% 20%, rgba(184, 145, 77, 0.35), transparent 45%),
    radial-gradient(circle at 70% 80%, rgba(62, 127, 193, 0.22), transparent 40%),
    var(--c-bg-base);
}
.skin-genshin.is-day {
  background:
    radial-gradient(circle at 30% 20%, rgba(184, 145, 77, 0.45), transparent 45%),
    radial-gradient(circle at 70% 80%, rgba(62, 127, 193, 0.18), transparent 40%),
    #17212F;
}

.skin-star {
  background:
    radial-gradient(circle at 25% 30%, rgba(138, 124, 245, 0.28), transparent 40%),
    radial-gradient(circle at 75% 70%, rgba(227, 184, 114, 0.18), transparent 45%),
    var(--c-bg-base);
}
.skin-star.is-day {
  background:
    radial-gradient(circle at 25% 30%, rgba(91, 79, 214, 0.2), transparent 40%),
    radial-gradient(circle at 75% 70%, rgba(169, 118, 42, 0.14), transparent 45%),
    #0C0F1C;
}

.skin-zenless {
  background: var(--c-bg-base);
}
.skin-zenless::after {
  content: '';
  position: absolute;
  inset: 0;
  background: repeating-linear-gradient(
    0deg,
    transparent 0px,
    transparent 3px,
    rgba(255, 255, 255, 0.06) 3px,
    rgba(255, 255, 255, 0.06) 6px
  );
  animation: crt-shrink 720ms var(--ease-out) forwards;
}
@keyframes crt-shrink {
  0% { transform: scaleY(1); opacity: 1; }
  50% { transform: scaleY(0.02); opacity: 1; }
  100% { transform: scaleY(0); opacity: 0; }
}
</style>
