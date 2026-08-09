<template>
  <div class="star-orbit">
    <svg class="orbit orbit-a" viewBox="0 0 200 200">
      <path d="M100,20 A80,80 0 1,1 99.9,20" fill="none" stroke="currentColor" stroke-width="1" stroke-dasharray="8 6" />
    </svg>
    <svg class="orbit orbit-b" viewBox="0 0 200 200">
      <path d="M100,45 A55,55 0 1,1 99.9,45" fill="none" stroke="currentColor" stroke-width="1" stroke-dasharray="6 10" />
    </svg>
    <svg class="orbit orbit-c" viewBox="0 0 200 200">
      <path d="M100,65 A35,35 0 1,1 99.9,65" fill="none" stroke="currentColor" stroke-width="1.5" />
    </svg>
    <div class="orbit-core">
      <div class="hex" />
    </div>
  </div>
</template>

<style scoped>
.star-orbit {
  width: 160px;
  height: 160px;
  position: relative;
  color: var(--c-accent);
}
.orbit {
  position: absolute;
  inset: 0;
}
.orbit-a { animation: rotate 16s linear infinite; color: var(--c-accent); }
.orbit-b { animation: rotate 12s linear infinite reverse; color: var(--c-accent-2); }
.orbit-c { animation: rotate 8s linear infinite; color: var(--c-text-secondary); }
.orbit-core {
  position: absolute;
  top: 50%;
  left: 50%;
  transform: translate(-50%, -50%);
}
.hex {
  width: 32px;
  height: 36px;
  background: radial-gradient(circle, var(--c-accent) 0%, transparent 70%);
  clip-path: polygon(50% 0%, 100% 25%, 100% 75%, 50% 100%, 0% 75%, 0% 25%);
  animation: corePulse 2s ease-in-out infinite;
}
@keyframes rotate { to { transform: rotate(360deg); } }
@keyframes corePulse {
  0%, 100% { opacity: 0.7; transform: scale(1); }
  50% { opacity: 1; transform: scale(1.15); }
}

[data-anim='off'] .orbit-a,
[data-anim='off'] .orbit-b,
[data-anim='off'] .orbit-c,
[data-anim='off'] .hex {
  animation: none;
}
</style>
