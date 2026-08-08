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
  <button class="wz-btn" @click="open = true; updatePreview()">一键排版</button>

  <Teleport to="body">
    <div v-if="open" class="wz-overlay" @click.self="cancel">
      <div class="wz-modal">
        <div class="wz-modal__head">
          <h3>一键排版 · 段落拆分</h3>
          <button class="wz-icon-btn" title="关闭" @click="cancel">×</button>
        </div>

        <div class="wz-modal__body">
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
              class="wz-slider"
              :style="{ '--_fill': level + '%' }"
              @input="updatePreview"
            />
            <p class="slider-hint">越靠左，分词越激进、段落越细碎；越靠右越保守、段落越长。</p>
          </div>

          <div class="preview">
            <p
              v-for="(chunk, i) in preview"
              :key="i"
              class="chunk"
              :class="{ hard: chunk.fromHardBreak }"
            >
              {{ chunk.text }}
            </p>
            <p v-if="!preview.length" class="wz-empty">当前无内容可预览</p>
          </div>
        </div>

        <div class="wz-modal__actions">
          <button class="wz-btn wz-btn--ghost" @click="cancel">取消</button>
          <button class="wz-btn wz-btn--primary" @click="apply">应用</button>
        </div>
      </div>
    </div>
  </Teleport>
</template>

<style scoped>
.slider-wrap {
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

.slider-hint {
  margin: 0;
  font-size: 11px;
  color: var(--c-text-tertiary);
  line-height: 1.5;
}

.preview {
  flex: 1;
  min-height: 220px;
  max-height: 46vh;
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
</style>
