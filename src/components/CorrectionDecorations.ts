/**
 * 编辑器实时纠错装饰
 *
 * 这是一个 Tiptap / ProseMirror 插件：每次文档变化时，遍历所有文本节点，
 * 用本地纠错引擎（utils/correct.ts）找出错词 / 标点问题，画上红色/黄色波浪线，
 * 同时把结果同步给纠错状态层（供右侧「对照面板」展示与应用）。
 *
 * 设计要点：
 *   · 只动 transform/装饰，不碰文档结构（绝不偷偷改字，改字必须由用户点「应用」）
 *   · 检测结果用绝对位置存，应用纠正时直接用 from/to，精确替换
 *   · 跨节点的长词（被样式截断的）抓不到 —— 写作场景罕见，可接受
 *   · 重叠检测：error 优先于 warn，保证一处只画一条线
 */
import { Extension } from '@tiptap/core'
import { Plugin, PluginKey } from '@tiptap/pm/state'
import { Decoration, DecorationSet } from '@tiptap/pm/view'
import type { Node as PMNode } from '@tiptap/pm/model'
import { useCorrectionStore } from '../stores/correction'
import { findTextIssues, type Issue } from '../utils/correct'

export const correctionPluginKey = new PluginKey('correction')

let storeTimer: ReturnType<typeof setTimeout> | null = null

function pushIssuesToStore(issues: Issue[]) {
  if (storeTimer) clearTimeout(storeTimer)
  storeTimer = setTimeout(() => {
    useCorrectionStore().setIssues(issues)
  }, 80)
}

interface BuildResult {
  decos: DecorationSet
  issues: Issue[]
}

function buildDecorations(doc: PMNode): BuildResult {
  const store = useCorrectionStore()
  const ctx = {
    lexiconMap: store.lexiconMap,
    whitelistTerms: store.whitelistTerms,
    rulesOn: store.rulesOn,
    lexiconOn: store.lexiconOn,
  }

  const decorations: Decoration[] = []
  const issues: Issue[] = []
  const used: Array<[number, number]> = []
  const isFree = (from: number, to: number) =>
    !used.some(([s, e]) => from < e && s < to)

  doc.descendants((node, pos) => {
    if (!node.isText || !node.text) return
    const text = node.text
    const found = findTextIssues(text, ctx)

    for (const it of found) {
      const from = pos + 1 + it.index
      const to = from + it.length
      if (!isFree(from, to)) continue
      used.push([from, to])

      decorations.push(
        Decoration.inline(from, to, {
          class: it.severity === 'error' ? 'wz-mark-error' : 'wz-mark-warn',
          'data-category': it.category,
          title: it.reason,
        }),
      )
      issues.push({
        from,
        to,
        index: it.index,
        length: it.length,
        original: it.original,
        revised: it.revised,
        category: it.category,
        reason: it.reason,
        severity: it.severity,
      })
    }
  })

  return { decos: DecorationSet.create(doc, decorations), issues }
}

export const CorrectionDecorations = Extension.create({
  name: 'correctionDecorations',

  addProseMirrorPlugins() {
    return [
      new Plugin({
        key: correctionPluginKey,
        state: {
          init: (_config, { doc }) => {
            const r = buildDecorations(doc)
            pushIssuesToStore(r.issues)
            return r.decos
          },
          apply: (tr, old) => {
            if (tr.docChanged || tr.getMeta('forceCorrection')) {
              const r = buildDecorations(tr.doc)
              pushIssuesToStore(r.issues)
              return r.decos
            }
            return old.map(tr.mapping, tr.doc)
          },
        },
        props: {
          decorations(state) {
            return correctionPluginKey.getState(state) as DecorationSet
          },
        },
      }),
    ]
  },
})
