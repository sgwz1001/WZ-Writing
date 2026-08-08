<script setup lang="ts">
import { computed, ref } from 'vue'
import { useEditorStore } from '../stores/editor'
import { useLoadingStore } from '../stores/loading'
import { htmlToPlainText } from '../utils/text'
import { analyzePoem, critiquePoem, POEM_FORMS } from '../utils/poetry'
import type { PoemAnalysis, CharCell } from '../utils/poetry'

const emit = defineEmits<{ (e: 'close'): void }>()
const editor = useEditorStore()
const loadingStore = useLoadingStore()

const poemText = ref(htmlToPlainText(editor.content).split('\n\n').join('\n').trim())
const formKey = ref(POEM_FORMS[0].key)
const variantIdx = ref(0)

const form = computed(() => POEM_FORMS.find((f) => f.key === formKey.value) || POEM_FORMS[0])
const analysis = computed<PoemAnalysis>(() => analyzePoem(poemText.value, formKey.value, variantIdx.value))

const critiquing = ref(false)
const critique = ref('')
const critiqueError = ref('')

function onFormChange() {
  variantIdx.value = 0
}

function cellClass(c: CharCell): string {
  const base = c.tone === '平' ? 't-ping' : c.tone === '仄' ? 't-ze' : 't-unknown'
  if (c.status === 'bad') return base + ' is-bad'
  if (c.status === 'unknown') return base + ' is-unknown'
  return base
}

async function doCritique() {
  critiquing.value = true
  critique.value = ''
  critiqueError.value = ''
  try {
    critique.value = await loadingStore.wrap('AI 正在品评格律…', () =>
      critiquePoem(poemText.value, formKey.value),
    )
  } catch (e) {
    critiqueError.value = e instanceof Error ? e.message : String(e)
  } finally {
    critiquing.value = false
  }
}

function close() {
  emit('close')
}
</script>

<template>
  <div class="wz-overlay" @click.self="close">
    <div class="wz-modal wz-modal--wide" role="dialog" aria-modal="true">
      <div class="wz-modal__head">
        <span class="wz-modal__title">格律诗词</span>
        <button class="wz-icon-btn" title="关闭" @click="close">×</button>
      </div>

      <div class="wz-modal__body poetry-body">
        <p class="hint">粘贴或输入诗词（每行一句）。本地引擎校验字数 / 句数 / 逐句平仄 / 韵脚；未收录字标「?」，可用「AI 点评」获得完整判断。</p>

        <div class="row">
          <span class="row-label">体裁</span>
          <select v-model="formKey" class="wz-input sel" @change="onFormChange">
            <option v-for="f in POEM_FORMS" :key="f.key" :value="f.key">{{ f.label }}</option>
          </select>
          <span class="row-label">体式</span>
          <select v-model.number="variantIdx" class="wz-input sel">
            <option v-for="(v, i) in form.variants" :key="i" :value="i">{{ v.label }}</option>
          </select>
        </div>

        <textarea v-model="poemText" class="poem-input wz-input" rows="6" placeholder="例如：&#10;空山新雨后&#10;天气晚来秋&#10;明月松间照&#10;清泉石上流" />

        <div class="legend">
          <span class="lg t-ping">平</span>
          <span class="lg t-ze">仄</span>
          <span class="lg t-unknown">? 未收录</span>
          <span class="lg is-bad">✕ 不合谱</span>
        </div>

        <div class="result">
          <div v-for="(line, li) in analysis.lines" :key="li" class="line">
            <div class="line-no">{{ li + 1 }}</div>
            <div class="chars">
              <span v-for="(c, ci) in line.cells" :key="ci" :class="cellClass(c)" :title="c.expect ? '应'+c.expect : ''">
                {{ c.ch }}
              </span>
            </div>
            <div class="line-meta">
              <span v-if="line.expectedLen" class="pat">{{ form.variants[variantIdx].pattern[li] || '—' }}</span>
              <span v-if="line.isRhyme" class="rhyme-tag">韵</span>
              <span v-if="line.note" class="ln-note">{{ line.note }}</span>
            </div>
          </div>
        </div>

        <div v-if="analysis.notes.length" class="notes">
          <p v-for="(n, i) in analysis.notes" :key="i">{{ n }}</p>
        </div>

        <div class="rhyme-box" :class="{ ok: analysis.rhyme.ok }">
          <strong>押韵：</strong>{{ analysis.rhyme.note || '—' }}
        </div>

        <div v-if="critique" class="critique">
          <div class="critique-head">AI 点评</div>
          <p class="critique-text">{{ critique }}</p>
        </div>
        <p v-if="critiqueError" class="error">{{ critiqueError }}</p>
      </div>

      <div class="wz-modal__actions">
        <span class="msg">{{ analysis.lineCount ? form.label + ' · ' + form.variants[variantIdx].label : '' }}</span>
        <button class="wz-btn wz-btn--ghost" :disabled="critiquing" @click="doCritique">
          {{ critiquing ? '点评中…' : 'AI 点评' }}
        </button>
        <button class="wz-btn wz-btn--primary" @click="close">完成</button>
      </div>
    </div>
  </div>
