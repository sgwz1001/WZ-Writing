<script setup lang="ts">
import { computed, ref } from 'vue'
import { invoke } from '@tauri-apps/api/core'
import { save } from '@tauri-apps/plugin-dialog'
import { useEditorStore } from '../stores/editor'
import { WECHAT_TEMPLATES, formatWeChat, type WeChatTemplate } from '../utils/wechat'
import { htmlToPlainText } from '../utils/text'

const emit = defineEmits<{ (e: 'close'): void }>()
const editor = useEditorStore()

const templateKey = ref<string>('minimal')
const fontSize = ref<number>(16)
const lineHeight = ref<number>(1.9)
const message = ref('')
const copied = ref(false)

const template = computed<WeChatTemplate>(
  () => WECHAT_TEMPLATES.find((t) => t.key === templateKey.value) || WECHAT_TEMPLATES[0],
)

const output = computed(() =>
  formatWeChat(editor.content, template.value, { fontSize: fontSize.value, lineHeight: lineHeight.value }),
)

const plainText = computed(() => htmlToPlainText(editor.content))

async function copyAll() {
  message.value = ''
  copied.value = false
  const html = output.value
  const text = plainText.value
  try {
    if (navigator.clipboard && (window as any).ClipboardItem) {
      await navigator.clipboard.write([
        new (window as any).ClipboardItem({
          'text/html': new Blob([html], { type: 'text/html' }),
          'text/plain': new Blob([text], { type: 'text/plain' }),
        }),
      ])
    } else {
      await navigator.clipboard.writeText(text)
    }
    copied.value = true
    message.value = '已复制！去公众号编辑器 Ctrl/⌘+V 粘贴即可。'
  } catch (e) {
    message.value = `复制失败：${e instanceof Error ? e.message : String(e)}（可改用「下载 HTML」）`
  }
}

async function downloadHtml() {
  message.value = ''
  const path = await save({
    filters: [{ name: '网页 HTML', extensions: ['html'] }],
    defaultPath: `${editor.title || '公众号排版'}.html`,
  })
  if (!path) return
  const doc = `<!doctype html><html lang="zh-CN"><head><meta charset="utf-8"><title>${editor.title}</title></head><body style="margin:0;padding:16px;background:#fff;">${output.value}</body></html>`
  try {
    await invoke('write_text_file', { path, content: doc })
    message.value = `已保存：${path}`
  } catch (e) {
    message.value = `保存失败：${e instanceof Error ? e.message : String(e)}`
  }
}

function close() {
  emit('close')
}
</script>

<template>
  <div class="wz-overlay" @click.self="close">
    <div class="wz-modal wz-modal--wide" role="dialog" aria-modal="true">
      <div class="wz-modal__head">
        <span class="wz-modal__title">公众号排版</span>
        <button class="wz-icon-btn" title="关闭" @click="close">×</button>
      </div>

      <div class="wz-modal__body wechat-body">
        <p class="hint">把当前正文转成「公众号可直接粘贴」的内联样式 HTML。选模板、调字号行距，复制后到公众号编辑器粘贴即可。</p>

        <div class="row">
          <span class="row-label">模板</span>
          <div class="chips">
            <button
              v-for="t in WECHAT_TEMPLATES"
              :key="t.key"
              class="wz-chip"
              :class="{ 'is-active': templateKey === t.key }"
              :title="t.desc"
              @click="templateKey = t.key"
            >
              {{ t.label }}
            </button>
          </div>
        </div>
        <p class="style-desc">{{ template.desc }}</p>

        <div class="row">
          <span class="row-label">正文字号</span>
          <select v-model.number="fontSize" class="wz-input sel">
            <option v-for="s in [14, 15, 16, 17, 18, 20]" :key="s" :value="s">{{ s }} px</option>
          </select>
          <span class="row-label">行距</span>
          <select v-model.number="lineHeight" class="wz-input sel">
            <option v-for="l in [1.6, 1.75, 1.9, 2.0, 2.2]" :key="l" :value="l">{{ l }}</option>
          </select>
        </div>

        <div class="preview-wrap">
          <div class="preview-label">预览（手机视图）</div>
          <div class="phone">
            <div class="phone-screen" v-html="output" />
          </div>
        </div>
      </div>

      <div class="wz-modal__actions">
        <span class="msg" :class="{ ok: copied }">{{ message }}</span>
        <button class="wz-btn wz-btn--ghost" @click="downloadHtml">下载 HTML</button>
        <button class="wz-btn wz-btn--primary" @click="copyAll">复制全文</button>
      </div>
    </div>
  </div>
</template>

<style scoped>
.hint {
  font-size: 12px;
  color: var(--c-text-dim, var(--c-text-tertiary));
  margin: 0 0 14px;
  line-height: 1.6;
}
.row {
  display: flex;
  align-items: center;
  gap: var(--space-3);
  margin-bottom: 8px;
  flex-wrap: wrap;
}
.row-label {
  font-size: 13px;
  color: var(--c-text-secondary);
  white-space: nowrap;
}
.chips {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
}
.chips .wz-chip.is-active {
  background: var(--c-accent);
  color: var(--c-accent-fg);
}
.style-desc {
  font-size: 12px;
  color: var(--c-accent);
  margin: 0 0 12px;
  min-height: 16px;
}
.sel {
  width: auto;
  flex: none;
}
.preview-wrap {
  margin-top: 8px;
}
.preview-label {
  font-size: 12px;
  color: var(--c-text-tertiary);
  margin-bottom: 8px;
}
.phone {
  max-width: 360px;
  margin: 0 auto;
  background: #f2f3f5;
  border-radius: 18px;
  padding: 12px;
  box-shadow: 0 6px 24px rgba(0, 0, 0, 0.12);
}
.phone-screen {
  background: #fff;
  border-radius: 10px;
  padding: 18px 16px;
  min-height: 280px;
  max-height: 360px;
  overflow-y: auto;
  font-size: 16px;
}
.msg {
  margin-right: auto;
  font-size: 12px;
  color: var(--c-error, #ff5a5a);
}
.msg.ok {
  color: var(--c-accent);
}
.wz-modal--wide {
  width: min(620px, 94vw);
}
</style>
