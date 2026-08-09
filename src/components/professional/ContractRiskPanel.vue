<script setup lang="ts">
import { computed, ref, watch } from 'vue'
import { editorRef } from '../../stores/editorRef'
import { checkContractRisks, getRiskStats, type RiskMatch } from '../../utils/contractParser'

const matches = ref<RiskMatch[]>([])
const stats = computed(() => getRiskStats(matches.value))

function runCheck() {
  const ed = editorRef.value
  if (!ed) return
  const text = ed.getText()
  matches.value = checkContractRisks(text)
}

// 编辑器有内容变化时自动检查（防抖由用户操作频率自然形成）
watch(
  () => editorRef.value?.getText() ?? '',
  () => runCheck(),
  { immediate: true },
)
</script>

<template>
  <div class="risk-panel">
    <div class="risk-head">
      <h4>合同风险识别</h4>
      <div class="risk-stats">
        <span v-if="stats.error" class="stat error">{{ stats.error }} 严重</span>
        <span v-if="stats.warn" class="stat warn">{{ stats.warn }} 警告</span>
        <span v-if="stats.info" class="stat info">{{ stats.info }} 提示</span>
        <span v-if="!matches.length" class="stat ok">暂无风险</span>
      </div>
    </div>

    <button class="wz-btn wz-btn--ghost w-full" @click="runCheck">重新检查</button>

    <ul v-if="matches.length" class="risk-list">
      <li v-for="m in matches" :key="`${m.ruleId}:${m.line}`" :class="['risk-item', m.severity]">
        <div class="risk-name">{{ m.name }}</div>
        <div class="risk-line">第 {{ m.line }} 行</div>
        <div class="risk-snippet">{{ m.snippet }}</div>
        <div class="risk-suggestion">{{ m.suggestion }}</div>
      </li>
    </ul>
  </div>
</template>

<style scoped>
.risk-panel {
  display: flex;
  flex-direction: column;
  gap: var(--space-3);
}
.risk-panel h4 {
  margin: 0;
  font-size: 15px;
  color: var(--c-text-base);
}
.risk-head {
  display: flex;
  justify-content: space-between;
  align-items: center;
  gap: var(--space-2);
}
.risk-stats {
  display: flex;
  flex-wrap: wrap;
  gap: 4px;
}
.stat {
  font-size: 11px;
  padding: 2px 8px;
  border-radius: var(--radius-sm);
}
.stat.ok {
  background: rgba(59, 165, 92, 0.12);
  color: var(--c-success);
}
.stat.error {
  background: rgba(224, 82, 82, 0.12);
  color: var(--c-danger);
}
.stat.warn {
  background: rgba(224, 163, 46, 0.12);
  color: var(--c-warning);
}
.stat.info {
  background: var(--c-bg-sunken);
  color: var(--c-text-secondary);
}
.w-full {
  width: 100%;
  justify-content: center;
}
.risk-list {
  list-style: none;
  margin: 0;
  padding: 0;
  display: flex;
  flex-direction: column;
  gap: var(--space-2);
}
.risk-item {
  padding: var(--space-3);
  border-radius: var(--radius-md);
  border-left: 3px solid var(--c-border);
  background: var(--c-surface-elevated);
  font-size: 12px;
}
.risk-item.error {
  border-left-color: var(--c-danger);
}
.risk-item.warn {
  border-left-color: var(--c-warning);
}
.risk-item.info {
  border-left-color: var(--c-accent);
}
.risk-name {
  font-weight: 600;
  color: var(--c-text-base);
}
.risk-line {
  color: var(--c-text-tertiary);
  margin: 2px 0;
}
.risk-snippet {
  color: var(--c-text-secondary);
  font-style: italic;
  margin: 4px 0;
  word-break: break-all;
}
.risk-suggestion {
  color: var(--c-accent);
  line-height: 1.5;
}
</style>
