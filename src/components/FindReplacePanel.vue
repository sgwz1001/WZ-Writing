<script setup lang="ts">
import { ref } from 'vue'
import type { Editor } from '@tiptap/vue-3'

const props = defineProps<{
  editor: Editor
}>()

const emit = defineEmits<{
  (e: 'close'): void
}>()

const find = ref('')
const replace = ref('')
const caseSensitive = ref(false)
const useRegex = ref(false)
const matchCount = ref(0)
const currentMatch = ref(0)

function flags() {
  return caseSensitive.value ? 'g' : 'gi'
}

function buildPattern(text: string) {
  if (useRegex.value) {
    return new RegExp(text, flags())
  }
  return new RegExp(text.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), flags())
}

function countMatches() {
  if (!find.value.trim()) {
    matchCount.value = 0
    currentMatch.value = 0
    return
  }
  try {
    const plain = props.editor.getText()
    const re = buildPattern(find.value)
    matchCount.value = (plain.match(re) || []).length
    currentMatch.value = Math.min(Math.max(1, currentMatch.value), matchCount.value || 1)
  } catch {
    matchCount.value = 0
  }
}

function findNext() {
  if (!find.value) return
  try {
    const re = buildPattern(find.value)
    props.editor.commands.find(re)
  } catch {
    // ignore invalid regex
  }
}

function replaceCurrent() {
  if (!find.value) return
  try {
    const re = buildPattern(find.value)
    props.editor.commands.replace(re, replace.value)
    countMatches()
  } catch {
    // ignore
  }
}

function replaceAll() {
  if (!find.value) return
  try {
    const re = buildPattern(find.value)
    props.editor.commands.replaceAll(re, replace.value)
    countMatches()
  } catch {
    // ignore
  }
}

function onInput() {
  currentMatch.value = 1
  countMatches()
}
</script>

<template>
  <Teleport to="body">
    <div class="wz-overlay" @click.self="emit('close')" @keyup.esc="emit('close')">
      <div class="wz-modal find-replace-modal">
        <div class="wz-modal__head">
          <h3>查找替换</h3>
          <button class="wz-icon-btn" title="关闭" @click="emit('close')">×</button>
        </div>
        <div class="wz-modal__body">
          <label class="field">
            <span>查找</span>
            <input v-model="find" class="wz-input" placeholder="输入要查找的内容" @input="onInput" @keyup.enter="findNext" />
          </label>
          <label class="field">
            <span>替换为</span>
            <input v-model="replace" class="wz-input" placeholder="留空表示删除" @keyup.enter="replaceCurrent" />
          </label>
          <div class="options">
            <label class="check">
              <input v-model="caseSensitive" type="checkbox" @change="countMatches" />
              区分大小写
            </label>
            <label class="check">
              <input v-model="useRegex" type="checkbox" @change="countMatches" />
              正则表达式
            </label>
          </div>
          <p v-if="find" class="match-hint">
            共 {{ matchCount }} 处匹配
          </p>
        </div>
        <div class="wz-modal__actions">
          <button class="wz-btn wz-btn--ghost" @click="emit('close')">关闭</button>
          <button class="wz-btn wz-btn--ghost" :disabled="!find" @click="findNext">查找下一个</button>
          <button class="wz-btn wz-btn--primary" :disabled="!find" @click="replaceCurrent">替换</button>
          <button class="wz-btn wz-btn--primary" :disabled="!find" @click="replaceAll">全部替换</button>
        </div>
      </div>
    </div>
  </Teleport>
</template>

<style scoped>
.find-replace-modal {
  width: 420px;
}

.field {
  display: flex;
  flex-direction: column;
  gap: var(--space-1);
  margin-bottom: var(--space-3);
}

.field span {
  font-size: 12px;
  color: var(--c-text-secondary);
}

.options {
  display: flex;
  gap: var(--space-4);
  margin-bottom: var(--space-3);
}

.check {
  display: flex;
  align-items: center;
  gap: var(--space-1);
  font-size: 13px;
  color: var(--c-text-secondary);
  cursor: pointer;
}

.match-hint {
  font-size: 12px;
  color: var(--c-text-tertiary);
  margin: 0;
}
</style>
