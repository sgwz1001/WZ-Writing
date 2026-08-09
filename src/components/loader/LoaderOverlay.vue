<script setup lang="ts">
import { computed } from 'vue'
import { useLoadingStore } from '../../stores/loading'
import { useAppearanceStore } from '../../stores/appearance'
import GenshinCompass from './animations/GenshinCompass.vue'
import StarRailOrbit from './animations/StarRailOrbit.vue'
import ZenlessGlitch from './animations/ZenlessGlitch.vue'
import LoaderWordCarousel from './LoaderWordCarousel.vue'
import LoaderElapsedTime from './LoaderElapsedTime.vue'

const loading = useLoadingStore()
const appearance = useAppearanceStore()

const animationComponent = computed(() => {
  switch (appearance.skin) {
    case 'genshin': return GenshinCompass
    case 'star': return StarRailOrbit
    case 'zenless': return ZenlessGlitch
    default: return StarRailOrbit
  }
})
</script>

<template>
  <Transition name="loader-zoom">
    <div v-if="loading.active" class="loader-overlay" :data-skin="appearance.skin" role="status" aria-live="polite">
      <div class="loader-stage">
        <component :is="animationComponent" class="loader-animation" />
        <LoaderWordCarousel class="loader-words" />
        <LoaderElapsedTime class="loader-time" />
        <p v-if="loading.label" class="loader-label">{{ loading.label }}</p>
        <button v-if="loading.cancellable" class="loader-cancel" @click="loading.cancel()">
          取消
        </button>
      </div>
    </div>
  </Transition>
</template>

<style scoped>
.loader-overlay {
  position: fixed;
  inset: 0;
  z-index: 900;
  display: grid;
  place-items: center;
  background: color-mix(in srgb, var(--c-bg-base) 62%, transparent);
  backdrop-filter: blur(var(--user-blur, 12px));
  -webkit-backdrop-filter: blur(var(--user-blur, 12px));
}

.loader-stage {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: var(--space-5);
  padding: var(--space-8) var(--space-10);
  border-radius: var(--radius-2xl);
  background: color-mix(in srgb, var(--c-surface) calc((1 - var(--user-glass-opacity, 0.2)) * 100%), transparent);
  border: 1px solid var(--glass-border);
  box-shadow: var(--shadow-lg), 0 0 40px var(--c-accent-soft);
  min-width: 280px;
}

.loader-words {
  margin-top: var(--space-2);
}

.loader-label {
  margin: 0;
  font-size: 13px;
  letter-spacing: 0.08em;
  color: var(--c-text-secondary);
}

.loader-cancel {
  padding: 6px 18px;
  border: 1px solid var(--c-border-strong);
  border-radius: var(--radius-md);
  background: transparent;
  color: var(--c-text-secondary);
  font-size: 12px;
  cursor: pointer;
  transition: all var(--dur-fast) var(--ease-out);
}
.loader-cancel:hover {
  border-color: var(--c-accent);
  color: var(--c-accent);
}

.loader-zoom-enter-active,
.loader-zoom-leave-active {
  transition: opacity var(--dur-base) var(--ease-out), transform var(--dur-base) var(--ease-out);
}
.loader-zoom-enter-from,
.loader-zoom-leave-to {
  opacity: 0;
  transform: scale(0.96);
}
</style>
