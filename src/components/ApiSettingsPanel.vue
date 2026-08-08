<script setup lang="ts">
import { computed, onMounted, ref, watch } from 'vue'
import { useSettingsStore } from '../stores/settings'
import { useLoadingStore } from '../stores/loading'
import { PROVIDERS, getProvider, getDefaultBase, getDefaultModel, getModelInfo } from '../data/models'
import { testConnection } from '../utils/ai'

const emit = defineEmits<{ (e: 'close'): void }>()
const settings = useSettingsStore()
const loadingStore = useLoadingStore()

const provider = ref(settings.ai.provider)
const baseUrl = ref(settings.ai.baseUrl)
const apiKey = ref(settings.ai.apiKey)
const model = ref(settings.ai.model)

const testMsg = ref('')
const testOk = ref(false)
const testing = ref(false)
const showKey = ref(false)

const currentProvider = computed(() => getProvider(provider.value))
const isCustom = computed(() => provider.value === 'custom')
const currentModel = computed(() => getModelInfo(provider.value, model.value))

// 切换厂商：自动带出默认 baseUrl（若用户没改过）与第一个型号
watch(provider, (id, old) => {
  if (!baseUrl.value || baseUrl.value === getDefaultBase(old)) {
    baseUrl.value = getDefaultBase(id)
  }
  const p = getProvider(id)
  if (p && p.models.length && !p.models.some((m) => m.id === model.value)) {
    model.value = getDefaultModel(id)
  }
  testMsg.value = ''
  sync()
})

function sync() {
  settings.ai.provider = provider.value
  settings.ai.baseUrl = baseUrl.value.trim()
  settings.ai.apiKey = apiKey.value.trim()
  settings.ai.model = model.value.trim()
}

watch([baseUrl, apiKey, model], () => {
  sync()
})

async function runTest() {
  sync()
  if (!apiKey.value.trim()) {
    testOk.value = false
    testMsg.value = '请先填写 API Key。'
    return
  }
  testing.value = true
  testMsg.value = ''
  try {
    const r = await loadingStore.wrap('正在连接模型服务…', () => testConnection())
    testOk.value = true
    testMsg.value = `连接成功 ✓ 模型回复：${r}`
  } catch (e) {
    testOk.value = false
    testMsg.value = (e as Error).message
  } finally {
    testing.value = false
  }
}

function openConsole() {
  const url = currentProvider.value?.console
  if (url) window.open(url, '_blank')
}

function dismissMigration() {
  settings.clearMigrationNotice()
}

onMounted(async () => {
  if (!settings.loaded) await settings.load()
  provider.value = settings.ai.provider
  baseUrl.value = settings.ai.baseUrl || getDefaultBase(settings.ai.provider)
  apiKey.value = settings.ai.apiKey
  model.value = settings.ai.model || getDefaultModel(settings.ai.provider)
})
</script>

<template>
  <div class="wz-overlay" @click.self="emit('close')">
    <div class="wz-modal api-modal">
      <div class="wz-modal__head">
        <h3>AI 模型接入</h3>
        <button class="wz-icon-btn" @click="emit('close')" aria-label="关闭">
          <svg viewBox="0 0 24 24" width="18" height="18">
            <path
              d="M6 6l12 12M18 6L6 18"
              stroke="currentColor"
              stroke-width="2"
              stroke-linecap="round"
            />
          </svg>
        </button>
      </div>

      <div class="wz-modal__body">
        <div v-if="settings.migrationNotice" class="migrate-tip">
          <strong>模型清单已更新</strong>
          <p>{{ settings.migrationNotice }}</p>
          <button class="wz-btn wz-btn--ghost wz-btn--xs" @click="dismissMigration">知道了</button>
        </div>

        <p class="hint">联网点仅此一处。API Key 只存在你本机数据库，不会上传。</p>

        <label class="field">
          <span class="field-label">服务商</span>
          <select v-model="provider" class="wz-input">
            <option v-for="p in PROVIDERS" :key="p.id" :value="p.id">{{ p.name }}</option>
          </select>
        </label>

        <p v-if="currentProvider?.note" class="provider-note">{{ currentProvider.note }}</p>

        <label class="field">
          <span class="field-label">
            API Key
            <button
              v-if="currentProvider?.console"
              class="link-btn"
              type="button"
              @click.prevent="openConsole"
            >
              去控制台获取 ↗
            </button>
          </span>
          <div class="key-row">
            <input
              v-model="apiKey"
              :type="showKey ? 'text' : 'password'"
              class="wz-input"
              placeholder="sk-..."
              autocomplete="off"
            />
            <button
              class="wz-btn wz-btn--ghost wz-btn--xs"
              type="button"
              @click="showKey = !showKey"
            >
              {{ showKey ? '隐藏' : '显示' }}
            </button>
          </div>
        </label>

        <label class="field">
          <span class="field-label">接口地址（baseUrl）</span>
          <input v-model="baseUrl" class="wz-input" placeholder="https://..." />
        </label>

        <label class="field">
          <span class="field-label">模型</span>
          <input
            v-if="isCustom || !currentProvider?.models.length"
            v-model="model"
            class="wz-input"
            placeholder="手动输入模型名，如 deepseek-v4-pro"
          />
          <select v-else v-model="model" class="wz-input">
            <option v-for="m in currentProvider.models" :key="m.id" :value="m.id">
              {{ m.label }}{{ m.ctx ? ` · ${m.ctx}` : '' }}
            </option>
          </select>
        </label>

        <div v-if="currentModel" class="model-card">
          <div class="model-tags">
            <span v-for="t in currentModel.tags ?? []" :key="t" class="tag">{{ t }}</span>
            <span v-if="currentModel.ctx" class="tag tag--ctx">上下文 {{ currentModel.ctx }}</span>
          </div>
          <p v-if="currentModel.desc" class="model-desc">{{ currentModel.desc }}</p>
        </div>

        <div class="api-actions">
          <button class="wz-btn wz-btn--soft wz-btn--sm" :disabled="testing" @click="runTest">
            {{ testing ? '测试中…' : '测试连接' }}
          </button>
          <button class="wz-btn wz-btn--primary wz-btn--sm" @click="emit('close')">完成</button>
        </div>

        <pre v-if="testMsg" class="test-msg" :class="{ ok: testOk }">{{ testMsg }}</pre>
      </div>
    </div>
  </div>
