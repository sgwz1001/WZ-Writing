import { Mark } from '@tiptap/core'

export interface FontFamilyOptions {
  types: string[]
}

declare module '@tiptap/core' {
  interface Commands<ReturnType> {
    fontFamily: {
      setFontFamily: (font: string) => ReturnType
      unsetFontFamily: () => ReturnType
    }
  }
}

export const FontFamily = Mark.create<FontFamilyOptions>({
  name: 'fontFamily',

  addOptions() {
    return {
      types: ['textStyle'],
    }
  },

  addAttributes() {
    return {
      font: {
        default: null,
        parseHTML: (element) => element.style.fontFamily || null,
        renderHTML: (attributes) => {
          if (!attributes.font) return {}
          return { style: `font-family: ${attributes.font}` }
        },
      },
    }
  },

  parseHTML() {
    return [
      {
        style: 'font-family',
        getAttrs: (value) => {
          if (typeof value !== 'string') return false
          return { font: value }
        },
      },
    ]
  },

  renderHTML({ HTMLAttributes }) {
    return ['span', { style: `font-family: ${HTMLAttributes.font}` }, 0]
  },

  addCommands() {
    return {
      setFontFamily:
        (font: string) =>
        ({ chain }) => {
          return chain().setMark(this.name, { font }).run()
        },
      unsetFontFamily:
        () =>
        ({ chain }) => {
          return chain().unsetMark(this.name).run()
        },
    }
  },
})
