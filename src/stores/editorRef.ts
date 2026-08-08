/**
 * 编辑器实例的全局引用。
 *
 * Tiptap 的 Editor 实例不适合放进 Pinia 的响应式状态（会触发大量无谓更新），
 * 这里用 shallowRef 仅保存引用，供「应用纠错」「一键替换」等动作调用。
 */
import { shallowRef } from 'vue'
import type { Editor } from '@tiptap/vue-3'

export const editorRef = shallowRef<Editor | null>(null)
