import { Extension } from '@tiptap/core'

export interface TextAlignOptions {
  types: string[]
  alignments: string[]
  defaultAlignment: string
}

declare module '@tiptap/core' {
  interface Commands<ReturnType> {
    textAlign: {
      setTextAlign: (alignment: string) => ReturnType
      unsetTextAlign: () => ReturnType
    }
  }
}

export const TextAlign = Extension.create<TextAlignOptions>({
  name: 'textAlign',

  addOptions() {
    return {
      types: ['paragraph', 'heading'],
      alignments: ['left', 'center', 'right', 'justify'],
      defaultAlignment: 'left',
    }
  },

  addGlobalAttributes() {
    return [
      {
        types: this.options.types,
        attributes: {
          textAlign: {
            default: this.options.defaultAlignment,
            parseHTML: (element) => {
              const alignment = element.style.textAlign || element.getAttribute('align') || ''
              return this.options.alignments.includes(alignment) ? alignment : this.options.defaultAlignment
            },
            renderHTML: (attributes) => {
              if (attributes.textAlign === this.options.defaultAlignment) {
                return {}
              }
              return { style: `text-align: ${attributes.textAlign}` }
            },
          },
        },
      },
    ]
  },

  addCommands() {
    return {
      setTextAlign:
        (alignment: string) =>
        ({ commands }) => {
          if (!this.options.alignments.includes(alignment)) {
            return false
          }
          return this.options.types.every((type) =>
            commands.updateAttributes(type, { textAlign: alignment }),
          )
        },
      unsetTextAlign:
        () =>
        ({ commands }) => {
          return this.options.types.every((type) =>
            commands.resetAttributes(type, 'textAlign'),
          )
        },
    }
  },

  addKeyboardShortcuts() {
    return {
      'Mod-Shift-l': () => this.editor.commands.setTextAlign('left'),
      'Mod-Shift-e': () => this.editor.commands.setTextAlign('center'),
      'Mod-Shift-r': () => this.editor.commands.setTextAlign('right'),
      'Mod-Shift-j': () => this.editor.commands.setTextAlign('justify'),
    }
  },
})
