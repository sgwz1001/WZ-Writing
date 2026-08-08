<script setup lang="ts">
/**
 * 工作室 · Studio
 *
 * v0.4.0 重构要点（逐条对应用户反馈）：
 *   · 身份隔离：项目列表只显示当前身份的项目，别的身份看不到，
 *     换句话说「剧作」里不会冒出「诗词」的东西。
 *   · 出得来：左上角常驻「首页 / 换身份」，不再是进去就出不来的死胡同。
 *   · 分身份：术语、强调色、右侧工具区随身份变；
 *     没有对应痛点的工具，不出现在那个身份的界面上。
 *   · 目录树：卷 → 章层级、字数、拖拽排序。
 */
import { computed, nextTick, onMounted, ref, watch } from 'vue'
import { useRouter } from 'vue-router'
import { invoke } from '@tauri-apps/api/core'
import { getCurrentWebviewWindow } from '@tauri-apps/api/webviewWindow'
import { useAppearanceStore } from '../stores/appearance'
import { useProjectStore } from '../stores/project'
import { useEditorStore } from '../stores/editor'
import { useCorrectionStore } from '../stores/correction'
import { useTraceStore } from '../stores/trace'
import { getIdentity, type IdentityId } from '../data/wendao-lineage'
import { getProfile, getToolModules, type ModuleId, type ModuleMeta } from '../data/identity-profile'
import { numberToChinese } from '../utils/text'
import Editor from '../components/Editor.vue'
import ChapterTree from '../components/ChapterTree.vue'
import WordCountPanel from '../components/WordCountPanel.vue'
import FormatSplitPanel from '../components/FormatSplitPanel.vue'
import ExportPanel from '../components/ExportPanel.vue'
import CorrectionPanel from '../components/CorrectionPanel.vue'
import LexiconPanel from '../components/LexiconPanel.vue'
import ApiSettingsPanel from '../components/ApiSettingsPanel.vue'
import TitleSuggestPanel from '../components/TitleSuggestPanel.vue'
import WeChatPanel from '../components/WeChatPanel.vue'
import PoetryPanel from '../components/PoetryPanel.vue'

const router = useRouter()
const appearance = useAppearanceStore()
const projectStore = useProjectStore()
const editorStore = useEditorStore()
const correctionStore = useCorrectionStore()
const trace = useTraceStore()

// ── 当前身份 ────────────────────────────────────

const identityId = ref<IdentityId>(
  (localStorage.getItem('wenzai:last-identity') as IdentityId) || 'general',
)
const identity = computed(() => getIdentity(identityId.value))
const profile = computed(() => getProfile(identityId.value))
const terms = computed(() => profile.value.terms)

/** 身份强调色注入到子树，皮肤的 accent 在这一层被覆盖 */
const accentVars = computed(() => ({
  '--c-accent': profile.value.accent,
  '--c-accent-soft': hexToRgba(profile.value.accent, 0.14),
  '--c-accent-strong': profile.value.accent,
}))

function hexToRgba(hex: string, a: number) {
  const h = hex.replace('#', '')
  const n = parseInt(h.length === 3 ? h.split('').map((c) => c + c).join('') : h, 16)
  return `rgba(${(n >> 16) & 255}, ${(n >> 8) & 255}, ${n & 255}, ${a})`
}

if (identity.value.preferredSkin) appearance.setSkin(identity.value.preferredSkin)

// ── 身份隔离：只看得到本身份的项目 ────────────────

const myProjects = computed(() => projectStore.byIdentity(identityId.value))

onMounted(async () => {
  await getCurrentWebviewWindow().show()
  await projectStore.loadProjects()
  correctionStore.refreshAll()

  // 从首页 / 小火苗带过来的项目与章节：直接落到那一页，省两次点击
  const q = router.currentRoute.value.query
  const wanted = q.project as string | undefined
  const wantedDoc = q.doc as string | undefined
  const target = wanted && myProjects.value.some((p) => p.id === wanted) ? wanted : myProjects.value[0]?.id
  if (target) {
    await selectProject(target)
    if (wantedDoc && projectStore.docs.some((d) => d.id === wantedDoc)) await openDoc(wantedDoc)
  }
})

// ── 项目 ────────────────────────────────────────

const showNewProject = ref(false)
const newProjectName = ref('')
const newProjectInput = ref<HTMLInputElement | null>(null)

watch(showNewProject, async (open) => {
  if (open) {
    await nextTick()
    newProjectInput.value?.focus()
  } else {
    newProjectName.value = ''
  }
})

