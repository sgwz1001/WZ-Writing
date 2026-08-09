<script setup lang="ts">
withDefaults(defineProps<{
  color?: string
  bg?: string
  position?: 'top' | 'bottom'
}>(), {
  color: '#C8F73D',
  bg: '#111114',
  position: 'top',
})
</script>

<template>
  <div class="caution-tape" :class="`is-${position}`">
    <slot />
  </div>
</template>

<style scoped>
.caution-tape {
  position: relative;
}

.caution-tape::before {
  content: '';
  position: absolute;
  inset-inline: 0;
  height: 6px;
  background: repeating-linear-gradient(
    45deg,
    var(--tape-bg, #111114) 0px, var(--tape-bg, #111114) 8px,
    var(--tape-color, #C8F73D) 8px, var(--tape-color, #C8F73D) 16px
  );
}

.caution-tape.is-top::before {
  top: 0;
}
.caution-tape.is-bottom::before {
  bottom: 0;
}
</style>
