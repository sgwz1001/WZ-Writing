<script setup lang="ts">
import { computed } from 'vue'
import { useCorrectionStore } from '../stores/correction'

const correction = useCorrectionStore()

const hasIssues = computed(() => correction.issues.length > 0)

function onToggleRules(v: boolean) {
  correction.rulesOn = v
}
function onToggleLexicon(v: boolean) {
  correction.lexiconOn = v
}
</script>

<template>
  <div class="wz-panel wz-panel--pad correction">
    <div class="correction-head">
      <span class="correction-title">实时纠错</span>
      <span class="correction-counts">
        <span class="badge badge-error">{{ correction.errorCount }} 错</span>
        <span class="badge badge-warn">{{ correction.warnCount }} 提示</span>
      </span>
    </div>

    <div class="correction-toggles">
      <label class="wz-check">
        <input type="checkbox" :checked="correction.rulesOn" @change="onToggleRules(($event.target as HTMLInputElement).checked)" />
        <span class="wz-check__box"></span>
        <span class="wz-check__label">本地规则（标点/全半角/错别字）</span>
      </label>
      <label class="wz-check">
        <input type="checkbox" :checked="correction.lexiconOn" @change="onToggleLexicon(($event.target as HTMLInputElement).checked)" />
        <span class="wz-check__box"></span>
        <span class="wz-check__label">错词库（自定义）</span>
      </label>
    </div>

    <div class="correction-actions">
      <button class="wz-btn wz-btn--primary wz-btn--sm" :disabled="!hasIssues" @click="correction.applyAll(correction.issues)">
        应用全部
      </button>
      <button class="wz-btn wz-btn--ghost wz-btn--sm" :disabled="!hasIssues" @click="correction.clearIgnore()">
        重置忽略
      </button>
    </div>

    <div class="wz-divider" />

    <p v-if="!hasIssues" class="correction-empty">
      没有发现明显问题。写下去，有硬伤会在这里标红标黄。
    </p>

    <ul v-else class="issue-list">
      <li v-for="(it, i) in correction.issues" :key="i + '-' + it.from" class="issue">
        <div class="issue-top">
          <span class="chip" :class="it.severity === 'error' ? 'chip-error' : 'chip-warn'">{{ it.category }}</span>
          <span class="issue-reason">{{ it.reason }}</span>
        </div>
        <div class="issue-body">
          <span class="orig">{{ it.original }}</span>
          <span class="arrow">→</span>
          <span class="rev">{{ it.revised }}</span>
        </div>
        <div class="issue-actions">
          <button class="wz-btn wz-btn--soft wz-btn--sm" @click="correction.applyIssue(it)">应用</button>
          <button class="wz-btn wz-btn--ghost wz-btn--sm" @click="correction.ignoreSuggestion(it)">忽略</button>
        </div>
      </li>
    </ul>
  </div>
</template>

<style scoped>
.correction {
  display: flex;
  flex-direction: column;
  gap: var(--space-3);
}
.correction-head {
  display: flex;
  align-items: center;
  justify-content: space-between;
}
.correction-title {
  font-family: var(--font-display);
  font-size: var(--fs-lg);
  font-weight: 700;
  color: var(--c-text-base);
}
.correction-counts {
  display: flex;
  gap: var(--space-2);
}
.badge {
  font-size: 11px;
  padding: 2px 8px;
  border-radius: var(--radius-full);
  font-weight: 600;
}
.badge-error {
  color: var(--c-error);
  background: color-mix(in srgb, var(--c-error) 14%, transparent);
}
.badge-warn {
  color: var(--c-warn);
  background: color-mix(in srgb, var(--c-warn) 14%, transparent);
}
.correction-toggles {
  display: flex;
  flex-direction: column;
  gap: var(--space-2);
}
.correction-actions {
  display: flex;
  gap: var(--space-2);
}
.correction-empty {
  font-size: 13px;
  color: var(--c-text-tertiary);
  line-height: 1.7;
}
.issue-list {
  list-style: none;
  margin: 0;
  padding: 0;
  display: flex;
  flex-direction: column;
  gap: var(--space-3);
}
.issue {
  border: 1px solid var(--c-border);
  border-radius: var(--radius-md);
  padding: var(--space-3);
  background: var(--c-surface);
  display: flex;
  flex-direction: column;
  gap: var(--space-2);
}
.issue-top {
  display: flex;
  align-items: center;
  gap: var(--space-2);
}
.chip {
  font-size: 11px;
  padding: 1px 8px;
  border-radius: var(--radius-full);
  font-weight: 600;
  flex-shrink: 0;
}
.chip-error {
  color: var(--c-error);
  background: color-mix(in srgb, var(--c-error) 14%, transparent);
}
.chip-warn {
  color: var(--c-warn);
  background: color-mix(in srgb, var(--c-warn) 14%, transparent);
}
.issue-reason {
  font-size: 12px;
  color: var(--c-text-tertiary);
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}
.issue-body {
  display: flex;
  align-items: center;
  gap: var(--space-2);
  font-size: 14px;
  flex-wrap: wrap;
}
.orig {
  color: var(--c-error);
  text-decoration: line-through;
}
.arrow {
  color: var(--c-text-tertiary);
}
.rev {
  color: #4ade80;
  font-weight: 600;
}
.issue-actions {
  display: flex;
  gap: var(--space-2);
  justify-content: flex-end;
}
</style>
