<script setup lang="ts">
import { computed, nextTick, onMounted, ref, watch } from 'vue'
import { useRoute } from 'vue-router'
import { invoke } from '@tauri-apps/api/core'
import { getCurrentWebviewWindow } from '@tauri-apps/api/webviewWindow'
import { useAppearanceStore } from '../stores/appearance'
import { useProjectStore } from '../stores/project'
import { useEditorStore } from '../stores/editor'
import { useCorrectionStore } from '../stores/correction'
import { useIdentitySessionStore } from '../stores/identitySession'
import { getLayoutProfile } from '../data/layoutProfiles'
import { isValidIdentity } from '../router'
import Editor from '../components/Editor.vue'
import WordCountPanel from '../components/WordCountPanel.vue'
import FormatSplitPanel from '../components/FormatSplitPanel.vue'
import ExportPanel from '../components/ExportPanel.vue'
import CorrectionPanel from '../components/CorrectionPanel.vue'
import LexiconPanel from '../components/LexiconPanel.vue'
import ApiSettingsPanel from '../components/ApiSettingsPanel.vue'
import TitleSuggestPanel from '../components/TitleSuggestPanel.vue'
import WeChatPanel from '../components/WeChatPanel.vue'
import PoetryPanel from '../components/PoetryPanel.vue'
import ChapterCreateDialog from '../components/ChapterCreateDialog.vue'
import OfficialTemplatePanel from '../components/professional/OfficialTemplatePanel.vue'
import OfficialFormatToolbar from '../components/professional/OfficialFormatToolbar.vue'
import ContractTemplatePanel from '../components/professional/ContractTemplatePanel.vue'
import ContractRiskPanel from '../components/professional/ContractRiskPanel.vue'
import ContractDraftForm from '../components/professional/ContractDraftForm.vue'
import AiWritePanel from '../components/professional/AiWritePanel.vue'

const appearance = useAppearanceStore()
const projectStore = useProjectStore()
const editorStore = useEditorStore()
const correctionStore = useCorrectionStore()
const identitySession = useIdentitySessionStore()
const route = useRoute()

const newProjectName = ref('')
const showNewProject = ref(false)
const activeDoc = ref<string | null>(null)
const showLexicon = ref(false)
const showApiSettings = ref(false)
const showTitle = ref(false)
const showWeChat = ref(false)
const showPoetry = ref(false)
const showChapterDialog = ref(false)
const newProjectInput = ref<HTMLInputElement | null>(null)

const identity = computed(() => identitySession.identity)
const layout = computed(() => identitySession.layout)

// 从 URL 恢复身份
onMounted(async () => {
  const id = route.params.identity as string | undefined
  if (id && isValidIdentity(id)) {
    identitySession.setIdentityId(id)
    appearance.setSkin(getLayoutProfile(id).preferredSkin)
  }

  await getCurrentWebviewWindow().show()
  await identitySession.init()
  correctionStore.refreshAll()
})

// 弹窗一出现就把光标放进输入框
watch(showNewProject, async (open) => {
  if (open) {
    await nextTick()
    newProjectInput.value?.focus()
  } else {
    newProjectName.value = ''
  }
})

async function createProject() {
  if (!newProjectName.value.trim()) return
  await projectStore.createProject(newProjectName.value, identitySession.identityId)
  newProjectName.value = ''
  showNewProject.value = false
}

async function createDoc(fullTitle: string) {
  const pid = projectStore.currentProjectId
  if (!pid) return
  const doc = await projectStore.createDoc(pid, fullTitle)
  activeDoc.value = doc.id
  const content = await invoke<string>('read_doc', { docId: doc.id }).catch(() => '')
  editorStore.open(doc.id, pid, doc.title, content)
  showChapterDialog.value = false
}

function selectProject(id: string) {
  projectStore.loadDocs(id)
  activeDoc.value = null
  editorStore.$reset()
}

function cycleSkin() {
  const skins: Array<'genshin' | 'star' | 'zenless'> = ['genshin', 'star', 'zenless']
  const next = skins[(skins.indexOf(appearance.skin) + 1) % skins.length]
  appearance.setSkin(next)
}

const suggestedCount = computed(() =>
  projectStore.docs.filter((d) => d.kind === 'chapter').length,
)

const showInspectorPanel = computed(() => (id: string) => {
  if (!layout.value.showInspector) return false
  return layout.value.inspectorPanels.includes(id as any)
})

const hasModule = computed(() => (id: string) => layout.value.sidebarModules.includes(id as any))
</script>

