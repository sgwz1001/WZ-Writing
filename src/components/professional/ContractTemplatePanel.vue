<script setup lang="ts">
import { computed, ref, watch } from 'vue'
import { editorRef } from '../../stores/editorRef'
import { CONTRACT_TEMPLATES, getContractTemplate, renderContractSkeleton } from '../../data/contractTemplates'

const selectedId = ref('service')
const template = computed(() => getContractTemplate(selectedId.value))

const vars = ref<Record<string, string>>({})
const today = new Date().toISOString().split('T')[0]

watch(
  template,
  (t) => {
    if (!t) return
    const next: Record<string, string> = { 日期: today }
    const matches = t.skeleton.match(/\{\{([^}]+)\}\}/g) ?? []
    for (const m of matches) {
      const key = m.slice(2, -2)
      if (!(key in next)) {
        next[key] = vars.value[key] ?? ''
      }
    }
    vars.value = next
  },
  { immediate: true },
)

function insert() {
  const ed = editorRef.value
  if (!ed || !template.value) return
  const html = renderContractSkeleton(template.value, vars.value)
  ed.chain().focus().insertContent(html).run()
}
</script>

<template>
  <div class="professional-panel">
    <h4>合同模板</h4>
    <label class="field">
      <span>合同类型</span>
      <select v-model="selectedId" class="wz-input">
        <option v-for="t in CONTRACT_TEMPLATES" :key="t.id" :value="t.id">{{ t.name }}</option>
      </select>
    </label>
    <p v-if="template" class="desc">{{ template.description }}</p>

    <div class="clauses">
      <span v-for="c in template?.clauses" :key="c" class="clause-tag">{{ c }}</span>
    </div>

    <div class="vars">
      <label v-for="key in Object.keys(vars)" :key="key" class="field">
        <span>{{ key }}</span>
        <input v-model="vars[key]" class="wz-input" :placeholder="`填写${key}`" />
      </label>
    </div>

    <div class="actions">
      <button class="wz-btn wz-btn--primary w-full" :disabled="!template" @click="insert">插入骨架</button>
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
.clauses {
  display: flex;
  flex-wrap: wrap;
  gap: 4px;
}
.clause-tag {
  font-size: 11px;
  padding: 2px 8px;
  border-radius: var(--radius-sm);
  background: var(--c-bg-sunken);
  color: var(--c-text-secondary);
  border: 1px solid var(--c-border);
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
