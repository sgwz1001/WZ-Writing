<script setup lang="ts">
import { ref } from 'vue'
import { useLoaderLexiconStore } from '../stores/loaderLexicon'
import { CATEGORY_LABELS, type LoaderWordCategory } from '../data/loaderLexicon'

const store = useLoaderLexiconStore()
const newWord = ref('')
const newCategory = ref<LoaderWordCategory>('literature')

const categories = Object.entries(CATEGORY_LABELS).map(([id, label]) => ({ id: id as LoaderWordCategory, label }))

function addCustom() {
  store.addWord(newWord.value, newCategory.value)
  newWord.value = ''
}
</script>

<template>
  <div class="loader-lexicon-panel">
    <h4 class="pane-title">加载动画词库</h4>
    <p class="pane-hint">AI / 本地计算等待时，中心会轮番显示这些词。可开关分类或添加自定义词。</p>

    <div class="category-toggles">
      <label v-for="cat in categories" :key="cat.id" class="check-pill">
        <input v-model="store.enabledCategories" type="checkbox" :value="cat.id" />
        <span>{{ cat.label }}</span>
      </label>
    </div>

    <div class="slider-row">
      <label class="slider-label">切换速度</label>
      <input
        type="range"
        min="600"
        max="4000"
        step="100"
        :value="store.rotationMs"
        @input="store.setRotationMs(Number(($event.target as HTMLInputElement).value))"
      />
      <span class="slider-val">{{ (store.rotationMs / 1000).toFixed(1) }}s</span>
    </div>

    <div class="add-word">
      <input v-model="newWord" class="wz-input" placeholder="添加自定义词" @keyup.enter="addCustom" />
      <select v-model="newCategory" class="wz-select">
        <option v-for="cat in categories" :key="cat.id" :value="cat.id">{{ cat.label }}</option>
      </select>
      <button class="wz-btn wz-btn--sm" @click="addCustom">添加</button>
    </div>

    <div class="word-list">
      <div v-for="w in store.words" :key="w.id" class="word-row">
        <span class="word-text">{{ w.text }}</span>
        <span class="word-cat">{{ CATEGORY_LABELS[w.category] }}</span>
        <button v-if="!w.builtin" class="wz-btn wz-btn--ghost wz-btn--xs" @click="store.removeWord(w.id)">
          删除
        </button>
      </div>
    </div>
  </div>
</template>

<style scoped>
.loader-lexicon-panel {
  display: flex;
  flex-direction: column;
  gap: var(--space-3);
}
.pane-title {
  margin: 0;
  font-size: 12px;
  letter-spacing: 0.14em;
  color: var(--c-text-tertiary);
  font-weight: 600;
}
.pane-hint {
  margin: 0;
  font-size: 12px;
  line-height: 1.7;
  color: var(--c-text-tertiary);
}

.category-toggles {
  display: flex;
  flex-wrap: wrap;
  gap: var(--space-2);
}
.check-pill {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  padding: 5px 10px;
  border: 1px solid var(--c-border);
  border-radius: var(--radius-full);
  background: var(--c-surface);
  color: var(--c-text-secondary);
  font-size: 12px;
  cursor: pointer;
}
.check-pill:has(input:checked) {
  border-color: var(--c-accent);
  color: var(--c-accent);
  background: var(--c-accent-soft);
}
.check-pill input {
  display: none;
}

.slider-row {
  display: flex;
  align-items: center;
  gap: var(--space-3);
}
.slider-row input[type='range'] {
  flex: 1;
}
.slider-label {
  width: 56px;
  font-size: 12px;
  color: var(--c-text-secondary);
  flex-shrink: 0;
}
.slider-val {
  min-width: 44px;
  text-align: right;
  font-size: 12px;
  color: var(--c-accent);
  font-variant-numeric: tabular-nums;
}

.add-word {
  display: flex;
  align-items: center;
  gap: var(--space-2);
}
.add-word .wz-input {
  flex: 1;
  min-width: 0;
}
.wz-select {
  padding: 5px 10px;
  border-radius: var(--radius-sm);
  border: 1px solid var(--c-border);
  background: var(--c-surface);
  color: var(--c-text-base);
  font-size: 12px;
}

.word-list {
  max-height: 180px;
  overflow-y: auto;
  display: flex;
  flex-direction: column;
  gap: 4px;
  border: 1px solid var(--c-border);
  border-radius: var(--radius-md);
  padding: var(--space-2);
}
.word-row {
  display: flex;
  align-items: center;
  gap: var(--space-2);
  padding: 4px 6px;
  border-radius: var(--radius-sm);
  font-size: 12px;
}
.word-row:hover {
  background: var(--c-surface-hover);
}
.word-text {
  flex: 1;
  min-width: 0;
  color: var(--c-text-base);
}
.word-cat {
  color: var(--c-text-tertiary);
  font-size: 11px;
}
.wz-btn--xs {
  padding: 2px 8px;
  font-size: 11px;
}
</style>