async function createProject() {
  const name = newProjectName.value.trim()
  if (!name) return
  const p = await projectStore.createProject(name, identityId.value, '', profile.value.accent)
  showNewProject.value = false
  await projectStore.loadDocs(p.id)
  // 按身份给一份初始结构，不用从空白开始
  for (const t of profile.value.starterChapters) {
    await projectStore.createDoc(p.id, t)
  }
  const first = projectStore.docs[0]
  if (first) await openDoc(first.id)
}

async function selectProject(id: string) {
  await projectStore.loadDocs(id)
  activeDoc.value = null
  editorStore.close()
  const p = projectStore.projects.find((x) => x.id === id)
  if (p) trace.mark(identityId.value, p.id, p.name)
}

async function removeProject(id: string, name: string) {
  if (!confirm(`删除${terms.value.project}「${name}」及其全部内容？此操作不可撤销。`)) return
  await projectStore.deleteProject(id)
  trace.forgetProject(id)
  activeDoc.value = null
  editorStore.close()
}

// ── 章节 ────────────────────────────────────────

const activeDoc = ref<string | null>(null)

/** 自动编号用身份术语：连载者「第三章」、剧作「第三场」、词客「第三首」 */
const suggestedChapter = computed(() => {
  const n = projectStore.docs.filter((d) => d.kind !== 'folder').length + 1
  return `第${numberToChinese(n)}${terms.value.chapter}`
})

const suggestedVolume = computed(() => {
  const n = projectStore.docs.filter((d) => d.kind === 'folder').length + 1
  return `第${numberToChinese(n)}${terms.value.volume}`
})

async function handleCreate(payload: { kind: 'chapter' | 'folder'; parentId: string | null }) {
  const pid = projectStore.currentProjectId
  if (!pid) return
  const title = payload.kind === 'folder' ? suggestedVolume.value : suggestedChapter.value
  const doc = await projectStore.createDoc(pid, title, payload.kind, payload.parentId)
  if (payload.kind === 'chapter') await openDoc(doc.id)
}

async function openDoc(id: string) {
  const pid = projectStore.currentProjectId
  const doc = projectStore.docs.find((d) => d.id === id)
  if (!pid || !doc) return
  const html = await invoke<string>('read_doc', { docId: id }).catch(() => '')
  activeDoc.value = id
  editorStore.open(id, pid, doc.title, html)

  // 留下足迹：下次小火苗就能把你送回这一页
  const p = projectStore.projects.find((x) => x.id === pid)
  if (p) trace.mark(identityId.value, p.id, p.name, doc.id, doc.title)
}

// 编辑器里改标题 → 同步回目录树
watch(
  () => editorStore.title,
  (t) => {
    if (!activeDoc.value || !t) return
    const d = projectStore.docs.find((x) => x.id === activeDoc.value)
    if (d && d.title !== t) projectStore.renameDoc(d.id, t)
  },
)

// ── 身份专属工具区 ──────────────────────────────

/** 已经做出来的模块 → 打开哪个面板 */
const READY: Partial<Record<ModuleId, () => void>> = {
  titling: () => (showTitle.value = true),
  'gzh-export': () => (showWeChat.value = true),
  prosody: () => (showPoetry.value = true),
  rhyme: () => (showPoetry.value = true),
  cipai: () => (showPoetry.value = true),
  classical: () => (showPoetry.value = true),
  proofread: () => (showLexicon.value = true),
  typeset: () => (showWeChat.value = true),
  focus: () => (focusMode.value = !focusMode.value),
}

/** 右侧工具按钮 —— 分段单独渲染（它自带按钮组件），这里排除 */
const toolModules = computed(() => getToolModules(identityId.value).filter((m) => m.id !== 'segment'))
const hasSegment = computed(() => profile.value.modules.includes('segment'))

const showLexicon = ref(false)
const showApiSettings = ref(false)
const showTitle = ref(false)
const showWeChat = ref(false)
const showPoetry = ref(false)
const focusMode = ref(false)
const pendingModule = ref<ModuleMeta | null>(null)

function runModule(m: ModuleMeta) {
  const fn = READY[m.id]
  if (fn) fn()
  else pendingModule.value = m
}

function cycleSkin() {
  const skins: Array<'genshin' | 'star' | 'zenless'> = ['genshin', 'star', 'zenless']
  appearance.setSkin(skins[(skins.indexOf(appearance.skin) + 1) % skins.length])
}
</script>

