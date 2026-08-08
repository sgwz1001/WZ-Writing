/**
 * 身份能力矩阵 · Identity Profile
 *
 * 这份文件回答用户提的那个核心问题：
 *   「哪些是通用的？哪些是每个身份独有的？」
 *
 * 设计原则（v0.4.0 定稿）——「通用外壳 + 模块显隐」：
 *   1. 外壳（窗口、项目树、编辑器、保存、导出、设置）九个身份完全一致，
 *      学一次就会，换身份不用重新学。
 *   2. 差异只体现在三处：**术语**、**右侧工具区**、**默认结构**。
 *      比如剧作把「章节」叫「场次」，词客把「章节」叫「作品」。
 *   3. 每个身份都写清楚：这行人真实的痛点是什么、我们给了什么工具。
 *      没有对应痛点的工具，就不该出现在那个身份的界面上。
 */
import type { IdentityId } from './wendao-lineage'

/** 功能模块 id */
export type ModuleId =
  // ── 通用（所有身份恒定开启，不可关闭）──
  | 'editor'
  | 'autosave'
  | 'outline-tree'
  | 'wordcount'
  | 'export'
  | 'snapshot'
  // ── 可选通用（默认开，用户可关）──
  | 'proofread'
  | 'focus'
  // ── 身份专属 ──
  | 'segment'
  | 'titling'
  | 'outline'
  | 'character'
  | 'prosody'
  | 'rhyme'
  | 'cipai'
  | 'classical'
  | 'typeset'
  | 'official-format'
  | 'citation'
  | 'timeline'
  | 'interview'
  | 'gzh-export'
  | 'zen'
  | 'script-format'
  | 'dialogue'
  | 'contract'
  | 'brief'
  | 'persona'
  | 'slogan'
  | 'variant'

export interface ModuleMeta {
  id: ModuleId
  name: string
  /** 一句话说明它替用户解决了什么 */
  desc: string
  icon: string
  /** 分层：core = 恒定通用，common = 可选通用，special = 身份专属 */
  tier: 'core' | 'common' | 'special'
}

