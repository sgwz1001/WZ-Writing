import { defineStore } from 'pinia'
import { ref, computed } from 'vue'
import { createSkillLibrary } from '../skills/SkillLibrary'
import { parseSkill, type Skill } from '../skills/types'

const CUSTOM_KEY = 'wenzai:custom-skills'
const BUILTIN_STATE_KEY = 'wenzai:builtin-skill-states'

export const useSkillLibraryStore = defineStore('skillLibrary', () => {
  const lib = createSkillLibrary()
  const loaded = ref(false)

  const allSkills = computed(() => lib.getAll())
  const builtinSkills = computed(() => lib.getAll().filter((s) => s.builtin))
  const customSkills = computed(() => lib.getAll().filter((s) => !s.builtin))

  async function load() {
    if (loaded.value) return
    await lib.loadBuiltin()

    // 恢复内置 Skill 启用状态
    try {
      const states = JSON.parse(localStorage.getItem(BUILTIN_STATE_KEY) || '{}')
      for (const s of lib.getAll()) {
        if (s.builtin && typeof states[s.id] === 'boolean') {
          s.enabled = states[s.id]
        }
      }
    } catch {
      // ignore
    }

    // 恢复自定义 Skill
    try {
      const raw = localStorage.getItem(CUSTOM_KEY)
      if (raw) {
        const items: string[] = JSON.parse(raw)
        for (const md of items) {
          lib.add(parseSkill(md, { builtin: false, enabled: true }))
        }
      }
    } catch {
      // ignore
    }

    loaded.value = true
  }

  function saveBuiltinStates() {
    const states: Record<string, boolean> = {}
    for (const s of lib.getAll()) {
      if (s.builtin) states[s.id] = s.enabled
    }
    localStorage.setItem(BUILTIN_STATE_KEY, JSON.stringify(states))
  }

  function saveCustomSkills() {
    const items = customSkills.value.map((s) => {
      const lines = [
        '---',
        `id: ${s.id}`,
        `name: ${s.name}`,
        `version: ${s.version}`,
        `author: ${s.author}`,
        `category: ${s.category}`,
        `tags: [${s.tags.map((t) => `"${t}"`).join(', ')}]`,
      ]
      if (s.match) {
        lines.push('match:')
        if (s.match.task) lines.push(`  task: ${s.match.task}`)
        if (s.match.keywords) lines.push(`  keywords: [${s.match.keywords.map((k) => `"${k}"`).join(', ')}]`)
      }
      if (s.variables.length) {
        lines.push('variables:')
        for (const v of s.variables) {
          lines.push(`  - name: ${v.name}`)
          lines.push(`    label: ${v.label}`)
          lines.push(`    type: ${v.type}`)
          if (v.default !== undefined) lines.push(`    default: ${v.default}`)
          if (v.options) lines.push(`    options: [${v.options.map((o) => `"${o}"`).join(', ')}]`)
          if (v.required) lines.push('    required: true')
          if (v.placeholder) lines.push(`    placeholder: ${v.placeholder}`)
        }
      }
      if (s.system) lines.push(`system: |\n  ${s.system.replace(/\n/g, '\n  ')}`)
      lines.push('---')
      lines.push(s.prompt)
      return lines.join('\n')
    })
    localStorage.setItem(CUSTOM_KEY, JSON.stringify(items))
  }

  function addCustom(skill: Skill) {
    lib.add(skill)
    saveCustomSkills()
  }

  function removeCustom(id: string) {
    lib.remove(id)
    saveCustomSkills()
  }

  function toggle(id: string, enabled: boolean) {
    lib.toggle(id, enabled)
    saveBuiltinStates()
  }

  function get(id: string) {
    return lib.get(id)
  }

  function getAll() {
    return lib.getAll()
  }

  return {
    loaded,
    allSkills,
    builtinSkills,
    customSkills,
    load,
    addCustom,
    removeCustom,
    toggle,
    get,
    getAll,
  }
})
