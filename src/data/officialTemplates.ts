/**
 * 法定公文模板库
 *
 * 收录《党政机关公文处理工作条例》规定的 15 个文种骨架，
 * 配套 GB/T 9704-2012 推荐版式参数。
 */

export interface OfficialFormat {
  titleFont: string
  titleSize: string
  bodyFont: string
  bodySize: string
  lineHeight: number
  paragraphIndent: string
  pageMargins: string
}

export interface OfficialTemplate {
  id: string
  name: string
  description: string
  skeleton: string
  format: OfficialFormat
}

export const DEFAULT_OFFICIAL_FORMAT: OfficialFormat = {
  titleFont: "'FZXiaoBiaoSong-B05S', 'FangXiaoBiaoSong', 'Source Han Serif SC', 'SimSun', serif",
  titleSize: '22pt',
  bodyFont: "'FangSong_GB2312', 'FangSong', 'SimSun', serif",
  bodySize: '16pt',
  lineHeight: 1.5,
  paragraphIndent: '2em',
  pageMargins: '3.7cm 3.5cm 2.8cm 2.6cm',
}

const makeSkeleton = (title: string, hasMainRecipient = true) => {
  const main = hasMainRecipient ? '<p>{{主送机关}}：</p>\n' : ''
  return `<h1 style="text-align:center">${title}</h1>
${main}<p>{{正文}}</p>
<p style="text-align:right">{{发文机关}}</p>
<p style="text-align:right">{{成文日期}}</p>`
}

export const OFFICIAL_TEMPLATES: OfficialTemplate[] = [
  {
    id: 'resolution',
    name: '决议',
    description: '会议讨论通过的重大决策事项',
    skeleton: makeSkeleton('{{发文机关}}关于{{事由}}的决议'),
    format: DEFAULT_OFFICIAL_FORMAT,
  },
  {
    id: 'decision',
    name: '决定',
    description: '对重要事项作出决策和部署',
    skeleton: makeSkeleton('{{发文机关}}关于{{事由}}的决定'),
    format: DEFAULT_OFFICIAL_FORMAT,
  },
  {
    id: 'order',
    name: '命令',
    description: '公布行政法规、宣布强制措施等',
    skeleton: makeSkeleton('{{发文机关}}令'),
    format: DEFAULT_OFFICIAL_FORMAT,
  },
  {
    id: 'communique',
    name: '公报',
    description: '公布重要决定或重大事项',
    skeleton: makeSkeleton('{{发文机关}}关于{{事由}}的公报', false),
    format: DEFAULT_OFFICIAL_FORMAT,
  },
  {
    id: 'announcement',
    name: '公告',
    description: '向国内外宣布重要或法定事项',
    skeleton: makeSkeleton('{{发文机关}}关于{{事由}}的公告', false),
    format: DEFAULT_OFFICIAL_FORMAT,
  },
  {
    id: 'proclamation',
    name: '通告',
    description: '在一定范围内公布应当遵守或周知的事项',
    skeleton: makeSkeleton('{{发文机关}}关于{{事由}}的通告', false),
    format: DEFAULT_OFFICIAL_FORMAT,
  },
  {
    id: 'opinion',
    name: '意见',
    description: '对重要问题提出见解和处理办法',
    skeleton: makeSkeleton('{{发文机关}}关于{{事由}}的意见'),
    format: DEFAULT_OFFICIAL_FORMAT,
  },
  {
    id: 'notice',
    name: '通知',
    description: '发布、传达事项，批转、转发文件',
    skeleton: makeSkeleton('{{发文机关}}关于{{事由}}的通知'),
    format: DEFAULT_OFFICIAL_FORMAT,
  },
  {
    id: 'circular',
    name: '通报',
    description: '表彰先进、批评错误、传达重要精神或情况',
    skeleton: makeSkeleton('{{发文机关}}关于{{事由}}的通报'),
    format: DEFAULT_OFFICIAL_FORMAT,
  },
  {
    id: 'report',
    name: '报告',
    description: '向上级机关汇报工作、反映情况',
    skeleton: makeSkeleton('{{发文机关}}关于{{事由}}的报告'),
    format: DEFAULT_OFFICIAL_FORMAT,
  },
  {
    id: 'request',
    name: '请示',
    description: '向上级机关请求指示、批准',
    skeleton: makeSkeleton('{{发文机关}}关于{{事由}}的请示'),
    format: DEFAULT_OFFICIAL_FORMAT,
  },
  {
    id: 'reply',
    name: '批复',
    description: '答复下级机关请示事项',
    skeleton: makeSkeleton('{{发文机关}}关于{{事由}}的批复'),
    format: DEFAULT_OFFICIAL_FORMAT,
  },
  {
    id: 'motion',
    name: '议案',
    description: '向同级人大或常委会提请审议事项',
    skeleton: makeSkeleton('{{发文机关}}关于{{事由}}的议案'),
    format: DEFAULT_OFFICIAL_FORMAT,
  },
  {
    id: 'letter',
    name: '函',
    description: '不相隶属机关之间商洽工作、询问答复',
    skeleton: `<h1 style="text-align:center">{{发文机关}}关于{{事由}}的函</h1>
<p>{{主送机关}}：</p>
<p>{{正文}}</p>
<p style="text-align:right">{{发文机关}}</p>
<p style="text-align:right">{{成文日期}}</p>`,
    format: DEFAULT_OFFICIAL_FORMAT,
  },
  {
    id: 'minutes',
    name: '纪要',
    description: '记载会议主要情况和议定事项',
    skeleton: `<h1 style="text-align:center">{{事由}}会议纪要</h1>
<p>时间：{{会议时间}}</p>
<p>地点：{{会议地点}}</p>
<p>出席：{{出席人员}}</p>
<p>{{正文}}</p>
<p style="text-align:right">{{记录单位}}</p>
<p style="text-align:right">{{成文日期}}</p>`,
    format: DEFAULT_OFFICIAL_FORMAT,
  },
]

export function getOfficialTemplate(id: string): OfficialTemplate | undefined {
  return OFFICIAL_TEMPLATES.find((t) => t.id === id)
}

export function getOfficialTemplateByName(name: string): OfficialTemplate | undefined {
  return OFFICIAL_TEMPLATES.find((t) => t.name === name)
}

export function renderOfficialSkeleton(template: OfficialTemplate, vars: Record<string, string>): string {
  let html = template.skeleton
  for (const [key, value] of Object.entries(vars)) {
    html = html.replace(new RegExp(`\\{\\{${key}\\}\\}`, 'g'), value || '')
  }
  // 清理未填写的占位符
  html = html.replace(/\\{\\{[^}]+\\}\\}/g, '')
  return html
}
