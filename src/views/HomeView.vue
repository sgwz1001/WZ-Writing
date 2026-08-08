<script setup lang="ts">
/**
 * 首页 · 总览
 *
 * 用户原话：「最外层能直接看到最近的、常用的项目，方便重新进入。」
 * 所以这一层不问身份、不问文体，先把「你上次写到哪」摆在最显眼的位置。
 *
 * 搜索遵循「先筛再搜」：
 *   筛选决定范围（全部 / 某个身份），搜索只在这个范围里按标题找。
 *   在「剧作」里搜「真」，只会出《贞观之治》，不会把诗词里的东西翻出来。
 */
import { computed, onMounted, ref, watch } from 'vue'
import { useRouter } from 'vue-router'
import { invoke } from '@tauri-apps/api/core'
import { getCurrentWebviewWindow } from '@tauri-apps/api/webviewWindow'
import { useProjectStore, type DocNode, type Project } from '../stores/project'
import { useAppearanceStore } from '../stores/appearance'
import { useTraceStore } from '../stores/trace'
import { IDENTITY_ORDER, getIdentity, PRODUCT_MAXIM, type IdentityId } from '../data/wendao-lineage'
import { getProfile } from '../data/identity-profile'

const router = useRouter()
const store = useProjectStore()
const appearance = useAppearanceStore()
const trace = useTraceStore()

// ── 筛选（先） ──────────────────────────────────

const filter = ref<'all' | IdentityId>('all')
const keyword = ref('')

const scoped = computed(() => store.byIdentity(filter.value === 'all' ? null : filter.value))

const identityTabs = computed(() =>
  IDENTITY_ORDER.map((id) => ({
    id,
    identity: getIdentity(id),
    count: store.countByIdentity[id] || 0,
    hot: appearance.flameHint && hotSet.value.has(id),
  })),
)

const hotSet = ref<Set<IdentityId>>(new Set())

// ── 章节索引（搜索用，懒加载） ────────────────────

const docIndex = ref<Record<string, DocNode[]>>({})
const indexing = ref(false)

async function ensureIndex() {
  if (indexing.value) return
  const missing = store.projects.filter((p) => !docIndex.value[p.id])
  if (!missing.length) return
  indexing.value = true
  try {
    for (const p of missing) {
      const docs = await invoke<DocNode[]>('list_docs', { projectId: p.id }).catch(() => [])
      docIndex.value = { ...docIndex.value, [p.id]: docs }
    }
  } finally {
    indexing.value = false
  }
}

// 一开始输入就把索引备好；只按标题搜，不翻正文
watch(keyword, (k) => {
  if (k.trim()) ensureIndex()
})

// ── 搜索（后） ──────────────────────────────────

interface Hit {
  project: Project
  /** 命中的章节；为空表示是项目名命中 */
  docs: DocNode[]
}

const hits = computed<Hit[]>(() => {
  const k = keyword.value.trim().toLowerCase()
  if (!k) return []
  const out: Hit[] = []
  for (const p of scoped.value) {
    const nameHit = p.name.toLowerCase().includes(k)
    const docs = (docIndex.value[p.id] || []).filter((d) => d.title.toLowerCase().includes(k))
    if (nameHit || docs.length) out.push({ project: p, docs })
  }
  return out
})

const searching = computed(() => keyword.value.trim().length > 0)

// ── 最近 ────────────────────────────────────────

const recent = computed(() => store.recent(8, filter.value === 'all' ? null : filter.value))

/** 「2026-8-7 更新第三章」这种动态文案 */
function dynamicOf(p: Project) {
  const t = trace.get(p.identity as IdentityId)
  const date = fmtDate(p.updatedAt)
  const prof = getProfile(p.identity)
  if (t && t.projectId === p.id && t.docTitle) return `${date} 更新《${t.docTitle}》`
  if (p.docCount === 0) return `${date} 建立，还没写`
  return `${date} 共 ${p.docCount} ${prof.terms.chapter}`
}

