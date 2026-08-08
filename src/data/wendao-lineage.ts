/**
 * 文道谱系 · Wendao Lineage
 *
 * 「文以载道」并非韩愈所言 —— 这是流传最广的一处误植。
 * 它出自北宋周敦颐《通书·文辞》。韩愈本人主张的是「文以明道」，
 * 而「文者，贯道之器也」一句，是其门人李汉在《昌黎先生集序》中
 * 对韩愈文学思想的概括。
 *
 * 「文」与「道」的关系，是中国文论史上贯穿一千八百年的核心命题。
 * 从曹丕到刘勰，从韩柳到周程朱，再到顾炎武，历代大家各有表述 ——
 * 意旨相通，而出处各异。本项目以此为骨：
 * 用户选择不同的写作身份，便由这条谱系中取一句相应的话相赠。
 *
 * 每一条均标注原文、篇目、作者、朝代与生卒年，可经查证。
 */

/** 写作身份 */
export type IdentityId =
  | 'general'
  | 'webnovel'
  | 'poet'
  | 'official'
  | 'scholar'
  | 'nonfiction'
  | 'editor'
  | 'essayist'
  | 'screenwriter'

export interface Maxim {
  /** 题于界面的短句，取原文中最凝练的一段 */
  text: string
  /** 完整原文，供「典出」浮层展示 */
  source: string
  /** 篇目 */
  work: string
  /** 作者 */
  author: string
  /** 朝代 */
  dynasty: string
  /** 作者生卒，未详者留空 */
  lifespan?: string
  /** 白话释义 */
  gloss: string
  /** 为何以此句相赠 —— 说明它与该身份的呼应之处 */
  affinity: string
}

export interface Identity {
  id: IdentityId
  /** 身份名 */
  name: string
  /** 一句话定位 */
  tagline: string
  /** 界面图标（单个 emoji 或字符） */
  icon: string
  /** 相赠之言 */
  maxim: Maxim
  /** 该身份默认开启的功能模块 */
  modules: string[]
  /** 该身份的默认皮肤偏好 */
  preferredSkin: 'genshin' | 'star' | 'zenless'
}

