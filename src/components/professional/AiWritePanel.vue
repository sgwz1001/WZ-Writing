<script setup lang="ts">
import { computed, ref, watch } from 'vue'
import { editorRef } from '../../stores/editorRef'
import { useIdentitySessionStore } from '../../stores/identitySession'
import { useSkillLibraryStore } from '../../stores/skillLibrary'
import { runSkill, matchAndRun } from '../../utils/ai'
import { buildDefaultValues } from '../../skills/SkillRenderer'
import { getGenresByIdentity } from '../../data/aiGenresByIdentity'
import SkillVariableForm from '../SkillVariableForm.vue'

const identitySession = useIdentitySessionStore()
const skillLib = useSkillLibraryStore()

const genres = computed(() => getGenresByIdentity(identitySession.identityId))
const selectedGenreId = ref<string>('')
const selectedGenre = computed(() => genres.value.find((g) => g.id === selectedGenreId.value) ?? null)
const wordCount = ref(500)
const generating = ref(false)
const result = ref('')
const error = ref('')
const skillValues = ref<Record<string, unknown>>({})

const resolvedSkill = computed(() => {
  if (!selectedGenre.value?.defaultSkill) return undefined
  return skillLib.get(selectedGenre.value.defaultSkill)
})

watch(
  () => genres.value,
  (list) => {
    selectedGenreId.value = list[0]?.id ?? ''
  },
  { immediate: true },
)

watch(
  resolvedSkill,
  (skill) => {
    skillValues.value = skill ? buildDefaultValues(skill.variables) : {}
  },
  { immediate: true },
)

async function generate() {
  result.value = ''
  error.value = ''
  if (!selectedGenre.value) {
    error.value = '当前身份未配置 AI 写作文体。'
    return
  }
  const genre = selectedGenre.value
  generating.value = true
  try {
    const skillId = genre.defaultSkill
    if (skillId) {
      const vars: Record<string, unknown> = { ...skillValues.value }
      if (genre.hasWordCount) {
        vars.wordCount = wordCount.value
        vars.length = wordCount.value
      }
      result.value = await runSkill(skillId, vars)
    } else {
      const out = await matchAndRun(
        { identityId: identitySession.identityId, task: 'generate' },
        { ...skillValues.value, length: wordCount.value, wordCount: wordCount.value },
      )
      result.value = out.result
    }
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
  <div class="ai-write-panel">
    <h4>AI 写作</h4>

    <label class="field">
      <span>文体</span>
      <select v-model="selectedGenreId" class="wz-input">
        <option v-for="g in genres" :key="g.id" :value="g.id">{{ g.name }}</option>
      </select>
    </label>

    <label v-if="selectedGenre?.hasWordCount" class="field">
      <span>字数</span>
      <input v-model.number="wordCount" type="number" min="100" max="10000" step="100" class="wz-input" />
    </label>

    <SkillVariableForm
      v-if="resolvedSkill"
      :variables="resolvedSkill.variables"
      :model-value="skillValues"
      @update:model-value="skillValues = $event"
    />

    <button
      class="wz-btn wz-btn--primary w-full"
      :disabled="generating || (resolvedSkill && !resolvedSkill.variables.length && !selectedGenre)"
      @click="generate"
    >
      {{ generating ? '生成中…' : '生成' }}
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
.ai-write-panel {
  display: flex;
  flex-direction: column;
  gap: var(--space-3);
}
.ai-write-panel h4 {
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