function fmtDate(iso: string) {
  if (!iso) return '—'
  const d = new Date(iso)
  if (Number.isNaN(d.getTime())) return '—'
  return `${d.getFullYear()}-${d.getMonth() + 1}-${d.getDate()}`
}

// ── 预览与进入 ──────────────────────────────────

const preview = ref<{ project: Project; docs: DocNode[] } | null>(null)

async function openPreview(p: Project) {
  await ensureIndex()
  preview.value = { project: p, docs: docIndex.value[p.id] || [] }
}

function enter(p: Project, docId?: string | null) {
  localStorage.setItem('wenzai:last-identity', p.identity)
  router.push({ path: '/studio', query: { project: p.id, ...(docId ? { doc: docId } : {}) } })
}

/** 小火苗：直达上次写到的那一章 */
function followFlame(id: IdentityId) {
  const t = trace.get(id)
  localStorage.setItem('wenzai:last-identity', id)
  if (t) router.push({ path: '/studio', query: { project: t.projectId, ...(t.docId ? { doc: t.docId } : {}) } })
  else router.push('/studio')
}

function pickIdentity(id: IdentityId) {
  if (filter.value === id) {
    // 再点一次 = 进这个身份的工作台
    followFlame(id)
    return
  }
  filter.value = id
}

onMounted(async () => {
  await getCurrentWebviewWindow().show()
  await store.loadProjects()
  hotSet.value = new Set(trace.hot(2))
})
</script>

