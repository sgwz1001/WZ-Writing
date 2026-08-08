<script setup lang="ts">
import { ref } from 'vue'
import { useAppearanceStore, type Skin } from '../stores/appearance'
import ApiSettingsPanel from './ApiSettingsPanel.vue'
import VersionTimeline from './VersionTimeline.vue'
import { CURRENT_VERSION } from '../data/versions'

const emit = defineEmits<{ (e: 'close'): void }>()

const appearance = useAppearanceStore()
const showApi = ref(false)

type TabKey = 'look' | 'motion' | 'ai' | 'version'
const tab = ref<TabKey>('look')

const TABS: { key: TabKey; label: string; icon: string }[] = [
  { key: 'look', label: '外观', icon: '◈' },
  { key: 'motion', label: '动效', icon: '◐' },
  { key: 'ai', label: 'AI 接入', icon: '⚙' },
  { key: 'version', label: '版本信息', icon: '⌗' },
]

const SKINS: { key: Skin; name: string; desc: string }[] = [
  { key: 'star', name: '星穹', desc: '崩坏：星穹铁道 · 靛蓝金辉' },
  { key: 'genshin', name: '提瓦特', desc: '原神 · 羊皮纸与暖金' },
  { key: 'zenless', name: '新艾利都', desc: '绝区零 · 荧光硬边' },
]
</script>

<template>
  <div class="wz-overlay" @click.self="emit('close')">
    <div class="wz-modal settings-modal" role="dialog" aria-modal="true" aria-label="设置">
      <div class="wz-modal__head">
        <span class="wz-modal__title">设置</span>
        <span class="head-ver">v{{ CURRENT_VERSION }}</span>
        <button class="wz-icon-btn" title="关闭" @click="emit('close')">
          <svg viewBox="0 0 24 24" width="18" height="18">
            <path d="M6 6l12 12M18 6L6 18" stroke="currentColor" stroke-width="2" stroke-linecap="round" />
          </svg>
        </button>
      </div>

      <div class="settings-body">
        <!-- 左侧分区 -->
        <nav class="settings-nav">
          <button
            v-for="t in TABS"
            :key="t.key"
            class="nav-item"
            :class="{ 'is-active': tab === t.key }"
            @click="tab = t.key"
          >
            <span class="nav-icon">{{ t.icon }}</span>
            <span>{{ t.label }}</span>
          </button>
        </nav>

        <!-- 右侧内容 -->
        <div class="settings-content">
          <!-- 外观 -->
          <section v-if="tab === 'look'" class="pane">
            <h4 class="pane-title">界面皮肤</h4>
            <div class="skin-grid">
              <button
                v-for="s in SKINS"
                :key="s.key"
                class="skin-card"
                :class="[{ 'is-active': appearance.skin === s.key }, 'preview-' + s.key]"
                @click="appearance.setSkin(s.key)"
              >
                <span class="skin-swatch" />
                <span class="skin-name">{{ s.name }}</span>
                <span class="skin-desc">{{ s.desc }}</span>
              </button>
            </div>

            <h4 class="pane-title">明暗模式</h4>
            <div class="seg">
              <button class="seg-btn" :class="{ 'is-active': appearance.mode === 'day' }" @click="appearance.setMode('day')">
                日间
              </button>
              <button class="seg-btn" :class="{ 'is-active': appearance.mode === 'night' }" @click="appearance.setMode('night')">
                夜间
              </button>
            </div>

            <h4 class="pane-title">毛玻璃强度</h4>
            <div class="slider-row">
              <input
                class="wz-slider"
                type="range"
                min="0"
                max="48"
                step="1"
                :value="appearance.blur"
                @input="appearance.setBlur(Number(($event.target as HTMLInputElement).value))"
              />
              <span class="slider-val">{{ appearance.blur }}px</span>
            </div>
            <p class="pane-hint">数值越大背景越朦胧；设为 0 则完全实心，低配机器更流畅。</p>
          </section>

          <!-- 动效 -->
          <section v-else-if="tab === 'motion'" class="pane">
            <h4 class="pane-title">动画总开关</h4>
            <label class="switch-row">
              <span class="switch-text">
                <strong>启用界面动画</strong>
                <small>关闭后转场、加载动效、脉冲高亮全部停用，仅保留必要的即时反馈。设置会自动记住。</small>
              </span>
              <input
                class="wz-check switch-input"
                type="checkbox"
                :checked="appearance.animations"
                @change="appearance.setAnimations(($event.target as HTMLInputElement).checked)"
              />
            </label>

            <div class="anim-state" :class="{ 'is-on': appearance.animations }">
              当前状态：{{ appearance.animations ? '动画已开启' : '动画已关闭' }}
            </div>

            <h4 class="pane-title">动效说明</h4>
            <ul class="feat-list">
              <li><b>AI / API 调用</b>：生成标题、品评诗词、测试连接等耗时操作时，全屏浮现加载层。</li>
              <li><b>页面跳转</b>：择道页与工作室之间切换时淡入上移，配合载入提示。</li>
              <li><b>皮肤差异</b>：星穹为环形扫描、提瓦特为双环呼吸、新艾利都为硬边闪烁。</li>
            </ul>
            <p class="pane-hint">若系统已开启「减弱动态效果」，应用会自动遵循，无需手动关闭。</p>
          </section>

          <!-- AI -->
          <section v-else-if="tab === 'ai'" class="pane">
            <h4 class="pane-title">大模型接入</h4>
            <p class="pane-hint">
              全应用唯一联网点。API Key 仅保存在本机数据库，不会上传。未配置时，取标题等功能会退回本地启发式算法。
            </p>
            <button class="wz-btn wz-btn--primary wz-btn--sm" @click="showApi = true">打开 AI 设置</button>

            <h4 class="pane-title">隐私与本地化</h4>
            <ul class="feat-list">
              <li>正文、项目、错词库全部存放于本机 SQLite，不联网同步。</li>
              <li>本地纠错引擎完全离线运行。</li>
              <li>仅在你主动点击 AI 功能时才会发起网络请求。</li>
            </ul>
          </section>

          <!-- 版本 -->
          <VersionTimeline v-else-if="tab === 'version'" />
        </div>
      </div>
    </div>

    <ApiSettingsPanel v-if="showApi" @close="showApi = false" />
  </div>
