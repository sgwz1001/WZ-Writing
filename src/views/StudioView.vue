<script setup lang="ts">
import { onMounted, ref } from 'vue'
import { getCurrentWebviewWindow } from '@tauri-apps/api/webviewWindow'
import { useAppearanceStore } from '../stores/appearance'
import { useProjectStore } from '../stores/project'
import { useEditorStore } from '../stores/editor'
import { getIdentity } from '../data/wendao-lineage'
import Editor from '../components/Editor.vue'
import WordCountPanel from '../components/WordCountPanel.vue'
import FormatSplitPanel from '../components/FormatSplitPanel.vue'
import ExportPanel from '../components/ExportPanel.vue'
import CorrectionPanel from '../components/CorrectionPanel.vue'
import LexiconPanel from '../components/LexiconPanel.vue'
import ApiSettingsPanel from '../components/ApiSettingsPanel.vue'
import TitleSuggestPanel from '../components/TitleSuggestPanel.vue'
import { useCorrectionStore } from '../stores/correction'

const appearance = useAppearanceStore()
const projectStore = useProjectStore()
const editorStore = useEditorStore()
const correctionStore = useCorrectionStore()

const newProjectName = ref('')
const newDocTitle = ref('')
const activeDoc = ref<string | null>(null)
const showLexicon = ref(false)
const showApiSettings = ref(false)
const showTitle = ref(false)
const identityId = ref(localStorage.getItem('wenzai:last-identity') || 'general')

const identity = getIdentity(identityId.value)
if (identity.preferredSkin) {
  appearance.setSkin(identity.preferredSkin)
}

onMounted(async () => {
  await getCurrentWebviewWindow().show()
  await projectStore.loadProjects()
  // 预载错词库 / 白名单，供编辑器实时标红使用
  correctionStore.refreshAll()
})

async function createProject() {
  if (!newProjectName.value.trim()) return
  await projectStore.createProject(newProjectName.value, identityId.value)
  newProjectName.value = ''
}

async function createDoc() {
  const pid = projectStore.currentProjectId
  if (!pid || !newDocTitle.value.trim()) return
  const doc = await projectStore.createDoc(pid, newDocTitle.value)
  activeDoc.value = doc.id
  editorStore.open(doc.id, pid, doc.title)
  newDocTitle.value = ''
}

function selectProject(id: string) {
  projectStore.loadDocs(id)
  activeDoc.value = null
}

function cycleSkin() {
  const skins: Array<'genshin' | 'star' | 'zenless'> = ['genshin', 'star', 'zenless']
  const next = skins[(skins.indexOf(appearance.skin) + 1) % skins.length]
  appearance.setSkin(next)
}
</script>

