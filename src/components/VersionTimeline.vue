<script setup lang="ts">
import { computed, nextTick, onBeforeUnmount, onMounted, ref, watch } from 'vue'
import {
  VERSIONS,
  CHANGE_KIND_LABEL,
  CURRENT_VERSION,
  PREVIOUS_VERSION,
  RELEASES_URL,
  REPO_OWNER,
  REPO_NAME,
  compareVersion,
} from '../data/versions'
import { openExternal, copyText, fetchWithTimeout } from '../utils/external'

type Order = 'desc' | 'asc'

const props = withDefaults(
  defineProps<{
    /** 全屏形态：铺满可用高度，展示完整时间轴 */
    fullscreen?: boolean
    /** 紧凑形态：只显示当前版本 + 检查更新入口，时间轴隐藏（设置面板内嵌用） */
    compact?: boolean
  }>(),
  { fullscreen: false, compact: false },
)
const emit = defineEmits<{ (e: 'expand'): void }>()
const fullscreen = computed(() => props.fullscreen)

const order = ref<Order>('desc')
const scroller = ref<HTMLElement | null>(null)

const list = computed(() => (order.value === 'desc' ? VERSIONS : [...VERSIONS].slice().reverse()))

/* ── 排序切换：切完滚回顶部，避免用户「停在中间不知道看哪」 ── */
async function toggleOrder() {
  order.value = order.value === 'desc' ? 'asc' : 'desc'
  await nextTick()
  scroller.value?.scrollTo({ top: 0, behavior: 'smooth' })
  bindObserver()
}

/* ── 滚动淡入淡出：进入视口的节点才点亮 ── */
let io: IntersectionObserver | null = null

function bindObserver() {
  io?.disconnect()
  const root = scroller.value
  if (!root) return
  io = new IntersectionObserver(
    (entries) => {
      for (const en of entries) {
        en.target.classList.toggle('is-inview', en.isIntersecting)
      }
    },
    { root, threshold: 0.18, rootMargin: '-6% 0px -10% 0px' },
  )
  root.querySelectorAll('.vt-item').forEach((el) => io!.observe(el))
}

onMounted(async () => {
  await nextTick()
  bindObserver()
})
onBeforeUnmount(() => io?.disconnect())
watch(list, () => nextTick().then(bindObserver))

/* ── 检查更新 ──
   v0.3.0 的问题：直接裸 fetch api.github.com，没有超时、没有备用源、
   报错只抛「Failed to fetch」，用户完全不知道发生了什么。
   现在：双数据源 + 8s 超时 + 人话错误提示 + 一键复制链接。 */
type CheckState = 'idle' | 'checking' | 'latest' | 'outdated' | 'error'
const checkState = ref<CheckState>('idle')
const remoteVersion = ref('')
const checkMsg = ref('')
const copyHint = ref('')

/** 依次尝试的接口：官方 API → ungh 公共镜像（国内可达性更好） */
const UPDATE_SOURCES: { name: string; url: string; pick: (d: unknown) => string }[] = [
  {
    name: 'GitHub API',
    url: `https://api.github.com/repos/${REPO_OWNER}/${REPO_NAME}/releases/latest`,
    pick: (d) => {
      const o = d as { tag_name?: string; name?: string }
      return (o?.tag_name || o?.name || '').trim()
    },
  },
  {
    name: 'ungh 镜像',
    url: `https://ungh.cc/repos/${REPO_OWNER}/${REPO_NAME}/releases/latest`,
    pick: (d) => {
      const o = d as { release?: { tag?: string; name?: string } }
      return (o?.release?.tag || o?.release?.name || '').trim()
    },
  },
]

