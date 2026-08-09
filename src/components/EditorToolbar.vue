<script setup lang="ts">
import { computed } from 'vue'
import type { Editor } from '@tiptap/vue-3'
import type { LayoutProfile } from '../data/layoutProfiles'

const props = defineProps<{
  editor: Editor
  profile: LayoutProfile
}>()

defineEmits<{
  (e: 'find-replace'): void
  (e: 'title-suggest'): void
  (e: 'lexicon'): void
  (e: 'ai'): void
  (e: 'wechat'): void
  (e: 'poetry'): void
  (e: 'official'): void
  (e: 'contract'): void
  (e: 'export'): void
}>()

const fontSizes = [12, 13, 14, 15, 16, 17, 18, 20, 22, 24, 28, 32]
const fontFamilies = [
  { label: '默认', value: 'var(--font-manuscript)' },
  { label: '宋体', value: "'Source Han Serif SC', 'SimSun', serif" },
  { label: '仿宋_GB2312', value: "'FangSong_GB2312', 'FangSong', 'SimSun', serif" },
  { label: '黑体', value: "'Noto Sans SC', 'Microsoft YaHei UI', sans-serif" },
  { label: '楷体', value: "'KaiTi', 'STKaiti', serif" },
]
const lineHeights = [1.25, 1.45, 1.6, 1.75, 1.9, 2.1, 2.3]
const paragraphSpacings = [0, 8, 12, 16, 20, 24, 32, 40]
const firstLineIndents = [0, 1, 2, 3, 4]

const activeSize = computed(() => {
  const attrs = props.editor.getAttributes('fontSize')
  return attrs.size ? Number(attrs.size) : props.profile.defaults.fontSize
})

const activeFamily = computed(() => props.editor.getAttributes('fontFamily').font || props.profile.defaults.fontFamily)
const activeLineHeight = computed(() => props.editor.getAttributes('paragraph').lineHeight || props.profile.defaults.lineHeight)
const activeSpacing = computed(() => {
  const v = props.editor.getAttributes('paragraph').paragraphSpacing
  return v != null ? Number(v) : props.profile.defaults.paragraphSpacing
})
const activeIndent = computed(() => {
  const v = props.editor.getAttributes('paragraph').firstLineIndent
  return v != null ? Number(v) : props.profile.defaults.firstLineIndent
})
const activeAlign = computed(() => props.editor.getAttributes('paragraph').textAlign || 'left')

function setSize(size: number) {
  props.editor.chain().focus().setFontSize(String(size)).run()
}

function setFamily(font: string) {
  props.editor.chain().focus().setFontFamily(font).run()
}

function setLineHeight(lh: number) {
  props.editor.chain().focus().setLineHeight(String(lh)).run()
}

function setSpacing(px: number) {
  props.editor.chain().focus().setParagraphSpacing(String(px)).run()
}

function setIndent(em: number) {
  props.editor.chain().focus().setFirstLineIndent(String(em)).run()
}

function setAlign(align: string) {
  props.editor.chain().focus().setTextAlign(align).run()
}

function insertTable() {
  props.editor.chain().focus().insertTable({ rows: 3, cols: 3, withHeaderRow: true }).run()
}

function toolbarAction(id: string) {
  switch (id) {
    case 'undo':
      props.editor.chain().focus().undo().run()
      break
    case 'redo':
      props.editor.chain().focus().redo().run()
      break
    case 'bold':
      props.editor.chain().focus().toggleBold().run()
      break
    case 'italic':
      props.editor.chain().focus().toggleItalic().run()
      break
    case 'strike':
      props.editor.chain().focus().toggleStrike().run()
      break
    case 'find-replace':
      break
    case 'table':
      insertTable()
      break
  }
}

const items = computed(() => props.profile.toolbar)
</script>