/** 全部模块的元信息。界面上的工具按钮从这里生成，不再散落在各组件里。 */
export const MODULES: Record<ModuleId, ModuleMeta> = {
  // ── 恒定通用 ──
  editor: { id: 'editor', name: '正文编辑器', desc: '富文本写作区，支持标题层级与格式', icon: '✎', tier: 'core' },
  autosave: { id: 'autosave', name: '断点保存', desc: '三级缓冲 + 崩溃恢复，断电也不丢字', icon: '⛨', tier: 'core' },
  'outline-tree': { id: 'outline-tree', name: '目录结构', desc: '卷 / 章的层级目录，可拖拽排序', icon: '☰', tier: 'core' },
  wordcount: { id: 'wordcount', name: '字数统计', desc: '实时字数，可选是否计标点与标题', icon: '#', tier: 'core' },
  export: { id: 'export', name: '导入导出', desc: 'TXT / DOCX / PDF / CSV，支持整本批量', icon: '⇪', tier: 'core' },
  snapshot: { id: 'snapshot', name: '版本快照', desc: '定时留档，随时回到任意历史版本', icon: '◷', tier: 'core' },

  // ── 可选通用 ──
  proofread: { id: 'proofread', name: '错字校对', desc: '本地词库实时标红 + 可选大模型深度纠错', icon: '✓', tier: 'common' },
  focus: { id: 'focus', name: '专注模式', desc: '隐去一切界面元素，只剩当前段落', icon: '◎', tier: 'common' },

  // ── 身份专属 ──
  segment: { id: 'segment', name: '一键分段', desc: '长段落按语义切分，滑块调节松紧', icon: '⁋', tier: 'special' },
  titling: { id: 'titling', name: '取标题', desc: '按流派生成章节名，含外国文学式英译', icon: '❝', tier: 'special' },
  outline: { id: 'outline', name: '大纲推演', desc: '主线 / 支线 / 伏笔的结构化梳理', icon: '⌗', tier: 'special' },
  character: { id: 'character', name: '人物卡', desc: '人设、关系、出场记录，防人物崩坏', icon: '👤', tier: 'special' },
  prosody: { id: 'prosody', name: '格律校验', desc: '五/七言绝句律诗的平仄粘对检查', icon: '平', tier: 'special' },
  rhyme: { id: 'rhyme', name: '韵书查询', desc: '平水韵 / 词林正韵，同韵字速查', icon: '韵', tier: 'special' },
  cipai: { id: 'cipai', name: '词牌填词', desc: '按词牌逐句提示字数与平仄，实时校对', icon: '词', tier: 'special' },
  classical: { id: 'classical', name: '古典文体', desc: '乐府 / 元曲 / 文言文 / 赋 的体例模板', icon: '古', tier: 'special' },
  typeset: { id: 'typeset', name: '一键排版', desc: '首行缩进、段间距、标点规范化', icon: '▤', tier: 'special' },
  'official-format': { id: 'official-format', name: '公文格式', desc: '党政机关公文格式国标层级与用语', icon: '印', tier: 'special' },
  citation: { id: 'citation', name: '引注管理', desc: 'GB/T 7714 与常见期刊格式的参考文献', icon: '¹', tier: 'special' },
  timeline: { id: 'timeline', name: '事实时间轴', desc: '事件按时间排布，核对前后矛盾', icon: '⟼', tier: 'special' },
  interview: { id: 'interview', name: '访谈整理', desc: '口述录音稿转书面语，保留原声引语', icon: '🎙', tier: 'special' },
  'gzh-export': { id: 'gzh-export', name: '公众号排版', desc: '生成可直接粘贴进公众号后台的样式', icon: '❐', tier: 'special' },
  zen: { id: 'zen', name: '素笺模式', desc: '去掉全部工具，只留纸和光标', icon: '○', tier: 'special' },
  'script-format': { id: 'script-format', name: '剧本格式', desc: '场景标题 / 动作 / 对白的标准剧本排版', icon: '🎬', tier: 'special' },
  dialogue: { id: 'dialogue', name: '对白打磨', desc: '按角色口吻检查台词一致性', icon: '❞', tier: 'special' },
  contract: { id: 'contract', name: '条款模板', desc: '合同 / 协议常用条款与风险提示', icon: '§', tier: 'special' },
  brief: { id: 'brief', name: '需求简报', desc: '目标 / 受众 / 主张 / 交付物，动笔前先对齐', icon: '◈', tier: 'special' },
  persona: { id: 'persona', name: '受众画像', desc: '人群标签与痛点，写给谁看先想清楚', icon: '◑', tier: 'special' },
  slogan: { id: 'slogan', name: '卖点提炼', desc: '把一堆功能拧成一句能打动人的主张', icon: '✦', tier: 'special' },
  variant: { id: 'variant', name: '多版并出', desc: '同一主张一次生成多渠道多长度版本', icon: '⧉', tier: 'special' },
}

/** 恒定通用模块 —— 九个身份完全一致，界面上不提供开关。 */
export const CORE_MODULES: ModuleId[] = [
  'editor',
  'autosave',
  'outline-tree',
  'wordcount',
  'export',
  'snapshot',
]

export interface IdentityProfile {
  id: IdentityId
  /** 主题强调色（HEX），进入该身份后覆盖皮肤的 accent */
  accent: string
  /** 术语表：同一个东西，不同身份的叫法 */
  terms: {
    /** 项目层怎么称呼，如「作品」「案卷」「剧本」 */
    project: string
    /** 章节层怎么称呼，如「章」「场」「篇」 */
    chapter: string
    /** 分组层怎么称呼，如「卷」「幕」「辑」 */
    volume: string
    /** 新建按钮的文案 */
    newProject: string
    newChapter: string
  }
  /** 新建项目时自动生成的初始结构（章节标题） */
  starterChapters: string[]
  /** 该行业真实痛点（写给用户看的，展示在身份说明栏） */
  painPoints: string[]
  /** 我们提供的对应工具（与 painPoints 一一对应） */
  solutions: string[]
  /** 专属模块（core 之外的） */
  modules: ModuleId[]
  /** 默认字数目标（每章），0 表示不设 */
  chapterGoal: number
}

