<script setup lang="ts">
import { ref, watch } from 'vue'
import { useEditorStore } from '../stores/editor'
import type { ParagraphChunk } from '../utils/text'

const editor = useEditorStore()
const level = ref(50)
const preview = ref<ParagraphChunk[]>([])
const open = ref(false)

function updatePreview() {
  preview.value = editor.splitCurrentContent(level.value)
}

watch([() => editor.content, level], updatePreview, { immediate: true, flush: 'post' })

function apply() {
  editor.applySplit(preview.value)
  open.value = false
}

function cancel() {
  open.value = false
}
</script>

<template>
  <div>
    <button class="btn" @click="open = true; updatePreview()">一键排版</button>

    <Teleport to="body">
      <div v-if="open" class="overlay" @click.self="cancel">
        <div class="modal">
          <h3>一键排版 · 段落拆分</h3>

          <div class="slider-wrap">
            <div class="slider-labels">
              <span>激进（更碎）</span>
              <span>保守（更长）</span>
            </div>
            <input
              v-model.number="level"
              type="range"
              min="0"
              max="100"
              step="1"
              class="slider"
              @input="updatePreview"
            />
          </div>

          <div class="preview-shell">
            <div class="preview">
              <p
                v-for="(chunk, i) in preview"
                :key="i"
                class="chunk"
                :class="{ hard: chunk.fromHardBreak }"
              >
                {{ chunk.text }}
              </p>
              <p v-if="!preview.length" class="empty">当前无内容可预览</p>
            </div>
          </div>

          <div class="actions">
            <button class="btn-ghost" @click="cancel">取消</button>
            <button class="btn-primary" @click="apply">应用</button>
          </div>
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
  width: min(720px, 90vw);
  max-height: 85vh;
  background: var(--c-bg-base);
  border: 1px solid var(--c-border);
  border-radius: var(--radius-2xl);
  box-shadow: 0 24px 80px rgba(0, 0, 0, 0.35);
  display: flex;
  flex-direction: column;
  overflow: hidden;
}

.modal h3 {
  margin: 0;
  padding: var(--space-5) var(--space-5) 0;
  font-size: var(--fs-xl);
  color: var(--c-text-base);
}

.slider-wrap {
  padding: var(--space-4) var(--space-5);
  display: flex;
  flex-direction: column;
  gap: var(--space-2);
}

.slider-labels {
  display: flex;
  justify-content: space-between;
  font-size: 12px;
  color: var(--c-text-tertiary);
}

.slider {
  width: 100%;
  accent-color: var(--c-accent);
  cursor: pointer;
}

.preview-shell {
  flex: 1;
  min-height: 0;
  padding: 0 var(--space-5);
  display: flex;
  flex-direction: column;
}

.preview {
  flex: 1;
  min-height: 0;
  overflow-y: auto;
  padding: var(--space-4);
  background: var(--c-surface-elevated);
  border: 1px solid var(--c-border);
  border-radius: var(--radius-xl);
  font-family: var(--font-manuscript);
  line-height: var(--lh-manuscript);
  color: var(--c-text-base);
}

.chunk {
  margin: 0 0 var(--space-5);
  text-indent: 2em;
}

.chunk.hard {
  border-left: 3px solid var(--c-accent);
  padding-left: var(--space-3);
  text-indent: 0;
}

.empty {
  color: var(--c-text-tertiary);
  text-align: center;
  margin: 0;
}

.actions {
  display: flex;
  justify-content: flex-end;
  gap: var(--space-3);
  padding: var(--space-4) var(--space-5);
  border-top: 1px solid var(--c-border);
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
</style>