<template>
  <div class="home">
    <header class="head">
      <div class="brand">
        <h1>文载 Writing</h1>
        <p class="maxim">
          {{ PRODUCT_MAXIM.text }}
          <span class="src">— {{ PRODUCT_MAXIM.author }}《{{ PRODUCT_MAXIM.work.replace(/[《》]/g, '') }}》</span>
        </p>
      </div>
      <button class="wz-btn wz-btn--ghost wz-btn--sm" @click="router.push('/identity')">⇄ 身份一览</button>
    </header>

    <!-- 先筛：范围定死之后再搜 -->
    <div class="filter-bar">
      <button class="chip" :class="{ 'is-on': filter === 'all' }" @click="filter = 'all'">
        全部<span class="chip-n">{{ store.projects.length }}</span>
      </button>
      <button
        v-for="t in identityTabs"
        :key="t.id"
        class="chip"
        :class="{ 'is-on': filter === t.id, 'is-empty': !t.count }"
        :style="filter === t.id ? { borderColor: getProfile(t.id).accent, color: getProfile(t.id).accent } : {}"
        :title="`${t.identity.name} · ${t.identity.tagline}`"
        @click="pickIdentity(t.id)"
      >
        <span class="chip-ico">{{ t.identity.icon }}</span>{{ t.identity.name }}
        <span class="chip-n">{{ t.count }}</span>
        <span v-if="t.hot" class="flame" title="最近常写，点两下直达上次那一章">🔥</span>
      </button>
    </div>

    <div class="search-bar">
      <input
        v-model="keyword"
        class="wz-input search-input"
        :placeholder="
          filter === 'all' ? '搜全部项目与篇目标题…' : `只在「${getIdentity(filter).name}」里搜标题…`
        "
      />
      <button v-if="keyword" class="wz-icon-btn" title="清空" @click="keyword = ''">×</button>
      <span class="search-note">
        {{ filter === 'all' ? '当前范围：全部' : `当前范围：${getIdentity(filter).name}` }} · 只匹配标题
      </span>
    </div>

    <!-- 搜索结果 -->
    <section v-if="searching" class="results">
      <p v-if="indexing" class="wz-empty">正在建立篇目索引…</p>
      <p v-else-if="!hits.length" class="wz-empty">
        这个范围里没有含「{{ keyword }}」的标题。换个词，或把范围放到「全部」。
      </p>
      <ul v-else class="hit-list">
        <li v-for="h in hits" :key="h.project.id" class="hit" @click="openPreview(h.project)">
          <span class="hit-ico">{{ getIdentity(h.project.identity).icon }}</span>
          <div class="hit-main">
            <div class="hit-name">{{ h.project.name }}</div>
            <div class="hit-sub">
              {{ getIdentity(h.project.identity).name }} · {{ h.project.docCount }} 篇 · {{ h.project.charCount }} 字
            </div>
            <div v-if="h.docs.length" class="hit-docs">
              命中篇目：<span v-for="d in h.docs.slice(0, 4)" :key="d.id" class="hit-doc">{{ d.title }}</span>
              <span v-if="h.docs.length > 4" class="more">等 {{ h.docs.length }} 篇</span>
            </div>
          </div>
          <span class="hit-go">预览 ›</span>
        </li>
      </ul>
    </section>

    <!-- 未搜索：最近 + 身份入口 -->
    <template v-else>
      <section class="block">
        <h2 class="block-title">继续写</h2>
        <p v-if="!recent.length" class="wz-empty">
          还没有项目。先挑一个身份，从那里开始。
        </p>
        <div v-else class="card-grid">
          <article
            v-for="p in recent"
            :key="p.id"
            class="wz-panel proj-card"
            :style="{ '--card-accent': getProfile(p.identity).accent }"
            @click="enter(p)"
          >
            <div class="card-top">
              <span class="card-ico">{{ getIdentity(p.identity).icon }}</span>
              <span class="card-identity">{{ getIdentity(p.identity).name }}</span>
              <button class="card-peek wz-icon-btn" title="先看看内容" @click.stop="openPreview(p)">⋯</button>
            </div>
            <h3 class="card-name">{{ p.name }}</h3>
            <p class="card-dyn">{{ dynamicOf(p) }}</p>
            <div class="card-foot">
              <span>{{ p.docCount }} {{ getProfile(p.identity).terms.chapter }}</span>
              <span>{{ p.charCount }} 字</span>
            </div>
          </article>
        </div>
      </section>

      <section class="block">
        <h2 class="block-title">按身份进入</h2>
        <div class="identity-grid">
          <button
            v-for="t in identityTabs"
            :key="t.id"
            class="wz-panel id-card"
            :style="{ '--card-accent': getProfile(t.id).accent }"
            @click="followFlame(t.id)"
          >
            <span class="id-ico">{{ t.identity.icon }}</span>
            <span class="id-name">
              {{ t.identity.name }}
              <span v-if="t.hot" class="flame">🔥</span>
            </span>
            <span class="id-tag">{{ t.identity.tagline }}</span>
            <span class="id-meta">
              {{ t.count ? `${t.count} 个${getProfile(t.id).terms.project}` : '尚未开张' }}
            </span>
          </button>
        </div>
      </section>
    </template>

    <!-- 预览：看清楚再进 -->
    <Teleport to="body">
      <div v-if="preview" class="wz-overlay" @click.self="preview = null">
        <div class="wz-modal">
          <div class="wz-modal__head">
            <h3>{{ getIdentity(preview.project.identity).icon }} {{ preview.project.name }}</h3>
            <button class="wz-icon-btn" title="关闭" @click="preview = null">×</button>
          </div>
          <div class="wz-modal__body">
            <p class="modal-hint">
              {{ getIdentity(preview.project.identity).name }} ·
              {{ preview.project.docCount }} {{ getProfile(preview.project.identity).terms.chapter }} ·
              {{ preview.project.charCount }} 字 · {{ dynamicOf(preview.project) }}
            </p>
            <ul v-if="preview.docs.length" class="peek-list">
              <li
                v-for="d in preview.docs.slice(0, 12)"
                :key="d.id"
                class="peek-row"
                @click="enter(preview!.project, d.id)"
              >
                <span class="peek-title">{{ d.title }}</span>
                <span class="peek-chars">{{ d.charCount }} 字</span>
              </li>
            </ul>
            <p v-else class="modal-hint dim">这个项目还是空的。</p>
          </div>
          <div class="wz-modal__actions">
            <button class="wz-btn wz-btn--ghost" @click="preview = null">再看看</button>
            <button class="wz-btn wz-btn--primary" @click="enter(preview.project)">进入</button>
          </div>
        </div>
      </div>
    </Teleport>
  </div>
