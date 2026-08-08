<script setup lang="ts">
import { useEditorStore } from '../stores/editor'

const editor = useEditorStore()
</script>

<template>
  <div class="panel">
    <h4 class="panel-title">字数统计</h4>

    <div class="switches">
      <label class="switch">
        <input v-model="editor.countPunctuation" type="checkbox" />
        <span>计入标点</span>
      </label>
      <label class="switch">
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
.panel {
  display: flex;
  flex-direction: column;
  gap: var(--space-4);
  padding: var(--space-4);
  background: var(--c-surface-elevated);
  border: 1px solid var(--c-border);
  border-radius: var(--radius-xl);
  min-width: 260px;
}

.panel-title {
  margin: 0;
  font-size: var(--fs-md);
  color: var(--c-text-base);
}

.switches {
  display: flex;
  gap: var(--space-4);
}

.switch {
  display: flex;
  align-items: center;
  gap: var(--space-2);
  font-size: var(--fs-sm);
  color: var(--c-text-secondary);
  cursor: pointer;
}

.big-number {
  display: flex;
  align-items: baseline;
  gap: var(--space-2);
  padding: var(--space-4);
  border-radius: var(--radius-lg);
  background: var(--c-surface-active);
  justify-content: center;
}

.num {
  font-size: 42px;
  font-weight: 700;
  color: var(--c-accent);
  line-height: 1;
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
