import { defineStore } from 'pinia'
import { computed, ref } from 'vue'
import { invoke } from '@tauri-apps/api/core'
import { computeStats, splitParagraphs, type TextStats } from '../utils/text'

export const useEditorStore = defineStore('editor', () => {
  const docId = ref<string | null>(null)
  const projectId = ref<string | null>(null)
  const title = ref('未命名')
  const content = ref('')
  const cursor = ref(0)
  const savedAt = ref<string | null>(null)
  const saving = ref(false)
  const lastHeartbeat = ref(0)
  const charCount = ref(0)

  // 字数统计开关
  const countPunctuation = ref(false)
  const countTitle = ref(true)

  const stats = computed<TextStats>(() => {
    return computeStats(content.value, countTitle.value ? title.value : '')
  })

  const displayCharCount = computed(() => {
    if (countPunctuation.value && countTitle.value) return stats.value.totalChars
    if (countPunctuation.value && !countTitle.value) return stats.value.charsNoTitle
    if (!countPunctuation.value && countTitle.value) return stats.value.charsNoPunct
    return stats.value.charsNoPunctNoTitle
  })

  function open(newDocId: string, newProjectId: string, newTitle: string, html = '') {
    docId.value = newDocId
    projectId.value = newProjectId
    title.value = newTitle
    content.value = html
    charCount.value = computeStats(html, title.value).totalChars
    savedAt.value = null
    lastHeartbeat.value = Date.now()
  }

  async function heartbeat() {
    if (!docId.value || !projectId.value) return

    const now = Date.now()
    // 与 Rust 侧的 400ms 节流对齐
    if (now - lastHeartbeat.value < 400) return
    lastHeartbeat.value = now

    saving.value = true
    try {
      const ack = await invoke<{ flushed: boolean; at: string }>('heartbeat', {
        docId: docId.value,
        projectId: projectId.value,
        title: title.value,
        content: content.value,
        cursor: cursor.value,
      })
      if (ack.flushed) {
        savedAt.value = ack.at
      }
    } finally {
      saving.value = false
    }
  }

  async function save() {
    if (!docId.value) return
    await invoke('save_doc', {
      docId: docId.value,
      content: content.value,
      plainLen: charCount.value,
    })
    savedAt.value = new Date().toISOString()
  }

  async function panicSave() {
    if (!docId.value || !projectId.value) return
    await invoke('panic_save', {
      docId: docId.value,
      content: content.value,
      plainLen: charCount.value,
    })
    savedAt.value = new Date().toISOString()
  }

  function updateCursor(pos: number) {
    cursor.value = pos
  }

  function updateContent(html: string, plainChars?: number) {
    content.value = html
    if (typeof plainChars === 'number') {
      charCount.value = plainChars
    } else {
      charCount.value = computeStats(html, title.value).totalChars
    }
  }

  /**
   * 一键排版：按给定激进/保守等级拆分正文，返回段落数组。
   */
  function splitCurrentContent(level: number) {
    const text = content.value.replace(/<[^>]*>/g, '').replace(/&nbsp;/g, ' ')
    return splitParagraphs(text, { level, respectParagraphs: true })
  }

  /**
   * 将拆分结果写回正文（简单段落以 <p> 包裹）。
   */
  function applySplit(chunks: { text: string }[]) {
    const html = chunks.map((c) => `<p>${escapeHtml(c.text)}</p>`).join('')
    content.value = html
    charCount.value = computeStats(html, title.value).totalChars
  }

  function escapeHtml(s: string): string {
    return s
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
  }

  return {
    docId,
    projectId,
    title,
    content,
    cursor,
    savedAt,
    saving,
    charCount,
    countPunctuation,
    countTitle,
    stats,
    displayCharCount,
    open,
    heartbeat,
    save,
    panicSave,
    updateCursor,
    updateContent,
    splitCurrentContent,
    applySplit,
  }
})
