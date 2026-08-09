<template>
  <div class="genshin-compass">
    <svg class="ring ring-outer" viewBox="0 0 200 200">
      <circle cx="100" cy="100" r="90" fill="none" stroke="currentColor" stroke-width="1.5" />
      <g v-for="i in 7" :key="i" :transform="`rotate(${i * 51.4} 100 100)`">
        <circle cx="100" cy="14" r="3" fill="currentColor" />
      </g>
    </svg>
    <svg class="ring ring-inner" viewBox="0 0 200 200">
      <circle cx="100" cy="100" r="55" fill="none" stroke="currentColor" stroke-width="1" />
    </svg>
    <div class="compass-core" />
    <div class="particles">
      <span v-for="i in 12" :key="i" class="particle" :style="{ '--i': i }" />
    </div>
  </div>
</template>

<style scoped>
.genshin-compass {
  width: 160px;
  height: 160px;
  position: relative;
  color: var(--c-accent);
}
.ring {
  position: absolute;
  inset: 0;
}
.ring-outer { animation: rotate 20s linear infinite reverse; }
.ring-inner { animation: rotate 14s linear infinite; }
.compass-core {
  position: absolute;
  width: 24px;
  height: 24px;
  border-radius: 50%;
  background: radial-gradient(circle, var(--c-accent) 0%, transparent 70%);
  top: 50%;
  left: 50%;
  transform: translate(-50%, -50%);
  animation: pulse 2s var(--ease-out) infinite;
}
.particle {
  position: absolute;
  width: 3px;
  height: 3px;
  border-radius: 50%;
  background: var(--c-accent);
  opacity: 0.5;
  top: 50%;
  left: 50%;
  --angle: calc(var(--i) * 30deg);
  --dist: calc(50% + 20px);
  transform: rotate(var(--angle)) translateX(var(--dist)) rotate(calc(-1 * var(--angle)));
  animation: float 3s ease-in-out infinite;
  animation-delay: calc(var(--i) * 0.2s);
}
@keyframes rotate { to { transform: rotate(360deg); } }
@keyframes pulse {
  0%, 100% { transform: translate(-50%, -50%) scale(1); opacity: 0.8; }
  50% { transform: translate(-50%, -50%) scale(1.4); opacity: 1; }
}
@keyframes float {
  0%, 100% { transform: rotate(var(--angle)) translateX(var(--dist)) rotate(calc(-1 * var(--angle))) translateY(0); }
  50% { transform: rotate(var(--angle)) translateX(var(--dist)) rotate(calc(-1 * var(--angle))) translateY(-8px); }
}

[data-anim='off'] .ring-outer,
[data-anim='off'] .ring-inner,
[data-anim='off'] .compass-core,
[data-anim='off'] .particle {
  animation: none;
}
</style>
