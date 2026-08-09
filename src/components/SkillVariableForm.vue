<script setup lang="ts">
import { computed } from 'vue'
import type { SkillVariable } from '../skills/types'

const props = defineProps<{
  variables: SkillVariable[]
  modelValue: Record<string, unknown>
}>()

const emit = defineEmits<{
  (e: 'update:modelValue', v: Record<string, unknown>): void
}>()

const values = computed({
  get: () => props.modelValue,
  set: (v) => emit('update:modelValue', v),
})

function update(name: string, value: unknown) {
  values.value = { ...values.value, [name]: value }
}
</script>

<template>
  <div class="skill-variable-form">
    <label v-for="v in variables" :key="v.name" class="var-row">
      <span class="var-label">{{ v.label }}</span>

      <select
        v-if="v.type === 'select'"
        :value="String(values[v.name] ?? v.default ?? '')"
        class="wz-input"
        @change="update(v.name, ($event.target as HTMLSelectElement).value)"
      >
        <option v-for="opt in v.options" :key="opt" :value="opt">{{ opt }}</option>
      </select>

      <textarea
        v-else-if="v.type === 'textarea'"
        :value="String(values[v.name] ?? v.default ?? '')"
        class="wz-input"
        :placeholder="v.placeholder"
        rows="4"
        @input="update(v.name, ($event.target as HTMLTextAreaElement).value)"
      />

      <input
        v-else-if="v.type === 'number'"
        :value="Number(values[v.name] ?? v.default ?? 0)"
        type="number"
        class="wz-input"
        @input="update(v.name, Number(($event.target as HTMLInputElement).value))"
      />

      <input
        v-else-if="v.type === 'boolean'"
        :checked="Boolean(values[v.name] ?? v.default ?? false)"
        type="checkbox"
        class="wz-check"
        @change="update(v.name, ($event.target as HTMLInputElement).checked)"
      />

      <input
        v-else
        :value="String(values[v.name] ?? v.default ?? '')"
        type="text"
        class="wz-input"
        :placeholder="v.placeholder"
        @input="update(v.name, ($event.target as HTMLInputElement).value)"
      />
    </label>
  </div>
</template>

<style scoped>
.skill-variable-form {
  display: flex;
  flex-direction: column;
  gap: var(--space-3);
}
.var-row {
  display: flex;
  flex-direction: column;
  gap: 4px;
}
.var-label {
  font-size: 12px;
  color: var(--c-text-secondary);
}
</style>
