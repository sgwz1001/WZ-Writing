/**
 * 本地语言纠错引擎（纯前端，无需联网）
 *
 * 这一层只做「机械可判定」的中文硬伤：
 *   · 错词库命中（用户自定义 wrong → right）
 *   · 标点全/半角混用（中文语境下建议用全角）
 *   · 全角字母数字（建议改为半角）
 *   · 重复标点（。。/ ，，）
 *   · 中文之间多余空格
 *   · 一组内置常见错别字（同音/形近）
 *
 * 不碰「的得地」「成语意境」「文风」这类需要语义判断的东西 ——
 * 那些交给大模型深度纠错（第三块之后的 Task #21）。
 *
 * 所有检测函数都返回「相对当前文本片段」的位置（index/length），
 * 由调用方（编辑器装饰插件）加上偏移量换算成绝对位置。
 */

export type Severity = 'error' | 'warn'

/** 单条检测结果（位置相对所在文本节点） */
export interface TextIssue {
  index: number
  length: number
  original: string
  revised: string
  category: string
  reason: string
  severity: Severity
}

/** 绝对位置版本，供侧栏对照面板与「应用」使用 */
export interface Issue extends TextIssue {
  from: number
  to: number
}

export interface CorrectionContext {
  lexiconMap: Record<string, string>
  whitelistTerms: string[]
  rulesOn: boolean
  lexiconOn: boolean
}

// ─────────────────────────────────────────────
//  字符判定
// ─────────────────────────────────────────────

function isCJK(code: number): boolean {
  return (
    (code >= 0x3400 && code <= 0x9fff) || // CJK 统一表意 + 扩展A
    (code >= 0xf900 && code <= 0xfaff) || // 兼容表意
    (code >= 0x3000 && code <= 0x303f) // CJK 符号标点
  )
}

function isCJKChar(ch: string): boolean {
  return isCJK(ch.charCodeAt(0))
}

// ─────────────────────────────────────────────
//  错词库扫描
// ─────────────────────────────────────────────

function escapeRe(s: string): string {
  return s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
}

/** 在一段文本上扫描错词库命中。白名单过滤由调用方在 findTextIssues 内统一处理。 */
export function scanLexicon(text: string, map: Record<string, string>): TextIssue[] {
  const out: TextIssue[] = []
  const keys = Object.keys(map)
  if (!keys.length) return out

  // 长词优先，避免「安」之类短词抢先
  const sorted = keys.slice().sort((a, b) => b.length - a.length)
  const re = new RegExp(sorted.map(escapeRe).join('|'), 'g')
  let m: RegExpExecArray | null
  while ((m = re.exec(text))) {
    const idx = m.index
    const orig = m[0]
    const len = orig.length
    out.push({
      index: idx,
      length: len,
      original: orig,
      revised: map[orig],
      category: '错词/错别字',
      reason: `命中自定义词库：应为「${map[orig]}」`,
      severity: 'error',
    })
    re.lastIndex = idx + len
  }
  return out
}

// ─────────────────────────────────────────────
//  本地规则
// ─────────────────────────────────────────────

const HALF_TO_FULL: Record<string, string> = {
  ',': '，',
  '.': '。',
  '!': '！',
  '?': '？',
  ':': '：',
  ';': '；',
  '(': '（',
  ')': '）',
  '[': '【',
  ']': '】',
}

/** 半角标点转为全角的条件：左或右为中文（`.` 仅当左侧为中文，避免 3.14） */
function halfToFullApplies(ch: string, prev: string, next: string): boolean {
  if (ch === '.') return isCJKChar(prev)
  return isCJKChar(prev) || isCJKChar(next)
}

/** 一组内置常见错别字（同音/形近）。可在词库里继续补充。 */
export const BUILTIN_TYPOS: Record<string, string> = {
  既使: '即使',
  好象: '好像',
  帐目: '账目',
  部份: '部分',
  份内: '分内',
  安祥: '安详',
  布署: '部署',
  沉缅: '沉湎',
  凑和: '凑合',
  克苦: '刻苦',
  滥芋充数: '滥竽充数',
  重迭: '重叠',
  防碍: '妨碍',
  甘败下风: '甘拜下风',
  个中三味: '个中三昧',
  一如继往: '一如既往',
  姿式: '姿势',
  沿续: '延续',
  泻露: '泄露',
  犹其: '尤其',
  粗旷: '粗犷',
  寒喧: '寒暄',
  精萃: '精粹',
  坐阵: '坐镇',
  再接再励: '再接再厉',
  弦律: '旋律',
  名信片: '明信片',
  泊来品: '舶来品',
  大姆指: '大拇指',
  挖墙角: '挖墙脚',
  一柱香: '一炷香',
  搏彩: '博彩',
  穿流不息: '川流不息',
  迫不急待: '迫不及待',
  默守成规: '墨守成规',
  原形必露: '原形毕露',
  世外桃园: '世外桃源',
  磬竹难书: '罄竹难书',
  饮鸠止渴: '饮鸩止渴',
  灸手可热: '炙手可热',
  声名雀起: '声名鹊起',
  趋之若骛: '趋之若鹜',
  不径而走: '不胫而走',
  食不果腹: '食不果腹',
}

