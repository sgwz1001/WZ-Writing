import {
  splitBatches,
  parseSuggestions,
  collectTextBlocks,
  buildPureTextWithMap,
  mapSuggestionsToDocIssues,
} from '../src/utils/deepCore'

let pass = 0
let fail = 0

function ok(name: string, cond: boolean, extra = '') {
  if (cond) {
    pass++
    console.log('  PASS  ' + name + (extra ? '   ' + extra : ''))
  } else {
    fail++
    console.log('  FAIL  ' + name + (extra ? '   ' + extra : ''))
  }
}

console.log('=== 1. 分块 splitBatches ===')
const long = '春江潮水连海平，海上明月共潮生。'.repeat(30)
const parts = splitBatches(long, 100)
ok('长文本按上限切分', parts.length > 1, '共 ' + parts.length + ' 批')
ok('每批 ≤ 上限', parts.every((p) => p.length <= 100), 'max=' + Math.max(...parts.map((p) => p.length)))
ok('拼接还原无损', parts.join('') === long)
const shortParts = splitBatches('短短一句话。', 100)
ok('短文本不切分', shortParts.length === 1 && shortParts[0] === '短短一句话。')

console.log('\n=== 2. JSON 解析 parseSuggestions ===')
const good = JSON.stringify({
  issues: [
    { original: '他说到', suggested: '他说道', type: '用词', reason: '口语化', confidence: 0.9 },
  ],
})
ok('标准对象格式', parseSuggestions(good).length === 1)
const fenced = '```json\n{"issues":[{"original":"以前","suggested":"从前","type":"用词","reason":"书面化","confidence":0.8}]}\n```'
const fencedParsed = parseSuggestions(fenced)
ok('```json 围栏可解析', fencedParsed.length === 1 && fencedParsed[0].original === '以前')
const arrayForm = '[{"original":"A","suggested":"B","type":"其他","reason":"x","confidence":0.5}]'
ok('数组形式可解析', parseSuggestions(arrayForm).length === 1)
const garbage = '抱歉，我无法完成这个任务。'
ok('非 JSON 返回空数组', parseSuggestions(garbage).length === 0)
const same = JSON.stringify({ issues: [{ original: '一样', suggested: '一样', type: '用词', reason: 'x', confidence: 0.7 }] })
ok('原样相同被丢弃', parseSuggestions(same).length === 0)
const longSug = JSON.stringify({ issues: [{ original: '短词', suggested: 'x'.repeat(50), type: '用词', reason: 'x', confidence: 0.7 }] })
ok('超长建议被丢弃', parseSuggestions(longSug).length === 0)

console.log('\n=== 3. 文本块拼接与坐标映射 ===')
// 模拟 PM 文档：两个段落，每段两个文本节点（如粗体拆分）
interface FakeNode {
  isText: boolean
  isBlock: boolean
  text: string | null
}
const p1 = { isBlock: true } as unknown
const p2 = { isBlock: true } as unknown
const blocks = [
  { text: '今天天气', docFrom: 1, parent: p1 },
  { text: '真的很好', docFrom: 6, parent: p1 },
  { text: '我们一起写文章', docFrom: 11, parent: p2 },
]
const { pure, charDocPos } = buildPureTextWithMap(blocks)
ok('块间补 \\n\\n', pure === '今天天气真的很好\n\n我们一起写文章', JSON.stringify(pure))
// 纯文本：b0(4字,idx0-3) b1(4字,idx4-7) 分隔符(idx8-9) b2(7字,idx10-16)
ok('分隔符不计入文档坐标', charDocPos[8] === null && charDocPos[9] === null, 'pos8=' + charDocPos[8] + ' pos9=' + charDocPos[9])
ok('文本字符映射正确', charDocPos[0] === 1 && charDocPos[5] === 7 && charDocPos[10] === 11, '0→' + charDocPos[0] + ' 5→' + charDocPos[5] + ' 10→' + charDocPos[10])

const sugg = [
  { original: '真的很好', suggested: '格外好', type: '用词' as const, reason: '更精炼', confidence: 0.8 },
]
const mapped = mapSuggestionsToDocIssues(blocks, sugg, [])
ok('段内建议可定位', mapped.issues.length === 1, 'from=' + mapped.issues[0]?.from + ' to=' + mapped.issues[0]?.to)
ok('坐标精确', mapped.issues[0]?.from === 6 && mapped.issues[0]?.to === 10, '6→10')

// 幻觉：原文不存在
const hallucinated = [{ original: '不存在的词', suggested: '替代', type: '用词' as const, reason: 'x', confidence: 0.6 }]
const h = mapSuggestionsToDocIssues(blocks, hallucinated, [])
ok('幻觉条目被计数丢弃', h.hallucinatedCount === 1 && h.issues.length === 0)

// 跨段命中：原文包含 \n\n，应判为无法定位
const cross = [{ original: '很好\n\n我们', suggested: '好我们', type: '用词' as const, reason: 'x', confidence: 0.6 }]
const c = mapSuggestionsToDocIssues(blocks, cross, [])
ok('跨段命中被计数丢弃', c.hallucinatedCount === 1 && c.issues.length === 0)

// 与本地重叠
const overlap = [
  { original: '真的很好', suggested: '格外好', type: '用词' as const, reason: 'x', confidence: 0.8 },
]
const localIssue = [{ from: 6, to: 10, index: 0, length: 4, original: '真的很好', revised: 'x', category: '错别字', reason: '本地', severity: 'error' as const }]
const o = mapSuggestionsToDocIssues(blocks, overlap, localIssue)
ok('与本地重叠被跳过', o.overlappedCount === 1 && o.issues.length === 0)

console.log('\n=== 4. 同段落文本节点（无块边界）不补分隔符 ===')
const p3 = { isBlock: true } as unknown
const sameBlock = [
  { text: '同一', docFrom: 1, parent: p3 },
  { text: '段落', docFrom: 3, parent: p3 },
]
const sp = buildPureTextWithMap(sameBlock)
ok('同一块内不补分隔符', sp.pure === '同一段落', JSON.stringify(sp.pure))
ok('坐标连续', sp.charDocPos[0] === 1 && sp.charDocPos[2] === 3)

console.log('\n────────────────────────────')
console.log(fail === 0 ? `ALL PASS (${pass})` : `PASS ${pass} / FAIL ${fail}`)
if (fail > 0) process.exit(1)