async function checkUpdate() {
  checkState.value = 'checking'
  checkMsg.value = ''
  copyHint.value = ''

  const errors: string[] = []
  for (const src of UPDATE_SOURCES) {
    try {
      const res = await fetchWithTimeout(src.url, {
        headers: { Accept: 'application/json' },
      })
      if (!res.ok) {
        errors.push(`${src.name} 返回 ${res.status}`)
        continue
      }
      const tag = src.pick(await res.json())
      if (!tag) {
        errors.push(`${src.name} 未返回版本号`)
        continue
      }
      remoteVersion.value = tag.replace(/^v/i, '')
      if (compareVersion(remoteVersion.value, CURRENT_VERSION) > 0) {
        checkState.value = 'outdated'
        checkMsg.value = `发现新版本 v${remoteVersion.value}（当前 v${CURRENT_VERSION}）`
      } else {
        checkState.value = 'latest'
        checkMsg.value = `已是最新版本 v${CURRENT_VERSION}`
      }
      return
    } catch (e) {
      const isAbort = e instanceof DOMException && e.name === 'AbortError'
      errors.push(`${src.name} ${isAbort ? '连接超时' : '连接失败'}`)
    }
  }

  checkState.value = 'error'
  checkMsg.value =
    `暂时联系不上更新服务器（${errors.join('；')}）。\n` +
    '这通常是网络问题，不影响软件使用。可以点下面的按钮直接去发布页看看。'
}

async function openReleases() {
  const ok = await openExternal(RELEASES_URL)
  if (!ok) {
    const copied = await copyText(RELEASES_URL)
    copyHint.value = copied
      ? '没能唤起浏览器，链接已复制到剪贴板，粘贴到浏览器打开即可。'
      : `请手动访问：${RELEASES_URL}`
  }
}

async function copyReleasesUrl() {
  const ok = await copyText(RELEASES_URL)
  copyHint.value = ok ? '链接已复制 ✓' : '复制失败，请手动记录：' + RELEASES_URL
  if (ok) setTimeout(() => (copyHint.value = ''), 2400)
}
</script>

<template>
  <section class="vt" :class="{ 'vt--full': fullscreen, 'vt--compact': compact }">
    <!-- 顶部：当前版本 / 上一版本 / 检查更新 -->
    <header class="vt-head">
      <div class="vt-now">
        <div class="vt-now-main">
          <span class="vt-now-label">当前版本</span>
          <strong class="vt-now-ver">v{{ CURRENT_VERSION }}</strong>
        </div>
        <span v-if="PREVIOUS_VERSION" class="vt-prev">上一版本 v{{ PREVIOUS_VERSION }}</span>
      </div>

      <div class="vt-head-actions">
        <button
          v-if="compact || !fullscreen"
          class="wz-btn wz-btn--primary wz-btn--sm"
          @click="emit('expand')"
        >
          全屏查看更新日志
        </button>
        <button
          class="wz-btn wz-btn--soft wz-btn--sm"
          :disabled="checkState === 'checking'"
          @click="checkUpdate"
        >
          {{ checkState === 'checking' ? '检查中…' : '检查更新' }}
        </button>
        <button class="wz-btn wz-btn--ghost wz-btn--sm" @click="openReleases">前往发布页</button>
        <button class="wz-btn wz-btn--ghost wz-btn--sm" @click="copyReleasesUrl">复制链接</button>
      </div>
    </header>

    <p v-if="checkMsg" class="vt-check" :class="'is-' + checkState">
      {{ checkMsg }}
      <button v-if="checkState === 'outdated'" class="vt-link" @click="openReleases">
        去下载 →
      </button>
    </p>
    <p v-if="copyHint" class="vt-check is-idle">{{ copyHint }}</p>

    <template v-if="!compact">
      <!-- 排序切换 -->
      <div class="vt-toolbar">
        <span class="vt-count">共 {{ VERSIONS.length }} 个版本</span>
        <button class="vt-order" @click="toggleOrder">
          <span class="vt-order-icon" :class="{ 'is-asc': order === 'asc' }">↓</span>
          {{ order === 'desc' ? '由新到旧' : '由旧到新' }}
        </button>
      </div>

      <!-- 时间轴：条目多时限高内部滚动 -->
      <div ref="scroller" class="vt-scroll">
        <ol class="vt-axis">
          <li
            v-for="(v, i) in list"
            :key="v.version"
            class="vt-item"
            :class="i % 2 === 0 ? 'is-left' : 'is-right'"
          >
            <span class="vt-dot" :class="{ 'is-current': v.version === CURRENT_VERSION }" aria-hidden="true" />
            <div class="vt-card">
              <div class="vt-card-head">
                <strong class="vt-ver">v{{ v.version }}</strong>
                <span v-if="v.codename" class="vt-codename">{{ v.codename }}</span>
                <span v-if="v.version === CURRENT_VERSION" class="vt-badge">当前</span>
                <time class="vt-date">{{ v.date }}</time>
              </div>
              <p class="vt-summary">{{ v.summary }}</p>
              <ul class="vt-changes">
                <li v-for="(c, ci) in v.changes" :key="ci" class="vt-change">
                  <span class="vt-kind" :class="'k-' + c.kind">{{ CHANGE_KIND_LABEL[c.kind] }}</span>
                  <span class="vt-target">{{ c.target }}</span>
                  <span class="vt-detail">{{ c.detail }}</span>
                </li>
              </ul>
            </div>
          </li>
        </ol>
      </div>
    </template>
  </section>
