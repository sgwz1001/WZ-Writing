<script setup lang="ts">
import { ref } from 'vue'
import { useRouter } from 'vue-router'
import { IDENTITY_ORDER, getIdentity, type IdentityId } from '../data/wendao-lineage'

const router = useRouter()
const selected = ref<IdentityId>('general')
const hovered = ref<IdentityId | null>(null)

function enterStudio() {
  localStorage.setItem('wenzai:last-identity', selected.value)
  router.push(`/studio/${selected.value}`)
}
</script>

<template>
  <div class="identity-page">
    <div class="identity-bg" aria-hidden="true" />

    <header class="page-header">
      <h1>选择你的文道</h1>
      <p>身份只决定一句话与你相遇的方式，不影响任何功能。</p>
    </header>

    <div class="card-grid">
      <button
        v-for="id in IDENTITY_ORDER"
        :key="id"
        class="identity-card"
        :class="{ active: selected === id, hovered: hovered === id }"
        @mouseenter="hovered = id"
        @mouseleave="hovered = null"
        @click="selected = id"
      >
        <div class="card-top">
          <span class="card-icon">{{ getIdentity(id).icon }}</span>
          <span v-if="selected === id" class="card-check">✓</span>
        </div>
        <h3>{{ getIdentity(id).name }}</h3>
        <p class="tagline">{{ getIdentity(id).tagline }}</p>
        <p class="maxim">{{ getIdentity(id).maxim.text }}</p>
        <p class="affinity">{{ getIdentity(id).maxim.affinity }}</p>
      </button>
    </div>

    <div class="selected-panel wz-panel">
      <div class="panel-meta">
        <span class="panel-icon">{{ getIdentity(selected).icon }}</span>
        <div>
          <h2>{{ getIdentity(selected).name }}</h2>
          <p class="panel-source">
            {{ getIdentity(selected).maxim.author }} · {{ getIdentity(selected).maxim.work }}
          </p>
        </div>
      </div>
      <p class="panel-explain">{{ getIdentity(selected).maxim.gloss }}</p>
      <p class="panel-affinity">{{ getIdentity(selected).maxim.affinity }}</p>
    </div>

    <div class="identity-actions">
      <button class="wz-btn wz-btn--primary wz-btn--lg enter-btn" @click="enterStudio">
        进入工作室 · {{ getIdentity(selected).name }}
      </button>
    </div>
  </div>
</template>

<style scoped>
.identity-page {
  flex: 1;
  min-height: 0;
  padding: var(--space-8) var(--space-10);
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: var(--space-8);
  position: relative;
  overflow-y: auto;
  overflow-x: hidden;
}

.identity-bg {
  position: absolute;
  inset: 0;
  background:
    radial-gradient(circle at 20% 30%, var(--c-accent-weak) 0%, transparent 45%),
    radial-gradient(circle at 80% 70%, var(--c-accent-soft) 0%, transparent 55%),
    var(--c-bg-base);
  z-index: -1;
}

.page-header {
  text-align: center;
  max-width: 560px;
}

.page-header h1 {
  font-size: 32px;
  font-weight: 700;
  margin: 0 0 var(--space-2);
  color: var(--c-text-base);
}

.page-header p {
  color: var(--c-text-secondary);
  margin: 0;
}

.card-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(220px, 1fr));
  gap: var(--space-4);
  width: 100%;
  max-width: 1200px;
}

.identity-card {
  position: relative;
  padding: var(--space-5);
  border-radius: var(--radius-2xl);
  border: 1px solid var(--c-border);
  background: var(--c-surface-elevated);
  text-align: left;
  cursor: pointer;
  transition:
    transform 0.25s var(--ease-out),
    border-color 0.25s ease,
    background 0.25s ease,
    box-shadow 0.25s ease;
  display: flex;
  flex-direction: column;
  gap: var(--space-3);
}

.identity-card:hover,
.identity-card.hovered {
  transform: translateY(-4px);
  border-color: var(--c-accent-weak);
}

.identity-card:active {
  transform: scale(0.97);
}