</template>

<style scoped>
.hint {
  font-size: 12px;
  color: var(--c-text-tertiary);
  margin: 0 0 12px;
  line-height: 1.6;
}
.row {
  display: flex;
  align-items: center;
  gap: var(--space-3);
  margin-bottom: 10px;
  flex-wrap: wrap;
}
.row-label {
  font-size: 13px;
  color: var(--c-text-secondary);
  white-space: nowrap;
}
.sel {
  width: auto;
  flex: none;
}
.poem-input {
  width: 100%;
  font-family: var(--font-serif);
  font-size: 15px;
  line-height: 1.9;
  resize: vertical;
  margin-bottom: 10px;
}
.legend {
  display: flex;
  gap: 12px;
  font-size: 12px;
  margin-bottom: 12px;
  color: var(--c-text-secondary);
}
.lg {
  padding: 1px 8px;
  border-radius: var(--radius-sm);
}
.t-ping {
  color: var(--c-accent);
  font-weight: 600;
}
.t-ze {
  color: #8a8f99;
}
.t-unknown {
  color: #b08a3a;
}
.is-bad {
  text-decoration: underline wavy var(--c-error, #ff5a5a);
  text-underline-offset: 3px;
}
.result {
  display: flex;
  flex-direction: column;
  gap: 8px;
  margin-bottom: 12px;
}
.line {
  display: flex;
  align-items: center;
  gap: 10px;
  flex-wrap: wrap;
}
.line-no {
  width: 20px;
  height: 20px;
  flex: none;
  display: grid;
  place-items: center;
  font-size: 11px;
  color: var(--c-text-tertiary);
  border: 1px solid var(--c-border);
  border-radius: 50%;
}
.chars {
  display: flex;
  gap: 2px;
}
.chars > span {
  font-family: var(--font-serif);
  font-size: 18px;
  line-height: 1.4;
  padding: 0 1px;
  cursor: default;
}
.line-meta {
  display: flex;
  align-items: center;
  gap: 8px;
  font-size: 12px;
  color: var(--c-text-tertiary);
  flex-wrap: wrap;
}
.pat {
  font-family: var(--font-mono);
  letter-spacing: 1px;
}
.rhyme-tag {
  background: var(--c-accent-soft);
  color: var(--c-accent);
  border-radius: var(--radius-full);
  padding: 0 6px;
  font-size: 11px;
}
.ln-note {
  color: var(--c-warn, #e0a83a);
}
.notes {
  background: var(--c-surface-elevated);
  border: 1px solid var(--c-border);
  border-radius: var(--radius-md);
  padding: 10px 12px;
  margin: 0 0 10px;
}
.notes p {
  margin: 2px 0;
  font-size: 13px;
  color: var(--c-text-secondary);
}
.rhyme-box {
  font-size: 13px;
  color: var(--c-text-secondary);
  background: var(--c-surface-elevated);
  border: 1px solid var(--c-border);
  border-radius: var(--radius-md);
  padding: 10px 12px;
}
.rhyme-box.ok {
  border-color: var(--c-accent);
  color: var(--c-accent);
}
.critique {
  margin-top: 12px;
  border: 1px solid var(--c-border-strong);
  border-radius: var(--radius-md);
  padding: 12px;
}
.critique-head {
  font-size: 12px;
  font-weight: 600;
  color: var(--c-accent);
  margin-bottom: 6px;
}
.critique-text {
  margin: 0;
  font-size: 13px;
  line-height: 1.7;
  color: var(--c-text-base);
  white-space: pre-wrap;
}
.error {
  color: var(--c-error, #ff5a5a);
  font-size: 12px;
  margin: 8px 0 0;
}
.msg {
  margin-right: auto;
  font-size: 12px;
  color: var(--c-text-tertiary);
}
.wz-modal--wide {
  width: min(640px, 94vw);
}
</style>
