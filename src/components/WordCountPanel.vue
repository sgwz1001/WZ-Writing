<script setup lang="ts">
import { useEditorStore } from '../stores/editor'

const editor = useEditorStore()
</script>

<template>
  <div class="wz-panel wz-panel--pad">
    <div class="wz-divider"><span>字数统计</span></div>

    <div class="switches">
      <label class="wz-check">
        <input v-model="editor.countPunctuation" type="checkbox" />
        <span>计入标点</span>
      </label>
      <label class="wz-check">
        <input v-model="editor.countTitle" type="checkbox" />
        <span>计入标题</span>
      </label>
    </div>

    <div class="big-number">
      <span class="num">{{ editor.displayCharCount }}</span>
      <span class="unit">字</span>
    </div>

    <div class="grid">
      <div class="cell">
        <span class="label">含标点 · 含标题</span>
        <span class="value">{{ editor.stats.totalChars }}</span>
      </div>
      <div class="cell">
        <span class="label">不含标点 · 含标题</span>
        <span class="value">{{ editor.stats.charsNoPunct }}</span>
      </div>
      <div class="cell">
        <span class="label">含标点 · 不含标题</span>
        <span class="value">{{ editor.stats.charsNoTitle }}</span>
      </div>
      <div class="cell">
        <span class="label">不含标点 · 不含标题</span>
        <span class="value">{{ editor.stats.charsNoPunctNoTitle }}</span>
      </div>
      <div class="cell">
        <span class="label">标点符号</span>
        <span class="value">{{ editor.stats.punctCount }}</span>
      </div>
      <div class="cell">
        <span class="label">标题字数</span>
        <span class="value">{{ editor.stats.titleChars }}</span>
      </div>
      <div class="cell">
        <span class="label">段落数</span>
        <span class="value">{{ editor.stats.paragraphCount }}</span>
      </div>
      <div class="cell">
        <span class="label">句子数</span>
        <span class="value">{{ editor.stats.sentenceCount }}</span>
      </div>
    </div>
  </div>
</template>

<style scoped>
.switches {
  display: flex;
  gap: var(--space-4);
  flex-wrap: wrap;
}

.big-number {
  display: flex;
  align-items: baseline;
  justify-content: center;
  gap: var(--space-2);
  padding: var(--space-4);
  border-radius: var(--radius-lg);
  background: var(--c-surface-active);
}

.num {
  font-size: 42px;
  font-weight: 700;
  color: var(--c-accent);
  line-height: 1;
  text-shadow: 0 0 18px var(--c-accent-soft);
}

.unit {
  font-size: var(--fs-sm);
  color: var(--c-text-tertiary);
}

.grid {
  display: grid;
  grid-template-columns: repeat(2, 1fr);
  gap: var(--space-3);
}

.cell {
  display: flex;
  flex-direction: column;
  gap: var(--space-1);
  padding: var(--space-3);
  border-radius: var(--radius-md);
  background: var(--c-bg-sunken);
}

.cell .label {
  font-size: 11px;
  color: var(--c-text-tertiary);
}

.cell .value {
  font-size: var(--fs-lg);
  font-weight: 600;
  color: var(--c-text-base);
}
</style>
