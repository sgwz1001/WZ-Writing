import { computeStats, numberToChinese } from '../src/utils/text'

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

console.log('=== 1. 字数统计：计入标点必须产生差异 ===')
const html = '<p>今天，天气很好。</p><p>我们去写作吧！</p>'
const s = computeStats(html, '第一章')

console.log(
  '  明细: total=' + s.totalChars,
  'noPunct=' + s.charsNoPunct,
  'noTitle=' + s.charsNoTitle,
  'noPunctNoTitle=' + s.charsNoPunctNoTitle,
  'punct=' + s.punctCount,
  'title=' + s.titleChars,
)

ok('标点数 > 0', s.punctCount > 0, 'punct=' + s.punctCount)
ok('标题字数 = 3', s.titleChars === 3, 'titleChars=' + s.titleChars)
ok('含标点 ≠ 不含标点（含标题）', s.totalChars !== s.charsNoPunct)
ok('含标点 ≠ 不含标点（不含标题）', s.charsNoTitle !== s.charsNoPunctNoTitle)
ok('差值恰为标点数（含标题）', s.totalChars - s.charsNoPunct === s.punctCount)
ok('差值恰为标点数（不含标题）', s.charsNoTitle - s.charsNoPunctNoTitle === s.punctCount)
ok('含标题 - 不含标题 = 标题字数', s.totalChars - s.charsNoTitle === s.titleChars)
ok(
  '正文净字数 = 12',
  s.charsNoPunctNoTitle === 12,
  '实际=' + s.charsNoPunctNoTitle + '（今天天气很好 + 我们去写作吧）',
)
ok('标点数 = 3', s.punctCount === 3, '实际=' + s.punctCount + '（，。！）')

console.log('\n=== 2. 无标点文本：两种口径应相等 ===')
const s2 = computeStats('<p>无标点纯文字</p>', '')
ok('无标点时 total = noPunct', s2.totalChars === s2.charsNoPunct, 'total=' + s2.totalChars)
ok('无标题时 titleChars = 0', s2.titleChars === 0)

console.log('\n=== 3. 空内容边界 ===')
const s3 = computeStats('', '')
ok('空内容全为 0', s3.totalChars === 0 && s3.punctCount === 0 && s3.charsNoPunctNoTitle === 0)

console.log('\n=== 4. 章节序号 numberToChinese ===')
const cases: [number, string][] = [
  [1, '一'],
  [2, '二'],
  [9, '九'],
  [10, '十'],
  [11, '十一'],
  [15, '十五'],
  [20, '二十'],
  [21, '二十一'],
  [99, '九十九'],
  [100, '一百'],
  [101, '一百零一'],
  [110, '一百一十'],
  [115, '一百一十五'],
  [999, '九百九十九'],
]
for (const [n, want] of cases) {
  const got = numberToChinese(n)
  ok('第' + want + '章', got === want, n + ' → ' + got)
}

console.log('\n=== 5. 章节自动顺延模拟 ===')
// 已有 1 章 → 下一章应为「第二章」
const existing = 1
ok(
  '已有第一章 → 推荐第二章',
  '第' + numberToChinese(existing + 1) + '章' === '第二章',
  '第' + numberToChinese(existing + 1) + '章',
)
ok(
  '空项目 → 推荐第一章',
  '第' + numberToChinese(0 + 1) + '章' === '第一章',
  '第' + numberToChinese(1) + '章',
)

console.log('\n────────────────────────────')
console.log(fail === 0 ? `ALL PASS (${pass})` : `PASS ${pass} / FAIL ${fail}`)
if (fail > 0) process.exit(1)
