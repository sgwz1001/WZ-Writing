<script setup lang="ts">
import { computed } from 'vue'
import { useCorrectionStore } from '../stores/correction'

const correction = useCorrectionStore()

const hasIssues = computed(() => correction.issues.length > 0)
const hasDeep = computed(() => correction.deepIssues.length > 0)

function onToggleRules(v: boolean) {
  correction.rulesOn = v
}
function onToggleLexicon(v: boolean) {
  correction.lexiconOn = v
}
function onToggleDeep(v: boolean) {
  correction.deepOn = v
  // 打开深度纠错且已有结果时，装饰插件已通过 watch 重建；无需额外动作
}

function onRunDeep() {
  correction.runDeep()
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
      <label class="wz-check wz-check--ai">
        <input type="checkbox" :checked="correction.deepOn" @change="onToggleDeep(($event.target as HTMLInputElement).checked)" />
        <span class="wz-check__box"></span>
        <span class="wz-check__label">AI 深度纠错<span class="ai-tag">AI</span></span>
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

    <!-- 本地纠错结果 -->
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

    <div class="wz-divider" />

    <!-- AI 深度纠错 -->
    <div class="deep-head">
      <span class="deep-title">AI 深度校对</span>
      <button
        class="wz-btn wz-btn--ai wz-btn--sm"
        :disabled="correction.deepRunning"
        @click="onRunDeep"
      >
        {{ correction.deepRunning ? '校对中…' : (hasDeep ? '重新校对' : '开始校对') }}
      </button>
    </div>
    <p class="deep-hint">
      把当前全文送大模型做语义级校对（搭配/用词/语序/冗余）。需先在
      <em>设置 → AI 接入</em> 填好 Key。
    </p>

    <p v-if="correction.deepError" class="deep-error">{{ correction.deepError }}</p>
    <p v-else-if="correction.deepInfo && !hasDeep" class="deep-info">{{ correction.deepInfo }}</p>

    <ul v-if="hasDeep" class="issue-list issue-list--deep">
      <li v-for="(it, i) in correction.deepIssues" :key="'d' + i + '-' + it.from" class="issue issue--deep">
        <div class="issue-top">
          <span class="chip chip-ai">{{ it.category }}</span>
          <span class="issue-reason">{{ it.reason }}</span>
        </div>
        <div class="issue-body">
          <span class="orig orig-ai">{{ it.original }}</span>
          <span class="arrow">→</span>
          <span class="rev rev-ai">{{ it.revised }}</span>
        </div>
        <div class="issue-actions">
          <button class="wz-btn wz-btn--ai-soft wz-btn--sm" @click="correction.applyDeepIssue(it)">采纳</button>
          <button class="wz-btn wz-btn--ghost wz-btn--sm" @click="correction.ignoreDeep(it)">忽略</button>
        </div>
      </li>
    </ul>

    <div v-if="hasDeep" class="deep-foot">
      <button class="wz-btn wz-btn--ghost wz-btn--sm" @click="correction.applyAllDeep(correction.deepIssues)">
        全部采纳
      </button>
    </div>
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
.issue--deep {
  border-color: color-mix(in srgb, #b07cf5 45%, var(--c-border));
  background: color-mix(in srgb, #b07cf5 5%, var(--c-surface));
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
.chip-ai {
  color: #b07cf5;
  background: color-mix(in srgb, #b07cf5 16%, transparent);
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
.orig-ai {
  color: #b07cf5;
}
.arrow {
  color: var(--c-text-tertiary);
}
.rev {
  color: #4ade80;
  font-weight: 600;
}
.rev-ai {
  color: #b07cf5;
}
.issue-actions {
  display: flex;
  gap: var(--space-2);
  justify-content: flex-end;
}
.deep-head {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: var(--space-2);
}
.deep-title {
  font-family: var(--font-display);
  font-size: 14px;
  font-weight: 700;
  color: var(--c-text-base);
}
.deep-hint {
  font-size: 12px;
  color: var(--c-text-tertiary);
  line-height: 1.6;
  margin: 0;
}
.deep-hint em {
  font-style: normal;
  color: var(--c-accent);
}
.deep-error {
  font-size: 12px;
  color: var(--c-error);
  line-height: 1.6;
  margin: 0;
  white-space: pre-wrap;
  word-break: break-word;
  background: color-mix(in srgb, var(--c-error) 8%, transparent);
  border-radius: var(--radius-md);
  padding: var(--space-2);
}
.deep-info {
  font-size: 12px;
  color: var(--c-text-tertiary);
  line-height: 1.6;
  margin: 0;
}
.deep-foot {
  display: flex;
  justify-content: flex-end;
}
.ai-tag {
  display: inline-block;
  font-size: 9px;
  font-weight: 700;
  color: #b07cf5;
  border: 1px solid color-mix(in srgb, #b07cf5 60%, transparent);
  border-radius: var(--radius-full);
  padding: 0 5px;
  margin-left: 4px;
  vertical-align: 1px;
  letter-spacing: 0.4px;
}
.wz-btn--ai {
  color: #b07cf5;
  border-color: color-mix(in srgb, #b07cf5 55%, var(--c-border));
  background: color-mix(in srgb, #b07cf5 10%, transparent);
}
.wz-btn--ai:hover {
  background: color-mix(in srgb, #b07cf5 18%, transparent);
}
.wz-btn--ai:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}
.wz-btn--ai-soft {
  color: #b07cf5;
  border-color: color-mix(in srgb, #b07cf5 40%, var(--c-border));
  background: color-mix(in srgb, #b07cf5 8%, transparent);
}
.wz-btn--ai-soft:hover {
  background: color-mix(in srgb, #b07cf5 16%, transparent);
}
</style>
