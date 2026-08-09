<script setup lang="ts">
import { computed } from 'vue'
import { editorRef } from '../../stores/editorRef'
import { applyOfficialFormat, DEFAULT_OFFICIAL_FORMAT } from '../../utils/officialFormat'
import { detectOfficialNumbering } from '../../utils/officialFormat'

const props = defineProps<{
  format?: 'body' | 'title'
}>()

const formatType = computed(() => props.format ?? 'body')

function applyFormat() {
  const ed = editorRef.value
  if (!ed) return
  applyOfficialFormat(ed, DEFAULT_OFFICIAL_FORMAT)
}

function checkNumbering() {
  const ed = editorRef.value
  if (!ed) return
  const text = ed.getText()
  const lines = text.split(/\r?\n/)
  for (const line of lines) {
    const rule = detectOfficialNumbering(line)
    if (!rule) continue
    // 简单高亮：给当前段落设置层级字体
    // 实际实现可由编辑器监听输入事件自动处理
    break
  }
}
</script>

<template>
  <div class="official-format-toolbar">
    <h5>公文格式</h5>
    <div class="checks">
      <span class="check-item">标题居中</span>
      <span class="check-item">正文仿宋_GB2312</span>
      <span class="check-item">首行缩进 2 字符</span>
      <span class="check-item">两端对齐</span>
    </div>
    <button class="wz-btn wz-btn--primary w-full" @click="applyFormat">
      {{ formatType === 'title' ? '标题排版' : '一键排版' }}
    </button>
    <button class="wz-btn wz-btn--ghost w-full" @click="checkNumbering">识别层级编号</button>
  </div>
</template>

<style scoped>
.official-format-toolbar {
  display: flex;
  flex-direction: column;
  gap: var(--space-3);
}
.official-format-toolbar h5 {
  margin: 0;
  font-size: 14px;
  color: var(--c-text-base);
}
.checks {
  display: flex;
  flex-direction: column;
  gap: 4px;
}
.check-item {
  font-size: 12px;
  color: var(--c-text-secondary);
}
.check-item::before {
  content: '☐ ';
  color: var(--c-accent);
}
.w-full {
  width: 100%;
  justify-content: center;
}
</style>
