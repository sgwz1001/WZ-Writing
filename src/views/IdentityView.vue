<script setup lang="ts">
/**
 * 身份一览 · Identity
 *
 * v0.4.0 改了三件事：
 *   1. 出得来 —— 顶部常驻「返回首页」，不再是进去就关不掉的一次性选择页。
 *   2. 说明挪到右侧常驻栏，「进入」按钮提到栏首，不用滚到底才找得到。
 *   3. 身份不再只是「一句话相遇的方式」：它决定了你看到哪些项目、
 *      界面用什么称呼、右侧摆哪些工具。这一点在页面上说清楚。
 */
import { computed, onMounted, ref } from 'vue'
import { useRouter } from 'vue-router'
import { getCurrentWebviewWindow } from '@tauri-apps/api/webviewWindow'
import { IDENTITY_ORDER, getIdentity, type IdentityId } from '../data/wendao-lineage'
import { getProfile, getToolModules } from '../data/identity-profile'
import { useProjectStore } from '../stores/project'
import { useAppearanceStore } from '../stores/appearance'
import { useTraceStore } from '../stores/trace'

const router = useRouter()
const store = useProjectStore()
const appearance = useAppearanceStore()
const trace = useTraceStore()

const last = (localStorage.getItem('wenzai:last-identity') as IdentityId) || null
const selected = ref<IdentityId>(last || 'general')
const hovered = ref<IdentityId | null>(null)
const hotSet = ref<Set<IdentityId>>(new Set())

/** 第一次打开软件时没有「首页」可回，这时不显示返回 */
const canGoBack = computed(() => !!last)

const current = computed(() => getIdentity(selected.value))
const profile = computed(() => getProfile(selected.value))
const tools = computed(() => getToolModules(selected.value))
const accentVars = computed(() => ({ '--c-accent': profile.value.accent }))

function countOf(id: IdentityId) {
  return store.countByIdentity[id] || 0
}

function enterStudio() {
  localStorage.setItem('wenzai:last-identity', selected.value)
  const t = trace.get(selected.value)
  // 有足迹就直接回到上次那一章
  router.push({
    path: '/studio',
    query: t ? { project: t.projectId, ...(t.docId ? { doc: t.docId } : {}) } : {},
  })
}

onMounted(async () => {
  await getCurrentWebviewWindow().show()
  await store.loadProjects()
  hotSet.value = new Set(trace.hot(2))
})
</script>

