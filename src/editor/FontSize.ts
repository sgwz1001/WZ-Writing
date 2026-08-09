import { Mark } from '@tiptap/core'

export interface FontSizeOptions {
  types: string[]
  defaultSize: string
}

declare module '@tiptap/core' {
  interface Commands<ReturnType> {
    fontSize: {
      setFontSize: (size: string) => ReturnType
      unsetFontSize: () => ReturnType
    }
  }
}

export const FontSize = Mark.create<FontSizeOptions>({
  name: 'fontSize',

  addOptions() {
    return {
      types: ['textStyle'],
      defaultSize: '17px',
    }
  },

  addAttributes() {
    return {
      size: {
        default: null,
        parseHTML: (element) => element.style.fontSize.replace('px', '') || null,
        renderHTML: (attributes) => {
          if (!attributes.size) return {}
          return { style: `font-size: ${attributes.size}px` }
        },
      },
    }
  },

  parseHTML() {
    return [
      {
        style: 'font-size',
        getAttrs: (value) => {
          if (typeof value !== 'string') return false
          return { size: value.replace('px', '') }
        },
      },
    ]
  },

  renderHTML({ HTMLAttributes }) {
    return ['span', { style: `font-size: ${HTMLAttributes.size}px` }, 0]
  },

  addCommands() {
    return {
      setFontSize:
        (size: string) =>
        ({ chain }) => {
          return chain().setMark(this.name, { size }).run()
        },
      unsetFontSize:
        () =>
        ({ chain }) => {
          return chain().unsetMark(this.name).run()
        },
    }
  },
})