</template>

<style scoped>
.settings-modal {
  width: min(860px, 94vw);
  max-height: 88vh;
  display: flex;
  flex-direction: column;
}
.wz-modal__head {
  gap: var(--space-3);
}
.head-ver {
  margin-left: auto;
  margin-right: var(--space-2);
  font-size: 11px;
  color: var(--c-text-tertiary);
  font-variant-numeric: tabular-nums;
}

.settings-body {
  display: flex;
  min-height: 0;
  flex: 1;
}

/* ── 左侧导航 ── */
.settings-nav {
  width: 148px;
  flex-shrink: 0;
  border-right: 1px solid var(--c-border);
  padding: var(--space-4) var(--space-2);
  display: flex;
  flex-direction: column;
  gap: 4px;
  background: var(--c-bg-sunken);
}
.nav-item {
  display: flex;
  align-items: center;
  gap: 9px;
  padding: 9px 12px;
  border: none;
  background: transparent;
  color: var(--c-text-secondary);
  font-size: 13px;
  border-radius: var(--radius-sm);
  cursor: pointer;
  text-align: left;
  transition: all var(--dur-fast) var(--ease-out);
}
.nav-item:hover {
  background: var(--c-surface-hover);
  color: var(--c-text-base);
}
.nav-item.is-active {
  background: var(--c-surface-active);
  color: var(--c-accent);
  box-shadow: inset 2px 0 0 0 var(--c-accent);
}
.nav-icon {
  font-size: 13px;
  opacity: 0.85;
}

/* ── 右侧内容 ── */
.settings-content {
  flex: 1;
  min-width: 0;
  overflow-y: auto;
  padding: var(--space-5);
}
.pane {
  display: flex;
  flex-direction: column;
  gap: var(--space-3);
}
.pane-title {
  margin: var(--space-2) 0 0;
  font-size: 12px;
  letter-spacing: 0.14em;
  color: var(--c-text-tertiary);
  font-weight: 600;
}
.pane-title:first-child {
  margin-top: 0;
}
.pane-hint {
  margin: 0;
  font-size: 12px;
  line-height: 1.7;
  color: var(--c-text-tertiary);
}

