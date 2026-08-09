<template>
  <div class="scanlines" aria-hidden="true">
    <div class="scan-bar" />
  </div>
</template>

<style scoped>
.scanlines {
  position: fixed;
  inset: 0;
  pointer-events: none;
  z-index: 1;
  opacity: 0.22;
  background: repeating-linear-gradient(
    0deg,
    transparent 0px,
    transparent 2px,
    rgba(0, 0, 0, 0.08) 2px,
    rgba(0, 0, 0, 0.08) 4px
  );
}

.scan-bar {
  position: absolute;
  inset-inline: 0;
  height: 4px;
  background: linear-gradient(
    to bottom,
    transparent,
    rgba(200, 247, 61, 0.18),
    transparent
  );
  animation: scan 4.2s linear infinite;
}

@keyframes scan {
  0% { top: -8%; }
  100% { top: 108%; }
}

[data-anim='off'] .scan-bar {
  animation: none;
}
</style>
