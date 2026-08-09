<script setup lang="ts">
import { ref, watch, onBeforeUnmount } from 'vue'
import { useEditor, EditorContent } from '@tiptap/vue-3'
import type { Editor } from '@tiptap/core'
import StarterKit from '@tiptap/starter-kit'
import Placeholder from '@tiptap/extension-placeholder'
import CharacterCount from '@tiptap/extension-character-count'
import { Table } from '@tiptap/extension-table'
import TableRow from '@tiptap/extension-table-row'
import TableHeader from '@tiptap/extension-table-header'
import TableCell from '@tiptap/extension-table-cell'
import { useEditorStore } from '../stores/editor'
import { useCorrectionStore } from '../stores/correction'
import { useIdentitySessionStore } from '../stores/identitySession'
import { useSettingsStore } from '../stores/settings'
import { editorRef } from '../stores/editorRef'
import { CorrectionDecorations } from './CorrectionDecorations'
import EditorToolbar from './EditorToolbar.vue'
import FindReplacePanel from './FindReplacePanel.vue'
import { FontSize } from '../editor/FontSize'
import { FontFamily } from '../editor/FontFamily'
import { LineHeight } from '../editor/LineHeight'
import { ParagraphSpacing } from '../editor/ParagraphSpacing'
import { FirstLineIndent } from '../editor/FirstLineIndent'
import { TextAlign } from '../editor/TextAlign'
import { FindReplaceCommands } from '../editor/FindReplaceCommands'

const editorStore = useEditorStore()
const correctionStore = useCorrectionStore()
const identitySession = useIdentitySessionStore()
const settings = useSettingsStore()

const showFindReplace = ref(false)

defineEmits<{
  (e: 'official'): void
  (e: 'contract'): void
  (e: 'ai'): void
}>()

const editor = useEditor({
  extensions: [
    StarterKit.configure({
      heading: { levels: [1, 2, 3] },
      undoRedo: {
        depth: settings.editor.historyDepth,
        newGroupDelay: 500,
      },
    }),
    Placeholder.configure({
      placeholder: '从这里开始写……',
    }),
    CharacterCount.configure({
      mode: 'textSize',
    }),
    Table.configure({ resizable: true }),
    TableRow,
    TableHeader,
    TableCell,
    FontSize,
    FontFamily,
    LineHeight,
    ParagraphSpacing,
    FirstLineIndent,
    TextAlign,
    FindReplaceCommands,
    CorrectionDecorations,
  ],
  content: editorStore.content,
  autofocus: 'end',
  onCreate({ editor }) {
    applyIdentityDefaults(editor)
  },
  onUpdate({ editor }) {
    const html = editor.getHTML()
    const chars = editor.storage.characterCount.characters()
    editorStore.updateContent(html, chars)
    editorStore.heartbeat()
  },
  onSelectionUpdate({ editor }) {
    const pos = editor.state.selection.anchor
    editorStore.updateCursor(pos)
  },
})

function applyIdentityDefaults(ed: Editor) {
  if (!ed) return
  const profile = identitySession.layout
  ed.chain()
    .setFontFamily(profile.defaults.fontFamily)
    .setFontSize(String(profile.defaults.fontSize))
    .setLineHeight(String(profile.defaults.lineHeight))
    .setParagraphSpacing(String(profile.defaults.paragraphSpacing))
    .setFirstLineIndent(String(profile.defaults.firstLineIndent))
    .setTextAlign(profile.defaults.textAlign)
    .run()
}

watch(
  editor,
  (ed) => {
    editorRef.value = ed ?? null
  },
  { immediate: true },
)

watch(
  () => identitySession.identityId,
  () => {
    if (editor.value && !editor.value.isDestroyed) {
      applyIdentityDefaults(editor.value)
    }
  },
)

watch(
  [
    () => correctionStore.lexiconMap,
    () => correctionStore.whitelistTerms,
    () => correctionStore.rulesOn,
    () => correctionStore.lexiconOn,
  ],
  () => {
    const ed = editor.value
    if (ed && !ed.isDestroyed) {
      ed.view.dispatch(ed.state.tr.setMeta('forceCorrection', true))
    }
  },
)

watch(
  () => editorStore.content,
  (next) => {
    if (!editor.value) return
    const cur = editor.value.getHTML()
    if (cur !== next) {
      editor.value.commands.setContent(next, { emitUpdate: false })
    }
  },
)

onBeforeUnmount(() => {
  editor.value?.destroy()
  editorRef.value = null
})

function openFindReplace() {
  showFindReplace.value = true
}
</script>

