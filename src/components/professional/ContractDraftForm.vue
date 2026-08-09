<script setup lang="ts">
import { ref } from 'vue'
import { editorRef } from '../../stores/editorRef'
import { useSkillLibraryStore } from '../../stores/skillLibrary'
import { runSkill } from '../../utils/ai'
import { buildDefaultValues } from '../../skills/SkillRenderer'
import { CONTRACT_TEMPLATES } from '../../data/contractTemplates'

const skillLib = useSkillLibraryStore()

const type = ref('服务合同')
const partyA = ref('')
const partyB = ref('')
const projectName = ref('')
const amount = ref('')
const duration = ref('')
const terms = ref('')

const generating = ref(false)
const result = ref('')
const error = ref('')

const contractTypes = CONTRACT_TEMPLATES.map((t) => t.name)

async function generate() {
  result.value = ''
  error.value = ''
  const skill = skillLib.get('planner-contract')
  if (!skill) {
    error.value = '未找到 planner-contract Skill，请检查内置 Skill 是否启用。'
    return
  }
  const vars = {
    type: type.value,
    partyA: partyA.value,
    partyB: partyB.value,
    projectName: projectName.value,
    amount: amount.value || '未约定',
    duration: duration.value || '未约定',
    terms: terms.value,
  }
  generating.value = true
  try {
    result.value = await runSkill('planner-contract', { ...buildDefaultValues(skill.variables), ...vars })
  } catch (e: any) {
    error.value = e?.message || '生成失败'
  } finally {
    generating.value = false
  }
}

function textToHtml(text: string): string {
  return text
    .split(/\n\s*\n/)
    .map((p) => `<p>${p.replace(/\n/g, '<br>')}</p>`)
    .join('')
}

function insert() {
  const ed = editorRef.value
  if (!ed || !result.value) return
  ed.chain().focus().insertContent(textToHtml(result.value)).run()
}

function copy() {
  if (!result.value) return
  navigator.clipboard.writeText(result.value)
}
</script>

<template>
  <div class="draft-form">
    <h4>合同 AI 拟稿</h4>

    <label class="field">
      <span>合同类型</span>
      <select v-model="type" class="wz-input">
        <option v-for="t in contractTypes" :key="t" :value="t">{{ t }}</option>
      </select>
    </label>

    <label class="field">
      <span>甲方</span>
      <input v-model="partyA" class="wz-input" placeholder="甲方名称" />
    </label>

    <label class="field">
      <span>乙方</span>
      <input v-model="partyB" class="wz-input" placeholder="乙方名称" />
    </label>

    <label class="field">
      <span>项目名称 / 标的</span>
      <input v-model="projectName" class="wz-input" placeholder="例如：短视频代运营服务" />
    </label>

    <label class="field">
      <span>金额（可选）</span>
      <input v-model="amount" class="wz-input" placeholder="例如：人民币伍万元整" />
    </label>

    <label class="field">
      <span>期限（可选）</span>
      <input v-model="duration" class="wz-input" placeholder="例如：自签署之日起一年" />
    </label>

    <label class="field">
      <span>关键条款要点</span>
      <textarea v-model="terms" class="wz-input" rows="4" placeholder="逐条列出双方关心的要点，例如：付款方式、交付物、保密范围、违约责任等。" />
    </label>

    <button class="wz-btn wz-btn--primary w-full" :disabled="generating || !partyA || !partyB || !terms" @click="generate">
      {{ generating ? '生成中…' : 'AI 拟稿' }}
    </button>

    <div v-if="error" class="error">{{ error }}</div>

    <div v-if="result" class="result">
      <pre>{{ result }}</pre>
      <div class="result-actions">
        <button class="wz-btn wz-btn--ghost" @click="insert">插入编辑器</button>
        <button class="wz-btn wz-btn--ghost" @click="copy">复制</button>
      </div>
    </div>
  </div>
</template>

<style scoped>
.draft-form {
  display: flex;
  flex-direction: column;
  gap: var(--space-3);
}
.draft-form h4 {
  margin: 0 0 var(--space-2);
  font-size: 15px;
  color: var(--c-text-base);
}
.field {
  display: flex;
  flex-direction: column;
  gap: 4px;
}
.field span {
  font-size: 12px;
  color: var(--c-text-secondary);
}
.w-full {
  width: 100%;
  justify-content: center;
}
.error {
  font-size: 12px;
  color: var(--c-danger);
  line-height: 1.5;
}
.result {
  margin-top: var(--space-2);
  padding: var(--space-3);
  border-radius: var(--radius-md);
  background: var(--c-bg-sunken);
  border: 1px solid var(--c-border);
  display: flex;
  flex-direction: column;
  gap: var(--space-2);
}
.result pre {
  margin: 0;
  white-space: pre-wrap;
  word-break: break-word;
  font-size: 13px;
  color: var(--c-text-base);
  max-height: 260px;
  overflow-y: auto;
}
.result-actions {
  display: flex;
  gap: var(--space-2);
}
</style>
