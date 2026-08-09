<script setup lang="ts">
import { ref, computed } from 'vue'
import { useSkillLibraryStore } from '../stores/skillLibrary'
import { parseSkill, type Skill } from '../skills/types'

const store = useSkillLibraryStore()
const tab = ref<'builtin' | 'custom'>('builtin')
const importRaw = ref('')
const showImport = ref(false)

const list = computed(() =>
  tab.value === 'builtin' ? store.builtinSkills : store.customSkills,
)

function toggle(skill: Skill) {
  store.toggle(skill.id, !skill.enabled)
}

function doImport() {
  try {
    const skill = parseSkill(importRaw.value, { builtin: false, enabled: true })
    store.addCustom(skill)
    importRaw.value = ''
    showImport.value = false
    tab.value = 'custom'
  } catch (e) {
    alert('解析失败：' + (e as Error).message)
  }
}

function exportSkill(skill: Skill) {
  const lines = [
    '---',
    `id: ${skill.id}`,
    `name: ${skill.name}`,
    `version: ${skill.version}`,
    `author: ${skill.author}`,
    `category: ${skill.category}`,
    `tags: [${skill.tags.map((t) => `"${t}"`).join(', ')}]`,
  ]
  if (skill.match) {
    lines.push('match:')
    if (skill.match.task) lines.push(`  task: ${skill.match.task}`)
    if (skill.match.keywords) lines.push(`  keywords: [${skill.match.keywords.map((k) => `"${k}"`).join(', ')}]`)
  }
  if (skill.variables.length) {
    lines.push('variables:')
    for (const v of skill.variables) {
      lines.push(`  - name: ${v.name}`)
      lines.push(`    label: ${v.label}`)
      lines.push(`    type: ${v.type}`)
      if (v.default !== undefined) lines.push(`    default: ${v.default}`)
      if (v.options) lines.push(`    options: [${v.options.map((o) => `"${o}"`).join(', ')}]`)
      if (v.required) lines.push('    required: true')
      if (v.placeholder) lines.push(`    placeholder: ${v.placeholder}`)
    }
  }
  if (skill.system) lines.push(`system: |\n  ${skill.system.replace(/\n/g, '\n  ')}`)
  lines.push('---')
  lines.push(skill.prompt)
  navigator.clipboard?.writeText(lines.join('\n'))
}
</script>

<template>
  <div class="skill-manager">
    <div class="manager-head">
      <button class="wz-btn wz-btn--sm" :class="{ 'is-active': tab === 'builtin' }" @click="tab = 'builtin'">
        内置
      </button>
      <button class="wz-btn wz-btn--sm" :class="{ 'is-active': tab === 'custom' }" @click="tab = 'custom'">
        自定义
      </button>
      <button class="wz-btn wz-btn--primary wz-btn--sm" @click="showImport = true">导入</button>
    </div>

    <div class="skill-list">
      <div v-for="skill in list" :key="skill.id" class="skill-row">
        <input
          type="checkbox"
          class="wz-check"
          :checked="skill.enabled"
          :disabled="!skill.builtin && tab === 'custom'"
          @change="toggle(skill)"
        />
        <div class="skill-meta">
          <div class="skill-name">{{ skill.name }}</div>
          <div class="skill-tags">{{ skill.category }} · {{ skill.tags.join(' / ') || '无标签' }}</div>
        </div>
        <button v-if="!skill.builtin" class="wz-btn wz-btn--ghost wz-btn--xs" @click="exportSkill(skill)">
          复制
        </button>
        <button v-if="!skill.builtin" class="wz-btn wz-btn--ghost wz-btn--xs" @click="store.removeCustom(skill.id)">
          删除
        </button>
      </div>
      <p v-if="!list.length" class="empty">暂无 Skill</p>
    </div>

    <Teleport to="body">
      <div v-if="showImport" class="wz-overlay" @click.self="showImport = false">
        <div class="wz-modal">
          <div class="wz-modal__head">
            <h3>导入 Skill</h3>
            <button class="wz-icon-btn" @click="showImport = false">×</button>
          </div>
          <div class="wz-modal__body">
            <textarea v-model="importRaw" class="wz-input import-area" placeholder="粘贴 SKILL.md 全文…" rows="12" />
          </div>
          <div class="wz-modal__actions">
            <button class="wz-btn wz-btn--ghost" @click="showImport = false">取消</button>
            <button class="wz-btn wz-btn--primary" :disabled="!importRaw.trim()" @click="doImport">导入</button>
          </div>
        </div>
      </div>
    </Teleport>
  </div>
</template>

<style scoped>
.skill-manager {
  display: flex;
  flex-direction: column;
  gap: var(--space-3);
}
.manager-head {
  display: flex;
  gap: var(--space-2);
}
.skill-list {
  max-height: 240px;
  overflow-y: auto;
  display: flex;
  flex-direction: column;
  gap: 4px;
  border: 1px solid var(--c-border);
  border-radius: var(--radius-md);
  padding: var(--space-2);
}
.skill-row {
  display: flex;
  align-items: center;
  gap: var(--space-2);
  padding: 6px 8px;
  border-radius: var(--radius-sm);
}
.skill-row:hover {
  background: var(--c-surface-hover);
}
.skill-meta {
  flex: 1;
  min-width: 0;
}
.skill-name {
  font-size: 13px;
  color: var(--c-text-base);
}
.skill-tags {
  font-size: 11px;
  color: var(--c-text-tertiary);
}
.empty {
  font-size: 12px;
  color: var(--c-text-tertiary);
  text-align: center;
  padding: var(--space-4);
}
.import-area {
  width: 100%;
  min-height: 200px;
  font-family: monospace;
  font-size: 12px;
}
</style>