<template>
  <div class="identity-page" :style="accentVars">
    <div class="identity-bg" aria-hidden="true" />

    <header class="page-header">
      <button v-if="canGoBack" class="wz-btn wz-btn--ghost wz-btn--sm back-btn" @click="router.push('/home')">
        ‹ 返回首页
      </button>
      <div class="header-text">
        <h1>选择你的文道</h1>
        <p>
          身份决定你看到哪些项目、界面怎么称呼、右侧摆哪些工具 ——
          <strong>各身份的内容互不打扰</strong>。随时可以换。
        </p>
      </div>
    </header>

    <div class="page-body">
      <div class="card-grid">
        <button
          v-for="id in IDENTITY_ORDER"
          :key="id"
          class="identity-card"
          :class="{ active: selected === id, hovered: hovered === id }"
          :style="{ '--card-accent': getProfile(id).accent }"
          @mouseenter="hovered = id"
          @mouseleave="hovered = null"
          @click="selected = id"
          @dblclick="((selected = id), enterStudio())"
        >
          <div class="card-top">
            <span class="card-icon">{{ getIdentity(id).icon }}</span>
            <span v-if="appearance.flameHint && hotSet.has(id)" class="flame" title="最近常写">🔥</span>
            <span v-if="selected === id" class="card-check">✓</span>
          </div>
          <h3>{{ getIdentity(id).name }}</h3>
          <p class="tagline">{{ getIdentity(id).tagline }}</p>
          <p class="maxim">{{ getIdentity(id).maxim.text }}</p>
          <p class="card-count">
            {{ countOf(id) ? `${countOf(id)} 个${getProfile(id).terms.project}` : '尚未开张' }}
          </p>
        </button>
      </div>

      <!-- 说明常驻右侧：进入按钮在最上面 -->
      <aside class="side-panel">
        <button class="wz-btn wz-btn--primary wz-btn--lg enter-btn" @click="enterStudio">
          进入 {{ current.icon }} {{ current.name }}
        </button>
        <p class="enter-note">
          {{
            trace.get(selected)
              ? `直接回到《${trace.get(selected)!.projectName}》`
              : `新开一个${profile.terms.project}开始`
          }}
        </p>

        <div class="side-block">
          <div class="side-maxim">{{ current.maxim.text }}</div>
          <div class="side-source">{{ current.maxim.author }}《{{ current.maxim.work.replace(/[《》]/g, '') }}》</div>
          <p class="side-gloss">{{ current.maxim.gloss }}</p>
          <details class="side-more">
            <summary>为什么以此句相赠</summary>
            <p>{{ current.maxim.affinity }}</p>
          </details>
        </div>

        <div class="side-block">
          <h4>这一行的难处</h4>
          <ul class="pain-list">
            <li v-for="(p, i) in profile.painPoints" :key="i">
              <span class="pain">{{ p }}</span>
              <span class="solve">→ {{ profile.solutions[i] }}</span>
            </li>
          </ul>
        </div>

        <div class="side-block">
          <h4>右侧会出现的工具</h4>
          <div class="tool-tags">
            <span v-for="m in tools" :key="m.id" class="tool-tag" :title="m.desc">
              {{ m.icon }} {{ m.name }}
            </span>
          </div>
          <p class="side-terms">
            这里把项目叫「{{ profile.terms.project }}」，章节叫「{{ profile.terms.chapter }}」，
            分组叫「{{ profile.terms.volume }}」。
          </p>
        </div>
      </aside>
    </div>
  </div>
</template>

<style scoped>
.identity-page {
  flex: 1;
  min-height: 0;
  padding: var(--space-6) var(--space-8);
  display: flex;
  flex-direction: column;
  gap: var(--space-5);
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
  display: flex;
  align-items: flex-start;
  gap: var(--space-4);
}

.back-btn {
  flex-shrink: 0;
  margin-top: 4px;
}

.header-text h1 {
  font-size: 28px;
  font-weight: 700;
  margin: 0 0 var(--space-1);
  color: var(--c-text-base);
}

.header-text p {
  color: var(--c-text-secondary);
  margin: 0;
  font-size: 13px;
  line-height: 1.7;
}
.header-text strong {
  color: var(--c-accent);
  font-weight: 600;
}

.page-body {
  display: grid;
  grid-template-columns: 1fr 320px;
  gap: var(--space-5);
  align-items: start;
}

.card-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(180px, 1fr));
  gap: var(--space-3);
}

.identity-card {
  position: relative;
  padding: var(--space-4);
  border-radius: var(--radius-xl);
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
  gap: var(--space-2);
}

.identity-card:hover,
.identity-card.hovered {
  transform: translateY(-4px);
  border-color: var(--card-accent);
}
[data-anim='off'] .identity-card:hover,
[data-anim='off'] .identity-card.hovered {
  transform: none;
}

.identity-card:active {
  transform: scale(0.97);
}

.identity-card.active {
  border-color: var(--card-accent);
  background: var(--c-surface-active);
  box-shadow: 0 0 0 1px var(--card-accent) inset;
}

.card-top {
  display: flex;
  justify-content: space-between;
  align-items: center;
  gap: var(--space-2);
}

.card-icon {
  font-size: 24px;
  line-height: 1;
  flex: 1;
}

