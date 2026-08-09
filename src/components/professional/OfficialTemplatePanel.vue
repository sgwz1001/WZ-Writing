<script setup lang="ts">
import { computed, ref, watch } from 'vue'
import { editorRef } from '../../stores/editorRef'
import { applyOfficialFormat } from '../../utils/officialFormat'
import { OFFICIAL_TEMPLATES, getOfficialTemplate, renderOfficialSkeleton } from '../../data/officialTemplates'

const selectedId = ref('notice')
const template = computed(() => getOfficialTemplate(selectedId.value))

const vars = ref<Record<string, string>>({})

watch(
  template,
  (t) => {
    if (!t) return
    const next: Record<string, string> = {}
    const matches = t.skeleton.match(/\{\{([^}]+)\}\}/g) ?? []
    for (const m of matches) {
      const key = m.slice(2, -2)
      next[key] = vars.value[key] ?? ''
    }
    vars.value = next
  },
  { immediate: true },
)

function insert() {
  const ed = editorRef.value
  if (!ed || !template.value) return
  const html = renderOfficialSkeleton(template.value, vars.value)
  ed.chain().focus().insertContent(html).run()
  applyOfficialFormat(ed, template.value.format)
}

function formatCurrent() {
  const ed = editorRef.value
  if (!ed) return
  const t = template.value ?? OFFICIAL_TEMPLATES[0]
  applyOfficialFormat(ed, t.format)
}
</script>

<template>
  <div class="professional-panel">
    <h4>公文模板</h4>
    <label class="field">
      <span>文种</span>
      <select v-model="selectedId" class="wz-input">
        <option v-for="t in OFFICIAL_TEMPLATES" :key="t.id" :value="t.id">{{ t.name }}</option>
      </select>
    </label>
    <p v-if="template" class="desc">{{ template.description }}</p>

    <div class="vars">
      <label v-for="key in Object.keys(vars)" :key="key" class="field">
        <span>{{ key }}</span>
        <input v-model="vars[key]" class="wz-input" :placeholder="`填写${key}`" />
      </label>
    </div>

    <div class="actions">
      <button class="wz-btn wz-btn--primary w-full" :disabled="!template" @click="insert">插入并排版</button>
      <button class="wz-btn wz-btn--ghost w-full" @click="formatCurrent">一键排版当前文</button>
    </div>
  </div>
</template>

<style scoped>
.professional-panel {
  display: flex;
  flex-direction: column;
  gap: var(--space-3);
}
.professional-panel h4 {
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
.desc {
  margin: 0;
  font-size: 12px;
  color: var(--c-text-tertiary);
  line-height: 1.5;
}
.vars {
  display: flex;
  flex-direction: column;
  gap: var(--space-3);
}
.actions {
  display: flex;
  flex-direction: column;
  gap: var(--space-2);
  margin-top: var(--space-2);
}
.w-full {
  width: 100%;
  justify-content: center;
}
</style>
