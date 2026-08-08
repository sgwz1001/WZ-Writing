<script setup lang="ts">
import { onMounted, ref } from 'vue'
import { useRouter } from 'vue-router'

const router = useRouter()
const stage = ref<'enter' | 'hold' | 'leave'>('enter')

onMounted(() => {
  setTimeout(() => (stage.value = 'hold'), 1200)
  setTimeout(() => (stage.value = 'leave'), 3000)
  setTimeout(() => router.replace('/identity'), 3600)
})
</script>

<template>
  <div class="splash" :class="stage">
    <div class="splash-bg" aria-hidden="true" />
    <div class="splash-grid" aria-hidden="true" />
    <div class="splash-frame" aria-hidden="true" />

    <div class="splash-content">
      <div class="seal">
        <span class="seal-ring" />
        <span class="seal-char">文</span>
      </div>
      <h1 class="title">文载</h1>
      <p class="slogan">文以载道</p>
      <p class="sub">Writing · 中文写作工作台</p>
    </div>

    <div class="splash-progress" aria-hidden="true">
      <span class="splash-progress-bar" />
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
  -webkit-user-select: none;
  z-index: 9999;
  background: var(--c-bg-base);
}

.splash-bg {
  position: absolute;
  inset: -10%;
  background:
    radial-gradient(circle at 30% 20%, var(--c-accent-soft) 0%, transparent 42%),
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

/* 极淡网格，呼应科幻 HUD */
.splash-grid {
  position: absolute;
  inset: 0;
  background-image:
    linear-gradient(var(--c-border) 1px, transparent 1px),
    linear-gradient(90deg, var(--c-border) 1px, transparent 1px);
  background-size: 46px 46px;
  opacity: 0;
  mask-image: radial-gradient(circle at 50% 45%, #000 0%, transparent 70%);
  -webkit-mask-image: radial-gradient(circle at 50% 45%, #000 0%, transparent 70%);
  transition: opacity 1.2s var(--ease-out) 0.2s;
}
.splash.enter .splash-grid {
  opacity: 0.16;
}

/* 四角角标框架 */
.splash-frame {
  position: absolute;
  inset: 26px;
  pointer-events: none;
  opacity: 0;
  transition: opacity 1s var(--ease-out) 0.3s;
  background:
    linear-gradient(var(--c-accent), var(--c-accent)) top left / 22px 2px no-repeat,
    linear-gradient(var(--c-accent), var(--c-accent)) top left / 2px 22px no-repeat,
    linear-gradient(var(--c-accent), var(--c-accent)) top right / 22px 2px no-repeat,
    linear-gradient(var(--c-accent), var(--c-accent)) top right / 2px 22px no-repeat,
    linear-gradient(var(--c-accent), var(--c-accent)) bottom left / 22px 2px no-repeat,
    linear-gradient(var(--c-accent), var(--c-accent)) bottom left / 2px 22px no-repeat,
    linear-gradient(var(--c-accent), var(--c-accent)) bottom right / 22px 2px no-repeat,
    linear-gradient(var(--c-accent), var(--c-accent)) bottom right / 2px 22px no-repeat;
}
.splash.enter .splash-frame {
  opacity: 0.55;
}
.splash.leave .splash-frame {
  opacity: 0;
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
  position: relative;
  width: 124px;
  height: 144px;
  border: 2px solid var(--c-accent);
  border-radius: var(--radius-2xl);
  display: grid;
  place-items: center;
  opacity: 0;
  transform: translateY(24px) scale(0.92);
  transition:
    opacity 0.8s var(--ease-out) 0.1s,
    transform 1s var(--ease-spring) 0.1s,
    border-color 0.4s ease;
  box-shadow: 0 0 28px var(--c-accent-soft), inset 0 0 18px var(--c-accent-soft);
}

/* 旋转光环：从印章四角掠过的描金光圈 */
.seal-ring {
  position: absolute;
  inset: -7px;
  border-radius: inherit;
  border: 1.5px solid transparent;
  background: conic-gradient(
    from 0deg,
    transparent 0deg,
    var(--c-accent) 40deg,
    transparent 110deg,
    transparent 360deg
  );
  -webkit-mask: linear-gradient(#000 0 0) content-box, linear-gradient(#000 0 0);
  -webkit-mask-composite: xor;
  mask-composite: exclude;
  padding: 2px;
  opacity: 0.7;
  animation: seal-spin 6s linear infinite;
}

@keyframes seal-spin {
  to {
    transform: rotate(360deg);
  }
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
  text-shadow: 0 0 18px var(--c-accent-soft);
}

.title {
  font-size: 48px;
  font-weight: 700;
  letter-spacing: 0.25em;
  margin: 0;
  background: linear-gradient(120deg, var(--c-text-base), var(--c-accent));
  -webkit-background-clip: text;
  background-clip: text;
  color: transparent;
  opacity: 0;
  transform: translateY(16px);
  transition: opacity 0.8s var(--ease-out) 0.35s, transform 0.8s var(--ease-out) 0.35s;
}

.slogan {
  font-size: 18px;
  color: var(--c-accent);
  letter-spacing: 0.4em;
  margin: 0;
  opacity: 0;
  transition: opacity 0.8s var(--ease-out) 0.55s;
}

.sub {
  font-size: 13px;
  color: var(--c-text-tertiary);
  letter-spacing: 0.15em;
  margin: 0;
  opacity: 0;
  transition: opacity 0.8s var(--ease-out) 0.7s;
}

.splash.enter .title,
.splash.hold .title,
.splash.leave .title,
.splash.enter .slogan,
.splash.hold .slogan,
.splash.leave .slogan,
.splash.enter .sub,
.splash.hold .sub,
.splash.leave .sub {
  opacity: 1;
  transform: translateY(0);
}

/* 底部一道扫过加载线 */
.splash-progress {
  position: absolute;
  left: 18%;
  right: 18%;
  bottom: 48px;
  height: 2px;
  border-radius: var(--radius-full);
  background: var(--c-border);
  overflow: hidden;
  opacity: 0;
  transition: opacity 0.6s var(--ease-out) 0.4s;
}
.splash.enter .splash-progress {
  opacity: 1;
}
.splash-progress-bar {
  position: absolute;
  inset: 0;
  width: 40%;
  background: linear-gradient(90deg, transparent, var(--c-accent), transparent);
  animation: splash-sweep 1.6s var(--ease-in-out) infinite;
}

@keyframes splash-sweep {
  0% {
    transform: translateX(-120%);
  }
  100% {
    transform: translateX(320%);
  }
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
.splash.leave .splash-progress {
  opacity: 0;
}

@media (prefers-reduced-motion: reduce) {
  .seal-ring,
  .splash-progress-bar {
    animation: none;
  }
  .splash-bg,
  .splash-grid,
  .splash-frame,
  .seal,
  .title,
  .slogan,
  .sub {
    transition-duration: 0.01ms !important;
  }
}
</style>
