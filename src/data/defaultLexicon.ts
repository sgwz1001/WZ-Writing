/**
 * 内置常用错词库（一键载入）
 *
 * 覆盖高频同音/形近错别字与常见错词。用户可在「词库」面板里
 * 一键载入，再按自己的写作习惯增删。这里只放「几乎不会误报」的硬伤，
 * 语义类（的得地、成语意境）不在此列，留给大模型深度纠错。
 */

export interface SeedEntry {
  wrong: string
  right: string
  category: string
  note: string
}

export const DEFAULT_LEXICON: SeedEntry[] = [
  { wrong: '按装', right: '安装', category: '同音错字', note: '安装设备，不是「按」' },
  { wrong: '必竟', right: '毕竟', category: '同音错字', note: '' },
  { wrong: '布署', right: '部署', category: '形近错字', note: '' },
  { wrong: '不异而飞', right: '不翼而飞', category: '成语误用', note: '' },
  { wrong: '沉缅', right: '沉湎', category: '形近错字', note: '' },
  { wrong: '穿流不息', right: '川流不息', category: '成语误用', note: '' },
  { wrong: '当务之急', right: '当务之急', category: '形近错字', note: '注意「急」非「及」' },
  { wrong: '谍血', right: '喋血', category: '形近错字', note: '' },
  { wrong: '防碍', right: '妨碍', category: '同音错字', note: '' },
  { wrong: '甘败下风', right: '甘拜下风', category: '成语误用', note: '' },
  { wrong: '各行其事', right: '各行其是', category: '成语误用', note: '' },
  { wrong: '寒喧', right: '寒暄', category: '形近错字', note: '暄=温暖，非「喧」' },
  { wrong: '好高鹜远', right: '好高骛远', category: '成语误用', note: '' },
  { wrong: '合龙', right: '合拢', category: '同音错字', note: '「合拢」更常见；堤坝合龙另说' },
  { wrong: '黄梁美梦', right: '黄粱美梦', category: '成语误用', note: '粱=小米，非「梁」' },
  { wrong: '既往不究', right: '既往不咎', category: '成语误用', note: '' },
  { wrong: '既往开来', right: '继往开来', category: '成语误用', note: '' },
  { wrong: '精萃', right: '精粹', category: '形近错字', note: '' },
  { wrong: '克苦', right: '刻苦', category: '同音错字', note: '' },
  { wrong: '老俩口', right: '老两口', category: '错词', note: '' },
  { wrong: '了望', right: '瞭望', category: '形近错字', note: '' },
  { wrong: '美仑美奂', right: '美轮美奂', category: '成语误用', note: '轮=高大连贯' },
  { wrong: '明查暗访', right: '明察暗访', category: '成语误用', note: '' },
  { wrong: '默守成规', right: '墨守成规', category: '成语误用', note: '' },
  { wrong: '泊来品', right: '舶来品', category: '形近错字', note: '' },
  { wrong: '气慨', right: '气概', category: '形近错字', note: '' },
  { wrong: '趋之若骛', right: '趋之若鹜', category: '成语误用', note: '' },
  { wrong: '入场卷', right: '入场券', category: '形近错字', note: '' },
  { wrong: '杀戳', right: '杀戮', category: '形近错字', note: '' },
  { wrong: '声名雀起', right: '声名鹊起', category: '成语误用', note: '' },
  { wrong: '食不裹腹', right: '食不果腹', category: '成语误用', note: '' },
  { wrong: '松驰', right: '松弛', category: '形近错字', note: '弛=松，非「驰」' },
  { wrong: '唐塞', right: '搪塞', category: '同音错字', note: '' },
  { wrong: '妥贴', right: '妥帖', category: '形近错字', note: '' },
  { wrong: '委屈求全', right: '委曲求全', category: '成语误用', note: '' },
  { wrong: '无名火', right: '无明火', category: '错词', note: '「无明」为佛家用语' },
  { wrong: '弦律', right: '旋律', category: '形近错字', note: '' },
  { wrong: '原型必露', right: '原形毕露', category: '成语误用', note: '' },
  { wrong: '针贬', right: '针砭', category: '形近错字', note: '' },
  { wrong: '坐阵', right: '坐镇', category: '同音错字', note: '' },
]