.flame {
  font-size: 13px;
  animation: flame-flicker 2.4s ease-in-out infinite;
}
@keyframes flame-flicker {
  0%,
  100% {
    opacity: 1;
    transform: translateY(0) scale(1);
  }
  50% {
    opacity: 0.75;
    transform: translateY(-1px) scale(1.08);
  }
}
[data-anim='off'] .flame {
  animation: none;
}

.card-check {
  width: 20px;
  height: 20px;
  border-radius: 50%;
  background: var(--card-accent);
  color: var(--c-text-on-accent);
  display: grid;
  place-items: center;
  font-size: 11px;
}

.identity-card h3 {
  margin: 0;
  font-size: 16px;
  color: var(--c-text-base);
}

.tagline {
  margin: 0;
  font-size: 11px;
  color: var(--c-text-tertiary);
}

.maxim {
  margin: 0;
  font-size: 13px;
  color: var(--card-accent);
  line-height: 1.6;
}

.card-count {
  margin: 0;
  font-size: 11px;
  color: var(--c-text-tertiary);
}

/* ── 右侧常驻说明栏 ── */
.side-panel {
  position: sticky;
  top: 0;
  display: flex;
  flex-direction: column;
  gap: var(--space-4);
  padding: var(--space-4);
  border-radius: var(--radius-xl);
  background: var(--c-surface-glass);
  backdrop-filter: blur(var(--blur-md));
  border: 1px solid var(--c-border);
}

.enter-btn {
  width: 100%;
  letter-spacing: 0.04em;
  box-shadow: 0 0 0 1px var(--c-accent-soft), 0 0 26px var(--c-accent-soft);
}

.enter-note {
  margin: -8px 0 0;
  font-size: 11px;
  color: var(--c-text-tertiary);
  text-align: center;
}

.side-block {
  display: flex;
  flex-direction: column;
  gap: var(--space-2);
  padding-top: var(--space-3);
  border-top: 1px solid var(--c-border);
}

.side-block h4 {
  margin: 0;
  font-size: 12px;
  letter-spacing: 0.08em;
  color: var(--c-text-tertiary);
  font-weight: 600;
}

.side-maxim {
  font-size: 17px;
  font-family: var(--font-display);
  color: var(--c-accent);
  letter-spacing: 0.06em;
}

.side-source {
  font-size: 11px;
  color: var(--c-text-tertiary);
}

.side-gloss {
  margin: 0;
  font-size: 12px;
  line-height: 1.75;
  color: var(--c-text-secondary);
}

.side-more summary {
  cursor: pointer;
  font-size: 12px;
  color: var(--c-text-tertiary);
}
.side-more p {
  margin: var(--space-2) 0 0;
  font-size: 12px;
  line-height: 1.7;
  color: var(--c-text-tertiary);
}

.pain-list {
  margin: 0;
  padding: 0;
  list-style: none;
  display: flex;
  flex-direction: column;
  gap: var(--space-2);
}
.pain-list li {
  display: flex;
  flex-direction: column;
  gap: 1px;
  font-size: 12px;
  line-height: 1.55;
}
.pain {
  color: var(--c-text-secondary);
}
.solve {
  color: var(--c-accent);
}

.tool-tags {
  display: flex;
  flex-wrap: wrap;
  gap: 5px;
}
.tool-tag {
  font-size: 11px;
  padding: 2px 7px;
  border-radius: 999px;
  border: 1px solid var(--c-border);
  color: var(--c-text-secondary);
}

.side-terms {
  margin: 0;
  font-size: 11px;
  line-height: 1.6;
  color: var(--c-text-tertiary);
}

@media (max-width: 980px) {
  .page-body {
    grid-template-columns: 1fr;
  }
  .side-panel {
    position: static;
  }
}

@media (max-width: 640px) {
  .identity-page {
    padding: var(--space-4);
  }
  .card-grid {
    grid-template-columns: repeat(auto-fill, minmax(140px, 1fr));
  }
}
</style>
