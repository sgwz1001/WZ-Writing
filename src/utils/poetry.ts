/**
 * 格律诗词（第四块 · 功能三）
 *
 * 本地引擎：平仄字表 + 韵部表 + 格律谱，对输入诗词做结构化校验
 * （字数 / 句数 / 逐句平仄 / 韵脚平仄与同韵）。
 * 未配置 API Key 时只做本地校验；配置了 Key 可调用大模型做权威点评。
 *
 * 说明：平仄/韵部为基础常用字表（平水韵 + 中华新韵归类），并非全字覆盖；
 * 字表未收录的字标「?」，此时建议用「AI 点评」获得完整判断。
 */

export type Tone = '平' | '仄' | '?'
/** 格律谱某一位的期望：平 / 仄 / 中（可平可仄） */
export type Expect = '平' | '仄' | '中'

// ── 平仄基础字表（常用字，平水韵；为基础字表，未收录字标「?」）──
const PING = new Set(
  ('丁三千天田年元川方王无中云风心开春星河清流烟高黄人仁从冰厅丁凡堪前南同后城声归明朋松岩庚情想愁文新更时来林桃歌残泉真眠船章移程稀颜魂乡飞音生花车麻家斜华深琴裁诗词阶宫眉红空虹茶霞边书初秋舟云罗衣微阳光江香长霜凉床肠苍茫航桑塘开怀才台回哀杯雷灰梅愁流休留游头幽求眸钩洲忧柔收州丘牛侯油谋投稠筹球抽尤邮优高涛袍刀郊桃逃劳骚毫曹膏篙遭操滔蒿号熬茅肴庖生声明情城横京惊平营迎英晴星盈成程清名鸣耕卿兵亭听厅冥灵青停灯琼精晶兄宏崩鹏弘登腾藤棱能恒凭层曾憎增僧征蒸称升绳陵凌菱冰绫经庭廷蜓霆宁瓶屏萍荧萤荣嵘容溶蓉锋蜂封峰逢龙浓松钟重从雍庸镕西题低迷溪栖齐啼泥凄梯鸡犁蹊犀妻奚脐黎圭闺携多河和波歌罗何娥柯蓑梭磨阿科棵驼陀沱鹅俄莎微非飞归衣稀违晖肥扉矶围帏巍威机讥饥溪期其旗棋奇宜怡疑移离璃疲碑卑悲追锥垂谁为违围飞肥微归衣矶稀晖肥扉依山穷楼还间')
    .split(''),
)

const ZE = new Set(
  ('白百伯薄北舶别蝶叠独读毒笛敌答达德得滴督度夺恶伐乏阀佛幅福服伏拂复阁革格隔国鸽骨谷黑击激积急疾集籍夹菊觉决绝角掘客刻阔勒乐烈列裂劣六绿律略落洛络率麦脉莫墨默默木目牧睦纳逆溺聂捏诺拍朴魄撇仆瀑戚漆七契缺却确鹊日肉辱入若弱塞杀色涩瑟失石识实食拾蚀叔熟束述术速宿俗缩踏榻塔拓踢剔帖突秃托脱袜物勿夕昔惜析息悉锡膝习袭席侠狭峡匣挟协胁学雪血鸭压叶业页一逸益易译翼玉育域欲月悦越阅杂泽窄责贼择扎摘宅整折哲浙织直值执侄职只指志制治滞上下降后後圣盛正政性命净静镜敬庆竞病并定映硬幸杏兴梦凤弄送痛众仲共贡冻栋洞恸讽宠重用诵颂讼统宋纵水火海柳友酒五舞武雨古土苦虎鼓府手首九久有走草早宝岛考讨饱恼表了鸟巧晓喜起里理李你米此子纸齿史使死鬼伟委毁轨老小改采宰在海尽一')
    .split(''),
)

function toneOf(ch: string): Tone {
  if (PING.has(ch)) return '平'
  if (ZE.has(ch)) return '仄'
  return '?'
}