</template>

<style scoped>
.home {
  flex: 1;
  min-height: 0;
  overflow-y: auto;
  padding: var(--space-6) var(--space-8);
  display: flex;
  flex-direction: column;
  gap: var(--space-5);
}

.head {
  display: flex;
  align-items: flex-end;
  justify-content: space-between;
  gap: var(--space-4);
}

.brand h1 {
  margin: 0;
  font-size: 26px;
  font-family: var(--font-display);
  color: var(--c-text-base);
  letter-spacing: 0.04em;
}

.maxim {
  margin: 4px 0 0;
  font-size: 13px;
  color: var(--c-accent);
  letter-spacing: 0.12em;
}
.maxim .src {
  color: var(--c-text-tertiary);
  letter-spacing: 0;
  margin-left: var(--space-2);
}

/* ── 筛选条 ── */
.filter-bar {
  display: flex;
  flex-wrap: wrap;
  gap: var(--space-2);
}

.chip {
  display: inline-flex;
  align-items: center;
  gap: 5px;
  padding: 5px 11px;
  border-radius: 999px;
  border: 1px solid var(--c-border);
  background: var(--c-bg-raised);
  color: var(--c-text-secondary);
  font-size: 13px;
  cursor: pointer;
  transition:
    border-color var(--dur-fast) var(--ease-out),
    color var(--dur-fast) var(--ease-out),
    background var(--dur-fast) var(--ease-out);
}
.chip:hover {
  border-color: var(--c-border-strong);
  color: var(--c-text-base);
}
.chip.is-on {
  background: var(--c-bg-base);
  border-color: var(--c-accent);
  color: var(--c-accent);
  font-weight: 600;
}
.chip.is-empty {
  opacity: 0.55;
}
.chip-ico {
  font-size: 13px;
}
.chip-n {
  font-size: 11px;
  color: var(--c-text-tertiary);
  font-variant-numeric: tabular-nums;
}

.flame {
  font-size: 12px;
  animation: flame-flicker 2.4s var(--ease-in-out, ease-in-out) infinite;
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

/* ── 搜索 ── */
.search-bar {
  display: flex;
  align-items: center;
  gap: var(--space-2);
}
.search-input {
  flex: 1;
  min-width: 0;
  max-width: 520px;
}
.search-note {
  font-size: 11px;
  color: var(--c-text-tertiary);
}

/* ── 结果 ── */
.hit-list {
  list-style: none;
  margin: 0;
  padding: 0;
  display: flex;
  flex-direction: column;
  gap: var(--space-2);
}
.hit {
  display: flex;
  align-items: center;
  gap: var(--space-3);
  padding: var(--space-3);
  border: 1px solid var(--c-border);
  border-radius: var(--radius-md);
  background: var(--c-bg-raised);
  cursor: pointer;
  transition: border-color var(--dur-fast) var(--ease-out);
}
.hit:hover {
  border-color: var(--c-accent);
}
.hit-ico {
  font-size: 20px;
}
.hit-main {
  flex: 1;
  min-width: 0;
}
.hit-name {
  color: var(--c-text-base);
  font-weight: 600;
}
.hit-sub {
  font-size: 12px;
  color: var(--c-text-tertiary);
  margin-top: 2px;
}
.hit-docs {
  font-size: 12px;
  color: var(--c-text-secondary);
  margin-top: 4px;
}
.hit-doc {
  display: inline-block;
  margin-right: var(--space-2);
  padding: 1px 6px;
  border-radius: var(--radius-sm);
  background: var(--c-accent-soft, rgba(128, 128, 128, 0.14));
  color: var(--c-accent);
}
.more {
  color: var(--c-text-tertiary);
}
.hit-go {
  font-size: 12px;
  color: var(--c-accent);
  flex-shrink: 0;
}

/* ── 区块 ── */
.block {
  display: flex;
  flex-direction: column;
  gap: var(--space-3);
}
.block-title {
  margin: 0;
  font-size: 13px;
  letter-spacing: 0.1em;
  color: var(--c-text-tertiary);
  font-weight: 600;
}

.card-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(230px, 1fr));
  gap: var(--space-3);
}