<template>
  <div class="editor-wrapper">
    <EditorToolbar
      v-if="editor && identitySession.layout.toolbar.length"
      :editor="editor"
      :profile="identitySession.layout"
      @find-replace="openFindReplace"
      @official="() => $emit('official')"
      @contract="() => $emit('contract')"
      @ai="() => $emit('ai')"
    >
      <template #split><slot name="split" /></template>
      <template #export><slot name="export" /></template>
    </EditorToolbar>
    <EditorContent :editor="editor" class="editor-content" />
  </div>
  <FindReplacePanel
    v-if="showFindReplace && editor"
    :editor="editor"
    @close="showFindReplace = false"
  />
</template>

<style>
.editor-wrapper {
  flex: 1;
  min-height: 0;
  display: flex;
  flex-direction: column;
  position: relative;
  border: 1px solid var(--c-border-strong);
  border-radius: var(--radius-xl);
  background: var(--c-surface-elevated);
  box-shadow: var(--shadow-md);
  overflow: hidden;
}

.editor-wrapper::after {
  content: '';
  position: absolute;
  inset: 0;
  pointer-events: none;
  border-radius: inherit;
  opacity: 0.42;
  background:
    linear-gradient(var(--c-accent), var(--c-accent)) top left / 12px 2px no-repeat,
    linear-gradient(var(--c-accent), var(--c-accent)) top left / 2px 12px no-repeat,
    linear-gradient(var(--c-accent), var(--c-accent)) top right / 12px 2px no-repeat,
    linear-gradient(var(--c-accent), var(--c-accent)) top right / 2px 12px no-repeat,
    linear-gradient(var(--c-accent), var(--c-accent)) bottom left / 12px 2px no-repeat,
    linear-gradient(var(--c-accent), var(--c-accent)) bottom left / 2px 12px no-repeat,
    linear-gradient(var(--c-accent), var(--c-accent)) bottom right / 12px 2px no-repeat,
    linear-gradient(var(--c-accent), var(--c-accent)) bottom right / 2px 12px no-repeat;
}

.editor-content {
  flex: 1;
  overflow-y: auto;
  padding: var(--space-6);
}

.editor-content .ProseMirror {
  min-height: 100%;
  font-family: var(--font-manuscript);
  font-size: var(--fs-manuscript);
  line-height: var(--lh-manuscript);
  color: var(--c-text-base);
  outline: none;
}

.editor-content .ProseMirror p {
  margin: 0 0 var(--space-5);
}

.editor-content .ProseMirror p:last-child {
  margin-bottom: 0;
}

.editor-content .ProseMirror h1,
.editor-content .ProseMirror h2,
.editor-content .ProseMirror h3 {
  font-family: var(--font-display);
  color: var(--c-text-base);
  margin: var(--space-6) 0 var(--space-3);
}

.editor-content .ProseMirror h1 { font-size: var(--fs-3xl); }
.editor-content .ProseMirror h2 { font-size: var(--fs-2xl); }
.editor-content .ProseMirror h3 { font-size: var(--fs-xl); }

.editor-content .ProseMirror blockquote {
  border-left: 3px solid var(--c-accent);
  padding-left: var(--space-4);
  margin: var(--space-5) 0;
  color: var(--c-text-secondary);
}

.editor-content .ProseMirror ul,
.editor-content .ProseMirror ol {
  margin: var(--space-4) 0;
  padding-left: var(--space-6);
}

.editor-content .ProseMirror ul { list-style: disc; }
.editor-content .ProseMirror ol { list-style: decimal; }

.editor-content .ProseMirror li {
  margin-bottom: var(--space-2);
}

.editor-content .ProseMirror hr {
  border: none;
  border-top: 1px solid var(--c-border-strong);
  margin: var(--space-6) 0;
}

.editor-content .ProseMirror strong {
  color: var(--c-text-base);
  font-weight: 700;
}

.editor-content .ProseMirror em {
  color: var(--c-text-secondary);
}

.editor-content .ProseMirror .is-editor-empty:first-child::before {
  content: attr(data-placeholder);
  float: left;
  color: var(--c-text-tertiary);
  pointer-events: none;
  height: 0;
}

.editor-content .ProseMirror ::selection {
  background: var(--c-selection);
}

.editor-content .ProseMirror table {
  border-collapse: collapse;
  width: 100%;
  margin: var(--space-4) 0;
}

.editor-content .ProseMirror th,
.editor-content .ProseMirror td {
  border: 1px solid var(--c-border);
  padding: var(--space-2) var(--space-3);
  min-width: 80px;
  text-align: left;
}

.editor-content .ProseMirror th {
  background: var(--c-bg-sunken);
  font-weight: 600;
}
</style>
