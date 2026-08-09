/**
 * 身份独立布局引擎 · Layout Profiles
 *
 * 每个身份拥有独立的界面排布：哪些面板显示、工具栏放什么、
 * 编辑区默认样式、右侧检查器内容。StudioView 读取当前身份的
 * LayoutProfile 后动态渲染，避免十个身份共用一套三栏模板。
 */

import type { IdentityId } from './wendao-lineage'

type ToolbarItemId =
  | 'undo'
  | 'redo'
  | 'separator'
  | 'bold'
  | 'italic'
  | 'strike'
  | 'font-family'
  | 'font-size'
  | 'line-height'
  | 'paragraph-spacing'
  | 'first-line-indent'
  | 'text-align'
  | 'table'
  | 'find-replace'
  | 'split'
  | 'title-suggest'
  | 'lexicon'
  | 'ai'
  | 'wechat'
  | 'poetry'
  | 'export'
  | 'official'
  | 'contract'
  | 'citation'
  | 'timeline'
  | 'snapshot'

type PanelId =
  | 'correction'
  | 'word-count'
  | 'lexicon'
  | 'ai'
  | 'title'
  | 'wechat'
  | 'poetry'
  | 'official'
  | 'contract'
  | 'citation'
  | 'timeline'
  | 'snapshot'

type LayoutEngine = 'classic' | 'minimal' | 'academic' | 'script' | 'zen'

export interface LayoutProfile {
  /** 身份 ID */
  identityId: IdentityId
  /** 布局引擎 */
  engine: LayoutEngine
  /** 默认皮肤 */
  preferredSkin: 'genshin' | 'star' | 'zenless'
  /** 是否显示左侧项目树 */
  showSidebar: boolean
  /** 是否显示右侧检查器 */
  showInspector: boolean
  /** 右侧检查器默认激活的标签页 */
  inspectorDefault: PanelId | null
  /** 工具栏按钮顺序 */
  toolbar: ToolbarItemId[]
  /** 编辑区上方的固定工具 */
  editorHeader: ('title' | 'save-state' | 'toolbar')[]
  /** 侧边栏额外模块 */
  sidebarModules: ('identity-badge' | 'projects' | 'quick-chapter' | 'outline' | 'characters' | 'timeline' | 'skin-switch')[]
  /** 右侧检查器可用面板 */
  inspectorPanels: PanelId[]
  /** 编辑器默认排版 */
  defaults: {
    fontFamily: string
    fontSize: number
    lineHeight: number
    paragraphSpacing: number
    firstLineIndent: number
    textAlign: 'left' | 'center' | 'right' | 'justify'
  }
}

const BASE_TOOLBAR: ToolbarItemId[] = [
  'undo', 'redo', 'separator',
  'font-family', 'font-size', 'line-height',
  'paragraph-spacing', 'first-line-indent', 'text-align',
  'separator', 'find-replace', 'split',
]

const DEFAULT_PROFILE: Omit<LayoutProfile, 'identityId'> = {
  engine: 'classic',
  preferredSkin: 'star',
  showSidebar: true,
  showInspector: true,
  inspectorDefault: 'correction',
  toolbar: BASE_TOOLBAR,
  editorHeader: ['title', 'toolbar', 'save-state'],
  sidebarModules: ['identity-badge', 'projects', 'quick-chapter', 'skin-switch'],
  inspectorPanels: ['correction', 'word-count', 'ai'],
  defaults: {
    fontFamily: 'var(--font-manuscript)',
    fontSize: 17,
    lineHeight: 1.9,
    paragraphSpacing: 20,
    firstLineIndent: 2,
    textAlign: 'left',
  },
}

