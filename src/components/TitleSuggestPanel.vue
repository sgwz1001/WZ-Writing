<script setup lang="ts">
import { ref } from 'vue'
import { useEditorStore } from '../stores/editor'
import { TITLE_STYLES, type TitleStyle, suggestTitles } from '../utils/title'

const emit = defineEmits<{ (e: 'close'): void }>()

const editor = useEditorStore()

const style = ref<TitleStyle>('webnovel')
const loading = ref(false)
const candidates = ref<string[]>([])
const error = ref('')

async function generate() {
  loading.value = true
  error.value = ''
  candidates.value = []
  try {
    candidates.value = await suggestTitles(editor.content, style.value, 5)
  } catch (e) {
    error.value = e instanceof Error ? e.message : String(e)
  } finally {
    loading.value = false
  }
}

function apply(title: string) {
  editor.title = title
  emit('close')
}
</script>

<template>
  <div class="wz-overlay" @click.self="emit('close')">
    <div class="wz-modal wz-modal--narrow" role="dialog" aria-modal="true">
      <div class="wz-modal__head">
        <span class="wz-modal__title">一键取标题</span>
        <button class="wz-icon-btn" title="关闭" @click="emit('close')">×</button>
      </div>

      <div class="wz-modal__body">
        <p class="hint">按正文内容生成候选标题。先在「AI 设置」填好 Key 效果最佳；未填则使用本地启发式。</p>

        <div class="style-row">
          <button
            v-for="s in TITLE_STYLES"
            :key="s.key"
            class="wz-chip"
            :class="{ 'is-active': style === s.key }"
            :title="s.hint"
            @click="style = s.key"
          >
            {{ s.label }}
          </button>
        </div>
        <p class="style-hint">{{ TITLE_STYLES.find((s) => s.key === style)?.hint }}</p>

        <div class="actions">
          <button class="wz-btn wz-btn--primary wz-btn--sm" :disabled="loading" @click="generate">
            {{ loading ? '生成中…' : '生成候选' }}
          </button>
        </div>

        <p v-if="error" class="error">{{ error }}</p>

        <ul v-if="candidates.length" class="title-list">
          <li v-for="(t, i) in candidates" :key="i" class="wz-list-item">
            <span class="title-text">{{ t }}</span>
            <button class="wz-btn wz-btn--soft wz-btn--sm" @click="apply(t)">应用</button>
          </li>
        </ul>
        <p v-else-if="!loading" class="empty">点击「生成候选」开始。</p>
      </div>
    </div>
  </div>
</template>

<style scoped>
.hint {
  font-size: 12px;
  color: var(--c-text-dim);
  margin: 0 0 14px;
  line-height: 1.6;
}
.style-row {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
}
.style-hint {
  font-size: 12px;
  color: var(--c-accent);
  margin: 8px 0 0;
  min-height: 18px;
}
.actions {
  margin: 16px 0 8px;
}
.title-list {
  list-style: none;
  margin: 12px 0 0;
  padding: 0;
  display: flex;
  flex-direction: column;
  gap: 8px;
  max-height: 280px;
  overflow-y: auto;
}
.title-list .wz-list-item {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
}
.title-text {
  flex: 1;
  font-size: 14px;
  color: var(--c-text);
}
.empty {
  color: var(--c-text-dim);
  font-size: 12px;
  margin: 16px 0 0;
}
.error {
  color: var(--c-error, #ff5a5a);
  font-size: 12px;
  margin: 10px 0 0;
}
.wz-modal--narrow {
  width: 460px;
  max-width: 92vw;
}
</style>
