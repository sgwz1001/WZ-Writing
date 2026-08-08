<script setup lang="ts">
import { onMounted, ref } from 'vue'
import { useCorrectionStore } from '../stores/correction'
import { DEFAULT_LEXICON, type SeedEntry } from '../data/defaultLexicon'

const emit = defineEmits<{ (e: 'close'): void }>()
const correction = useCorrectionStore()

const tab = ref<'lexicon' | 'whitelist'>('lexicon')

// 新增错词表单
const newWrong = ref('')
const newRight = ref('')
const newCategory = ref('同音错字')
const newNote = ref('')

// 新增白名单表单
const newTerm = ref('')
const newTermNote = ref('')

// 批量导入
const showImport = ref(false)
const importText = ref('')
const importMsg = ref('')

const CATEGORIES = ['同音错字', '形近错字', '错词', '成语误用', '搭配不当', '自定义']

onMounted(() => {
  if (!correction.loaded) correction.refreshAll()
})

function addEntry() {
  const w = newWrong.value.trim()
  const r = newRight.value.trim()
  if (!w || !r) return
  correction.addEntry({
    wrong: w,
    right: r,
    category: newCategory.value,
    note: newNote.value.trim(),
  })
  newWrong.value = ''
  newRight.value = ''
  newNote.value = ''
}

function loadBuiltin() {
  const list = DEFAULT_LEXICON.map((e: SeedEntry) => ({
    wrong: e.wrong,
    right: e.right,
    category: e.category,
    note: e.note,
  }))
  correction.importEntries(list).then((n) => {
    importMsg.value = `已载入 ${n} 条内置词库`
    setTimeout(() => (importMsg.value = ''), 2500)
  })
}

function parseImport() {
  const lines = importText.value.split('\n').map((l) => l.trim()).filter(Boolean)
  const list = []
  for (const line of lines) {
    // 支持逗号 / 制表符 / 多个空格 分隔
    const parts = line.split(/[,，\t]+|\s{2,}/).map((p) => p.trim()).filter(Boolean)
    if (parts.length < 2) continue
    list.push({
      wrong: parts[0],
      right: parts[1],
      category: parts[2] || '自定义',
      note: parts[3] || '',
    })
  }
  if (!list.length) {
    importMsg.value = '没有解析到有效条目（每行：错词,正确词,分类）'
    return
  }
  correction.importEntries(list).then((n) => {
    importMsg.value = `已导入 ${n} 条`
    importText.value = ''
    showImport.value = false
    setTimeout(() => (importMsg.value = ''), 2500)
  })
}

function addWhitelist() {
  const t = newTerm.value.trim()
  if (!t) return
  correction.addWhitelist(t, newTermNote.value.trim())
  newTerm.value = ''
  newTermNote.value = ''
}
</script>