.proj-card {
  padding: var(--space-4);
  cursor: pointer;
  border-left: 3px solid var(--card-accent);
  display: flex;
  flex-direction: column;
  gap: 6px;
  transition:
    transform var(--dur-base) var(--ease-spring),
    box-shadow var(--dur-base) var(--ease-out);
}
.proj-card:hover {
  transform: translateY(-3px);
  box-shadow: 0 10px 26px rgba(0, 0, 0, 0.22);
}
[data-anim='off'] .proj-card:hover {
  transform: none;
}

.card-top {
  display: flex;
  align-items: center;
  gap: var(--space-2);
}
.card-ico {
  font-size: 15px;
}
.card-identity {
  font-size: 11px;
  color: var(--card-accent);
  flex: 1;
}
.card-peek {
  opacity: 0;
}
.proj-card:hover .card-peek {
  opacity: 0.7;
}

.card-name {
  margin: 0;
  font-size: 16px;
  color: var(--c-text-base);
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}
.card-dyn {
  margin: 0;
  font-size: 12px;
  color: var(--c-text-secondary);
}
.card-foot {
  display: flex;
  gap: var(--space-3);
  font-size: 11px;
  color: var(--c-text-tertiary);
  margin-top: 2px;
}

.identity-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(150px, 1fr));
  gap: var(--space-3);
}

.id-card {
  padding: var(--space-4);
  display: flex;
  flex-direction: column;
  align-items: flex-start;
  gap: 3px;
  cursor: pointer;
  text-align: left;
  border-top: 2px solid var(--card-accent);
  transition:
    transform var(--dur-base) var(--ease-spring),
    box-shadow var(--dur-base) var(--ease-out);
}
.id-card:hover {
  transform: translateY(-3px);
  box-shadow: 0 10px 26px rgba(0, 0, 0, 0.22);
}
[data-anim='off'] .id-card:hover {
  transform: none;
}
.id-ico {
  font-size: 22px;
}
.id-name {
  font-weight: 600;
  color: var(--c-text-base);
  display: inline-flex;
  align-items: center;
  gap: 4px;
}
.id-tag {
  font-size: 11px;
  color: var(--c-text-tertiary);
}
.id-meta {
  font-size: 11px;
  color: var(--card-accent);
  margin-top: 2px;
}

/* ── 预览 ── */
.modal-hint {
  margin: 0;
  font-size: 13px;
  color: var(--c-text-secondary);
}
.modal-hint.dim {
  color: var(--c-text-tertiary);
}
.peek-list {
  list-style: none;
  margin: var(--space-3) 0 0;
  padding: 0;
  max-height: 46vh;
  overflow-y: auto;
}
.peek-row {
  display: flex;
  justify-content: space-between;
  gap: var(--space-3);
  padding: 6px var(--space-2);
  border-radius: var(--radius-sm);
  cursor: pointer;
  font-size: 13px;
  color: var(--c-text-secondary);
}
.peek-row:hover {
  background: var(--c-accent-soft, rgba(128, 128, 128, 0.12));
  color: var(--c-accent);
}
.peek-chars {
  font-size: 11px;
  color: var(--c-text-tertiary);
  flex-shrink: 0;
}

@media (max-width: 760px) {
  .home {
    padding: var(--space-4);
  }
}
</style>