<template>
  <div class="studio">
    <aside v-if="layout.showSidebar" class="sidebar">
      <div class="sidebar-head">
        <div v-if="hasModule('identity-badge')" class="wz-panel wz-panel--pad identity-badge">
          <span class="identity-icon">{{ identity.icon }}</span>
          <div class="identity-meta">
            <div class="identity-name">{{ identity.name }}</div>
            <div class="identity-maxim">{{ identity.maxim.text }}</div>
          </div>
        </div>

        <div v-if="hasModule('projects')" class="project-actions">
          <button class="wz-btn wz-btn--primary wz-btn--sm" @click="showNewProject = true">+ 新建项目</button>
        </div>
      </div>

      <div v-if="hasModule('projects')" class="project-list">
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

      <div v-if="hasModule('quick-chapter') && projectStore.currentProjectId" class="quick-chapter">
        <button class="wz-btn wz-btn--primary wz-btn--sm w-full" @click="showChapterDialog = true">+ 新建章节</button>
      </div>

      <div class="sidebar-foot">
        <button v-if="hasModule('skin-switch')" class="wz-btn wz-btn--ghost wz-btn--sm" @click="cycleSkin">
          切换皮肤：{{ appearance.skin }}
        </button>
        <button class="wz-btn wz-btn--ghost wz-btn--sm" @click="appearance.toggleMode">
          {{ appearance.mode === 'night' ? '切换日间' : '切换夜间' }}
        </button>
      </div>
    </aside>

    <section class="workspace">
      <div v-if="!activeDoc" class="welcome">
        <h2>文载工作室 · {{ identity.name }}</h2>
        <p>选择左侧项目，或新建一篇开始写作。</p>

        <div v-if="projectStore.currentProjectId" class="quick-create">
          <button class="wz-btn wz-btn--primary" @click="showChapterDialog = true">+ 新建章节</button>
        </div>
      </div>

      <div v-else class="editor-shell">
        <div class="editor-header">
          <input v-model="editorStore.title" class="doc-title" placeholder="无标题" />
          <span class="save-state" :class="{ saving: editorStore.saving }">
            {{ editorStore.saving ? '保存中…' : editorStore.savedAt ? '已保存' : '待保存' }}
          </span>
        </div>

        <Editor>
          <template #split><FormatSplitPanel /></template>
          <template #export><ExportPanel /></template>
        </Editor>

        <div class="status-bar">
          <span>{{ editorStore.displayCharCount }} 字</span>
          <span>光标 {{ editorStore.cursor }}</span>
        </div>
      </div>
    </section>

    <aside v-if="layout.showInspector" class="inspector">
      <OfficialTemplatePanel v-if="showInspectorPanel('official')" />
      <OfficialFormatToolbar v-if="showInspectorPanel('official')" />
      <ContractTemplatePanel v-if="showInspectorPanel('contract')" />
      <ContractRiskPanel v-if="showInspectorPanel('contract')" />
      <ContractDraftForm v-if="showInspectorPanel('contract')" />
      <AiWritePanel v-if="showInspectorPanel('ai')" />
      <CorrectionPanel v-if="showInspectorPanel('correction')" />
      <WordCountPanel v-if="showInspectorPanel('word-count')" />
    </aside>

    <LexiconPanel v-if="showLexicon" @close="showLexicon = false" />
    <ApiSettingsPanel v-if="showApiSettings" @close="showApiSettings = false" />
    <TitleSuggestPanel v-if="showTitle" @close="showTitle = false" />
    <WeChatPanel v-if="showWeChat" @close="showWeChat = false" />
    <PoetryPanel v-if="showPoetry" @close="showPoetry = false" />

    <ChapterCreateDialog
      v-if="showChapterDialog"
      :identity-id="identitySession.identityId"
      :existing-count="suggestedCount"
      @close="showChapterDialog = false"
      @create="createDoc"
    />

    <Teleport to="body">
      <div
        v-if="showNewProject"
        class="wz-overlay"
        @click.self="showNewProject = false"
        @keyup.esc="showNewProject = false"
      >
        <div class="wz-modal">
          <div class="wz-modal__head">
            <h3>新建项目</h3>
            <button class="wz-icon-btn" title="关闭" @click="showNewProject = false">×</button>
          </div>
          <div class="wz-modal__body">
            <p class="modal-hint">请输入项目名或书名：</p>
            <input
              ref="newProjectInput"
              v-model="newProjectName"
              class="wz-input"
              placeholder="例如：长篇连载《星海》"
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
.quick-create,
.quick-chapter {
  display: flex;
  gap: var(--space-2);
}

.w-full {
  width: 100%;
  justify-content: center;
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

.modal-hint {
  margin: 0;
  font-size: 13px;
  color: var(--c-text-secondary);
}

.modal-hint + .wz-input {
  margin-top: var(--space-3);
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

.editor-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: var(--space-4);
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