<template>
  <div class="wz-overlay" @click.self="emit('close')">
    <div class="wz-modal lexicon-modal">
      <div class="wz-modal__head">
        <h3>错词库与白名单</h3>
        <button class="wz-icon-btn" @click="emit('close')" aria-label="关闭">
          <svg viewBox="0 0 24 24" width="18" height="18"><path d="M6 6l12 12M18 6L6 18" stroke="currentColor" stroke-width="2" stroke-linecap="round" /></svg>
        </button>
      </div>

      <div class="wz-tabs">
        <button :class="{ 'is-active': tab === 'lexicon' }" @click="tab = 'lexicon'">错词库</button>
        <button :class="{ 'is-active': tab === 'whitelist' }" @click="tab = 'whitelist'">专有名词白名单</button>
      </div>

      <div class="wz-modal__body">
        <p v-if="importMsg" class="import-msg">{{ importMsg }}</p>

        <!-- 错词库 -->
        <div v-if="tab === 'lexicon'" class="tab-pane">
          <div class="toolbar-row">
            <button class="wz-btn wz-btn--ghost wz-btn--sm" @click="loadBuiltin">载入内置词库</button>
            <button class="wz-btn wz-btn--ghost wz-btn--sm" @click="showImport = !showImport">批量导入</button>
          </div>

          <div v-if="showImport" class="import-box">
            <p class="hint">每行一条，格式：<code>错词,正确词,分类</code>（分类可省略）。支持中英文逗号与制表符分隔。</p>
            <textarea v-model="importText" class="wz-input import-area" placeholder="按装,安装,形近错字&#10;必竟,毕竟,同音错字"></textarea>
            <div class="toolbar-row">
              <button class="wz-btn wz-btn--primary wz-btn--sm" @click="parseImport">导入</button>
              <button class="wz-btn wz-btn--ghost wz-btn--sm" @click="showImport = false">取消</button>
            </div>
          </div>

          <div class="add-form">
            <input v-model="newWrong" class="wz-input" placeholder="错词" />
            <input v-model="newRight" class="wz-input" placeholder="正确词" />
            <select v-model="newCategory" class="wz-input">
              <option v-for="c in CATEGORIES" :key="c" :value="c">{{ c }}</option>
            </select>
            <input v-model="newNote" class="wz-input" placeholder="备注（可选）" />
            <button class="wz-btn wz-btn--primary wz-btn--sm" @click="addEntry">添加</button>
          </div>

          <ul class="entry-list">
            <li v-for="e in correction.entries" :key="e.id" class="entry">
              <label class="wz-check entry-enable">
                <input type="checkbox" :checked="e.enabled" @change="correction.setEntryEnabled(e.id, ($event.target as HTMLInputElement).checked)" />
                <span class="wz-check__box"></span>
              </label>
              <div class="entry-main">
                <div class="entry-words">
                  <span class="orig">{{ e.wrong }}</span>
                  <span class="arrow">→</span>
                  <span class="rev">{{ e.right }}</span>
                  <span class="chip">{{ e.category }}</span>
                </div>
                <div v-if="e.note" class="entry-note">{{ e.note }}</div>
              </div>
              <button class="wz-btn wz-btn--danger wz-btn--sm" @click="correction.removeEntry(e.id)">删除</button>
            </li>
            <p v-if="!correction.entries.length" class="empty">词库还是空的，先「载入内置词库」或手动添加。</p>
          </ul>
        </div>

        <!-- 白名单 -->
        <div v-else class="tab-pane">
          <p class="hint">专有名词（人名、地名、功法名等）加入白名单后，纠错不会改动它们。</p>
          <div class="add-form">
            <input v-model="newTerm" class="wz-input" placeholder="专有名词" />
            <input v-model="newTermNote" class="wz-input" placeholder="备注（可选）" />
            <button class="wz-btn wz-btn--primary wz-btn--sm" @click="addWhitelist">添加</button>
          </div>
          <ul class="entry-list">
            <li v-for="w in correction.whitelist" :key="w.id" class="entry">
              <div class="entry-main">
                <div class="entry-words">
                  <span class="rev">{{ w.term }}</span>
                </div>
                <div v-if="w.note" class="entry-note">{{ w.note }}</div>
              </div>
              <button class="wz-btn wz-btn--danger wz-btn--sm" @click="correction.removeWhitelist(w.id)">删除</button>
            </li>
            <p v-if="!correction.whitelist.length" class="empty">还没有白名单条目。</p>
          </ul>
        </div>
      </div>
    </div>
  </div>
</template>

<style scoped>
.lexicon-modal {
  width: min(680px, 92vw);
  max-height: 86vh;
  display: flex;
  flex-direction: column;
}
.wz-modal__body {
  overflow-y: auto;
  padding: var(--space-5);
  display: flex;
  flex-direction: column;
  gap: var(--space-4);
}
.import-msg {
  font-size: 13px;
  color: #4ade80;
  background: color-mix(in srgb, #4ade80 12%, transparent);
  padding: var(--space-2) var(--space-3);
  border-radius: var(--radius-sm);
}
.toolbar-row {
  display: flex;
  gap: var(--space-2);
}
.import-box {
  display: flex;
  flex-direction: column;
  gap: var(--space-2);
  padding: var(--space-3);
  border: 1px solid var(--c-border);
  border-radius: var(--radius-md);
  background: var(--c-surface);
}
.hint {
  font-size: 12px;
  color: var(--c-text-tertiary);
  line-height: 1.6;
  margin: 0;
}
.hint code {
  font-family: var(--font-mono);
  background: var(--c-surface-elevated);
  padding: 1px 5px;
  border-radius: 4px;
}
.import-area {
  min-height: 96px;
  resize: vertical;
  font-family: var(--font-mono);
  font-size: 13px;
}
.add-form {
  display: grid;
  grid-template-columns: 1fr 1fr 1.1fr 1.3fr auto;
  gap: var(--space-2);
  align-items: center;
}
.entry-list {
  list-style: none;
  margin: 0;
  padding: 0;
  display: flex;
  flex-direction: column;
  gap: var(--space-2);
}
.entry {
  display: flex;
  align-items: center;
  gap: var(--space-3);
  padding: var(--space-3);
  border: 1px solid var(--c-border);
  border-radius: var(--radius-md);
  background: var(--c-surface);
}
.entry-enable {
  flex-shrink: 0;
}
.entry-main {
  flex: 1;
  min-width: 0;
}
.entry-words {
  display: flex;
  align-items: center;
  gap: var(--space-2);
  flex-wrap: wrap;
  font-size: 14px;
}
.orig {
  color: var(--c-error);
  text-decoration: line-through;
}
.arrow {
  color: var(--c-text-tertiary);
}
.rev {
  color: #4ade80;
  font-weight: 600;
}
.chip {
  font-size: 11px;
  padding: 1px 8px;
  border-radius: var(--radius-full);
  background: var(--c-accent-weak);
  color: var(--c-accent);
  font-weight: 600;
}
.entry-note {
  font-size: 12px;
  color: var(--c-text-tertiary);
  margin-top: 2px;
}
.empty {
  font-size: 13px;
  color: var(--c-text-tertiary);
}
</style>