</template>

<style scoped>
.vt {
  display: flex;
  flex-direction: column;
  gap: var(--space-3);
}

/* ── 头部 ── */
.vt-head {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: var(--space-3);
  flex-wrap: wrap;
}
.vt-now {
  display: flex;
  flex-direction: column;
  gap: 2px;
}
.vt-now-main {
  display: flex;
  align-items: baseline;
  gap: 8px;
}
.vt-now-label {
  font-size: 12px;
  color: var(--c-text-tertiary);
}
.vt-now-ver {
  font-size: 22px;
  letter-spacing: 0.04em;
  color: var(--c-accent);
  text-shadow: 0 0 18px var(--c-accent-soft);
}
.vt-prev {
  font-size: 12px;
  color: var(--c-text-tertiary);
}
.vt-head-actions {
  display: flex;
  gap: var(--space-2);
}

.vt-check {
  margin: 0;
  font-size: 12.5px;
  line-height: 1.75;
  display: flex;
  align-items: center;
  flex-wrap: wrap;
  gap: 8px;
  color: var(--c-text-secondary);
  white-space: pre-line;
}
.vt-check.is-latest {
  color: var(--c-success);
}
.vt-check.is-outdated {
  color: var(--c-accent);
}
.vt-check.is-error {
  color: var(--c-danger);
}
.vt-link {
  background: none;
  border: none;
  color: var(--c-accent);
  cursor: pointer;
  font-size: 12px;
  padding: 0;
}
.vt-link:hover {
  text-decoration: underline;
}

/* ── 工具条 ── */
.vt-toolbar {
  display: flex;
  align-items: center;
  justify-content: space-between;
  border-top: 1px solid var(--c-border);
  padding-top: var(--space-2);
}
.vt-count {
  font-size: 12px;
  color: var(--c-text-tertiary);
}
.vt-order {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  font-size: 12px;
  color: var(--c-text-secondary);
  background: transparent;
  border: 1px solid var(--c-border-strong);
  border-radius: 999px;
  padding: 4px 12px;
  cursor: pointer;
  transition: all var(--dur-fast) var(--ease-out);
}
.vt-order:hover {
  color: var(--c-accent);
  border-color: var(--c-accent-soft);
}
.vt-order-icon {
  display: inline-block;
  transition: transform var(--dur-base) var(--ease-spring);
}
.vt-order-icon.is-asc {
  transform: rotate(180deg);
}

/* ── 全屏形态 ── */
.vt--full {
  height: 100%;
  gap: var(--space-4);
}
.vt--full .vt-scroll {
  max-height: none;
  flex: 1;
  min-height: 0;
}
.vt--full .vt-now-ver {
  font-size: 34px;
}