<template>
  <div class="studio" :class="{ 'is-focus': focusMode }" :style="accentVars">
    <aside class="sidebar">
      <div class="sidebar-head">
        <!-- 出口常驻：不再是进去就出不来 -->
        <div class="nav-row">
          <button class="wz-btn wz-btn--ghost wz-btn--sm" title="回到首页总览" @click="router.push('/home')">
            ⌂ 首页
          </button>
          <button class="wz-btn wz-btn--ghost wz-btn--sm" title="换一个写作身份" @click="router.push('/identity')">
            ⇄ 换身份
          </button>
        </div>

        <div class="wz-panel wz-panel--pad identity-badge">
          <span class="identity-icon">{{ identity.icon }}</span>
          <div class="identity-meta">
            <div class="identity-name">{{ identity.name }}</div>
            <div class="identity-maxim">{{ identity.maxim.text }}</div>
          </div>
        </div>
      </div>

      <div class="section-head">
        <span class="section-title">我的{{ terms.project }}</span>
        <button class="wz-icon-btn" :title="terms.newProject" @click="showNewProject = true">+</button>
      </div>

      <div class="project-list">
        <div
          v-for="p in myProjects"
          :key="p.id"
          class="wz-list-item project-row"
          :class="{ 'is-active': p.id === projectStore.currentProjectId }"
          @click="selectProject(p.id)"
        >
          <span class="dot" :style="{ background: p.color }" />
          <span class="name">{{ p.name }}</span>
          <span class="meta">{{ p.docCount }}{{ terms.chapter }} · {{ p.charCount }}字</span>
          <button class="row-del wz-icon-btn" title="删除" @click.stop="removeProject(p.id, p.name)">×</button>
        </div>
        <p v-if="!myProjects.length" class="wz-empty">
          「{{ identity.name }}」下还没有{{ terms.project }}，点上方 + {{ terms.newProject }}。
        </p>
      </div>

      <div v-if="projectStore.currentProjectId" class="tree-wrap">
        <ChapterTree :active-id="activeDoc" :terms="terms" @open="openDoc" @create="handleCreate" />
      </div>

      <div class="sidebar-foot">
        <button class="wz-btn wz-btn--ghost wz-btn--sm" @click="cycleSkin">切换皮肤：{{ appearance.skin }}</button>
        <button class="wz-btn wz-btn--ghost wz-btn--sm" @click="appearance.toggleMode">
          {{ appearance.mode === 'night' ? '切换日间' : '切换夜间' }}
        </button>
      </div>
    </aside>

    <section class="workspace">
      <div v-if="!activeDoc" class="welcome">
        <span class="welcome-icon">{{ identity.icon }}</span>
        <h2>{{ identity.name }} · {{ identity.tagline }}</h2>
        <p class="welcome-maxim">{{ identity.maxim.text }}</p>

        <p v-if="!projectStore.currentProjectId" class="welcome-hint">
          先在左侧选一个{{ terms.project }}，或{{ terms.newProject }}。
        </p>
        <div v-else class="quick-create">
          <button class="wz-btn wz-btn--primary" @click="handleCreate({ kind: 'chapter', parentId: null })">
            + {{ terms.newChapter }}
          </button>
        </div>
      </div>

      <div v-else class="editor-shell">
        <div class="editor-toolbar">
          <input v-model="editorStore.title" class="doc-title" placeholder="无标题" />
          <span class="save-state" :class="{ saving: editorStore.saving }">
            {{ editorStore.saving ? '保存中…' : editorStore.savedAt ? '已保存' : '待保存' }}
          </span>
        </div>

        <!-- 工具区随身份变：这一行在剧作和词客下长得不一样 -->
        <div class="tool-rail">
          <button
            v-for="m in toolModules"
            :key="m.id"
            class="wz-btn wz-btn--ghost wz-btn--sm tool-btn"
            :class="{ 'is-pending': !READY[m.id] }"
            :title="m.desc"
            @click="runModule(m)"
          >
            <span class="tool-icon">{{ m.icon }}</span>{{ m.name }}
          </button>
          <FormatSplitPanel v-if="hasSegment" />
          <span class="rail-gap" />
          <button class="wz-btn wz-btn--ghost wz-btn--sm" title="大模型接入设置" @click="showApiSettings = true">
            AI
          </button>
          <ExportPanel />
        </div>

        <Editor />

        <div class="status-bar">
          <span>{{ editorStore.displayCharCount }} 字</span>
          <span v-if="profile.chapterGoal">
            目标 {{ profile.chapterGoal }} 字 ·
            {{ Math.min(100, Math.round((editorStore.displayCharCount / profile.chapterGoal) * 100)) }}%
          </span>
          <span>光标 {{ editorStore.cursor }}</span>
          <span class="grow" />
          <span>本{{ terms.project }}合计 {{ projectStore.currentCharCount }} 字</span>
        </div>
      </div>
    </section>

    <aside class="inspector">
      <!-- 这行人真实的痛点，以及我们给了什么 —— 写给用户看 -->
      <details class="wz-panel wz-panel--pad pain-card" open>
        <summary>{{ identity.name }}的常见难处</summary>
        <ul class="pain-list">
          <li v-for="(p, i) in profile.painPoints" :key="i">
            <span class="pain">{{ p }}</span>
            <span class="solve">→ {{ profile.solutions[i] }}</span>
          </li>
        </ul>
      </details>

      <CorrectionPanel />
      <WordCountPanel />
    </aside>

    <LexiconPanel v-if="showLexicon" @close="showLexicon = false" />
    <ApiSettingsPanel v-if="showApiSettings" @close="showApiSettings = false" />
    <TitleSuggestPanel v-if="showTitle" @close="showTitle = false" />
    <WeChatPanel v-if="showWeChat" @close="showWeChat = false" />
    <PoetryPanel v-if="showPoetry" @close="showPoetry = false" />

    <Teleport to="body">
      <div v-if="showNewProject" class="wz-overlay" @click.self="showNewProject = false">
        <div class="wz-modal">
          <div class="wz-modal__head">
            <h3>{{ terms.newProject }}</h3>
            <button class="wz-icon-btn" title="关闭" @click="showNewProject = false">×</button>
          </div>
          <div class="wz-modal__body">
            <p class="modal-hint">
              这个{{ terms.project }}只会出现在「{{ identity.name }}」身份下。
              创建后自动生成：{{ profile.starterChapters.join(' / ') }}
            </p>
            <input
              ref="newProjectInput"
              v-model="newProjectName"
              class="wz-input"
              :placeholder="`${terms.project}名`"
              @keyup.enter="createProject"
              @keyup.esc="showNewProject = false"
            />
          </div>
          <div class="wz-modal__actions">
            <button class="wz-btn wz-btn--ghost" @click="showNewProject = false">取消</button>
            <button class="wz-btn wz-btn--primary" :disabled="!newProjectName.trim()" @click="createProject">
              创建
            </button>
          </div>
        </div>
      </div>

      <!-- 尚未落地的模块：老实说明它规划来解决什么，不做假按钮 -->
      <div v-if="pendingModule" class="wz-overlay" @click.self="pendingModule = null">
        <div class="wz-modal wz-modal--sm">
          <div class="wz-modal__head">
            <h3>{{ pendingModule.icon }} {{ pendingModule.name }}</h3>
            <button class="wz-icon-btn" title="关闭" @click="pendingModule = null">×</button>
          </div>
          <div class="wz-modal__body">
            <p class="modal-hint">{{ pendingModule.desc }}</p>
            <p class="modal-hint dim">这个模块已排进路线图，尚未开放。先用现有工具顶一顶。</p>
          </div>
          <div class="wz-modal__actions">
            <button class="wz-btn wz-btn--primary" @click="pendingModule = null">知道了</button>
          </div>
        </div>
      </div>
    </Teleport>
  </div>