// ── 韵部表（中华新韵 14 韵，仅收录常见平声韵字）─────────────────
// 1麻 2波 3皆 4开 5微 6豪 7尤 8寒 9文 10唐 11庚 12齐 13支 14姑
const RHYME_RAW: [string, number][] = [
  ['麻花家华斜茶车沙霞鸦瓜嘉涯夸虾遮奢牙芽拿葩纱娃哇巴疤爬麻槎丫差叉', 1],
  ['波多河和过歌罗何娥柯蓑梭磨阿科棵驼陀沱鹅俄莎哦戈坡颇娑涡窝', 2],
  ['皆阶街鞋偕皆排埋乖怀淮谐骸皆皆皆携', 3],
  ['开来台杯回哀才苔哉裁猜陪孩财材腮嵬雷灰枚媒梅催颓隈徊培裴开', 4],
  ['微非飞归衣稀违晖肥扉矶围帏巍威机讥饥期旗棋奇宜怡疑移离璃疲碑卑悲追锥垂谁为违围微归衣', 5],
  ['豪高涛袍刀郊桃逃劳骚膏篙遭操滔蒿号熬猱肴茅庖桃逃劳骚毫曹翱', 6],
  ['尤秋愁流舟楼休留游头幽求眸钩洲忧柔收州丘牛侯喉油谋投稠筹球抽尤邮优浮', 7],
  ['寒山间还颜天年前言边船眠泉烟圆渊弦篇千然莲川悬员全权绵连田川单丹滩滩寒残栏兰干漫', 8],
  ['文人新春尘神身亲臣贫民邻仁云文分门村恩魂温群君闻心林音深阴琴寻今金侵吟沉痕巾银鳞晨辰珍陈伦轮津滨秦旬巡驯纯唇裙勤欣', 9],
  ['唐江阳香长乡光章康方王郎堂黄裳忙行伤霜凉床肠苍茫航桑塘昂荒藏旁房装妆囊冈刚钢纲盲芒唐糖', 10],
  ['庚生声明情城横京惊平营迎英晴星盈成程清名鸣耕卿兵亭听厅冥灵青停灯琼精晶兄宏崩鹏弘登腾藤棱能恒凭层曾憎增僧征蒸称升绳陵凌菱冰绎经庭廷蜓霆宁瓶屏萍荧萤荣嵘容溶蓉锋蜂封峰逢龙浓松钟重从雍庸镕', 11],
  ['齐西题低迷溪栖齐啼泥凄梯鸡犁蹊犀妻奚脐黎圭闺', 12],
  ['支诗词其旗棋奇宜怡疑移离璃疲碑卑悲追锥垂为', 13],
  ['姑湖孤芜无珠书疏枯炉芦苏庐蒲途图壶乌姑吴呼铺卢殊躯须株奴徒涂虞愚娱隅余如儒朱诸诛厨雏扶符芙凫胡糊蝴弧狐乎污迂舒输枢区驱躯', 14],
]
const RHYME: Record<string, number> = {}
for (const [chars, group] of RHYME_RAW) {
  for (const c of chars) if (c !== '(' && c !== ')') RHYME[c] = group
}

// ── 格律谱（标准 4 体式）──────────────────────────────────
export interface PoemVariant {
  label: string
  /** 每句的平仄谱，'中' 表示可平可仄 */
  pattern: string[]
}
export interface PoemForm {
  key: string
  label: string
  /** 每句字数 */
  len: number
  /** 句数 */
  lines: number
  variants: PoemVariant[]
}

