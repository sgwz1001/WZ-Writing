import type { Skill, SkillMatchRequest } from './types'

export function matchSkill(req: SkillMatchRequest, skills: Skill[]): Skill | undefined {
  const enabled = skills.filter((s) => s.enabled)

  // 1. 按身份过滤：通用 或 本身份
  let candidates = enabled.filter(
    (s) => s.category === 'general' || s.category === req.identityId,
  )

  // 2. 按任务精确匹配
  const exact = candidates.find((s) => s.match?.task === req.task)
  if (exact) return exact

  // 3. 按关键词匹配 tags
  const text = (req.userText || '').toLowerCase()
  if (text) {
    const byTag = candidates.find((s) =>
      s.tags.some((t) => text.includes(t.toLowerCase())),
    )
    if (byTag) return byTag
  }

  // 4. fallback：返回通用生成 Skill
  return enabled.find((s) => s.id === 'general-write')
}
