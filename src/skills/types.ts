export interface SkillVariable {
  name: string
  label: string
  type: 'text' | 'number' | 'select' | 'textarea' | 'boolean'
  default?: string | number | boolean
  options?: string[]
  required?: boolean
  placeholder?: string
}

export interface SkillMatch {
  task?: string
  keywords?: string[]
}

export interface Skill {
  id: string
  name: string
  version: string
  author: string
  category: string
  tags: string[]
  match?: SkillMatch
  variables: SkillVariable[]
  system?: string
  prompt: string
  builtin: boolean
  enabled: boolean
  sourcePath?: string
}

export type SkillTask =
  | 'continue'
  | 'title'
  | 'outline'
  | 'polish'
  | 'generate'
  | 'proofread'
  | 'contract'
  | 'scene'

export interface SkillMatchRequest {
  identityId: string
  task: SkillTask
  selectedText?: string
  userText?: string
}

/**
 * 极简 YAML frontmatter + Markdown 解析。
 * 只处理本系统用到的字段，不引入 gray-matter 依赖。
 */
export function parseSkill(raw: string, source: { builtin: boolean; path?: string; enabled?: boolean }): Skill {
  const trimmed = raw.trim()
  let front: Record<string, any> = {}
  let body = trimmed

  if (trimmed.startsWith('---')) {
    const end = trimmed.indexOf('---', 3)
    if (end > 3) {
      const yamlText = trimmed.slice(3, end).trim()
      front = parseSimpleYaml(yamlText)
      body = trimmed.slice(end + 3).trim()
    }
  }

  return {
    id: String(front.id || source.path?.split('/').pop()?.replace(/\.md$/, '') || 'unknown'),
    name: String(front.name || '未命名 Skill'),
    version: String(front.version || '1.0.0'),
    author: String(front.author || ''),
    category: String(front.category || 'general'),
    tags: Array.isArray(front.tags) ? front.tags.map(String) : [],
    match: front.match && typeof front.match === 'object' ? front.match : undefined,
    variables: Array.isArray(front.variables) ? front.variables : [],
    system: front.system ? String(front.system) : undefined,
    prompt: body,
    builtin: source.builtin,
    enabled: source.enabled ?? true,
    sourcePath: source.path,
  }
}

function parseSimpleYaml(text: string): Record<string, any> {
  const result: Record<string, any> = {}
  const lines = text.split('\n')
  let i = 0

  while (i < lines.length) {
    const line = lines[i]
    const match = line.match(/^(\w+):\s*(.*)$/)
    if (!match) {
      i++
      continue
    }
    const key = match[1]
    const rest = match[2].trim()

    if (rest === '|' || rest === '>') {
      // 多行字符串
      i++
      const chunks: string[] = []
      while (i < lines.length && (lines[i].startsWith('  ') || lines[i] === '')) {
        chunks.push(lines[i].slice(2))
        i++
      }
      result[key] = chunks.join('\n').trim()
      continue
    }

    if (rest.startsWith('[') && rest.endsWith(']')) {
      result[key] = rest
        .slice(1, -1)
        .split(',')
        .map((s) => s.trim().replace(/^["']|["']$/g, ''))
        .filter(Boolean)
    } else if (rest.startsWith('"') && rest.endsWith('"')) {
      result[key] = rest.slice(1, -1)
    } else if (rest.startsWith("'") && rest.endsWith("'")) {
      result[key] = rest.slice(1, -1)
    } else if (rest === 'true') {
      result[key] = true
    } else if (rest === 'false') {
      result[key] = false
    } else if (/^-?\d+$/.test(rest)) {
      result[key] = Number(rest)
    } else if (rest === '') {
      // 可能是对象或数组，进入下一行判断
      const next = lines[i + 1]
      if (next && next.trim().startsWith('- ')) {
        const arr: any[] = []
        i++
        while (i < lines.length && lines[i].trim().startsWith('- ')) {
          const item = lines[i].trim().slice(2)
          arr.push(parseYamlValue(item))
          i++
        }
        result[key] = arr
        continue
      }
      if (next && next.startsWith('  ')) {
        const obj: Record<string, any> = {}
        i++
        while (i < lines.length && (lines[i].startsWith('  ') || lines[i] === '')) {
          const inner = lines[i].trim()
          const im = inner.match(/^(\w+):\s*(.*)$/)
          if (im) obj[im[1]] = parseYamlValue(im[2].trim())
          i++
        }
        result[key] = obj
        continue
      }
      result[key] = ''
    } else {
      result[key] = rest
    }
    i++
  }

  return result
}

function parseYamlValue(v: string): any {
  if (v.startsWith('[') && v.endsWith(']')) {
    return v.slice(1, -1).split(',').map((s) => s.trim().replace(/^["']|["']$/g, '')).filter(Boolean)
  }
  if (v.startsWith('"') && v.endsWith('"')) return v.slice(1, -1)
  if (v.startsWith("'") && v.endsWith("'")) return v.slice(1, -1)
  if (v === 'true') return true
  if (v === 'false') return false
  if (/^-?\d+$/.test(v)) return Number(v)
  return v
}
