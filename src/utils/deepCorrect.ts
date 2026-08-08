/**
 * 大模型深度纠错引擎（网络编排层）
 *
 * 与 utils/deepCore.ts 的分工：
 *   · deepCore.ts —— 纯函数：分块、JSON 解析、文本块 ↔ 文档坐标映射。可独立单测。
 *   · 本文件 —— 网络编排：调 chat() 分批发给大模型，并 re-export deepCore 全部能力。
 *
 * 与 utils/correct.ts（机械可判定的硬伤）的分工：
 *   · 本地规则：标点全/半角、重复标点、错词库、常见错别字 —— 即时、免费、离线
 *   · 深度纠错：搭配不当、语义错讹、成语误用、语序别扭、冗余啰嗦 —— 需语义理解
 *
 * 安全与体验约定：
 *   · 不自动改字 —— 只标出建议，用户点「应用」才动（与本地规则一致）
 *   · 分段超长或解析失败时整批降级为「解析失败」，不静默丢弃；可重试
 *   · 联网点只有 chat() 一处，API Key 用户自填，只存在本地数据库
 */
import { chat } from './ai'
import {
  splitBatches,
  parseSuggestions,
  failBatch,
  type DeepSuggestion,
  type DeepBatchResult,
} from './deepCore'

export * from './deepCore'

/** 构建发给模型的单批 prompt（每批独立，上下文小、失败可单批重试） */
function buildPrompt(batchText: string): ChatMessageLike[] {
  return [
    {
      role: 'system',
      content:
        '你是资深中文编辑。请检查下面这段文字中的语言问题，只挑「确定有问题」的硬伤与「明显更好」的改进，' +
        '不要逐句挑刺、不要改动标点之外无问题的句子。' +
        '对每一处，输出：original（原文片段，必须逐字来自原文）、suggested（修改建议）、' +
        'type（仅限：搭配/用词/成语/语序/冗余/标点/其他）、reason（一句话理由）、confidence（0到1的数值）。' +
        '只输出 JSON，不要任何解释文字。格式：{"issues":[{"original":"...","suggested":"...","type":"...","reason":"...","confidence":0.8}]}',
    },
    { role: 'user', content: batchText },
  ]
}

interface ChatMessageLike {
  role: 'system' | 'user' | 'assistant'
  content: string
}

export interface DeepCorrectOptions {
  /** 覆盖模型（默认用设置里的 model） */
  model?: string
  signal?: AbortSignal
  /** 进度回调（已完成批数, 总批数） */
  onProgress?: (done: number, total: number) => void
}

export interface DeepCorrectResult {
  /** 全部批次是否成功（只要有一批失败即为 false） */
  allOk: boolean
  /** 成功的批次里解析出的建议（未映射位置） */
  suggestions: DeepSuggestion[]
  /** 每批的原始结果（含失败信息） */
  batches: DeepBatchResult[]
  /** 失败的批次信息，展示给用户看 */
  failures: { batchIndex: number; error: string }[]
}

/**
 * 深度纠错主入口：分批发给大模型，返回全部建议。
 * 不负责位置映射（那是调用方基于原文做），这里只管「拿到建议」。
 */
export async function runDeepCorrection(
  text: string,
  opts: DeepCorrectOptions = {},
): Promise<DeepCorrectResult> {
  if (!text.trim()) return { allOk: true, suggestions: [], batches: [], failures: [] }

  const batches = splitBatches(text)
  const results: DeepBatchResult[] = []
  const failures: { batchIndex: number; error: string }[] = []
  let offset = 0

  for (let i = 0; i < batches.length; i++) {
    const batch = batches[i]
    try {
      const raw = await chat(buildPrompt(batch), { temperature: 0.2, model: opts.model, signal: opts.signal })
      const sug = parseSuggestions(raw)
      results.push({ batchIndex: i, offset, suggestions: sug, ok: true })
    } catch (e: unknown) {
      const msg = (e as Error)?.message || String(e)
      results.push(failBatch(i, offset, msg))
      failures.push({ batchIndex: i, error: msg })
    }
    offset += batch.length
    opts.onProgress?.(i + 1, batches.length)
  }

  const allOk = failures.length === 0
  const suggestions = results.filter((r) => r.ok).flatMap((r) => r.suggestions)
  return { allOk, suggestions, batches: results, failures }
}
