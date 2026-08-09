<script setup lang="ts">
import { ref, computed, onMounted, onUnmounted } from 'vue'
import { useLoadingStore } from '../../stores/loading'

const loading = useLoadingStore()
const now = ref(performance.now())
let raf = 0

onMounted(() => {
  const tick = () => {
    now.value = performance.now()
    raf = requestAnimationFrame(tick)
  }
  raf = requestAnimationFrame(tick)
})

onUnmounted(() => cancelAnimationFrame(raf))

const elapsed = computed(() => {
  if (!loading.active) return '0.0 秒'
  const ms = now.value - loading.startAt
  if (ms < 60000) return `${(ms / 1000).toFixed(1)} 秒`
  const m = Math.floor(ms / 60000)
  const s = Math.floor((ms % 60000) / 1000)
  return `${m} 分 ${s} 秒`
})

const longWait = computed(() => {
  if (!loading.active) return false
  return now.value - loading.startAt > 30000
})
</script>

<template>
  <div class="elapsed-time">
    <span class="label">已用时</span>
    <span class="value">{{ elapsed }}</span>
    <span v-if="longWait" class="hint">响应较慢，可点击取消重试</span>
  </div>
</template>

<style scoped>
.elapsed-time {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 4px;
  font-variant-numeric: tabular-nums;
}
.label {
  font-size: 11px;
  color: var(--c-text-tertiary);
  letter-spacing: 0.08em;
}
.value {
  font-size: 14px;
  color: var(--c-text-base);
  font-weight: 600;
}
.hint {
  font-size: 11px;
  color: var(--c-warning);
}
</style>
