import type { IdentityId } from './wendao-lineage'

export interface AiGenre {
  id: string
  name: string
  /** 是否显示字数输入 */
  hasWordCount: boolean
  /** 默认匹配 Skill ID */
  defaultSkill?: string
}

export const AI_GENRES_BY_IDENTITY: Record<IdentityId, AiGenre[]> = {
  general: [
    { id: 'essay', name: '散文', hasWordCount: true, defaultSkill: 'general-write' },
    { id: 'short-story', name: '短篇小说', hasWordCount: true, defaultSkill: 'general-write' },
    { id: 'blog', name: '博客', hasWordCount: true, defaultSkill: 'general-write' },
  ],
  webnovel: [
    { id: 'xuanhuan', name: '玄幻', hasWordCount: true, defaultSkill: 'novel-continue' },
    { id: 'dushi', name: '都市', hasWordCount: true, defaultSkill: 'novel-continue' },
    { id: 'xuanyi', name: '悬疑', hasWordCount: true, defaultSkill: 'novel-continue' },
    { id: 'kefant', name: '科幻', hasWordCount: true, defaultSkill: 'novel-continue' },
    { id: 'yanqing', name: '言情', hasWordCount: true, defaultSkill: 'novel-continue' },
  ],
  poet: [
    { id: 'wujue', name: '五绝', hasWordCount: false, defaultSkill: 'poetry-gen' },
    { id: 'qijue', name: '七绝', hasWordCount: false, defaultSkill: 'poetry-gen' },
    { id: 'wulv', name: '五律', hasWordCount: false, defaultSkill: 'poetry-gen' },
    { id: 'qilv', name: '七律', hasWordCount: false, defaultSkill: 'poetry-gen' },
    { id: 'ci', name: '词', hasWordCount: false, defaultSkill: 'poetry-gen' },
    { id: 'qu', name: '曲', hasWordCount: false, defaultSkill: 'poetry-gen' },
  ],
  official: [
    { id: 'notice', name: '通知', hasWordCount: false, defaultSkill: 'official-notice' },
    { id: 'report', name: '报告', hasWordCount: false, defaultSkill: 'official-report' },
    { id: 'request', name: '请示', hasWordCount: false, defaultSkill: 'official-report' },
    { id: 'memo', name: '纪要', hasWordCount: false, defaultSkill: 'official-report' },
  ],
  scholar: [
    { id: 'abstract', name: '论文摘要', hasWordCount: true, defaultSkill: 'academic-polish' },
    { id: 'review', name: '文献综述', hasWordCount: true, defaultSkill: 'academic-polish' },
    { id: 'method', name: '研究方法', hasWordCount: true, defaultSkill: 'academic-polish' },
  ],
  nonfiction: [
    { id: 'interview', name: '人物专访', hasWordCount: true, defaultSkill: 'general-write' },
    { id: 'feature', name: '特稿', hasWordCount: true, defaultSkill: 'general-write' },
    { id: 'memoir', name: '回忆录', hasWordCount: true, defaultSkill: 'general-write' },
  ],
  editor: [],
  essayist: [
    { id: 'diary', name: '日记', hasWordCount: false, defaultSkill: 'general-write' },
    { id: 'prose', name: '随笔', hasWordCount: false, defaultSkill: 'general-write' },
  ],
  screenwriter: [
    { id: 'scene', name: '场景', hasWordCount: false, defaultSkill: 'screenplay-scene' },
    { id: 'dialogue', name: '对白', hasWordCount: false, defaultSkill: 'screenplay-scene' },
    { id: 'storyboard', name: '分镜', hasWordCount: false, defaultSkill: 'screenplay-scene' },
  ],
  planner: [
    { id: 'brand', name: '品牌方案', hasWordCount: true, defaultSkill: 'general-write' },
    { id: 'event', name: '活动策划', hasWordCount: true, defaultSkill: 'general-write' },
    { id: 'prd', name: 'PRD', hasWordCount: true, defaultSkill: 'general-write' },
    { id: 'contract', name: '合同', hasWordCount: false, defaultSkill: 'planner-contract' },
  ],
}

export function getGenresByIdentity(identityId: IdentityId): AiGenre[] {
  return AI_GENRES_BY_IDENTITY[identityId] ?? AI_GENRES_BY_IDENTITY.general
}

export function getGenreById(identityId: IdentityId, genreId: string): AiGenre | undefined {
  return getGenresByIdentity(identityId).find((g) => g.id === genreId)
}
