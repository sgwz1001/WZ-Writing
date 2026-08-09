<script setup lang="ts">
import { ref, computed, watch } from 'vue'
import { useSettingsStore, type AiProviderConfig } from '../../stores/settings'
import { AI_PROVIDERS, getAiProvider } from '../../data/providers'
import { testConnection } from '../../utils/ai'

const emit = defineEmits<{ (e: 'close'): void }>()

const settings = useSettingsStore()

const draft = ref<AiProviderConfig>({
  ...settings.activeConfig,
})

const showAdvanced = ref(false)
const testing = ref(false)
const testStatus = ref<'idle' | 'success' | 'error'>('idle')
const testMessage = ref('')

const isCustom = computed(() => draft.value.providerId === 'custom')
const provider = computed(() => getAiProvider(draft.value.providerId))
const models = computed(() => provider.value?.models ?? [])

watch(() => settings.activeConfig, (cfg) => {
  draft.value = { ...cfg }
})

function selectProvider(id: string) {
  draft.value.providerId = id
  const p = getAiProvider(id)
  if (p) {
    draft.value.name = p.name
    draft.value.baseUrl = p.defaultBaseUrl
    draft.value.model = p.defaultModel
  }
}

function selectModel(id: string) {
  draft.value.model = id
}

async function runTest() {
  testing.value = true
  testStatus.value = 'idle'
  testMessage.value = ''
  const start = performance.now()
  try {
    // 临时把 draft 写进 activeConfig 让 testConnection 使用
    const backup = { ...settings.activeConfig }
    Object.assign(settings.activeConfig, draft.value)
    const reply = await testConnection()
    const latency = Math.round(performance.now() - start)
    testStatus.value = 'success'
    testMessage.value = `连接成功 · 延迟 ${latency}ms · 返回：${reply.slice(0, 30)}`
    Object.assign(settings.activeConfig, backup)
  } catch (e) {
    testStatus.value = 'error'
    testMessage.value = classifyError(e)
  } finally {
    testing.value = false
  }
}

function classifyError(e: unknown): string {
  const msg = String((e as Error)?.message ?? e)
  if (msg.includes('401') || msg.includes('Unauthorized') || msg.includes('invalid')) return 'API Key 无效或已过期'
  if (msg.includes('404')) return '模型不存在或无法访问'
  if (msg.includes('429')) return '请求频率超限，请稍后重试'
  if (msg.includes('超时') || msg.includes('abort') || msg.includes('timeout')) return '连接超时，请检查网络'
  if (msg.includes('Failed to fetch') || msg.includes('NetworkError')) return '网络错误，无法连接到服务商'
  return '连接失败：' + msg.slice(0, 80)
}

function save() {
  const idx = settings.ai.configs.findIndex((c) => c.id === draft.value.id)
  if (idx >= 0) {
    settings.ai.configs[idx] = { ...draft.value }
  } else {
    settings.ai.configs.push({ ...draft.value, id: `cfg-${Date.now()}` })
  }
  settings.ai.configs.forEach((c) => (c.isDefault = c.id === draft.value.id))
  settings.ai.activeConfigId = draft.value.id
  emit('close')
}

function addConfig() {
  const p = AI_PROVIDERS[0]
  draft.value = {
    id: `cfg-${Date.now()}`,
    providerId: p.id,
    name: p.name,
    apiKey: '',
    model: p.defaultModel,
    baseUrl: p.defaultBaseUrl,
    temperature: 0.7,
    maxTokens: 2048,
    timeoutSeconds: 30,
    contextRounds: 6,
    isDefault: false,
  }
}

function selectConfig(id: string) {
  const cfg = settings.ai.configs.find((c) => c.id === id)
  if (cfg) draft.value = { ...cfg }
}

function deleteConfig(id: string) {
  if (settings.ai.configs.length <= 1) return
  settings.ai.configs = settings.ai.configs.filter((c) => c.id !== id)
  if (settings.ai.activeConfigId === id) {
    settings.ai.activeConfigId = settings.ai.configs[0].id
  }
  draft.value = { ...settings.activeConfig }
}

const showKey = ref(false)
</script>

