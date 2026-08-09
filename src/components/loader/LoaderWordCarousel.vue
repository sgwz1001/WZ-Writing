<script setup lang="ts">
import { ref, computed, onMounted, onUnmounted, watch } from 'vue'
import { useLoaderLexiconStore } from '../../stores/loaderLexicon'
import { CATEGORY_LABELS } from '../../data/loaderLexicon'

const store = useLoaderLexiconStore()
const index = ref(0)
let timer: ReturnType<typeof setInterval>

const current = computed(() => store.activeWords[index.value] ?? store.activeWords[0])

function categoryLabel(cat: string) {
  return CATEGORY_LABELS[cat as keyof typeof CATEGORY_LABELS] || cat
}

function start() {
  clearInterval(timer)
  if (store.activeWords.length <= 1) return
  timer = setInterval(() => {
    index.value = (index.value + 1) % store.activeWords.length
  }, store.rotationMs)
}

onMounted(start)
onUnmounted(() => clearInterval(timer))
watch(() => [store.activeWords.length, store.rotationMs], () => {
  index.value = 0
  start()
})
</script>

<template>
  <div class="word-carousel">
    <Transition name="word-slide" mode="out-in">
      <div v-if="current" :key="current.id" class="word-item">
        <span class="word-text">{{ current.text }}</span>
        <span class="word-category">{{ categoryLabel(current.category) }}</span>
      </div>
    </Transition>
  </div>
</template>

<style scoped>
.word-carousel {
  height: 48px;
  display: grid;
  place-items: center;
  overflow: hidden;
}
.word-item {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 4px;
}
.word-text {
  font-size: 18px;
  color: var(--c-text-base);
  font-weight: 600;
}
.word-category {
  font-size: 11px;
  color: var(--c-text-tertiary);
  letter-spacing: 0.08em;
}
.word-slide-enter-active,
.word-slide-leave-active { transition: all 0.4s var(--ease-out); }
.word-slide-enter-from { opacity: 0; transform: translateY(16px); }
.word-slide-leave-to { opacity: 0; transform: translateY(-16px); }
</style>