export const IDENTITY_PROFILES: Record<IdentityId, IdentityProfile> = {
  general: {
    id: 'general',
    accent: '#7C9CF5',
    terms: { project: '文集', chapter: '篇', volume: '辑', newProject: '新建文集', newChapter: '新建一篇' },
    starterChapters: ['第一篇'],
    painPoints: ['不想被文体框住，只想先写下来', '写完不知道有没有错字'],
    solutions: ['最简界面，不预设任何格式', '本地词库实时标红，离线可用'],
    modules: ['proofread', 'focus'],
    chapterGoal: 0,
  },

  webnovel: {
    id: 'webnovel',
    accent: '#F5A65B',
    terms: { project: '书', chapter: '章', volume: '卷', newProject: '开新书', newChapter: '写下一章' },
    starterChapters: ['第一章'],
    painPoints: [
      '日更压力大，卡在章节名上就写不动',
      '几十万字后，伏笔和人物设定自己都记不清',
      '大段对话堆在一起，读者阅读体验差',
      '断更一天数据就掉，需要随时接着上次继续',
    ],
    solutions: [
      '取标题模块，按流派一次给多个候选',
      '大纲推演 + 人物卡，主线支线伏笔集中管理',
      '一键分段，滑块调节松紧，即时预览',
      '小火苗直达上次写到的那一章，自动接续新章',
    ],
    modules: ['proofread', 'focus', 'segment', 'titling', 'outline', 'character'],
    chapterGoal: 3000,
  },

  poet: {
    id: 'poet',
    accent: '#E58FA8',
    terms: { project: '集', chapter: '首', volume: '卷', newProject: '新建诗集', newChapter: '题新篇' },
    starterChapters: ['无题'],
    painPoints: [
      '平仄粘对靠记，写完还要一个字一个字数',
      '填词要翻《钦定词谱》，一个词牌一个格式',
      '想写乐府 / 元曲 / 文言文，没有体例参考',
      '押韵要查平水韵，来回切换很麻烦',
    ],
    solutions: [
      '格律校验，逐字标出平仄与出律位置',
      '内置词牌库，选牌即出格，逐句提示字数平仄',
      '古典文体模板：乐府、元曲曲牌、文言文体、赋',
      '韵书内嵌，光标处即可查同韵字',
    ],
    modules: ['prosody', 'rhyme', 'cipai', 'classical', 'typeset', 'focus'],
    chapterGoal: 0,
  },

  official: {
    id: 'official',
    accent: '#6FA8A0',
    terms: { project: '案卷', chapter: '文', volume: '类', newProject: '新建案卷', newChapter: '拟新文' },
    starterChapters: ['正文'],
    painPoints: [
      '公文层级序号写错要重排整篇',
      '合同条款容易漏项，出了问题追责到人',
      '措辞分寸难拿捏，用词不当会出事',
    ],
    solutions: [
      '公文格式模块，按国标自动编号层级',
      '条款模板库，常用条款与风险点提示',
      '错字校对 + 敏感措辞提醒',
    ],
    modules: ['proofread', 'official-format', 'contract', 'typeset'],
    chapterGoal: 0,
  },

  scholar: {
    id: 'scholar',
    accent: '#8E8FD8',
    terms: { project: '课题', chapter: '章', volume: '编', newProject: '新建课题', newChapter: '新建一章' },
    starterChapters: ['摘要', '引言'],
    painPoints: [
      '参考文献格式各刊不同，手改容易出错',
      '引文和正文对不上，返修被打回',
      '长文结构容易失衡，各章篇幅不匀',
    ],
    solutions: [
      '引注管理，GB/T 7714 与常见期刊格式一键切换',
      '引文标记与文末条目双向关联',
      '目录树显示各章字数，结构失衡一眼看出',
    ],
    modules: ['proofread', 'citation', 'typeset', 'focus'],
    chapterGoal: 0,
  },

  nonfiction: {
    id: 'nonfiction',
    accent: '#C98F63',
    terms: { project: '选题', chapter: '节', volume: '部', newProject: '新建选题', newChapter: '新建一节' },
    starterChapters: ['开篇'],
    painPoints: [
      '采访素材散在录音、笔记、聊天记录里',
      '时间线一乱，事实就站不住',
      '口述转书面容易失真，又不能改动引语',
    ],
    solutions: [
      '访谈整理模块，原声引语与整理稿分栏对照',
      '事实时间轴，事件按时间排布并校验矛盾',
      '引语区独立锁定，排版时不被自动改写',
    ],
    modules: ['proofread', 'timeline', 'interview', 'typeset'],
    chapterGoal: 0,
  },

  editor: {
    id: 'editor',
    accent: '#5FB4C9',
    terms: { project: '刊期', chapter: '稿', volume: '栏目', newProject: '新建刊期', newChapter: '新增一稿' },
    starterChapters: ['头条'],
    painPoints: [
      '公众号后台排版反复调，一次要花半小时',
      '来稿格式五花八门，统一排版靠手工',
      '错字漏字上线之后才被读者发现',
    ],
    solutions: [
      '公众号排版，生成可直接粘贴的样式',
      '一键排版，缩进段距标点一次规范',
      '发布前批量校对，整刊一次扫完',
    ],
    modules: ['proofread', 'typeset', 'gzh-export'],
    chapterGoal: 0,
  },

  essayist: {
    id: 'essayist',
    accent: '#93B77E',
    terms: { project: '本子', chapter: '则', volume: '辑', newProject: '新开一本', newChapter: '写一则' },
    starterChapters: ['今天'],
    painPoints: ['界面太热闹，写私人文字会分心', '写完不想被任何人看到'],
    solutions: ['素笺模式，只剩纸和光标', '全程本地存储，不联网、不同步'],
    modules: ['zen', 'focus'],
    chapterGoal: 0,
  },

  screenwriter: {
    id: 'screenwriter',
    accent: '#D9736B',
    terms: { project: '剧本', chapter: '场', volume: '幕', newProject: '新建剧本', newChapter: '加一场' },
    starterChapters: ['第一场'],
    painPoints: [
      '剧本格式严格，缩进对不齐制片方不收',
      '多个角色的口吻容易写串',
      '改一场戏，后面场次编号全乱',
    ],
    solutions: [
      '剧本格式模块，场景标题 / 动作 / 对白自动排版',
      '对白打磨，按角色检查台词一致性',
      '场次拖拽排序，编号自动重排',
    ],
    modules: ['proofread', 'script-format', 'dialogue', 'character'],
    chapterGoal: 0,
  },

  planner: {
    id: 'planner',
    accent: '#D7A94B',
    terms: { project: '案子', chapter: '方案', volume: '阶段', newProject: '接新案', newChapter: '写新方案' },
    starterChapters: ['需求简报', '核心主张', '文案初稿'],
    painPoints: [
      '甲方一句「再多给几版」，改到第八版还在原地打转',
      '卖点罗列了一堆，说不清哪一条真能打动人',
      '动笔前没对齐目标和受众，写完整个推翻',
      '同一个概念要出短标题、长图文、朋友圈、详情页好几种版本',
    ],
    solutions: [
      '多版并出，一次给足平行候选，横向比对而不是逐版磨',
      '卖点提炼，按受众排序打分，先定主张再动笔',
      '需求简报模板，目标 / 受众 / 主张 / 交付物写在最前面',
      '同一主张自动改写成不同渠道的长度与语气',
    ],
    modules: ['proofread', 'brief', 'persona', 'slogan', 'variant', 'titling', 'focus'],
    chapterGoal: 0,
  },
}

export function getProfile(id: IdentityId | string | null | undefined): IdentityProfile {
  return IDENTITY_PROFILES[(id as IdentityId) ?? 'general'] ?? IDENTITY_PROFILES.general
}

/** 某身份最终启用的全部模块 = 恒定通用 + 该身份专属 */
export function getModules(id: IdentityId | string | null | undefined): ModuleMeta[] {
  const prof = getProfile(id)
  return [...CORE_MODULES, ...prof.modules].map((m) => MODULES[m]).filter(Boolean)
}

/** 只取右侧工具区要显示的（排除恒定通用里那些没有面板的） */
export function getToolModules(id: IdentityId | string | null | undefined): ModuleMeta[] {
  const prof = getProfile(id)
  return prof.modules.map((m) => MODULES[m]).filter(Boolean)
}

export function getTerms(id: IdentityId | string | null | undefined) {
  return getProfile(id).terms
}
