<script setup lang="ts">
import { onMounted, ref, watch } from 'vue'
import { useSettingsStore } from '../stores/settings'
import { PROVIDERS, getProvider, getDefaultBase, getDefaultModel } from '../data/models'
import { testConnection } from '../utils/ai'

const emit = defineEmits<{ (e: 'close'): void }>()
const settings = useSettingsStore()

const provider = ref(settings.ai.provider)
const baseUrl = ref(settings.ai.baseUrl)
const apiKey = ref(settings.ai.apiKey)
const model = ref(settings.ai.model)

const testMsg = ref('')
const testing = ref(false)
const dirty = ref(false)

// 切换厂商：自动带出默认 baseUrl（若用户没改过）与第一个型号
watch(provider, (id) => {
  if (!baseUrl.value || baseUrl.value === getDefaultBase(settings.ai.provider)) {
    baseUrl.value = getDefaultBase(id)
  }
  const p = getProvider(id)
  if (p && (!model.value || !p.models.some((m) => m.id === model.value))) {
    model.value = getDefaultModel(id)
  }
  sync()
})

function sync() {
  settings.ai.provider = provider.value
  settings.ai.baseUrl = baseUrl.value.trim()
  settings.ai.apiKey = apiKey.value.trim()
  settings.ai.model = model.value
  dirty.value = false
}

// 任一字段变化标记 dirty（设置本身是 deep-watch 自动保存，这里用于提示）
watch([provider, baseUrl, apiKey, model], () => {
  dirty.value = true
})

async function runTest() {
  sync()
  testing.value = true
  testMsg.value = ''
  try {
    const r = await testConnection()
    testMsg.value = '连接成功 ✓ ' + r
  } catch (e) {
    testMsg.value = '连接失败：' + (e as Error).message
  } finally {
    testing.value = false
  }
}

onMounted(async () => {
  if (!settings.loaded) await settings.load()
  // 用最新值回填本地表单
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
          <svg viewBox="0 0 24 24" width="18" height="18"><path d="M6 6l12 12M18 6L6 18" stroke="currentColor" stroke-width="2" stroke-linecap="round" /></svg>
        </button>
      </div>

      <div class="wz-modal__body">
        <p class="hint">联网点仅此一处。API Key 只存在你本机数据库，不会上传。</p>

        <label class="field">
          <span class="field-label">服务商</span>
          <select v-model="provider" class="wz-input">
            <option v-for="p in PROVIDERS" :key="p.id" :value="p.id">{{ p.name }}</option>
          </select>
        </label>

        <label class="field">
          <span class="field-label">API Key</span>
          <input v-model="apiKey" type="password" class="wz-input" placeholder="sk-..." autocomplete="off" />
        </label>

        <label class="field">
          <span class="field-label">接口地址（baseUrl）</span>
          <input v-model="baseUrl" class="wz-input" placeholder="https://..." />
        </label>

        <label class="field">
          <span class="field-label">模型</span>
          <select v-model="model" class="wz-input">
            <option v-for="m in getProvider(provider)?.models ?? []" :key="m.id" :value="m.id">
              {{ m.label }}
            </option>
          </select>
        </label>

        <div class="api-actions">
          <button class="wz-btn wz-btn--soft wz-btn--sm" :disabled="testing" @click="runTest">
            {{ testing ? '测试中…' : '测试连接' }}
          </button>
          <button class="wz-btn wz-btn--primary wz-btn--sm" @click="emit('close')">完成</button>
        </div>

        <p v-if="testMsg" class="test-msg" :class="{ ok: testMsg.startsWith('连接成功') }">{{ testMsg }}</p>
      </div>
    </div>
  </div>
</template>

<style scoped>
.api-modal {
  width: min(520px, 92vw);
}
.wz-modal__body {
  padding: var(--space-5);
  display: flex;
  flex-direction: column;
  gap: var(--space-4);
}
.hint {
  font-size: 12px;
  color: var(--c-text-tertiary);
  margin: 0;
  line-height: 1.6;
}
.field {
  display: flex;
  flex-direction: column;
  gap: var(--space-2);
}
.field-label {
  font-size: 13px;
  color: var(--c-text-secondary);
}
.api-actions {
  display: flex;
  gap: var(--space-2);
  justify-content: flex-end;
}
.test-msg {
  font-size: 13px;
  color: var(--c-error);
}
.test-msg.ok {
  color: #4ade80;
}
</style>