<template>
  <div class="editor-toolbar">
    <template v-for="id in items" :key="id">
      <template v-if="id === 'separator'">
        <span class="toolbar-sep" />
      </template>
      <template v-else-if="id === 'undo'">
        <button class="wz-icon-btn" title="撤销 (Ctrl+Z)" @click="toolbarAction('undo')">↩</button>
      </template>
      <template v-else-if="id === 'redo'">
        <button class="wz-icon-btn" title="重做 (Ctrl+Y)" @click="toolbarAction('redo')">↪</button>
      </template>
      <template v-else-if="id === 'bold'">
        <button class="wz-icon-btn" :class="{ active: editor.isActive('bold') }" title="加粗" @click="toolbarAction('bold')">B</button>
      </template>
      <template v-else-if="id === 'italic'">
        <button class="wz-icon-btn" :class="{ active: editor.isActive('italic') }" title="斜体" @click="toolbarAction('italic')">I</button>
      </template>
      <template v-else-if="id === 'strike'">
        <button class="wz-icon-btn" :class="{ active: editor.isActive('strike') }" title="删除线" @click="toolbarAction('strike')">S</button>
      </template>
      <template v-else-if="id === 'font-family'">
        <select class="wz-select toolbar-select" :value="activeFamily" @change="setFamily(($event.target as HTMLSelectElement).value)">
          <option v-for="f in fontFamilies" :key="f.value" :value="f.value">{{ f.label }}</option>
        </select>
      </template>
      <template v-else-if="id === 'font-size'">
        <select class="wz-select toolbar-select" :value="activeSize" @change="setSize(Number(($event.target as HTMLSelectElement).value))">
          <option v-for="s in fontSizes" :key="s" :value="s">{{ s }} px</option>
        </select>
      </template>
      <template v-else-if="id === 'line-height'">
        <select class="wz-select toolbar-select" :value="activeLineHeight" @change="setLineHeight(Number(($event.target as HTMLSelectElement).value))">
          <option v-for="lh in lineHeights" :key="lh" :value="lh">{{ lh }}</option>
        </select>
      </template>
      <template v-else-if="id === 'paragraph-spacing'">
        <select class="wz-select toolbar-select" :value="activeSpacing" @change="setSpacing(Number(($event.target as HTMLSelectElement).value))">
          <option v-for="px in paragraphSpacings" :key="px" :value="px">段距 {{ px }}</option>
        </select>
      </template>
      <template v-else-if="id === 'first-line-indent'">
        <select class="wz-select toolbar-select" :value="activeIndent" @change="setIndent(Number(($event.target as HTMLSelectElement).value))">
          <option v-for="em in firstLineIndents" :key="em" :value="em">缩进 {{ em }} em</option>
        </select>
      </template>
      <template v-else-if="id === 'text-align'">
        <button class="wz-icon-btn" :class="{ active: activeAlign === 'left' }" title="左对齐" @click="setAlign('left')">⬅</button>
        <button class="wz-icon-btn" :class="{ active: activeAlign === 'center' }" title="居中对齐" @click="setAlign('center')">↔</button>
        <button class="wz-icon-btn" :class="{ active: activeAlign === 'right' }" title="右对齐" @click="setAlign('right')">➡</button>
        <button class="wz-icon-btn" :class="{ active: activeAlign === 'justify' }" title="两端对齐" @click="setAlign('justify')">≡</button>
      </template>
      <template v-else-if="id === 'table'">
        <button class="wz-icon-btn" title="插入表格" @click="insertTable">▦</button>
      </template>
      <template v-else-if="id === 'find-replace'">
        <button class="wz-icon-btn" title="查找替换 (Ctrl+H)" @click="$emit('find-replace')">🔍</button>
      </template>
      <template v-else-if="id === 'split'">
        <slot name="split" />
      </template>
      <template v-else-if="id === 'title-suggest'">
        <button class="wz-btn wz-btn--ghost wz-btn--sm" @click="$emit('title-suggest')">取标题</button>
      </template>
      <template v-else-if="id === 'lexicon'">
        <button class="wz-btn wz-btn--ghost wz-btn--sm" @click="$emit('lexicon')">词库</button>
      </template>
      <template v-else-if="id === 'ai'">
        <button class="wz-btn wz-btn--ghost wz-btn--sm" @click="$emit('ai')">AI</button>
      </template>
      <template v-else-if="id === 'wechat'">
        <button class="wz-btn wz-btn--ghost wz-btn--sm" @click="$emit('wechat')">公众号</button>
      </template>
      <template v-else-if="id === 'poetry'">
        <button class="wz-btn wz-btn--ghost wz-btn--sm" @click="$emit('poetry')">格律</button>
      </template>
      <template v-else-if="id === 'official'">
        <button class="wz-btn wz-btn--ghost wz-btn--sm" @click="$emit('official')">公文</button>
      </template>
      <template v-else-if="id === 'contract'">
        <button class="wz-btn wz-btn--ghost wz-btn--sm" @click="$emit('contract')">合同</button>
      </template>
      <template v-else-if="id === 'export'">
        <slot name="export" />
      </template>
    </template>
  </div>
</template>

<style scoped>
.editor-toolbar {
  display: flex;
  align-items: center;
  flex-wrap: wrap;
  gap: var(--space-2);
  padding: var(--space-2) var(--space-3);
  border-bottom: 1px solid var(--c-border);
  background: var(--c-bg-sunken);
}

.toolbar-sep {
  width: 1px;
  height: 20px;
  background: var(--c-border);
  margin: 0 var(--space-1);
}

.toolbar-select {
  min-width: 84px;
  height: 28px;
  font-size: 12px;
  padding: 0 var(--space-2);
}

.wz-icon-btn {
  width: 28px;
  height: 28px;
  border-radius: var(--radius-sm);
  border: 1px solid transparent;
  background: transparent;
  color: var(--c-text-secondary);
  display: grid;
  place-items: center;
  cursor: pointer;
  font-size: 13px;
  transition: all 0.15s ease;
}

.wz-icon-btn:hover {
  background: var(--c-surface-hover);
  color: var(--c-text-base);
}

.wz-icon-btn.active {
  background: var(--c-accent-weak);
  color: var(--c-accent);
  border-color: var(--c-accent-weak);
}
</style>
