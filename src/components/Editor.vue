<script setup lang="ts">
import { watch, onBeforeUnmount } from 'vue'
import { useEditor, EditorContent } from '@tiptap/vue-3'
import StarterKit from '@tiptap/starter-kit'
import Placeholder from '@tiptap/extension-placeholder'
import CharacterCount from '@tiptap/extension-character-count'
import { useEditorStore } from '../stores/editor'

const editorStore = useEditorStore()

const editor = useEditor({
  extensions: [
    StarterKit.configure({
      // 写作场景下不需要默认 heading 的快捷键，容易误触
      heading: {
        levels: [1, 2, 3],
      },
    }),
    Placeholder.configure({
      placeholder: '从这里开始写……',
    }),
    CharacterCount.configure({
      mode: 'textSize',
    }),
  ],
  content: editorStore.content,
  autofocus: 'end',
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

// 当 store 中内容变化（如恢复历史版本）时同步到编辑器
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
})
</script>

<template>
  <div class="editor-wrapper">
    <EditorContent :editor="editor" class="editor-content" />
  </div>
</template>

<style>
.editor-wrapper {
  flex: 1;
  min-height: 0;
  display: flex;
  flex-direction: column;
  border: 1px solid var(--c-border);
  border-radius: var(--radius-xl);
  background: var(--c-surface-elevated);
  overflow: hidden;
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

.editor-content .ProseMirror h1 {
  font-size: var(--fs-3xl);
}

.editor-content .ProseMirror h2 {
  font-size: var(--fs-2xl);
}

.editor-content .ProseMirror h3 {
  font-size: var(--fs-xl);
}

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

.editor-content .ProseMirror ul {
  list-style: disc;
}

.editor-content .ProseMirror ol {
  list-style: decimal;
}

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

/* 编辑器内的选中文本使用皮肤定义的颜色 */
.editor-content .ProseMirror ::selection {
  background: var(--c-selection);
}
</style>
