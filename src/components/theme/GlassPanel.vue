<template>
  <div class="glass-panel">
    <slot />
  </div>
</template>

<style scoped>
.glass-panel {
  background: color-mix(
    in srgb,
    var(--c-surface) calc((1 - var(--user-glass-opacity, 0.2)) * 100%),
    transparent
  );
  backdrop-filter: blur(var(--user-blur, 12px)) saturate(var(--user-saturate, 120%));
  -webkit-backdrop-filter: blur(var(--user-blur, 12px)) saturate(var(--user-saturate, 120%));
  border: 1px solid var(--glass-border);
  border-radius: var(--radius-xl);
}
</style>