export const IDENTITIES: readonly Identity[] = [
  {
    id: 'general',
    name: '通用',
    icon: '🖋',
    tagline: '不预设文体，一切从简',
    maxim: {
      text: '文以载道',
      source: '文所以载道也。轮辕饰而人弗庸，徒饰也，况虚车乎？文辞，艺也；道德，实也。笃其实而艺者书之，美则爱，爱则传焉。',
      work: '《通书·文辞》',
      author: '周敦颐',
      dynasty: '北宋',
      lifespan: '1017—1073',
      gloss:
        '文章是用来承载道理的。车轮车辕装饰得再好，若无人乘用，也不过是装饰罢了，何况是空车呢？文辞是技艺，道德才是实质。',
      affinity:
        '「文以载道」四字的真正出处。周敦颐以车喻文：文辞是车，道理是车上所载之物。空有辞藻而无所承载，便是一辆漂亮的空车。',
    },
    modules: ['editor', 'autosave', 'proofread'],
    preferredSkin: 'star',
  },

  {
    id: 'webnovel',
    name: '连载者',
    icon: '📖',
    tagline: '长篇网文与类型小说',
    maxim: {
      text: '文者，贯道之器也',
      source: '文者，贯道之器也；不深于斯道，有至焉者，不也。',
      work: '《昌黎先生集序》',
      author: '李汉',
      dynasty: '唐',
      gloss:
        '文章是贯通道理的器具；若对这道理钻研不深，说它能写到极致，是不可能的。',
      affinity:
        '李汉是韩愈的门人兼女婿，此句为他替老师总结的文学纲领。一个「贯」字最合长篇之道 —— 数十万字要一气贯穿，靠的不是辞采，是那根始终没断的线。',
    },
    modules: ['editor', 'autosave', 'proofread', 'segment', 'titling', 'outline'],
    preferredSkin: 'zenless',
  },

  {
    id: 'poet',
    name: '词客',
    icon: '🌸',
    tagline: '格律诗、词、曲',
    maxim: {
      text: '道沿圣以垂文，圣因文而明道',
      source:
        '道沿圣以垂文，圣因文而明道，旁通而无滞，日用而不匮。《易》曰：「鼓天下之动者存乎辞。」辞之所以能鼓天下者，乃道之文也。',
      work: '《文心雕龙·原道》',
      author: '刘勰',
      dynasty: '南朝梁',
      lifespan: '约465—约520',
      gloss:
        '道借着圣人流传为文章，圣人凭着文章阐明道理，触类旁通而无所滞碍，日常取用而不会枯竭。',
      affinity:
        '《文心雕龙》是中国第一部体大思精的文学理论专著，而《原道》是它的开篇。讲声律、讲对仗、讲一字之工，源头都在这里。',
    },
    modules: ['editor', 'autosave', 'prosody', 'rhyme', 'typeset'],
    preferredSkin: 'genshin',
  },

  {
    id: 'official',
    name: '案牍',
    icon: '📜',
    tagline: '公文、报告与事务文书',
    maxim: {
      text: '盖文章，经国之大业，不朽之盛事',
      source:
        '盖文章，经国之大业，不朽之盛事。年寿有时而尽，荣乐止乎其身，二者必至之常期，未若文章之无穷。',
      work: '《典论·论文》',
      author: '曹丕',
      dynasty: '三国·魏',
      lifespan: '187—226',
      gloss:
        '文章是治理国家的大事业，是可以不朽的盛事。人的寿命总有尽头，荣华享乐也止于此身，这两样都有个必然到来的期限，都比不上文章的无穷无尽。',
      affinity:
        '「经国」二字直指公文的本分。《典论·论文》是中国文学批评的开山之作，也是第一次把文章抬到与治国同高的位置。（通行本无「者」字，坊间常误引作「盖文章者」。）',
    },
    modules: ['editor', 'autosave', 'proofread', 'official-format'],
    preferredSkin: 'star',
  },

  {
    id: 'scholar',
    name: '学人',
    icon: '🔍',
    tagline: '论文、评论与学术写作',
    maxim: {
      text: '道者文之根本，文者道之枝叶',
      source:
        '道者文之根本，文者道之枝叶。惟其根本乎道，所以发之于文皆道也。',
      work: '《朱子语类》卷一三九',
      author: '朱熹',
      dynasty: '南宋',
      lifespan: '1130—1200',
      gloss:
        '道是文章的根，文章是道的枝叶。正因为根扎在道上，所以流露为文字的也全都是道。',
      affinity:
        '朱熹这句是对「文以载道」更进一步的推演 —— 文与道不是装载关系，而是根与枝的关系。学术写作最忌根浅而枝繁。',
    },
    modules: ['editor', 'autosave', 'proofread', 'citation'],
    preferredSkin: 'star',
  },

  {
    id: 'nonfiction',
    name: '纪实',
    icon: '🎙',
    tagline: '非虚构、报告与口述',
    maxim: {
      text: '文须有益于天下',
      source:
        '文之不可绝于天地间者，曰明道也，纪政事也，察民隐也，乐道人之善也。若此者，有益于天下，有益于将来，多一篇，多一篇之益矣。',
      work: '《日知录》卷十九',
      author: '顾炎武',
      dynasty: '明末清初',
      lifespan: '1613—1682',
      gloss:
        '文章之所以不能在天地间断绝，是因为它能阐明道理、记述政事、体察民间疾苦、乐于称道他人的善行。这样的文章有益于天下、有益于将来，多一篇就多一分益处。',
      affinity:
        '「察民隐」三字是非虚构写作的全部要义。顾炎武反对空谈心性，主张文章要救世救民 —— 这是中国最早的「记录者伦理」。',
    },
    modules: ['editor', 'autosave', 'proofread', 'timeline'],
    preferredSkin: 'genshin',
  },

  {
    id: 'editor',
    name: '编者',
    icon: '✂',
    tagline: '排版、编校与内容分发',
    maxim: {
      text: '言之无文，行而不远',
      source:
        '仲尼曰：《志》有之：「言以足志，文以足言。」不言，谁知其志？言之无文，行而不远。',
      work: '《左传·襄公二十五年》',
      author: '相传为左丘明',
      dynasty: '先秦',
      gloss:
        '孔子说：古书上讲，「言语用来充分表达心志，文采用来充分表达言语」。不说出来，谁知道你的心志？说出来而没有文采，就传不远。',
      affinity:
        '「行而不远」四个字，说尽了排版这件事的意义 —— 内容决定它值不值得被读，形式决定它能走多远。',
    },
    modules: ['editor', 'autosave', 'typeset', 'gzh-export'],
    preferredSkin: 'zenless',
  },

  {
    id: 'essayist',
    name: '随笔',
    icon: '🍃',
    tagline: '散文、日记与自由书写',
    maxim: {
      text: '修辞立其诚',
      source: '君子进德修业。忠信，所以进德也；修辞立其诚，所以居业也。',
      work: '《周易·乾·文言》',
      author: '佚名',
      dynasty: '先秦',
      gloss:
        '君子增进德行、修习功业。忠诚守信，是用来增进德行的；修饰言辞而确立诚意，是用来守住功业的。',
      affinity:
        '「修辞」在这里不是雕琢，是「立其诚」—— 把话说准，把心意说真。私人书写不必取悦任何人，唯一的读者标准就是诚。',
    },
    modules: ['editor', 'autosave', 'zen'],
    preferredSkin: 'genshin',
  },

  {
    id: 'screenwriter',
    name: '剧作',
    icon: '🎬',
    tagline: '剧本、分镜与对白',
    maxim: {
      text: '文者以明道',
      source:
        '始吾幼且少，为文章，以辞为工。及长，乃知文者以明道，是固不苟为炳炳烺烺、务采色、夸声音而以为能也。',
      work: '《答韦中立论师道书》',
      author: '柳宗元',
      dynasty: '唐',
      lifespan: '773—819',
      gloss:
        '起初我年幼时写文章，把辞藻华丽当作本事。年长之后才明白，文章是用来阐明道理的，本就不该随便追求光彩夺目、堆砌色泽、夸饰声韵，还自以为高明。',
      affinity:
        '柳宗元这段是写作者的成年礼 —— 从炫技到藏技。剧本尤其如此：一切华丽的句子都要让位给人物真正会说的话。',
    },
    modules: ['editor', 'autosave', 'proofread', 'script-format'],
    preferredSkin: 'zenless',
  },
] as const

/** 按 id 取身份，未命中则回退到通用 */
export const IDENTITY_ORDER: readonly IdentityId[] = ['general', 'webnovel', 'poet', 'official', 'scholar', 'nonfiction', 'editor', 'essayist', 'screenwriter'] as const

export function getIdentity(id: IdentityId | string | null | undefined): Identity {
  return IDENTITIES.find((i) => i.id === id) ?? IDENTITIES[0]
}

/** 主 slogan —— 无论何种身份，产品自身的立身之句 */
export const PRODUCT_MAXIM = {
  text: '文以载道',
  work: '《通书·文辞》',
  author: '周敦颐',
  dynasty: '北宋',
} as const
