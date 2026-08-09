<script setup lang="ts">
import { ref, onMounted, onUnmounted } from 'vue'

const words = ['寫', 'WRITE', 'LOADING', 'NEW ERIDU', '文']
const current = ref(0)
let timer: ReturnType<typeof setInterval>

onMounted(() => {
  timer = setInterval(() => {
    current.value = (current.value + 1) % words.length
  }, 800)
})

onUnmounted(() => clearInterval(timer))
</script>

<template>
  <div class="zenless-glitch">
    <div class="glitch-frame" />
    <div class="glitch-text">
      <span class="main">{{ words[current] }}</span>
      <span class="layer red" aria-hidden="true">{{ words[current] }}</span>
      <span class="layer cyan" aria-hidden="true">{{ words[current] }}</span>
    </div>
    <div class="caution-stripes" />
  </div>
</template>

<style scoped>
.zenless-glitch {
  width: 200px;
  height: 160px;
  display: grid;
  place-items: center;
  position: relative;
}
.glitch-frame {
  position: absolute;
  width: 120px;
  height: 120px;
  border: 2px solid var(--c-accent);
  animation: frameSpin 0.8s steps(8) infinite;
  box-shadow: 0 0 20px var(--c-accent);
}
.glitch-text {
  position: relative;
  font-family: var(--font-display);
  font-size: 64px;
  font-weight: 900;
  color: var(--c-accent);
}
.layer {
  position: absolute;
  inset: 0;
  opacity: 0;
}
.layer.red { color: #FF3E7F; animation: glitchRed 1.8s steps(2) infinite; }
.layer.cyan { color: #4D9FFF; animation: glitchCyan 1.8s steps(2) infinite 0.3s; }
.caution-stripes {
  position: absolute;
  inset-inline: 0;
  top: 0;
  height: 6px;
  background: repeating-linear-gradient(45deg, #111114 0 8px, var(--c-accent) 8px 16px);
  animation: stripePulse 1.2s steps(2) infinite;
}
@keyframes frameSpin { to { transform: rotate(360deg); } }
@keyframes glitchRed {
  0%, 90%, 100% { opacity: 0; transform: translateX(0); }
  91%, 94% { opacity: 0.7; transform: translateX(-3px); }
  92%, 95% { opacity: 0; }
  93%, 96% { opacity: 0.5; transform: translateX(-2px); }
}
@keyframes glitchCyan {
  0%, 90%, 100% { opacity: 0; transform: translateX(0); }
  91%, 94% { opacity: 0.7; transform: translateX(3px); }
  92%, 95% { opacity: 0; }
  93%, 96% { opacity: 0.5; transform: translateX(2px); }
}
@keyframes stripePulse { 0%, 100% { opacity: 1; } 50% { opacity: 0.6; } }

[data-anim='off'] .glitch-frame,
[data-anim='off'] .layer.red,
[data-anim='off'] .layer.cyan,
[data-anim='off'] .caution-stripes {
  animation: none;
}
</style>