.identity-card.active {
  border-color: var(--c-accent);
  background: var(--c-surface-active);
  box-shadow: 0 0 0 1px var(--c-accent) inset, 0 0 22px var(--c-accent-soft);
}

.identity-card.active::after {
  content: '';
  position: absolute;
  inset: 0;
  pointer-events: none;
  border-radius: inherit;
  opacity: 0.6;
  background:
    linear-gradient(var(--c-accent), var(--c-accent)) top left / 14px 2px no-repeat,
    linear-gradient(var(--c-accent), var(--c-accent)) top left / 2px 14px no-repeat,
    linear-gradient(var(--c-accent), var(--c-accent)) top right / 14px 2px no-repeat,
    linear-gradient(var(--c-accent), var(--c-accent)) top right / 2px 14px no-repeat,
    linear-gradient(var(--c-accent), var(--c-accent)) bottom left / 14px 2px no-repeat,
    linear-gradient(var(--c-accent), var(--c-accent)) bottom left / 2px 14px no-repeat,
    linear-gradient(var(--c-accent), var(--c-accent)) bottom right / 14px 2px no-repeat,
    linear-gradient(var(--c-accent), var(--c-accent)) bottom right / 2px 14px no-repeat;
}

.card-top {
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.card-icon {
  font-size: 28px;
  line-height: 1;
}

.card-check {
  width: 24px;
  height: 24px;
  border-radius: 50%;
  background: var(--c-accent);
  color: var(--c-text-on-accent);
  display: grid;
  place-items: center;
  font-size: 12px;
}

.identity-card h3 {
  margin: 0;
  font-size: 17px;
  color: var(--c-text-base);
}

.tagline {
  margin: 0;
  font-size: 12px;
  color: var(--c-text-tertiary);
}

.maxim {
  margin: 0;
  font-size: 14px;
  color: var(--c-accent);
  line-height: 1.6;
}

.affinity {
  margin: 0;
  font-size: 12px;
  color: var(--c-text-tertiary);
  line-height: 1.5;
}

.selected-panel {
  width: 100%;
  max-width: 760px;
  padding: var(--space-6);
  border-radius: var(--radius-2xl);
  background: var(--c-surface-glass);
  backdrop-filter: blur(var(--blur-md));
  border: 1px solid var(--c-border);
  display: flex;
  flex-direction: column;
  gap: var(--space-4);
}

.panel-meta {
  display: flex;
  align-items: center;
  gap: var(--space-4);
}

.panel-icon {
  width: 56px;
  height: 56px;
  border-radius: var(--radius-xl);
  background: var(--c-accent-weak);
  display: grid;
  place-items: center;
  font-size: 30px;
}

.panel-meta h2 {
  margin: 0 0 var(--space-1);
  font-size: 22px;
  color: var(--c-text-base);
}

.panel-source {
  margin: 0;
  color: var(--c-text-secondary);
  font-size: 13px;
}

.panel-explain {
  margin: 0;
  color: var(--c-text-secondary);
  line-height: 1.8;
}

.panel-affinity {
  margin: 0;
  color: var(--c-text-tertiary);
  font-size: 13px;
  line-height: 1.7;
}

/* 进入按钮置底常驻操作条：滚动时也始终可见、醒目 */
.identity-actions {
  position: sticky;
  bottom: 0;
  margin-top: var(--space-2);
  padding: var(--space-4) 0 var(--space-2);
  display: flex;
  justify-content: center;
  background: linear-gradient(to top, var(--c-bg-base) 55%, transparent);
  z-index: var(--z-sticky);
}

.enter-btn {
  min-width: 280px;
  letter-spacing: 0.04em;
  box-shadow: 0 0 0 1px var(--c-accent-soft), 0 0 26px var(--c-accent-soft);
}

/* 进入按钮已统一为 .wz-btn .wz-btn--primary（见 components.css），不再重复定义。 */

@media (max-width: 640px) {
  .identity-page {
    padding: var(--space-5);
  }
  .card-grid {
    grid-template-columns: 1fr;
  }
}
</style>