<template>
  <div class="wz-overlay" @click.self="emit('close')">
    <div class="wz-modal ai-config-modal">
      <div class="wz-modal__head">
        <h3>AI 模型接入</h3>
        <button class="wz-icon-btn" @click="emit('close')">×</button>
      </div>

      <div class="wz-modal__body">
        <!-- 已保存配置 -->
        <div class="saved-configs">
          <h4 class="section-title">已保存配置</h4>
          <div class="config-scroll">
            <div
              v-for="c in settings.ai.configs"
              :key="c.id"
              class="config-card"
              :class="{ active: c.id === draft.id }"
              @click="selectConfig(c.id)"
            >
              <div class="config-meta">
                <span class="name">{{ c.name }}</span>
                <span class="model">{{ c.model || '未选模型' }}</span>
              </div>
              <span v-if="c.isDefault" class="badge-default">默认</span>
              <button class="btn-more" @click.stop="deleteConfig(c.id)">×</button>
            </div>
            <button class="config-card add" @click="addConfig">+ 添加配置</button>
          </div>
        </div>

        <!-- 厂商选择 -->
        <div class="provider-selector">
          <label class="section-title">服务商</label>
          <div class="provider-options">
            <button
              v-for="p in AI_PROVIDERS"
              :key="p.id"
              class="provider-btn"
              :class="{ active: draft.providerId === p.id }"
              @click="selectProvider(p.id)"
            >
              {{ p.name }}
            </button>
          </div>
        </div>

        <!-- 模型卡片 -->
        <div class="model-section">
          <label class="section-title">模型</label>
          <div class="model-grid">
            <div
              v-for="m in models"
              :key="m.id"
              class="model-card"
              :class="{ active: draft.model === m.id, recommended: m.recommended }"
              @click="selectModel(m.id)"
            >
              <div class="model-name">{{ m.name }}</div>
              <div class="model-desc">{{ m.description }}</div>
              <div class="model-tags">
                <span v-for="tag in m.tags" :key="tag" class="tag">{{ tag }}</span>
              </div>
            </div>
          </div>
          <input
            v-if="isCustom"
            v-model="draft.model"
            class="wz-input custom-model"
            placeholder="输入模型 ID，例如 gpt-4o"
          />
        </div>

        <!-- API Key -->
        <label class="field">
          <span class="section-title">API Key</span>
          <div class="key-input">
            <input
              v-model="draft.apiKey"
              :type="showKey ? 'text' : 'password'"
              class="wz-input"
              placeholder="sk-..."
              autocomplete="off"
            />
            <button type="button" class="wz-btn wz-btn--ghost wz-btn--sm" @click="showKey = !showKey">
              {{ showKey ? '隐藏' : '显示' }}
            </button>
          </div>
          <p class="field-hint">只保存在本地数据库，不会上传到任何服务器。</p>
        </label>

        <!-- 测试连接 -->
        <div class="test-section">
          <button
            class="wz-btn"
            :class="{
              'wz-btn--success': testStatus === 'success',
              'wz-btn--danger': testStatus === 'error',
              'wz-btn--primary': testStatus === 'idle',
            }"
            :disabled="testing || !draft.apiKey"
            @click="runTest"
          >
            {{ testing ? '连接中…' : testStatus === 'success' ? '连接成功' : testStatus === 'error' ? '重试' : '测试连接' }}
          </button>
          <p v-if="testMessage" class="test-msg" :class="testStatus">{{ testMessage }}</p>
        </div>

        <!-- 高级参数 -->
        <details class="advanced-params" :open="showAdvanced">
          <summary @click="showAdvanced = !showAdvanced">高级参数</summary>
          <div class="params-body">
            <label class="param-row">
              <span>温度 (temperature)</span>
              <input v-model.number="draft.temperature" type="range" min="0" max="2" step="0.1" />
              <span class="param-val">{{ draft.temperature }}</span>
            </label>
            <label class="param-row">
              <span>最大 token</span>
              <input v-model.number="draft.maxTokens" type="number" min="256" max="8192" step="256" />
            </label>
            <label class="param-row">
              <span>超时时间（秒）</span>
              <input v-model.number="draft.timeoutSeconds" type="number" min="5" max="300" />
            </label>
            <label class="param-row">
              <span>上下文轮数</span>
              <input v-model.number="draft.contextRounds" type="number" min="0" max="20" />
            </label>
            <label v-if="isCustom" class="param-row">
              <span>接口地址 (baseUrl)</span>
              <input v-model="draft.baseUrl" class="wz-input" placeholder="https://..." />
            </label>
          </div>
        </details>
      </div>

      <div class="wz-modal__actions">
        <button class="wz-btn wz-btn--ghost" @click="emit('close')">取消</button>
        <button class="wz-btn wz-btn--primary" @click="save">保存并启用</button>
      </div>
    </div>
  </div>
</template>

<style scoped>
.ai-config-modal {
  width: min(760px, 94vw);
  max-height: 90vh;
  display: flex;
  flex-direction: column;
}
.wz-modal__body {
  display: flex;
  flex-direction: column;
  gap: var(--space-4);
  overflow-y: auto;
}
.section-title {
  margin: 0 0 var(--space-2);
  font-size: 12px;
  letter-spacing: 0.1em;
  color: var(--c-text-tertiary);
  font-weight: 600;
}