/* ── 紧凑形态（设置面板内嵌）：不放时间轴，只留入口 ── */
.vt--compact {
  gap: var(--space-4);
}
.vt--compact .vt-now-ver {
  font-size: 26px;
}

.vt-scroll {
  position: relative;
  max-height: 46vh;
  overflow-y: auto;
  overflow-x: hidden;
  padding: var(--space-3) 0 var(--space-5);
  -webkit-mask-image: linear-gradient(
    to bottom,
    transparent 0,
    #000 26px,
    #000 calc(100% - 34px),
    transparent 100%
  );
  mask-image: linear-gradient(
    to bottom,
    transparent 0,
    #000 26px,
    #000 calc(100% - 34px),
    transparent 100%
  );
  scrollbar-width: thin;
}

/* ── 中轴 ── */
.vt-axis {
  position: relative;
  list-style: none;
  margin: 0;
  padding: 0;
}
.vt-axis::before {
  content: '';
  position: absolute;
  left: 50%;
  top: 0;
  bottom: 0;
  width: 1px;
  transform: translateX(-0.5px);
  background: linear-gradient(
    to bottom,
    transparent,
    var(--c-accent-soft) 8%,
    var(--c-accent-soft) 92%,
    transparent
  );
}

/* ── 节点 ── */
.vt-item {
  position: relative;
  width: 50%;
  padding: 0 var(--space-5) var(--space-5);
  opacity: 0;
  transform: translateY(14px);
  transition:
    opacity var(--dur-slow) var(--ease-out),
    transform var(--dur-slow) var(--ease-out);
}
.vt-item.is-inview {
  opacity: 1;
  transform: translateY(0);
}
.vt-item.is-left {
  margin-right: auto;
  text-align: right;
}
.vt-item.is-right {
  margin-left: auto;
  text-align: left;
}
.vt-item.is-left {
  transform: translateY(14px) translateX(-10px);
}
.vt-item.is-right {
  transform: translateY(14px) translateX(10px);
}
.vt-item.is-inview.is-left,
.vt-item.is-inview.is-right {
  transform: translateY(0) translateX(0);
}

/* 轴上圆点 */
.vt-dot {
  position: absolute;
  top: 8px;
  width: 11px;
  height: 11px;
  border-radius: 50%;
  background: var(--c-bg-base);
  border: 2px solid var(--c-accent);
  box-shadow: 0 0 0 3px var(--c-bg-base), 0 0 14px var(--c-accent-soft);
  z-index: 1;
}
.vt-item.is-left .vt-dot {
  right: calc(var(--space-5) * -1 - 5.5px);
}
.vt-item.is-right .vt-dot {
  left: calc(var(--space-5) * -1 - 5.5px);
}
.vt-dot.is-current {
  background: var(--c-accent);
  animation: vt-pulse 2.2s ease-in-out infinite;
}

@keyframes vt-pulse {
  0%,
  100% {
    box-shadow: 0 0 0 3px var(--c-bg-base), 0 0 0 0 var(--c-accent-soft), 0 0 12px var(--c-accent-soft);
  }
  50% {
    box-shadow: 0 0 0 3px var(--c-bg-base), 0 0 0 7px transparent, 0 0 22px var(--c-accent);
  }
}

