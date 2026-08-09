import { Extension } from '@tiptap/core'

export interface ParagraphSpacingOptions {
  types: string[]
  defaultSpacing: string
}

declare module '@tiptap/core' {
  interface Commands<ReturnType> {
    paragraphSpacing: {
      setParagraphSpacing: (spacing: string) => ReturnType
      unsetParagraphSpacing: () => ReturnType
    }
  }
}

export const ParagraphSpacing = Extension.create<ParagraphSpacingOptions>({
  name: 'paragraphSpacing',

  addOptions() {
    return {
      types: ['paragraph', 'heading'],
      defaultSpacing: '20px',
    }
  },

  addGlobalAttributes() {
    return [
      {
        types: this.options.types,
        attributes: {
          paragraphSpacing: {
            default: null,
            parseHTML: (element) => {
              const v = element.style.marginBottom
              return v ? v.replace('px', '') : null
            },
            renderHTML: (attributes) => {
              if (attributes.paragraphSpacing == null) return {}
              return { style: `margin-bottom: ${attributes.paragraphSpacing}px` }
            },
          },
        },
      },
    ]
  },

  addCommands() {
    return {
      setParagraphSpacing:
        (spacing: string) =>
        ({ commands }) => {
          return this.options.types.every((type) =>
            commands.updateAttributes(type, { paragraphSpacing: spacing }),
          )
        },
      unsetParagraphSpacing:
        () =>
        ({ commands }) => {
          return this.options.types.every((type) =>
            commands.resetAttributes(type, 'paragraphSpacing'),
          )
        },
    }
  },
})
