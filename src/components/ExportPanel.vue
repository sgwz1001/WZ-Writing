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
  // MVP：先用快照表里的记录当日志；后续可接入 operation_log 表
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
  <div>
    <button class="btn" @click="visible = true">导入 / 导出</button>

    <Teleport to="body">
      <div v-if="visible" class="overlay" @click.self="close">
        <div class="modal">
          <div class="modal-head">
            <h3>批量导入 / 导出</h3>
            <button class="close-btn" @click="close">×</button>
          </div>

          <div class="tabs">
            <button :class="{ active: activeTab === 'doc' }" @click="activeTab = 'doc'">文档导出</button>
            <button :class="{ active: activeTab === 'log' }" @click="activeTab = 'log'">日志导出</button>
          </div>

          <div v-if="activeTab === 'doc'" class="body">
            <div class="doc-actions">
              <button class="mini" @click="selectAll">全选</button>
              <button class="mini" @click="selectNone">清空</button>
            </div>
            <div class="doc-list">
              <label v-for="d in projectStore.docs" :key="d.id" class="doc-row">
                <input :checked="selectedIds.has(d.id)" type="checkbox" @change="toggleDoc(d.id)" />
                <span>{{ d.title }}</span>
              </label>
              <p v-if="!projectStore.docs.length" class="hint">当前项目没有章节。</p>
            </div>

            <div class="field">
              <span class="field-label">格式</span>
              <select v-model="format" class="field-input">
                <option v-for="f in formats" :key="f" :value="f">
                  {{ { txt: 'TXT 纯文本', md: 'Markdown', html: 'HTML 网页', docx: 'Word .docx', csv: 'CSV 表格', xlsx: 'Excel 表格', pdf: 'PDF（打印）' }[f] }}
                </option>
              </select>
            </div>

            <div class="actions">
              <button class="btn-ghost" @click="doImport">从文件导入</button>
              <button class="btn-primary" :disabled="busy || !canExport" @click="doExport">
                {{ busy ? '处理中…' : '导出' }}
              </button>
            </div>
          </div>

          <div v-else class="body">
            <p class="hint">导出当前文档的保存历史为 CSV / Excel。</p>
            <div class="actions">
              <button class="btn-primary" :disabled="busy" @click="format = 'csv'; doExport()">
                {{ busy ? '处理中…' : '导出日志' }}
              </button>
            </div>
          </div>

          <p v-if="message" class="message">{{ message }}</p>
        </div>
      </div>
    </Teleport>
  </div>
</template>

<style scoped>
.btn {
  padding: var(--space-2) var(--space-4);
  border-radius: var(--radius-md);
  border: 1px solid var(--c-border);
  background: var(--c-surface-elevated);
  color: var(--c-text-base);
  font-size: var(--fs-sm);
  cursor: pointer;
  white-space: nowrap;
  transition: background var(--dur-fast) ease;
}

.btn:hover {
  background: var(--c-surface-hover);
}

.overlay {
  position: fixed;
  inset: 0;
  z-index: var(--z-modal);
  background: rgba(0, 0, 0, 0.45);
  backdrop-filter: blur(var(--blur-sm));
  display: grid;
  place-items: center;
  padding: var(--space-6);
}

.modal {
  width: min(520px, 90vw);
  max-height: 85vh;
  background: var(--c-bg-base);
  border: 1px solid var(--c-border);
  border-radius: var(--radius-2xl);
  box-shadow: 0 24px 80px rgba(0, 0, 0, 0.35);
  display: flex;
  flex-direction: column;
  overflow: hidden;
}

.modal-head {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: var(--space-4) var(--space-5);
  border-bottom: 1px solid var(--c-border);
}

.modal-head h3 {
  margin: 0;
  font-size: var(--fs-xl);
  color: var(--c-text-base);
}

.close-btn {
  width: 28px;
  height: 28px;
  border-radius: var(--radius-md);
  display: grid;
  place-items: center;
  font-size: 18px;
  color: var(--c-text-tertiary);
  cursor: pointer;
}

.close-btn:hover {
  background: var(--c-surface-hover);
  color: var(--c-text-base);
}

.tabs {
  display: flex;
  gap: var(--space-1);
  padding: var(--space-3) var(--space-5) 0;
}

.tabs button {
  padding: var(--space-2) var(--space-4);
  border-radius: var(--radius-md);
  border: none;
  background: transparent;
  color: var(--c-text-secondary);
  font-size: var(--fs-sm);
  cursor: pointer;
}

.tabs button.active {
  background: var(--c-surface-active);
  color: var(--c-text-base);
}

.body {
  padding: var(--space-4) var(--space-5);
  display: flex;
  flex-direction: column;
  gap: var(--space-4);
  overflow-y: auto;
}

.doc-actions {
  display: flex;
  gap: var(--space-2);
}

.mini {
  padding: var(--space-1) var(--space-3);
  border-radius: var(--radius-sm);
  border: 1px solid var(--c-border);
  background: var(--c-bg-sunken);
  color: var(--c-text-secondary);
  font-size: 12px;
  cursor: pointer;
}

.doc-list {
  display: flex;
  flex-direction: column;
  gap: var(--space-1);
  max-height: 200px;
  overflow-y: auto;
  padding: var(--space-2);
  border: 1px solid var(--c-border);
  border-radius: var(--radius-lg);
  background: var(--c-surface-elevated);
}

.doc-row {
  display: flex;
  align-items: center;
  gap: var(--space-2);
  padding: var(--space-2);
  border-radius: var(--radius-md);
  cursor: pointer;
  font-size: var(--fs-sm);
  color: var(--c-text-base);
}

.doc-row:hover {
  background: var(--c-surface-hover);
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
  padding: var(--space-2) var(--space-3);
  border-radius: var(--radius-md);
  border: 1px solid var(--c-border);
  background: var(--c-surface-elevated);
  color: var(--c-text-base);
  font-size: var(--fs-sm);
}

.actions {
  display: flex;
  justify-content: flex-end;
  gap: var(--space-3);
  padding-top: var(--space-2);
}

.btn-ghost,
.btn-primary {
  padding: var(--space-2) var(--space-5);
  border-radius: var(--radius-md);
  font-size: var(--fs-sm);
  cursor: pointer;
  border: 1px solid var(--c-border);
}

.btn-ghost {
  background: transparent;
  color: var(--c-text-secondary);
}

.btn-primary {
  background: var(--c-accent);
  color: var(--c-text-on-accent);
  border-color: transparent;
}

.btn-primary:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

.hint,
.message {
  font-size: var(--fs-sm);
  color: var(--c-text-tertiary);
  margin: 0;
}

.message {
  color: var(--c-accent);
  padding: 0 var(--space-5) var(--space-4);
}
</style>
