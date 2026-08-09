import { Extension } from '@tiptap/core'

export interface FirstLineIndentOptions {
  types: string[]
}

declare module '@tiptap/core' {
  interface Commands<ReturnType> {
    firstLineIndent: {
      setFirstLineIndent: (indent: string) => ReturnType
      unsetFirstLineIndent: () => ReturnType
    }
  }
}

export const FirstLineIndent = Extension.create<FirstLineIndentOptions>({
  name: 'firstLineIndent',

  addOptions() {
    return {
      types: ['paragraph'],
    }
  },

  addGlobalAttributes() {
    return [
      {
        types: this.options.types,
        attributes: {
          firstLineIndent: {
            default: null,
            parseHTML: (element) => {
              const v = element.style.textIndent
              return v ? v.replace('em', '') : null
            },
            renderHTML: (attributes) => {
              if (attributes.firstLineIndent == null) return {}
              return { style: `text-indent: ${attributes.firstLineIndent}em` }
            },
          },
        },
      },
    ]
  },

  addCommands() {
    return {
      setFirstLineIndent:
        (indent: string) =>
        ({ commands }) => {
          return this.options.types.every((type) =>
            commands.updateAttributes(type, { firstLineIndent: indent }),
          )
        },
      unsetFirstLineIndent:
        () =>
        ({ commands }) => {
          return this.options.types.every((type) =>
            commands.resetAttributes(type, 'firstLineIndent'),
          )
        },
    }
  },
})