.saved-configs {
  display: flex;
  flex-direction: column;
  gap: var(--space-2);
}
.config-scroll {
  display: flex;
  flex-wrap: wrap;
  gap: var(--space-2);
}
.config-card {
  display: flex;
  align-items: center;
  gap: var(--space-2);
  padding: var(--space-2) var(--space-3);
  border: 1px solid var(--c-border);
  border-radius: var(--radius-md);
  background: var(--c-surface);
  cursor: pointer;
  transition: all var(--dur-fast) var(--ease-out);
}
.config-card:hover {
  border-color: var(--c-border-strong);
}
.config-card.active {
  border-color: var(--c-accent);
  box-shadow: 0 0 0 1px var(--c-accent), 0 0 16px var(--c-accent-soft);
}
.config-card.add {
  border-style: dashed;
  color: var(--c-text-secondary);
}
.config-meta {
  display: flex;
  flex-direction: column;
  min-width: 0;
}
.config-meta .name {
  font-size: 13px;
  color: var(--c-text-base);
}
.config-meta .model {
  font-size: 11px;
  color: var(--c-text-tertiary);
}
.badge-default {
  font-size: 10px;
  padding: 1px 6px;
  border-radius: var(--radius-full);
  background: var(--c-accent-soft);
  color: var(--c-accent);
}
.btn-more {
  border: none;
  background: transparent;
  color: var(--c-text-tertiary);
  cursor: pointer;
  font-size: 14px;
}
.btn-more:hover {
  color: var(--c-danger);
}

.provider-options {
  display: flex;
  flex-wrap: wrap;
  gap: var(--space-2);
}
.provider-btn {
  padding: 6px 12px;
  border: 1px solid var(--c-border);
  border-radius: var(--radius-md);
  background: var(--c-surface);
  color: var(--c-text-secondary);
  font-size: 12px;
  cursor: pointer;
  transition: all var(--dur-fast) var(--ease-out);
}
.provider-btn:hover {
  border-color: var(--c-border-strong);
  color: var(--c-text-base);
}
.provider-btn.active {
  border-color: var(--c-accent);
  background: var(--c-accent-soft);
  color: var(--c-accent);
}

.model-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(150px, 1fr));
  gap: var(--space-3);
}
.model-card {
  padding: var(--space-3);
  border: 1px solid var(--c-border);
  border-radius: var(--radius-md);
  background: var(--c-surface);
  cursor: pointer;
  transition: all var(--dur-fast) var(--ease-out);
}
.model-card:hover {
  border-color: var(--c-border-strong);
  transform: translateY(-2px);
}
.model-card.active {
  border-color: var(--c-accent);
  box-shadow: 0 0 0 1px var(--c-accent), 0 0 18px var(--c-accent-soft);
}
.model-name {
  font-size: 13px;
  font-weight: 600;
  color: var(--c-text-base);
}
.model-desc {
  font-size: 11px;
  color: var(--c-text-tertiary);
  margin-top: 4px;
  line-height: 1.5;
}
.model-tags {
  display: flex;
  flex-wrap: wrap;
  gap: 4px;
  margin-top: 8px;
}
.tag {
  font-size: 10px;
  padding: 1px 6px;
  border-radius: var(--radius-full);
  background: var(--c-bg-sunken);
  color: var(--c-text-secondary);
}
.custom-model {
  margin-top: var(--space-2);
}

.field {
  display: flex;
  flex-direction: column;
  gap: 4px;
}
.key-input {
  display: flex;
  gap: var(--space-2);
}
.key-input input {
  flex: 1;
}
.field-hint {
  margin: 0;
  font-size: 11px;
  color: var(--c-text-tertiary);
}

.test-section {
  display: flex;
  flex-direction: column;
  gap: var(--space-2);
}
.test-msg {
  margin: 0;
  font-size: 12px;
  padding: 6px 10px;
  border-radius: var(--radius-md);
}
.test-msg.success {
  color: var(--c-success);
  background: rgba(59, 165, 92, 0.1);
}
.test-msg.error {
  color: var(--c-danger);
  background: rgba(224, 82, 82, 0.1);
}

.advanced-params summary {
  font-size: 12px;
  color: var(--c-text-secondary);
  cursor: pointer;
  padding: var(--space-2) 0;
}
.params-body {
  display: flex;
  flex-direction: column;
  gap: var(--space-3);
  padding: var(--space-2) 0;
}
.param-row {
  display: flex;
  align-items: center;
  gap: var(--space-3);
  font-size: 12px;
  color: var(--c-text-secondary);
}
.param-row span:first-child {
  width: 110px;
  flex-shrink: 0;
}
.param-row input[type='range'] {
  flex: 1;
}
.param-row input[type='number'] {
  width: 90px;
  padding: 4px 8px;
  border: 1px solid var(--c-border);
  border-radius: var(--radius-sm);
  background: var(--c-surface);
  color: var(--c-text-base);
}
.param-val {
  min-width: 36px;
  text-align: right;
  color: var(--c-accent);
}
</style>
