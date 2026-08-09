export type LoaderWordCategory =
  | 'literature'
  | 'linguistics'
  | 'philology'
  | 'phonology'
  | 'statistics'

export interface LoaderWord {
  id: string
  text: string
  category: LoaderWordCategory
  enabled: boolean
  builtin: boolean
}

export const CATEGORY_LABELS: Record<LoaderWordCategory, string> = {
  literature: '文学',
  linguistics: '语言学',
  philology: '训诂学',
  phonology: '音韵学',
  statistics: '数学统计',
}

export const BUILTIN_LOADER_WORDS: LoaderWord[] = [
  // 文学
  { id: 'lit-1', text: '意象', category: 'literature', enabled: true, builtin: true },
  { id: 'lit-2', text: '隐喻', category: 'literature', enabled: true, builtin: true },
  { id: 'lit-3', text: '叙事弧线', category: 'literature', enabled: true, builtin: true },
  { id: 'lit-4', text: '人物弧光', category: 'literature', enabled: true, builtin: true },
  { id: 'lit-5', text: '复调', category: 'literature', enabled: true, builtin: true },
  { id: 'lit-6', text: '陌生化', category: 'literature', enabled: true, builtin: true },
  { id: 'lit-7', text: '互文性', category: 'literature', enabled: true, builtin: true },
  { id: 'lit-8', text: '象征', category: 'literature', enabled: true, builtin: true },
  { id: 'lit-9', text: '张力', category: 'literature', enabled: true, builtin: true },
  { id: 'lit-10', text: '节奏', category: 'literature', enabled: true, builtin: true },
  { id: 'lit-11', text: '文体', category: 'literature', enabled: true, builtin: true },
  { id: 'lit-12', text: '视角', category: 'literature', enabled: true, builtin: true },
  { id: 'lit-13', text: '伏笔', category: 'literature', enabled: true, builtin: true },
  { id: 'lit-14', text: '高潮', category: 'literature', enabled: true, builtin: true },
  { id: 'lit-15', text: '留白', category: 'literature', enabled: true, builtin: true },

  // 语言学
  { id: 'lin-1', text: '语义场', category: 'linguistics', enabled: true, builtin: true },
  { id: 'lin-2', text: '句法树', category: 'linguistics', enabled: true, builtin: true },
  { id: 'lin-3', text: '语用学', category: 'linguistics', enabled: true, builtin: true },
  { id: 'lin-4', text: '形态学', category: 'linguistics', enabled: true, builtin: true },
  { id: 'lin-5', text: '转换生成', category: 'linguistics', enabled: true, builtin: true },
  { id: 'lin-6', text: '能指与所指', category: 'linguistics', enabled: true, builtin: true },
  { id: 'lin-7', text: '语料库', category: 'linguistics', enabled: true, builtin: true },
  { id: 'lin-8', text: '词频分布', category: 'linguistics', enabled: true, builtin: true },
  { id: 'lin-9', text: '共现网络', category: 'linguistics', enabled: true, builtin: true },
  { id: 'lin-10', text: '依存句法', category: 'linguistics', enabled: true, builtin: true },
  { id: 'lin-11', text: '话语分析', category: 'linguistics', enabled: true, builtin: true },
  { id: 'lin-12', text: '认知隐喻', category: 'linguistics', enabled: true, builtin: true },

  // 训诂学
  { id: 'phi-1', text: '形训', category: 'philology', enabled: true, builtin: true },
  { id: 'phi-2', text: '声训', category: 'philology', enabled: true, builtin: true },
  { id: 'phi-3', text: '义训', category: 'philology', enabled: true, builtin: true },
  { id: 'phi-4', text: '本义', category: 'philology', enabled: true, builtin: true },
  { id: 'phi-5', text: '引申义', category: 'philology', enabled: true, builtin: true },
  { id: 'phi-6', text: '假借', category: 'philology', enabled: true, builtin: true },
  { id: 'phi-7', text: '通假', category: 'philology', enabled: true, builtin: true },
  { id: 'phi-8', text: '古今字', category: 'philology', enabled: true, builtin: true },
  { id: 'phi-9', text: '同源词', category: 'philology', enabled: true, builtin: true },
  { id: 'phi-10', text: '反训', category: 'philology', enabled: true, builtin: true },

  // 音韵学
  { id: 'pho-1', text: '平仄', category: 'phonology', enabled: true, builtin: true },
  { id: 'pho-2', text: '押韵', category: 'phonology', enabled: true, builtin: true },
  { id: 'pho-3', text: '四声', category: 'phonology', enabled: true, builtin: true },
  { id: 'pho-4', text: '等韵', category: 'phonology', enabled: true, builtin: true },
  { id: 'pho-5', text: '中古音', category: 'phonology', enabled: true, builtin: true },
  { id: 'pho-6', text: '上古音', category: 'phonology', enabled: true, builtin: true },
  { id: 'pho-7', text: '清浊', category: 'phonology', enabled: true, builtin: true },
  { id: 'pho-8', text: '开合口', category: 'phonology', enabled: true, builtin: true },
  { id: 'pho-9', text: '声调曲线', category: 'phonology', enabled: true, builtin: true },
  { id: 'pho-10', text: '谐声系列', category: 'phonology', enabled: true, builtin: true },

  // 数学统计
  { id: 'sta-1', text: '马尔可夫链', category: 'statistics', enabled: true, builtin: true },
  { id: 'sta-2', text: '贝叶斯推断', category: 'statistics', enabled: true, builtin: true },
  { id: 'sta-3', text: ' tf-idf', category: 'statistics', enabled: true, builtin: true },
  { id: 'sta-4', text: '主题模型', category: 'statistics', enabled: true, builtin: true },
  { id: 'sta-5', text: '隐马尔可夫', category: 'statistics', enabled: true, builtin: true },
  { id: 'sta-6', text: 'N 元语法', category: 'statistics', enabled: true, builtin: true },
  { id: 'sta-7', text: '困惑度', category: 'statistics', enabled: true, builtin: true },
  { id: 'sta-8', text: '余弦相似度', category: 'statistics', enabled: true, builtin: true },
  { id: 'sta-9', text: '主成分分析', category: 'statistics', enabled: true, builtin: true },
  { id: 'sta-10', text: '聚类', category: 'statistics', enabled: true, builtin: true },
  { id: 'sta-11', text: '熵', category: 'statistics', enabled: true, builtin: true },
  { id: 'sta-12', text: '信息增益', category: 'statistics', enabled: true, builtin: true },
]
