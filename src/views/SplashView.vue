<script setup lang="ts">
import { onMounted, ref } from 'vue'
import { useRouter } from 'vue-router'

const router = useRouter()
const stage = ref<'enter' | 'hold' | 'leave'>('enter')

onMounted(() => {
  // 第一阶段：入场 1.2s；第二阶段：停留 1.8s；第三阶段：离场 0.6s
  setTimeout(() => (stage.value = 'hold'), 1200)
  setTimeout(() => (stage.value = 'leave'), 3000)
  setTimeout(() => router.replace('/identity'), 3600)
})
</script>

<template>
  <div class="splash" :class="stage">
    <div class="splash-bg" aria-hidden="true" />

    <div class="splash-content">
      <div class="seal">
        <span class="seal-char">文</span>
      </div>
      <h1 class="title">文载</h1>
      <p class="slogan">文以载道</p>
      <p class="sub">Writing · 中文写作工作台</p>
    </div>
  </div>
</template>

<style scoped>
.splash {
  position: fixed;
  inset: 0;
  display: grid;
  place-items: center;
  overflow: hidden;
  user-select: none;
  z-index: 9999;
  background: var(--c-bg-base);
}

.splash-bg {
  position: absolute;
  inset: -10%;
  background:
    radial-gradient(circle at 30% 20%, var(--c-accent-weak) 0%, transparent 40%),
    radial-gradient(circle at 70% 80%, var(--c-accent-soft) 0%, transparent 50%),
    var(--c-bg-base);
  opacity: 0;
  transform: scale(1.1);
  transition: opacity 1.2s var(--ease-out), transform 1.6s var(--ease-out);
}

.splash.enter .splash-bg {
  opacity: 1;
  transform: scale(1);
}

.splash-content {
  position: relative;
  text-align: center;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: var(--space-3);
}

.seal {
  width: 120px;
  height: 140px;
  border: 3px solid var(--c-accent);
  border-radius: var(--radius-2xl);
  display: grid;
  place-items: center;
  opacity: 0;
  transform: translateY(24px) scale(0.92);
  transition:
    opacity 0.8s var(--ease-out) 0.1s,
    transform 1s var(--ease-out) 0.1s,
    border-color 0.4s ease;
}

.splash.enter .seal,
.splash.hold .seal,
.splash.leave .seal {
  opacity: 1;
  transform: translateY(0) scale(1);
}

.seal-char {
  font-family: var(--font-display);
  font-size: 72px;
  color: var(--c-accent);
  line-height: 1;
}

.title {
  font-size: 48px;
  font-weight: 700;
  letter-spacing: 0.25em;
  color: var(--c-text-base);
  opacity: 0;
  transform: translateY(16px);
  transition: opacity 0.8s var(--ease-out) 0.35s, transform 0.8s var(--ease-out) 0.35s;
  margin: 0;
}

.splash.enter .title,
.splash.hold .title,
.splash.leave .title {
  opacity: 1;
  transform: translateY(0);
}

.slogan {
  font-size: 18px;
  color: var(--c-accent);
  letter-spacing: 0.4em;
  opacity: 0;
  margin: 0;
  transition: opacity 0.8s var(--ease-out) 0.55s;
}

.splash.enter .slogan,
.splash.hold .slogan,
.splash.leave .slogan {
  opacity: 1;
}

.sub {
  font-size: 13px;
  color: var(--c-text-tertiary);
  letter-spacing: 0.15em;
  opacity: 0;
  transition: opacity 0.8s var(--ease-out) 0.7s;
  margin: 0;
}

.splash.enter .sub,
.splash.hold .sub,
.splash.leave .sub {
  opacity: 1;
}

/* 离场 */
.splash.leave .splash-bg {
  opacity: 0;
  transform: scale(1.05);
}

.splash.leave .seal {
  transform: scale(0.9) translateY(-20px);
  opacity: 0;
}

.splash.leave .title,
.splash.leave .slogan,
.splash.leave .sub {
  opacity: 0;
  transform: translateY(-12px);
}

@media (prefers-reduced-motion: reduce) {
  .splash-bg,
  .seal,
  .title,
  .slogan,
  .sub {
    transition-duration: 0.01ms !important;
  }
}
</style>
