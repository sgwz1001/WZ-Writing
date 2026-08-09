import { Extension } from '@tiptap/core'

declare module '@tiptap/core' {
  interface Commands<ReturnType> {
    findReplace: {
      find: (pattern: RegExp) => ReturnType
      replace: (pattern: RegExp, replacement: string) => ReturnType
      replaceAll: (pattern: RegExp, replacement: string) => ReturnType
    }
  }
}

export const FindReplaceCommands = Extension.create({
  name: 'findReplaceCommands',

  addCommands() {
    return {
      find:
        (pattern: RegExp) =>
        ({ editor, chain }) => {
          const text = editor.getText()
          const { from } = editor.state.selection
          const pos = from ?? 0
          const after = text.slice(pos)
          const match = after.match(pattern)
          if (!match || match.index === undefined) {
            // 从开头重新搜索
            const wrap = text.match(pattern)
            if (!wrap || wrap.index === undefined) return false
            return chain()
              .setTextSelection({ from: wrap.index + 1, to: wrap.index + wrap[0].length + 1 })
              .scrollIntoView()
              .run()
          }
          const start = pos + match.index
          return chain()
            .setTextSelection({ from: start + 1, to: start + match[0].length + 1 })
            .scrollIntoView()
            .run()
        },
      replace:
        (pattern: RegExp, replacement: string) =>
        ({ editor, chain }) => {
          const text = editor.getText()
          const { from, to } = editor.state.selection
          const selected = text.slice((from ?? 1) - 1, (to ?? 1) - 1)
          if (pattern.test(selected)) {
            pattern.lastIndex = 0
            return chain()
              .focus()
              .insertContentAt({ from: from ?? 1, to: to ?? 1 }, replacement)
              .run()
          }
          // 否则先查找下一个再替换
          const after = text.slice((to ?? 1) - 1)
          const match = after.match(pattern)
          if (!match || match.index === undefined) return false
          const start = (to ?? 1) - 1 + match.index
          return chain()
            .focus()
            .setTextSelection({ from: start + 1, to: start + match[0].length + 1 })
            .insertContentAt({ from: start + 1, to: start + match[0].length + 1 }, replacement)
            .run()
        },
      replaceAll:
        (pattern: RegExp, replacement: string) =>
        ({ editor, commands }) => {
          // 仅替换文本节点中的匹配，避免破坏标签属性
          const plain = editor.getText()
          const replaced = plain.replace(pattern, replacement)
          if (plain === replaced) return false
          // 简单回写：把纯文本按段落拆分后包成 <p>
          const paragraphs = replaced
            .split(/\n{2,}/)
            .map((p) => `<p>${p.replace(/\n/g, '<br>')}</p>`)
            .join('')
          return commands.setContent(paragraphs, { emitUpdate: true })
        },
    }
  },
})
