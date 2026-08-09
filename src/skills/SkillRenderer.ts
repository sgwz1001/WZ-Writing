import { useEditorStore } from '../stores/editor'
import { useIdentitySessionStore } from '../stores/identitySession'
import type { Skill, SkillVariable } from './types'

export interface RenderedSkill {
  system?: string
  user: string
}

export function renderSkill(skill: Skill, vars: Record<string, unknown>): RenderedSkill {
  const merged = { ...buildAutoVars(), ...vars }
  const user = replaceVars(skill.prompt, merged)
  const system = skill.system ? replaceVars(skill.system, merged) : undefined
  return { system, user }
}

export function buildDefaultValues(variables: SkillVariable[]): Record<string, unknown> {
  const out: Record<string, unknown> = {}
  for (const v of variables) {
    out[v.name] = v.default ?? ''
  }
  return out
}

function replaceVars(template: string, vars: Record<string, unknown>): string {
  return template.replace(/\{\{(\w+)\}\}/g, (_, key) => {
    const v = vars[key]
    return v == null ? `{{${key}}}` : String(v)
  })
}

function buildAutoVars(): Record<string, unknown> {
  const editor = useEditorStore()
  const identity = useIdentitySessionStore()
  return {
    title: editor.title,
    fullText: editor.content,
    selectedText: '',
    wordCount: editor.charCount,
    identity: identity.identityId,
    identityName: identity.identity.name,
  }
}