</template>

<style scoped>
.studio {
  display: flex;
  flex: 1;
  min-height: 0;
  min-width: 0;
}

/* 专注模式：只剩纸和光标 */
.studio.is-focus .sidebar,
.studio.is-focus .inspector,
.studio.is-focus .tool-rail {
  display: none;
}

.sidebar {
  width: var(--sidebar-w);
  flex-shrink: 0;
  background: var(--c-bg-sunken);
  border-right: 1px solid var(--c-border);
  display: flex;
  flex-direction: column;
  padding: var(--space-4);
  gap: var(--space-3);
  min-height: 0;
}

.sidebar-head {
  display: flex;
  flex-direction: column;
  gap: var(--space-2);
}

.nav-row {
  display: flex;
  gap: var(--space-2);
}
.nav-row .wz-btn {
  flex: 1;
}

.identity-badge {
  display: flex;
  align-items: center;
  gap: var(--space-3);
  border-left: 3px solid var(--c-accent);
}

.identity-icon {
  font-size: 26px;
  flex-shrink: 0;
}

.identity-meta {
  min-width: 0;
}

.identity-name {
  font-weight: 600;
  color: var(--c-text-base);
}

.identity-maxim {
  font-size: 12px;
  color: var(--c-text-tertiary);
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.section-head {
  display: flex;
  align-items: center;
  justify-content: space-between;
}

.section-title {
  font-size: 12px;
  letter-spacing: 0.08em;
  color: var(--c-text-tertiary);
}

.project-list {
  display: flex;
  flex-direction: column;
  gap: var(--space-1);
  max-height: 30vh;
  overflow-y: auto;
}

.project-row .row-del {
  opacity: 0;
  flex-shrink: 0;
}
.project-row:hover .row-del {
  opacity: 0.6;
}

.tree-wrap {
  flex: 1;
  min-height: 0;
  display: flex;
  flex-direction: column;
  border-top: 1px solid var(--c-border);
  padding-top: var(--space-3);
}

.dot {
  width: 8px;
  height: 8px;
  border-radius: 50%;
  flex-shrink: 0;
}

.name {
  flex: 1;
  min-width: 0;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  color: var(--c-text-base);
  font-size: 14px;
}

.meta {
  font-size: 11px;
  color: var(--c-text-tertiary);
  flex-shrink: 0;
}

.sidebar-foot {
  display: flex;
  flex-direction: column;
  gap: var(--space-2);
}

.workspace {
  flex: 1;
  min-width: 0;
  min-height: 0;
  display: flex;
  flex-direction: column;
  padding: var(--space-6);
  overflow-y: auto;
  overflow-x: hidden;
}

.welcome {
  max-width: 480px;
  margin: auto;
  text-align: center;
}

.welcome-icon {
  font-size: 42px;
  display: block;
  margin-bottom: var(--space-3);
}

.welcome h2 {
  font-size: 24px;
  margin: 0 0 var(--space-2);
  color: var(--c-text-base);
}

.welcome-maxim {
  color: var(--c-accent);
  font-family: var(--font-display);
  letter-spacing: 0.1em;
  margin: 0 0 var(--space-6);
}

.welcome-hint {
  color: var(--c-text-secondary);
  margin: 0;
}

.quick-create {
  display: flex;
  justify-content: center;
  gap: var(--space-2);
}

.modal-hint {
  margin: 0;
  font-size: 13px;
  color: var(--c-text-secondary);
  line-height: 1.6;
}
.modal-hint.dim {
  color: var(--c-text-tertiary);
  margin-top: var(--space-3);
}
.modal-hint + .wz-input {
  margin-top: var(--space-3);
}

.editor-shell {
  flex: 1;
  display: flex;
  flex-direction: column;
  gap: var(--space-3);
  max-width: var(--measure-wide);
  margin: 0 auto;
  width: 100%;
}

.editor-toolbar {
  display: flex;
  align-items: center;
  gap: var(--space-4);
}

.tool-rail {
  display: flex;
  align-items: center;
  gap: var(--space-2);
  flex-wrap: wrap;
  padding-bottom: var(--space-2);
  border-bottom: 1px solid var(--c-border);
}

.rail-gap {
  flex: 1;
}

.tool-btn {
  display: inline-flex;
  align-items: center;
  gap: 4px;
}
.tool-btn.is-pending {
  opacity: 0.55;
}

.tool-icon {
  font-size: 12px;
}

.doc-title {
  flex: 1;
  min-width: 0;
  font-size: 22px;
  font-weight: 700;
  border: none;
  background: transparent;
  color: var(--c-text-base);
  padding: var(--space-2) 0;
  font-family: var(--font-display);
}
.doc-title:focus {
  outline: none;
}

.save-state {
  font-size: 12px;
  color: var(--c-text-tertiary);
  flex-shrink: 0;
}
.save-state.saving {
  color: var(--c-accent);
}

.status-bar {
  display: flex;
  gap: var(--space-4);
  font-size: 12px;
  color: var(--c-text-tertiary);
}
.status-bar .grow {
  flex: 1;
}

.inspector {
  width: var(--inspector-w);
  flex-shrink: 0;
  min-width: 0;
  background: var(--c-bg-sunken);
  border-left: 1px solid var(--c-border);
  padding: var(--space-4);
  overflow-y: auto;
  display: flex;
  flex-direction: column;
  gap: var(--space-3);
}

.pain-card summary {
  cursor: pointer;
  font-size: 13px;
  font-weight: 600;
  color: var(--c-text-base);
}

.pain-list {
  margin: var(--space-3) 0 0;
  padding: 0;
  list-style: none;
  display: flex;
  flex-direction: column;
  gap: var(--space-3);
}

.pain-list li {
  display: flex;
  flex-direction: column;
  gap: 2px;
  font-size: 12px;
  line-height: 1.5;
}

.pain {
  color: var(--c-text-secondary);
}

.solve {
  color: var(--c-accent);
}

@media (max-width: 1080px) {
  .inspector {
    display: none;
  }
}
</style>