</template>

<style scoped>
.api-modal {
  width: min(560px, 92vw);
  max-height: 88vh;
}
.wz-modal__body {
  padding: var(--space-5);
  display: flex;
  flex-direction: column;
  gap: var(--space-4);
  overflow-y: auto;
}
.hint {
  font-size: 12px;
  color: var(--c-text-tertiary);
  margin: 0;
  line-height: 1.6;
}
.migrate-tip {
  border: 1px solid var(--c-accent);
  background: color-mix(in srgb, var(--c-accent) 12%, transparent);
  border-radius: var(--radius-md);
  padding: var(--space-3);
  font-size: 12.5px;
  line-height: 1.7;
}
.migrate-tip strong {
  display: block;
  margin-bottom: 4px;
  color: var(--c-accent);
}
.migrate-tip p {
  margin: 0 0 6px;
  color: var(--c-text-secondary);
}
.field {
  display: flex;
  flex-direction: column;
  gap: var(--space-2);
}
.field-label {
  font-size: 13px;
  color: var(--c-text-secondary);
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: var(--space-2);
}
.link-btn {
  background: none;
  border: none;
  color: var(--c-accent);
  font-size: 12px;
  cursor: pointer;
  padding: 0;
}
.link-btn:hover {
  text-decoration: underline;
}
.key-row {
  display: flex;
  gap: var(--space-2);
  align-items: center;
}
.key-row .wz-input {
  flex: 1;
}
.provider-note {
  margin: -6px 0 0;
  font-size: 12px;
  line-height: 1.7;
  color: var(--c-text-tertiary);
  padding-left: 2px;
}
.model-card {
  border: 1px solid var(--c-border);
  border-radius: var(--radius-md);
  padding: var(--space-3);
  background: var(--c-surface-2);
}
.model-tags {
  display: flex;
  flex-wrap: wrap;
  gap: 6px;
}
.tag {
  font-size: 11px;
  padding: 2px 8px;
  border-radius: 999px;
  background: color-mix(in srgb, var(--c-accent) 18%, transparent);
  color: var(--c-accent);
}
.tag--ctx {
  background: var(--c-surface-3, rgba(128, 128, 128, 0.15));
  color: var(--c-text-tertiary);
}
.model-desc {
  margin: 8px 0 0;
  font-size: 12.5px;
  line-height: 1.7;
  color: var(--c-text-secondary);
}
.api-actions {
  display: flex;
  gap: var(--space-2);
  justify-content: flex-end;
}
.test-msg {
  font-size: 12.5px;
  line-height: 1.75;
  color: var(--c-error);
  white-space: pre-wrap;
  word-break: break-word;
  margin: 0;
  font-family: inherit;
  background: color-mix(in srgb, var(--c-error) 8%, transparent);
  border-radius: var(--radius-md);
  padding: var(--space-3);
  max-height: 200px;
  overflow-y: auto;
}
.test-msg.ok {
  color: #4ade80;
  background: rgba(74, 222, 128, 0.08);
}
</style>