export const POEM_FORMS: PoemForm[] = [
  {
    key: 'wujue',
    label: '五言绝句',
    len: 5,
    lines: 4,
    variants: [
      { label: '仄起·首句不入韵', pattern: ['中仄平平仄', '平平仄仄平', '中平平仄仄', '中仄仄平平'] },
      { label: '仄起·首句入韵', pattern: ['中仄仄平平', '平平仄仄平', '中平平仄仄', '中仄仄平平'] },
      { label: '平起·首句不入韵', pattern: ['中平平仄仄', '中仄仄平平', '中仄平平仄', '平平仄仄平'] },
      { label: '平起·首句入韵', pattern: ['平平仄仄平', '中仄仄平平', '中仄平平仄', '平平仄仄平'] },
    ],
  },
  {
    key: 'qijue',
    label: '七言绝句',
    len: 7,
    lines: 4,
    variants: [
      { label: '仄起·首句不入韵', pattern: ['中仄平平平仄仄', '中平仄仄仄平平', '中平仄仄平平仄', '中仄平平仄仄平'] },
      { label: '仄起·首句入韵', pattern: ['中仄平平仄仄平', '中平仄仄仄平平', '中平仄仄平平仄', '中仄平平仄仄平'] },
      { label: '平起·首句不入韵', pattern: ['中平仄仄平平仄', '中仄平平仄仄平', '中仄平平平仄仄', '中平仄仄仄平平'] },
      { label: '平起·首句入韵', pattern: ['中平仄仄仄平平', '中仄平平仄仄平', '中仄平平平仄仄', '中平仄仄仄平平'] },
    ],
  },
  {
    key: 'wulu',
    label: '五言律诗',
    len: 5,
    lines: 8,
    variants: [
      { label: '仄起·首句不入韵', pattern: ['中仄平平仄', '平平仄仄平', '中平平仄仄', '中仄仄平平', '中仄平平仄', '平平仄仄平', '中平平仄仄', '中仄仄平平'] },
      { label: '仄起·首句入韵', pattern: ['中仄仄平平', '平平仄仄平', '中平平仄仄', '中仄仄平平', '中仄平平仄', '平平仄仄平', '中平平仄仄', '中仄仄平平'] },
      { label: '平起·首句不入韵', pattern: ['中平平仄仄', '中仄仄平平', '中仄平平仄', '平平仄仄平', '中平平仄仄', '中仄仄平平', '中仄平平仄', '平平仄仄平'] },
      { label: '平起·首句入韵', pattern: ['平平仄仄平', '中仄仄平平', '中仄平平仄', '平平仄仄平', '中平平仄仄', '中仄仄平平', '中仄平平仄', '平平仄仄平'] },
    ],
  },
  {
    key: 'qilu',
    label: '七言律诗',
    len: 7,
    lines: 8,
    variants: [
      { label: '仄起·首句不入韵', pattern: ['中仄平平平仄仄', '中平仄仄仄平平', '中平仄仄平平仄', '中仄平平仄仄平', '中仄平平平仄仄', '中平仄仄仄平平', '中平仄仄平平仄', '中仄平平仄仄平'] },
      { label: '仄起·首句入韵', pattern: ['中仄平平仄仄平', '中平仄仄仄平平', '中平仄仄平平仄', '中仄平平仄仄平', '中仄平平平仄仄', '中平仄仄仄平平', '中平仄仄平平仄', '中仄平平仄仄平'] },
      { label: '平起·首句不入韵', pattern: ['中平仄仄平平仄', '中仄平平仄仄平', '中仄平平平仄仄', '中平仄仄仄平平', '中平仄仄平平仄', '中仄平平仄仄平', '中仄平平平仄仄', '中平仄仄仄平平'] },
      { label: '平起·首句入韵', pattern: ['中平仄仄仄平平', '中仄平平仄仄平', '中仄平平平仄仄', '中平仄仄仄平平', '中平仄仄平平仄', '中仄平平仄仄平', '中仄平平平仄仄', '中平仄仄仄平平'] },
    ],
  },
]

