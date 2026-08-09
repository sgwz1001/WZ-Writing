<script setup lang="ts">
import { computed } from 'vue'
import { useAppearanceStore } from '../../stores/appearance'

const props = defineProps<{
  text: string
}>()

const appearance = useAppearanceStore()
const isZenless = computed(() => appearance.skin === 'zenless')
</script>

<template>
  <div class="decorative-text" :class="{ glitch: isZenless }">
    <span class="main">{{ text }}</span>
    <span v-if="isZenless" class="glitch-layer red" aria-hidden="true">{{ text }}</span>
    <span v-if="isZenless" class="glitch-layer cyan" aria-hidden="true">{{ text }}</span>
  </div>
</template>

<style scoped>
.decorative-text {
  font-family: var(--font-display);
  font-size: clamp(44px, 10vw, 140px);
  font-weight: 900;
  line-height: 1;
  color: var(--c-accent);
  position: relative;
  user-select: none;
  pointer-events: none;
}

.main {
  position: relative;
  z-index: 1;
}

.glitch-layer {
  position: absolute;
  inset: 0;
  opacity: 0;
  z-index: 2;
}

.glitch-layer.red {
  color: #FF3E7F;
  animation: glitch-red 2.6s steps(2) infinite;
}
.glitch-layer.cyan {
  color: #4D9FFF;
  animation: glitch-cyan 2.6s steps(2) infinite;
}

@keyframes glitch-red {
  0%, 90%, 100% { opacity: 0; transform: translateX(0); }
  91% { opacity: 0.7; transform: translateX(-3px); }
  92% { opacity: 0; }
  93% { opacity: 0.6; transform: translateX(-2px); }
  94% { opacity: 0; }
}

@keyframes glitch-cyan {
  0%, 88%, 100% { opacity: 0; transform: translateX(0); }
  89% { opacity: 0.7; transform: translateX(3px); }
  90% { opacity: 0; }
  91% { opacity: 0.6; transform: translateX(2px); }
  92% { opacity: 0; }
}

[data-anim='off'] .glitch-layer {
  animation: none;
}
</style>