/* ── 卡片 ── */
.vt-card {
  display: inline-block;
  width: 100%;
  text-align: left;
  background: var(--c-surface);
  border: 1px solid var(--c-border);
  border-radius: var(--radius-md);
  padding: var(--space-3) var(--space-4);
  transition: border-color var(--dur-fast) var(--ease-out), box-shadow var(--dur-fast) var(--ease-out);
}
.vt-card:hover {
  border-color: var(--c-accent-soft);
  box-shadow: 0 0 22px var(--c-accent-soft);
}
.vt-card-head {
  display: flex;
  align-items: baseline;
  flex-wrap: wrap;
  gap: 8px;
  margin-bottom: 6px;
}
.vt-ver {
  font-size: 15px;
  color: var(--c-accent);
  letter-spacing: 0.03em;
}
.vt-codename {
  font-size: 12px;
  color: var(--c-text-secondary);
  letter-spacing: 0.14em;
}
.vt-badge {
  font-size: 10px;
  padding: 1px 7px;
  border-radius: 999px;
  border: 1px solid var(--c-accent);
  color: var(--c-accent);
}
.vt-date {
  margin-left: auto;
  font-size: 11px;
  color: var(--c-text-tertiary);
  font-variant-numeric: tabular-nums;
}
.vt-summary {
  margin: 0 0 10px;
  font-size: 12px;
  line-height: 1.7;
  color: var(--c-text-secondary);
}
.vt-changes {
  list-style: none;
  margin: 0;
  padding: 0;
  display: flex;
  flex-direction: column;
  gap: 6px;
}
.vt-change {
  font-size: 12px;
  line-height: 1.65;
  color: var(--c-text-base);
}
.vt-kind {
  display: inline-block;
  min-width: 32px;
  text-align: center;
  font-size: 10px;
  padding: 1px 5px;
  margin-right: 6px;
  border-radius: 4px;
  vertical-align: 1px;
}
.k-add {
  background: color-mix(in srgb, var(--c-success) 15%, transparent);
  color: var(--c-success);
}
.k-remove {
  background: color-mix(in srgb, var(--c-danger) 15%, transparent);
  color: var(--c-danger);
}
.k-change {
  background: color-mix(in srgb, var(--c-info) 15%, transparent);
  color: var(--c-info);
}
.k-fix {
  background: color-mix(in srgb, var(--c-warning) 18%, transparent);
  color: var(--c-warning);
}
.vt-target {
  color: var(--c-accent);
  margin-right: 6px;
}
.vt-detail {
  color: var(--c-text-secondary);
}

/* ── 皮肤差异化 ── */
/* 原神：轴线呼吸更柔，卡片带一点暖描边 */
:global([data-skin='genshin']) .vt-dot.is-current {
  animation-duration: 2.8s;
  animation-timing-function: ease-in-out;
}
:global([data-skin='genshin']) .vt-card:hover {
  box-shadow: 0 0 26px var(--c-accent-soft);
}
/* 绝区零：硬边方点 + 平滑霓虹呼吸（原 steps(2) 硬闪已移除，会导致视觉频闪） */
:global([data-skin='zenless']) .vt-dot.is-current {
  animation: vt-neon 2s ease-in-out infinite;
  border-radius: 2px;
}
:global([data-skin='zenless']) .vt-card {
  border-radius: 4px;
}
@keyframes vt-neon {
  0%,
  100% {
    box-shadow: 0 0 0 3px var(--c-bg-base), 0 0 18px var(--c-accent);
  }
  50% {
    box-shadow: 0 0 0 3px var(--c-bg-base), 0 0 6px var(--c-accent-soft);
  }
}

/* ── 窄屏：退化为单侧时间轴 ── */
@media (max-width: 720px) {
  .vt-axis::before {
    left: 7px;
  }
  .vt-item {
    width: 100%;
    padding-left: calc(var(--space-5) + 8px);
    padding-right: 0;
    text-align: left;
  }
  .vt-item.is-left,
  .vt-item.is-right {
    margin: 0;
    text-align: left;
    transform: translateY(14px);
  }
  .vt-item.is-left .vt-dot,
  .vt-item.is-right .vt-dot {
    left: 2px;
    right: auto;
  }
}

/* ── 关闭动画 / 减少动效 ── */
:global([data-anim='off']) .vt-item {
  opacity: 1;
  transform: none;
  transition: none;
}
:global([data-anim='off']) .vt-dot.is-current {
  animation: none;
}
@media (prefers-reduced-motion: reduce) {
  .vt-item {
    opacity: 1;
    transform: none;
    transition: none;
  }
  .vt-dot.is-current {
    animation: none;
  }
}
</style>