<template>
  <div class="studio">
    <aside class="sidebar">
      <div class="sidebar-head">
        <div class="wz-panel wz-panel--pad identity-badge">
          <span class="identity-icon">{{ identity.icon }}</span>
          <div class="identity-meta">
            <div class="identity-name">{{ identity.name }}</div>
            <div class="identity-maxim">{{ identity.maxim.text }}</div>
          </div>
        </div>

        <div class="project-actions">
          <input
            v-model="newProjectName"
            class="wz-input"
            placeholder="新建项目名"
            @keyup.enter="createProject"
          />
          <button class="wz-btn wz-btn--primary wz-btn--sm" @click="createProject">+ 项目</button>
        </div>
      </div>

      <div class="project-list">
        <div
          v-for="p in projectStore.projects"
          :key="p.id"
          class="wz-list-item"
          :class="{ 'is-active': p.id === projectStore.currentProjectId }"
          @click="selectProject(p.id)"
        >
          <span class="dot" :style="{ background: p.color }" />
          <span class="name">{{ p.name }}</span>
          <span class="meta">{{ p.docCount }} 篇 · {{ p.charCount }} 字</span>
        </div>
        <p v-if="!projectStore.projects.length" class="wz-empty">还没有项目，先建一个吧。</p>
      </div>

      <div class="sidebar-foot">
        <button class="wz-btn wz-btn--ghost wz-btn--sm" @click="cycleSkin">
          切换皮肤：{{ appearance.skin }}
        </button>
        <button class="wz-btn wz-btn--ghost wz-btn--sm" @click="appearance.toggleMode">
          {{ appearance.mode === 'night' ? '切换日间' : '切换夜间' }}
        </button>
      </div>
    </aside>

    <section class="workspace">
      <div v-if="!activeDoc" class="welcome">
        <h2>文载工作室</h2>
        <p>选择左侧项目，或新建一篇开始写作。</p>

        <div v-if="projectStore.currentProjectId" class="quick-create">
          <input
            v-model="newDocTitle"
            class="wz-input"
            placeholder="章节标题"
            @keyup.enter="createDoc"
          />
          <button class="wz-btn wz-btn--primary" @click="createDoc">+ 新建章节</button>
        </div>
      </div>

      <div v-else class="editor-shell">
        <div class="editor-toolbar">
          <input v-model="editorStore.title" class="doc-title" placeholder="无标题" />
          <button class="wz-btn wz-btn--ghost wz-btn--sm" @click="showTitle = true">取标题</button>
          <div class="toolbar-tools">
            <button class="wz-btn wz-btn--ghost wz-btn--sm" @click="showLexicon = true">词库</button>
            <button class="wz-btn wz-btn--ghost wz-btn--sm" @click="showApiSettings = true">AI</button>
            <FormatSplitPanel />
            <ExportPanel />
          </div>
          <span class="save-state" :class="{ saving: editorStore.saving }">
            {{ editorStore.saving ? '保存中…' : editorStore.savedAt ? '已保存' : '待保存' }}
          </span>
        </div>
        <Editor />
        <div class="status-bar">
          <span>{{ editorStore.displayCharCount }} 字</span>
          <span>光标 {{ editorStore.cursor }}</span>
        </div>
      </div>
    </section>

    <aside class="inspector">
      <CorrectionPanel />
      <WordCountPanel />
    </aside>

    <LexiconPanel v-if="showLexicon" @close="showLexicon = false" />
    <ApiSettingsPanel v-if="showApiSettings" @close="showApiSettings = false" />
    <TitleSuggestPanel v-if="showTitle" @close="showTitle = false" />
  </div>
</template>

<style scoped>
.studio {
  display: flex;
  flex: 1;
  min-height: 0;
  min-width: 0;
}

.sidebar {
  width: var(--sidebar-w);
  flex-shrink: 0;
  background: var(--c-bg-sunken);
  border-right: 1px solid var(--c-border);
  display: flex;
  flex-direction: column;
  padding: var(--space-4);
  gap: var(--space-4);
}

.sidebar-head {
  display: flex;
  flex-direction: column;
  gap: var(--space-3);
}

.identity-badge {
  display: flex;
  align-items: center;
  gap: var(--space-3);
}

.identity-icon {
  font-size: 28px;
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

.project-actions,
.quick-create {
  display: flex;
  gap: var(--space-2);
}

.project-list {
  flex: 1;
  overflow-y: auto;
  display: flex;
  flex-direction: column;
  gap: var(--space-1);
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

.welcome h2 {
  font-size: 28px;
  margin: 0 0 var(--space-3);
  color: var(--c-text-base);
}

.welcome p {
  color: var(--c-text-secondary);
  margin: 0 0 var(--space-6);
}

.quick-create {
  justify-content: center;
}

.editor-shell {
  flex: 1;
  display: flex;
  flex-direction: column;
  gap: var(--space-4);
  max-width: var(--measure-wide);
  margin: 0 auto;
  width: 100%;
}

.editor-toolbar {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: var(--space-4);
}

.toolbar-tools {
  display: flex;
  align-items: center;
  gap: var(--space-2);
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

.inspector {
  width: var(--inspector-w);
  flex-shrink: 0;
  min-width: 0;
  background: var(--c-bg-sunken);
  border-left: 1px solid var(--c-border);
  padding: var(--space-4);
  overflow-y: auto;
}

@media (max-width: 1080px) {
  .inspector {
    display: none;
  }
}
</style>