/* ── 皮肤卡片 ── */
.skin-grid {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: var(--space-3);
}
.skin-card {
  display: flex;
  flex-direction: column;
  gap: 6px;
  padding: var(--space-3);
  border: 1px solid var(--c-border);
  border-radius: var(--radius-md);
  background: var(--c-surface);
  cursor: pointer;
  text-align: left;
  transition: all var(--dur-fast) var(--ease-out);
}
.skin-card:hover {
  border-color: var(--c-border-strong);
  transform: translateY(-2px);
}
.skin-card.is-active {
  border-color: var(--c-accent);
  box-shadow: 0 0 0 1px var(--c-accent), 0 0 20px var(--c-accent-soft);
}
.skin-swatch {
  height: 34px;
  border-radius: var(--radius-sm);
}
.preview-star .skin-swatch {
  background: linear-gradient(120deg, #1b2140, #3b4a86 55%, #e8c27a);
}
.preview-genshin .skin-swatch {
  background: linear-gradient(120deg, #2a2418, #6b5a3a 55%, #ffd58a);
}
.preview-zenless .skin-swatch {
  background: linear-gradient(120deg, #141414, #2f2f2f 55%, #c8f14a);
}
.skin-name {
  font-size: 13px;
  color: var(--c-text-base);
  font-weight: 600;
}
.skin-desc {
  font-size: 11px;
  color: var(--c-text-tertiary);
  line-height: 1.5;
}

/* ── 分段控件 ── */
.seg {
  display: inline-flex;
  border: 1px solid var(--c-border);
  border-radius: var(--radius-full);
  overflow: hidden;
  align-self: flex-start;
}
.seg-btn {
  padding: 6px 20px;
  border: none;
  background: transparent;
  color: var(--c-text-secondary);
  font-size: 12px;
  cursor: pointer;
  transition: all var(--dur-fast) var(--ease-out);
}
.seg-btn.is-active {
  background: var(--c-accent);
  color: var(--c-text-on-accent, var(--c-accent-fg));
}

/* ── 滑块 ── */
.slider-row {
  display: flex;
  align-items: center;
  gap: var(--space-3);
}
.slider-row .wz-slider {
  flex: 1;
}
.slider-val {
  min-width: 44px;
  text-align: right;
  font-size: 12px;
  color: var(--c-accent);
  font-variant-numeric: tabular-nums;
}

/* ── 开关行 ── */
.switch-row {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: var(--space-4);
  padding: var(--space-3) var(--space-4);
  border: 1px solid var(--c-border);
  border-radius: var(--radius-md);
  background: var(--c-surface);
  cursor: pointer;
}
.switch-text {
  display: flex;
  flex-direction: column;
  gap: 4px;
}
.switch-text strong {
  font-size: 13px;
  color: var(--c-text-base);
}
.switch-text small {
  font-size: 11px;
  line-height: 1.65;
  color: var(--c-text-tertiary);
}
.switch-input {
  margin-top: 3px;
  flex-shrink: 0;
}

.anim-state {
  font-size: 12px;
  padding: 7px 12px;
  border-radius: var(--radius-sm);
  align-self: flex-start;
  color: var(--c-text-tertiary);
  background: color-mix(in srgb, var(--c-text-tertiary) 10%, transparent);
}
.anim-state.is-on {
  color: var(--c-accent);
  background: var(--c-accent-soft);
}

/* ── 说明列表 ── */
.feat-list {
  margin: 0;
  padding-left: 18px;
  display: flex;
  flex-direction: column;
  gap: 6px;
}
.feat-list li {
  font-size: 12px;
  line-height: 1.7;
  color: var(--c-text-secondary);
}
.feat-list b {
  color: var(--c-text-base);
}

/* ── 窄屏 ── */
@media (max-width: 640px) {
  .settings-body {
    flex-direction: column;
  }
  .settings-nav {
    width: 100%;
    flex-direction: row;
    overflow-x: auto;
    border-right: none;
    border-bottom: 1px solid var(--c-border);
  }
  .skin-grid {
    grid-template-columns: 1fr;
  }
}
</style>