export const IDENTITY_LAYOUT_PROFILES: Record<IdentityId, LayoutProfile> = {
  general: {
    ...DEFAULT_PROFILE,
    identityId: 'general',
    preferredSkin: 'star',
    inspectorPanels: ['correction', 'word-count', 'ai', 'snapshot'],
  },
  webnovel: {
    ...DEFAULT_PROFILE,
    identityId: 'webnovel',
    engine: 'classic',
    preferredSkin: 'zenless',
    sidebarModules: ['identity-badge', 'projects', 'quick-chapter', 'outline', 'skin-switch'],
    inspectorPanels: ['correction', 'word-count', 'ai', 'title', 'snapshot'],
    toolbar: [...BASE_TOOLBAR, 'separator', 'title-suggest', 'ai'],
  },
  poet: {
    ...DEFAULT_PROFILE,
    identityId: 'poet',
    engine: 'minimal',
    preferredSkin: 'genshin',
    inspectorDefault: 'poetry',
    inspectorPanels: ['correction', 'word-count', 'poetry', 'ai'],
    toolbar: ['undo', 'redo', 'separator', 'font-family', 'font-size', 'line-height', 'text-align'],
    defaults: { ...DEFAULT_PROFILE.defaults, fontFamily: "'Source Han Serif SC', 'SimSun', serif", firstLineIndent: 0 },
  },
  official: {
    ...DEFAULT_PROFILE,
    identityId: 'official',
    engine: 'academic',
    preferredSkin: 'star',
    inspectorDefault: 'official',
    inspectorPanels: ['official', 'correction', 'word-count', 'ai'],
    toolbar: [...BASE_TOOLBAR, 'separator', 'official'],
    defaults: { ...DEFAULT_PROFILE.defaults, fontFamily: "'FangSong_GB2312', 'FangSong', 'SimSun', serif", firstLineIndent: 2 },
  },
  scholar: {
    ...DEFAULT_PROFILE,
    identityId: 'scholar',
    engine: 'academic',
    preferredSkin: 'star',
    inspectorDefault: 'citation',
    inspectorPanels: ['citation', 'correction', 'word-count', 'ai'],
    toolbar: [...BASE_TOOLBAR, 'separator', 'table', 'citation'],
    defaults: { ...DEFAULT_PROFILE.defaults, fontFamily: "'Times New Roman', 'SimSun', serif", firstLineIndent: 2 },
  },
  nonfiction: {
    ...DEFAULT_PROFILE,
    identityId: 'nonfiction',
    engine: 'classic',
    preferredSkin: 'genshin',
    inspectorDefault: 'timeline',
    inspectorPanels: ['timeline', 'correction', 'word-count', 'ai'],
    toolbar: [...BASE_TOOLBAR, 'separator', 'timeline'],
  },
  editor: {
    ...DEFAULT_PROFILE,
    identityId: 'editor',
    engine: 'classic',
    preferredSkin: 'zenless',
    inspectorDefault: 'correction',
    inspectorPanels: ['correction', 'word-count', 'lexicon', 'wechat', 'ai'],
    toolbar: [...BASE_TOOLBAR, 'separator', 'lexicon', 'wechat'],
  },
  essayist: {
    ...DEFAULT_PROFILE,
    identityId: 'essayist',
    engine: 'minimal',
    preferredSkin: 'genshin',
    showInspector: false,
    inspectorDefault: null,
    toolbar: ['undo', 'redo', 'separator', 'font-family', 'font-size', 'line-height'],
    sidebarModules: ['identity-badge', 'projects', 'quick-chapter', 'skin-switch'],
    inspectorPanels: [],
    defaults: { ...DEFAULT_PROFILE.defaults, firstLineIndent: 2 },
  },
  screenwriter: {
    ...DEFAULT_PROFILE,
    identityId: 'screenwriter',
    engine: 'script',
    preferredSkin: 'zenless',
    inspectorDefault: 'correction',
    inspectorPanels: ['correction', 'word-count', 'ai'],
    toolbar: [...BASE_TOOLBAR, 'separator', 'ai'],
    defaults: { ...DEFAULT_PROFILE.defaults, firstLineIndent: 0, paragraphSpacing: 12 },
  },
  planner: {
    ...DEFAULT_PROFILE,
    identityId: 'planner',
    engine: 'classic',
    preferredSkin: 'star',
    inspectorDefault: 'contract',
    inspectorPanels: ['contract', 'ai', 'correction', 'word-count'],
    toolbar: [...BASE_TOOLBAR, 'separator', 'contract', 'ai'],
    defaults: { ...DEFAULT_PROFILE.defaults, fontFamily: "'Noto Sans SC', 'Microsoft YaHei UI', sans-serif", firstLineIndent: 0 },
  },
}

export function getLayoutProfile(identityId: IdentityId): LayoutProfile {
  return IDENTITY_LAYOUT_PROFILES[identityId] ?? IDENTITY_LAYOUT_PROFILES.general
}
