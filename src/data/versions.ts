/**
 * 版本历史。
 * 新版本一律追加到数组「开头」，即数组天然按时间倒序（新 → 旧）。
 * kind 决定时间轴节点上标签的配色：
 *   add    新增
 *   remove 删除
 *   change 调整
 *   fix    修复
 */

export type ChangeKind = 'add' | 'remove' | 'change' | 'fix'

export interface ChangeItem {
  kind: ChangeKind
  /** 对「什么」做了什么：目标对象 */
  target: string
  /** 具体做了什么 */
  detail: string
}

export interface VersionEntry {
  version: string
  /** YYYY-MM-DD */
  date: string
  /** 版本代号，显示在版本号右侧 */
  codename?: string
  /** 一句话概述 */
  summary: string
  changes: ChangeItem[]
}

export const CHANGE_KIND_LABEL: Record<ChangeKind, string> = {
  add: '新增',
  remove: '删除',
  change: '调整',
  fix: '修复',
}

export const VERSIONS: VersionEntry[] = [
  {
    version: '0.3.0',
    date: '2026-08-08',
    codename: '流光',
    summary: '第四块创作辅助三件套上线；补齐加载动效、常驻设置与版本时间轴，并修复四处体验缺陷。',
    changes: [
      { kind: 'add', target: '一键取标题', detail: '4 种风格（网文/文艺/悬疑/纪实）候选生成，接大模型，无 Key 时本地启发式兜底' },
      { kind: 'add', target: '微信公众号排版', detail: '正文转公众号内联样式 HTML，支持主题配色、首行缩进、分割线与一键复制' },
      { kind: 'add', target: '格律诗词', detail: '五绝/七绝/五律/七律平仄校验，逐字标平仄与出律高亮，韵脚检查 + AI 品评' },
      { kind: 'add', target: '加载动画', detail: 'AI/API 调用与页面跳转期间展示主题化加载层，三套皮肤各有专属动效' },
      { kind: 'add', target: '设置按钮', detail: '右下角常驻齿轮，任意界面可直接呼出设置面板' },
      { kind: 'add', target: '设置面板', detail: '皮肤/日夜/毛玻璃/动画总开关/AI 接入/版本信息集中管理' },
      { kind: 'add', target: '版本信息', detail: '中轴左右交替的版本时间轴，支持正序倒序切换与在线检查更新' },
      { kind: 'add', target: '动画总开关', detail: '可一键关闭全局动效，设置本地持久化，重启后保持' },
      { kind: 'fix', target: '字数统计', detail: '「计入标点」此前完全不生效，勾选与否结果相同；现已真实计入标点符号' },
      { kind: 'fix', target: '一键排版', detail: '分段滑块「激进 / 保守」标签左右标反，已互换为左保守（更长）右激进（更碎）' },
      { kind: 'fix', target: '进入工作室按钮', detail: '按钮位置过低需滚动才能看见，改为底部吸附常驻并加强视觉权重' },
      { kind: 'change', target: '新建项目', detail: '由行内输入改为弹窗提示「请输入项目名或书名」' },
      { kind: 'change', target: '新建章节', detail: '自动推荐「第 N 章」序号，已存在第一章时顺延为第二章，可手填或交给 AI' },
      { kind: 'change', target: '路由切换', detail: '页面之间加入淡入上移转场，不再硬切' },
    ],
  },
  {
    version: '0.2.0',
    date: '2026-08-08',
    codename: '拾遗',
    summary: '第二块本地纠错与第三块大模型接入层落地，编辑器具备实时标红能力。',
    changes: [
      { kind: 'add', target: '本地纠错引擎', detail: '规则 + 错词库双通道校对，纯本地运行不联网' },
      { kind: 'add', target: '错词库管理', detail: '自定义错词、白名单增删改查，数据落 SQLite 本地库' },
      { kind: 'add', target: '实时标红', detail: '基于 TipTap Decoration 在正文中直接高亮疑似错词' },
      { kind: 'add', target: '大模型接入层', detail: '统一 chat 接口，支持多家服务商切换、baseUrl/模型自定义与连通性测试' },
      { kind: 'add', target: '深度纠错', detail: '调用大模型对整段文字做语义级校对，与本地结果合并展示' },
      { kind: 'change', target: 'API Key 存储', detail: '仅落本机数据库，全应用唯一联网点收敛到 utils/ai.ts' },
      { kind: 'fix', target: '纠错引擎', detail: '修复重叠区间、空白段落误报与光标偏移三处问题' },
    ],
  },
  {
    version: '0.1.0',
    date: '2026-08-08',
    codename: '开卷',
    summary: '首个可运行版本：Tauri 2 + Vue 3 骨架、米哈游风三皮肤 UI 与核心写作功能。',
    changes: [
      { kind: 'add', target: '应用骨架', detail: 'Tauri 2 + Rust + Vue 3 + TypeScript + Vite 打通，产出本地 Windows EXE' },
      { kind: 'add', target: '三套皮肤', detail: '崩坏星穹铁道 / 原神 / 绝区零 设计令牌体系，支持日夜双模式' },
      { kind: 'add', target: '文道谱系', detail: '身份选择与 slogan 数据，进入工作室前先择道' },
      { kind: 'add', target: '写作编辑器', detail: 'TipTap 富文本编辑、项目与章节管理、断点保存与崩溃恢复' },
      { kind: 'add', target: '字数统计', detail: '支持标点、标题是否计入的独立开关' },
      { kind: 'add', target: '一键排版', detail: '智能分段并提供滑块实时预览分段粒度' },
      { kind: 'add', target: '批量导入导出', detail: 'TXT / PDF / DOCX 正文导出，写作日志导出 CSV / Excel' },
      { kind: 'add', target: '开机动画', detail: '启动页动效与日夜切换全屏过渡' },
      { kind: 'change', target: '项目命名', detail: '仓库与软件名统一为 WZ-Writing / 文载 Writing' },
      { kind: 'fix', target: '响应式布局', detail: '修复窄窗口下的错位与全局滚动失效' },
    ],
  },
]

/** 当前版本（数组第一项） */
export const CURRENT_VERSION = VERSIONS[0]?.version ?? '0.0.0'
/** 上一版本 */
export const PREVIOUS_VERSION = VERSIONS[1]?.version ?? ''

/** GitHub 仓库，用于「检查更新」 */
export const REPO_OWNER = 'sgwz1001'
export const REPO_NAME = 'WZ-Writing'
export const RELEASES_URL = `https://github.com/${REPO_OWNER}/${REPO_NAME}/releases`

/** 语义化版本比较：a > b 返回正数 */
export function compareVersion(a: string, b: string): number {
  const pa = a.replace(/^v/i, '').split('.').map((n) => parseInt(n, 10) || 0)
  const pb = b.replace(/^v/i, '').split('.').map((n) => parseInt(n, 10) || 0)
  for (let i = 0; i < Math.max(pa.length, pb.length); i++) {
    const d = (pa[i] ?? 0) - (pb[i] ?? 0)
    if (d !== 0) return d
  }
  return 0
}