function repeatedPunct(text: string): TextIssue[] {
  const out: TextIssue[] = []
  const re = /([。，、；：!?.,;:])\1+/g
  let m: RegExpExecArray | null
  while ((m = re.exec(text))) {
    const ch = m[1]
    const idx = m.index
    const len = m[0].length
    out.push({
      index: idx,
      length: len,
      original: m[0],
      revised: ch,
      category: '标点',
      reason: `重复标点「${ch}」只需保留一个`,
      severity: 'warn',
    })
    re.lastIndex = idx + 1
  }
  return out
}

function cjkSpaces(text: string): TextIssue[] {
  const out: TextIssue[] = []
  // 只匹配真正的空格（半角空格 / 全角空格），绝不匹配换行，否则会吞掉段落分隔
  const re = /([\u3400-\u9FFF\uF900-\uFAFF])[ \u3000]+([\u3400-\u9FFF\uF900-\uFAFF])/g
  let m: RegExpExecArray | null
  while ((m = re.exec(text))) {
    const idx = m.index
    const len = m[0].length
    out.push({
      index: idx,
      length: len,
      original: m[0],
      revised: m[1] + m[2],
      category: '空格',
      reason: '中文之间无需空格',
      severity: 'warn',
    })
    re.lastIndex = idx + 1
  }
  return out
}

function typoMapScan(text: string): TextIssue[] {
  const out: TextIssue[] = []
  const keys = Object.keys(BUILTIN_TYPOS).sort((a, b) => b.length - a.length)
  const re = new RegExp(keys.map(escapeRe).join('|'), 'g')
  let m: RegExpExecArray | null
  while ((m = re.exec(text))) {
    const idx = m.index
    const orig = m[0]
    out.push({
      index: idx,
      length: orig.length,
      original: orig,
      revised: BUILTIN_TYPOS[orig],
      category: '错别字',
      reason: `常见错别字：「${orig}」应为「${BUILTIN_TYPOS[orig]}」`,
      severity: 'error',
    })
    re.lastIndex = idx + orig.length
  }
  return out
}

function runLocalRules(text: string): TextIssue[] {
  const out: TextIssue[] = []

  // 逐字符：全角字母数字 / 全角空格 / 半角标点转全角
  for (let i = 0; i < text.length; i++) {
    const ch = text[i]
    const code = ch.charCodeAt(0)

    // 只把「全角字母 / 数字」判为需转半角；全角标点（。，！？等）在中文里本就正确，绝不标记
    const isFullWidthAlphaNum =
      (code >= 0xff10 && code <= 0xff19) || // ０-９
      (code >= 0xff21 && code <= 0xff3a) || // Ａ-Ｚ
      (code >= 0xff41 && code <= 0xff5a) // ａ-ｚ
    if (isFullWidthAlphaNum) {
      const half = String.fromCharCode(code - 0xfee0)
      out.push({
        index: i,
        length: 1,
        original: ch,
        revised: half,
        category: '全/半角',
        reason: `全角字母/数字「${ch}」建议改为半角「${half}」`,
        severity: 'warn',
      })
      continue
    }
    if (ch === '　') {
      out.push({
        index: i,
        length: 1,
        original: ch,
        revised: ' ',
        category: '空格',
        reason: '全角空格建议改为半角空格',
        severity: 'warn',
      })
      continue
    }
    const full = HALF_TO_FULL[ch]
    if (full && halfToFullApplies(ch, text[i - 1] ?? '', text[i + 1] ?? '')) {
      out.push({
        index: i,
        length: 1,
        original: ch,
        revised: full,
        category: '标点',
        reason: `中文语境下标点「${ch}」建议改为全角「${full}」`,
        severity: 'warn',
      })
    }
  }

  out.push(...repeatedPunct(text))
  out.push(...cjkSpaces(text))
  out.push(...typoMapScan(text))
  return out
}

// ─────────────────────────────────────────────
//  统一入口
// ─────────────────────────────────────────────

/** 在一段文本上跑全部检测，返回相对该文本的检测结果。 */
export function findTextIssues(text: string, ctx: CorrectionContext): TextIssue[] {
  const issues: TextIssue[] = []

  // 白名单保护区间（专有名词不允许被改）—— 对所有检测类型统一生效
  const protectedRanges: Array<[number, number]> = []
  for (const t of ctx.whitelistTerms) {
    if (!t) continue
    let idx = text.indexOf(t)
    while (idx !== -1) {
      protectedRanges.push([idx, idx + t.length])
      idx = text.indexOf(t, idx + t.length)
    }
  }
  const overlapsProtected = (i: number, len: number) =>
    protectedRanges.some(([s, e]) => i < e && s < i + len)

  if (ctx.lexiconOn) {
    issues.push(...scanLexicon(text, ctx.lexiconMap))
  }
  if (ctx.rulesOn) {
    issues.push(...runLocalRules(text))
  }

  // 统一过滤掉落在白名单保护区间内的命中（错词库 + 内置错别字都受保护）
  const filtered = issues.filter((it) => !overlapsProtected(it.index, it.length))

  // error 优先，其次按出现顺序 —— 决定重叠时保留哪一条
  filtered.sort((a, b) => {
    if (a.severity !== b.severity) return a.severity === 'error' ? -1 : 1
    return a.index - b.index
  })
  return filtered
}