const PUNCT = /[\s，。、；：？！“”‘’（）《》【】…—~·「」『』〖〗,.!?;:'"()\[\]{}<>/\\|]/g

function splitLines(text: string): string[] {
  return text
    .split(/\n+/)
    .map((l) => l.replace(PUNCT, '').trim())
    .filter(Boolean)
}

export interface CharCell {
  ch: string
  tone: Tone
  expect: Expect | null
  status: 'ok' | 'bad' | 'unknown' | 'none'
}
export interface LineAnalysis {
  raw: string
  cells: CharCell[]
  expectedLen: number
  isRhyme: boolean
  rhymeChar: string | null
  rhymeTone: Tone | null
  rhymeGroup: number | null
  note: string
}
export interface RhymeResult {
  ok: boolean
  feet: { line: number; char: string; tone: Tone; group: number | null }[]
  note: string
}
export interface PoemAnalysis {
  formLabel: string
  variantLabel: string
  lineCount: number
  expectedLines: number
  notes: string[]
  lines: LineAnalysis[]
  rhyme: RhymeResult
}

/**
 * 分析一首诗词。
 * @param text 用户输入（按行分隔，标点会被忽略）
 * @param formKey POEM_FORMS 的 key
 * @param variantIdx 体式下标
 */
export function analyzePoem(text: string, formKey: string, variantIdx: number): PoemAnalysis {
  const form = POEM_FORMS.find((f) => f.key === formKey) || POEM_FORMS[0]
  const variant = form.variants[variantIdx] || form.variants[0]
  const rawLines = splitLines(text)
  const notes: string[] = []

  if (rawLines.length === 0) {
    return {
      formLabel: form.label,
      variantLabel: variant.label,
      lineCount: 0,
      expectedLines: form.lines,
      notes: ['请输入至少一行诗句。'],
      lines: [],
      rhyme: { ok: false, feet: [], note: '' },
    }
  }

  if (rawLines.length !== form.lines) {
    notes.push(`句数：${rawLines.length} 句，标准 ${form.label} 应为 ${form.lines} 句。`)
  }

  const lines: LineAnalysis[] = rawLines.map((raw, i) => {
    const chars = [...raw]
    const pattern = variant.pattern[i] || ''
    const expectArr = pattern.split('') as Expect[]
    const isRhyme = i % 2 === 1 // 偶句（第2/4/6/8句）为韵脚
    const cells: CharCell[] = chars.map((ch, j) => {
      const tone = toneOf(ch)
      const expect: Expect | null = expectArr[j] || null
      let status: CharCell['status'] = 'none'
      if (expect) {
        if (expect === '中') status = 'ok'
        else if (tone === '?') status = 'unknown'
        else status = tone === expect ? 'ok' : 'bad'
      }
      return { ch, tone, expect, status }
    })

    // 逐句字数
    let note = ''
    if (chars.length !== form.len && i < form.lines) {
      note = `本句 ${chars.length} 字，应为 ${form.len} 字。`
    }

    const rhymeChar = isRhyme && chars.length ? chars[chars.length - 1] : null
    const rhymeTone = rhymeChar ? toneOf(rhymeChar) : null
    const rhymeGroup = rhymeChar ? RHYME[rhymeChar] ?? null : null

    return {
      raw,
      cells,
      expectedLen: form.len,
      isRhyme,
      rhymeChar,
      rhymeTone,
      rhymeGroup,
      note,
    }
  })

  // 韵脚校验：偶句末字须为平声，且同韵部
  const feet = lines
    .map((l, i) => ({ i, l }))
    .filter(({ l }) => l.isRhyme && l.rhymeChar)
    .map(({ i, l }) => ({ line: i + 1, char: l.rhymeChar as string, tone: l.rhymeTone as Tone, group: l.rhymeGroup }))

  let rhymeOk = true
  const groups = feet.map((f) => f.group).filter((g): g is number => g != null)
  const firstGroup = groups[0]
  for (const f of feet) {
    if (f.tone === '仄') rhymeOk = false
    if (f.group != null && firstGroup != null && f.group !== firstGroup) rhymeOk = false
  }
  let rhymeNote = ''
  if (!feet.length) rhymeNote = '未检测到韵脚（偶句末字）。'
  else {
    const nonPing = feet.filter((f) => f.tone !== '平')
    if (nonPing.length) rhymeNote += `有 ${nonPing.length} 个韵脚不是平声（${nonPing.map((f) => f.char).join('、')}）。`
    const diff = feet.filter((f) => f.group != null && firstGroup != null && f.group !== firstGroup)
    if (diff.length) rhymeNote += `韵脚「${diff.map((f) => f.char).join('、')}」与首韵部不同韵。`
    if (!nonPing.length && !diff.length) {
      const unknown = feet.filter((f) => f.group == null)
      rhymeNote = unknown.length
        ? `韵脚均为平声；「${unknown.map((f) => f.char).join('、')}」字表未收录，建议人工核对同韵。`
        : '韵脚合规：均为平声且同韵部。'
    }
  }

  if (form.lines === rawLines.length && !notes.length) notes.push('结构与句数符合标准。')

  return {
    formLabel: form.label,
    variantLabel: variant.label,
    lineCount: rawLines.length,
    expectedLines: form.lines,
    notes,
    lines,
    rhyme: { ok: rhymeOk, feet, note: rhymeNote },
  }
}

// ── AI 点评（需配置 Key）─────────────────────────────────────
import { chat } from './ai'
import { useSettingsStore } from '../stores/settings'

export async function critiquePoem(text: string, formKey: string): Promise<string> {
  const { ai } = useSettingsStore()
  if (!ai.apiKey) throw new Error('尚未配置 API Key，请先在「AI」设置里填写。')
  const form = POEM_FORMS.find((f) => f.key === formKey) || POEM_FORMS[0]
  const sys =
    '你是一位精通中国古典诗词格律的专家。请对用户提供的诗词做专业点评，' +
    '重点指出：1) 平仄是否符合所选体裁；2) 押韵（韵部、平仄）是否规范；3) 对仗是否工整；4) 意境与炼字建议。' +
    '用简体中文，条理清晰，少客套。'
  const user = `体裁：${form.label}\n\n诗词：\n${text}\n\n请点评。`
  return chat(
    [
      { role: 'system', content: sys },
      { role: 'user', content: user },
    ],
    { temperature: 0.5 },
  )
}
