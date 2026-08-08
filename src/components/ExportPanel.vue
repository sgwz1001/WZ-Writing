<script setup lang="ts">
import { computed, ref } from 'vue'
import { invoke } from '@tauri-apps/api/core'
import { useProjectStore } from '../stores/project'
import { useEditorStore } from '../stores/editor'
import { exportDocuments, exportLogs, pickExportPath, importDocumentText, pickImportPath, type ExportDoc, type ExportFormat } from '../utils/export'

const projectStore = useProjectStore()
const editorStore = useEditorStore()

const visible = ref(false)
const activeTab = ref<'doc' | 'log'>('doc')
const format = ref<ExportFormat>('txt')
const selectedIds = ref<Set<string>>(new Set())
const busy = ref(false)
const message = ref('')

const formats: ExportFormat[] = ['txt', 'md', 'html', 'docx', 'pdf']

const canExport = computed(() => {
  if (activeTab.value === 'doc') return selectedIds.value.size > 0
  return true
})

function toggleDoc(id: string) {
  const next = new Set(selectedIds.value)
  if (next.has(id)) next.delete(id)
  else next.add(id)
  selectedIds.value = next
}

function selectAll() {
  selectedIds.value = new Set(projectStore.docs.map((d) => d.id))
}

function selectNone() {
  selectedIds.value = new Set()
}

async function doExport() {
  if (!canExport.value) return
  busy.value = true
  message.value = ''
  try {
    if (activeTab.value === 'doc') {
      const docs: ExportDoc[] = projectStore.docs
        .filter((d) => selectedIds.value.has(d.id))
        .map((d) => ({
          id: d.id,
          projectName: projectStore.currentProject()?.name || '未命名项目',
          title: d.title,
          html: editorStore.content,
          updatedAt: d.updatedAt,
        }))
      const path = await pickExportPath(docs, format.value)
      if (!path) return
      await exportDocuments(docs, format.value, path)
      message.value = `已导出：${path}`
    } else {
      const path = await pickExportPath([], 'csv')
      if (!path) return
      const rows = await fetchLogs()
      const ext = path.endsWith('.xlsx') ? 'xlsx' : 'csv'
      await exportLogs(rows, ext, path)
      message.value = `日志已导出：${path}`
    }
  } catch (e: any) {
    message.value = `导出失败：${e?.message || String(e)}`
  } finally {
    busy.value = false
  }
}

async function fetchLogs(): Promise<any[]> {
  if (!editorStore.docId) return []
  const list = await invoke<any[]>('list_snapshots', { docId: editorStore.docId }).catch(() => [])
  return list.map((s) => ({
    time: s.createdAt,
    action: `保存（${s.reason || 'auto'}）`,
    project: projectStore.currentProject()?.name,
    document: editorStore.title,
    detail: `${s.charCount ?? 0} 字`,
  }))
}

async function doImport() {
  busy.value = true
  message.value = ''
  try {
    const path = await pickImportPath()
    if (!path) return
    const text = await importDocumentText(path)
    const name = (path as string).split(/[\\/]/).pop() || '导入文档'
    const pid = projectStore.currentProjectId
    if (!pid) {
      message.value = '请先选择一个项目再导入。'
      return
    }
    const doc = await projectStore.createDoc(pid, name.replace(/\.[^.]+$/, ''))
    editorStore.open(doc.id, pid, doc.title, `<p>${text.replace(/\n{2,}/g, '</p><p>').replace(/\n/g, '<br>')}</p>`)
    await editorStore.save()
    message.value = '导入成功'
  } catch (e: any) {
    message.value = `导入失败：${e?.message || String(e)}`
  } finally {
    busy.value = false
  }
}

function close() {
  visible.value = false
  message.value = ''
}
</script>

<template>
  <button class="wz-btn" @click="visible = true">导入 / 导出</button>

  <Teleport to="body">
    <div v-if="visible" class="wz-overlay" @click.self="close">
      <div class="wz-modal">
        <div class="wz-modal__head">
          <h3>批量导入 / 导出</h3>
          <button class="wz-icon-btn" title="关闭" @click="close">×</button>
        </div>

        <div class="wz-tabs">
          <button :class="{ 'is-active': activeTab === 'doc' }" @click="activeTab = 'doc'">文档导出</button>
          <button :class="{ 'is-active': activeTab === 'log' }" @click="activeTab = 'log'">日志导出</button>
        </div>

        <div v-if="activeTab === 'doc'" class="wz-modal__body">
          <div class="doc-actions">
            <button class="wz-btn wz-btn--ghost wz-btn--sm" @click="selectAll">全选</button>
            <button class="wz-btn wz-btn--ghost wz-btn--sm" @click="selectNone">清空</button>
          </div>
          <div class="doc-list">
            <label v-for="d in projectStore.docs" :key="d.id" class="wz-list-item">
              <span class="wz-check">
                <input :checked="selectedIds.has(d.id)" type="checkbox" @change="toggleDoc(d.id)" />
              </span>
              <span class="doc-title">{{ d.title }}</span>
            </label>
            <p v-if="!projectStore.docs.length" class="wz-empty">当前项目没有章节。</p>
          </div>

          <div class="field">
            <span class="field-label">格式</span>
            <select v-model="format" class="wz-input field-input">
              <option v-for="f in formats" :key="f" :value="f">
                {{ { txt: 'TXT 纯文本', md: 'Markdown', html: 'HTML 网页', docx: 'Word .docx', pdf: 'PDF（打印）', csv: 'CSV 表格', xlsx: 'Excel 表格' }[f] }}
              </option>
            </select>
          </div>

          <div class="wz-modal__actions">
            <button class="wz-btn wz-btn--ghost" @click="doImport">从文件导入</button>
            <button class="wz-btn wz-btn--primary" :disabled="busy || !canExport" @click="doExport">
              {{ busy ? '处理中…' : '导出' }}
            </button>
          </div>
        </div>

        <div v-else class="wz-modal__body">
          <p class="hint">导出当前文档的保存历史为 CSV / Excel。</p>
          <div class="wz-modal__actions">
            <button class="wz-btn wz-btn--primary" :disabled="busy" @click="format = 'csv'; doExport()">
              {{ busy ? '处理中…' : '导出日志' }}
            </button>
          </div>
        </div>

        <p v-if="message" class="message">{{ message }}</p>
      </div>
    </div>
  </Teleport>
</template>

<style scoped>
.doc-actions {
  display: flex;
  gap: var(--space-2);
}

.doc-list {
  display: flex;
  flex-direction: column;
  gap: var(--space-1);
  max-height: 220px;
  overflow-y: auto;
  padding: var(--space-2);
  border: 1px solid var(--c-border);
  border-radius: var(--radius-lg);
  background: var(--c-surface-elevated);
}

.wz-list-item {
  gap: var(--space-3);
}

.doc-title {
  flex: 1;
  min-width: 0;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  font-size: var(--fs-sm);
}

.field {
  display: flex;
  align-items: center;
  gap: var(--space-3);
}

.field-label {
  font-size: var(--fs-sm);
  color: var(--c-text-secondary);
  white-space: nowrap;
}

.field-input {
  flex: 1;
}

.hint {
  font-size: var(--fs-sm);
  color: var(--c-text-tertiary);
  margin: 0;
}

.message {
  color: var(--c-accent);
  padding: 0 var(--space-5) var(--space-4);
  font-size: var(--fs-sm);
  margin: 0;
}
</style>
