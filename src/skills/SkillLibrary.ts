import { parseSkill, type Skill } from './types'

export interface SkillLibrary {
  skills: Skill[]
  loadBuiltin: () => Promise<void>
  getAll: () => Skill[]
  get: (id: string) => Skill | undefined
  add: (skill: Skill) => void
  remove: (id: string) => void
  toggle: (id: string, enabled: boolean) => void
}

export function createSkillLibrary(): SkillLibrary {
  const skills: Skill[] = []

  async function loadBuiltin() {
    const modules = import.meta.glob<string>('/src/skills/builtin/*.md', {
      query: '?raw',
      import: 'default',
    })
    for (const path in modules) {
      const raw = await modules[path]()
      skills.push(parseSkill(raw, { builtin: true, path, enabled: true }))
    }
  }

  function getAll() {
    return skills
  }

  function get(id: string) {
    return skills.find((s) => s.id === id)
  }

  function add(skill: Skill) {
    const idx = skills.findIndex((s) => s.id === skill.id)
    if (idx >= 0) skills[idx] = skill
    else skills.push(skill)
  }

  function remove(id: string) {
    const idx = skills.findIndex((s) => s.id === id)
    if (idx >= 0) skills.splice(idx, 1)
  }

  function toggle(id: string, enabled: boolean) {
    const s = skills.find((s) => s.id === id)
    if (s) s.enabled = enabled
  }

  return {
    skills,
    loadBuiltin,
    getAll,
    get,
    add,
    remove,
    toggle,
  }
}
