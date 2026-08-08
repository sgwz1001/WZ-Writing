<script setup lang="ts">
/**
 * 诗词面板 · 诗 / 词 / 乐府·曲 / 文言文
 *
 * 四个页签：
 *   1. 近体诗 —— 原有五/七言律绝校验（本地引擎）
 *   2. 词牌填词 —— 103 个词牌，选牌即出谱，逐句提示字数平仄（本地校验）
 *   3. 乐府·曲 —— 古典文体体例模板（结构 / 韵律 / 要点 / 范例）
 *   4. 文言文 · 赋 —— 文言体例与赋体模板
 *
 * 另有一个贯穿全页的入口：按主题 / 需求，让 AI 直接写一首。
 */
import { computed, ref, watch } from 'vue'
import { useEditorStore } from '../stores/editor'
import { useLoadingStore } from '../stores/loading'
import { htmlToPlainText } from '../utils/text'
import { analyzePoem, critiquePoem, POEM_FORMS, analyzeCi, type CiAnalysis, type CiCell } from '../utils/poetry'
import type { PoemAnalysis, CharCell } from '../utils/poetry'
import { CI_PAI, getFormsByGenre, getCiPai, type CiPai, type ClassicalForm } from '../data/cipai'
import { chat } from '../utils/ai'
import { useSettingsStore } from '../stores/settings'

const emit = defineEmits<{ (e: 'close'): void }>()
const editor = useEditorStore()
const loadingStore = useLoadingStore()
const settings = useSettingsStore()

type Tab = 'poem' | 'ci' | 'classical' | 'wenyan'
const tab = ref<Tab>('poem')

// ── 诗 ─────────────────────────────────────────

const poemText = ref(htmlToPlainText(editor.content).split('\n\n').join('\n').trim())
const formKey = ref(POEM_FORMS[0].key)
const variantIdx = ref(0)

const form = computed(() => POEM_FORMS.find((f) => f.key === formKey.value) || POEM_FORMS[0])
const analysis = computed<PoemAnalysis>(() => analyzePoem(poemText.value, formKey.value, variantIdx.value))

const critiquing = ref(false)
const critique = ref('')
const critiqueError = ref('')

function onFormChange() {
  variantIdx.value = 0
}

function cellClass(c: CharCell): string {
  const base = c.tone === '平' ? 't-ping' : c.tone === '仄' ? 't-ze' : 't-unknown'
  if (c.status === 'bad') return base + ' is-bad'
  if (c.status === 'unknown') return base + ' is-unknown'
  return base
}

async function doCritique() {
  critiquing.value = true
  critique.value = ''
  critiqueError.value = ''
  try {
    critique.value = await loadingStore.wrap('AI 正在品评格律…', () =>
      critiquePoem(poemText.value, formKey.value),
    )
  } catch (e) {
    critiqueError.value = e instanceof Error ? e.message : String(e)
  } finally {
    critiquing.value = false
  }
}

// ── 词牌 ───────────────────────────────────────

const ciText = ref('')
const ciKeyword = ref('')
const ciPaiId = ref(CI_PAI[0].id)

const ciSearchResult = computed(() => {
  const kw = ciKeyword.value.trim()
  if (!kw) return CI_PAI
  const k = kw.toLowerCase()
  return CI_PAI.filter(
    (c) =>
      c.name.toLowerCase().includes(k) ||
      c.alias.some((a) => a.toLowerCase().includes(k)) ||
      c.id.toLowerCase().includes(k),
  )
})

const ciPai = computed<CiPai>(() => getCiPai(ciPaiId.value) || CI_PAI[0])

/** 词牌说明与例句，供右侧参考 */
const ciRef = computed(() => ciPai.value)

const ciAnalysis = computed<CiAnalysis>(() => analyzeCi(ciText.value, ciPai.value))

function ciCellClass(c: CiCell): string {
  const base = c.tone === '平' ? 't-ping' : c.tone === '仄' ? 't-ze' : 't-unknown'
  if (c.status === 'bad') return base + ' is-bad'
  if (c.status === 'unknown') return base + ' is-unknown'
  return base
}

/** 选词牌时按谱预填一句空行，方便对照着填 */
function onCiPaiChange() {
  ciText.value = ciPai.value.sections
    .map((s) => s.sentences.map(() => '　').join('，'))
    .join('\n\n')
}

// ── 乐府 / 曲 / 文言文 ─────────────────────────

const CLASSICAL_GENRES = [
  { id: 'yuefu', label: '乐府', genre: '乐府' },
  { id: 'qu', label: '元曲·散曲', genre: '曲' },
  { id: 'wenyan', label: '文言文', genre: '文言文' },
  { id: 'gu', label: '古体诗', genre: '古体诗' },
  { id: 'fu', label: '赋', genre: '赋' },
] as const

const classicalGenre = ref<(typeof CLASSICAL_GENRES)[number]['genre']>('乐府')
const classicalId = ref('')

const classicalList = computed<ClassicalForm[]>(() => getFormsByGenre(classicalGenre.value))
const classicalForm = computed<ClassicalForm | null>(() =>
  classicalList.value.find((f) => f.id === classicalId.value) || classicalList.value[0] || null,
)

function onClassicalGenreChange() {
  const list = getFormsByGenre(classicalGenre.value)
  classicalId.value = list[0]?.id || ''
}

// ── AI 按主题创作 ───────────────────────────────

const aiOpen = ref(false)
const aiTopic = ref('')
const aiKind = ref('poem')
const aiResult = ref('')
const aiBusy = ref(false)
const aiError = ref('')

async function doAiCompose() {
  if (!aiTopic.value.trim()) return
  aiBusy.value = true
  aiError.value = ''
  aiResult.value = ''
  try {
    const kindLabel =
      aiKind.value === 'poem'
        ? '近体诗（五言/七言律绝）'
        : aiKind.value === 'ci'
          ? `词牌「${ciPai.value.name}」（${ciPai.value.totalChars}字，${ciPai.value.rhymeType}）`
          : aiKind.value === 'yuefu'
            ? '乐府'
            : aiKind.value === 'qu'
              ? '元曲散曲'
              : aiKind.value === 'wenyan'
                ? '文言文'
                : '赋'
    const sys =
      '你是深谙中国古典文学的行家，擅诗、词、曲、赋与文言文。' +
      '严格按用户要求的体裁与格律创作，先给作品，再给一段百字以内的创作思路说明。'
    const user = `体裁：${kindLabel}\n主题 / 要求：${aiTopic.value}\n\n请创作。`
    aiResult.value = await loadingStore.wrap('AI 正在动笔…', () =>
      chat(
        [
          { role: 'system', content: sys },
          { role: 'user', content: user },
        ],
        { temperature: 0.8 },
      ),
    )
  } catch (e) {
    aiError.value = e instanceof Error ? e.message : String(e)
  } finally {
    aiBusy.value = false
  }
}

/** 把 AI 结果插入正文 */
function insertToEditor(text: string) {
  editor.updateContent(editor.content + (editor.content ? '\n\n' : '') + text)
}

function close() {
  emit('close')
}

watch(ciPaiId, () => onCiPaiChange())
</script>

<template>
  <div class="wz-overlay" @click.self="close">
    <div class="wz-modal wz-modal--wide" role="dialog" aria-modal="true">
      <div class="wz-modal__head">
        <span class="wz-modal__title">诗词 · 词牌 · 古典文体</span>
        <button class="wz-icon-btn" title="关闭" @click="close">×</button>
      </div>

      <div class="wz-modal__body">
        <div class="tabs">
          <button class="tab" :class="{ 'is-on': tab === 'poem' }" @click="tab = 'poem'">近体诗</button>
          <button class="tab" :class="{ 'is-on': tab === 'ci' }" @click="tab = 'ci'">词牌填词</button>
          <button class="tab" :class="{ 'is-on': tab === 'classical' }" @click="tab = 'classical'">乐府·曲</button>
          <button class="tab" :class="{ 'is-on': tab === 'wenyan' }" @click="tab = 'wenyan'">文言·赋</button>
          <button class="tab tab--ai" :class="{ 'is-on': aiOpen }" @click="aiOpen = !aiOpen">✍ 按主题创作</button>
        </div>

        <!-- AI 创作抽屉 -->
        <div v-if="aiOpen" class="ai-drawer">
          <div class="row">
            <select v-model="aiKind" class="wz-input sel">
              <option value="poem">近体诗</option>
              <option value="ci">词（用当前选中的词牌）</option>
              <option value="yuefu">乐府</option>
              <option value="qu">元曲散曲</option>
              <option value="wenyan">文言文</option>
              <option value="fu">赋</option>
            </select>
            <input
              v-model="aiTopic"
              class="wz-input"
              style="flex: 1"
              placeholder="主题 / 要求，如：深秋送别，含蓄些，五言律诗"
              @keyup.enter="doAiCompose"
            />
            <button class="wz-btn wz-btn--primary" :disabled="aiBusy || !aiTopic.trim()" @click="doAiCompose">
              {{ aiBusy ? '创作中…' : '写' }}
            </button>
          </div>
          <p v-if="!settings.ai.apiKey" class="error">未配置 API Key，请先到「AI」设置里填写。</p>
          <p v-if="aiError" class="error">{{ aiError }}</p>
          <div v-if="aiResult" class="ai-result">
            <pre class="ai-result-text">{{ aiResult }}</pre>
            <div class="ai-result-actions">
              <button class="wz-btn wz-btn--sm wz-btn--ghost" @click="insertToEditor(aiResult)">插入正文</button>
            </div>
          </div>
        </div>

        <!-- ── 近体诗 ── -->
        <template v-if="tab === 'poem'">
          <p class="hint">粘贴或输入诗词（每行一句）。本地引擎校验字数 / 句数 / 逐句平仄 / 韵脚；未收录字标「?」，可用「AI 点评」获得完整判断。</p>

          <div class="row">
            <span class="row-label">体裁</span>
            <select v-model="formKey" class="wz-input sel" @change="onFormChange">
              <option v-for="f in POEM_FORMS" :key="f.key" :value="f.key">{{ f.label }}</option>
            </select>
            <span class="row-label">体式</span>
            <select v-model.number="variantIdx" class="wz-input sel">
              <option v-for="(v, i) in form.variants" :key="i" :value="i">{{ v.label }}</option>
            </select>
          </div>

          <textarea v-model="poemText" class="poem-input wz-input" rows="6" placeholder="例如：&#10;空山新雨后&#10;天气晚来秋&#10;明月松间照&#10;清泉石上流" />

          <div class="legend">
            <span class="lg t-ping">平</span>
            <span class="lg t-ze">仄</span>
            <span class="lg t-unknown">? 未收录</span>
            <span class="lg is-bad">✕ 不合谱</span>
          </div>

          <div class="result">
            <div v-for="(line, li) in analysis.lines" :key="li" class="line">
              <div class="line-no">{{ li + 1 }}</div>
              <div class="chars">
                <span v-for="(c, ci) in line.cells" :key="ci" :class="cellClass(c)" :title="c.expect ? '应'+c.expect : ''">
                  {{ c.ch }}
                </span>
              </div>
              <div class="line-meta">
                <span v-if="line.expectedLen" class="pat">{{ form.variants[variantIdx].pattern[li] || '—' }}</span>
                <span v-if="line.isRhyme" class="rhyme-tag">韵</span>
                <span v-if="line.note" class="ln-note">{{ line.note }}</span>
              </div>
            </div>
          </div>

          <div v-if="analysis.notes.length" class="notes">
            <p v-for="(n, i) in analysis.notes" :key="i">{{ n }}</p>
          </div>

          <div class="rhyme-box" :class="{ ok: analysis.rhyme.ok }">
            <strong>押韵：</strong>{{ analysis.rhyme.note || '—' }}
          </div>

          <div v-if="critique" class="critique">
            <div class="critique-head">AI 点评</div>
            <p class="critique-text">{{ critique }}</p>
          </div>
          <p v-if="critiqueError" class="error">{{ critiqueError }}</p>

          <div class="wz-modal__actions">
            <span class="msg">{{ analysis.lineCount ? form.label + ' · ' + form.variants[variantIdx].label : '' }}</span>
            <button class="wz-btn wz-btn--ghost" :disabled="critiquing" @click="doCritique">
              {{ critiquing ? '点评中…' : 'AI 点评' }}
            </button>
          </div>
        </template>

        <!-- ── 词牌 ── -->
        <template v-if="tab === 'ci'">
          <div class="row">
            <span class="row-label">搜索词牌</span>
            <input v-model="ciKeyword" class="wz-input sel" placeholder="如梦令 / 忆江南 / qingping…" style="width: 200px" />
          </div>
          <div class="ci-picker">
            <button
              v-for="p in ciSearchResult.slice(0, 30)"
              :key="p.id"
              class="ci-chip"
              :class="{ 'is-on': p.id === ciPaiId }"
              :title="`${p.totalChars}字 · ${p.category} · ${p.rhymeType}`"
              @click="ciPaiId = p.id"
            >
              {{ p.name }}
            </button>
            <span v-if="ciSearchResult.length > 30" class="ci-more">… 共 {{ ciSearchResult.length }} 个</span>
          </div>

          <div class="ci-info">
            <strong>{{ ciRef.name }}</strong>
            <span class="ci-meta">{{ ciRef.totalChars }} 字 · {{ ciRef.category }} · {{ ciRef.rhymeType }}</span>
            <p v-if="ciRef.note" class="ci-note">{{ ciRef.note }}</p>
            <p class="ci-example">例 · {{ ciRef.exampleAuthor }}：{{ ciRef.example }}</p>
          </div>

          <textarea v-model="ciText" class="poem-input wz-input" rows="6" placeholder="按谱逐句填写，每句一行。选词牌后会自动铺好空行。" />

          <div class="legend">
            <span class="lg t-ping">平</span>
            <span class="lg t-ze">仄</span>
            <span class="lg t-unknown">? 未收录</span>
            <span class="lg is-bad">✕ 不合谱</span>
            <span class="lg ci-rhyme">韵脚句</span>
          </div>

          <div v-for="(sec, si) in ciAnalysis.sections" :key="si" class="ci-sec">
            <div class="ci-sec-name">{{ sec.name }}</div>
            <div v-for="(line, li) in sec.lines" :key="li" class="line">
              <div class="line-no">{{ li + 1 }}</div>
              <div class="chars">
                <span v-for="(c, ci) in line.cells" :key="ci" :class="ciCellClass(c)" :title="c.expect ? '应' + (c.expect === 'p' ? '平' : c.expect === 'z' ? '仄' : '可平可仄') : ''">
                  {{ c.ch }}
                </span>
              </div>
              <div class="line-meta">
                <span v-if="line.isRhyme" class="rhyme-tag">韵 {{ line.punct }}</span>
                <span v-if="line.note" class="ln-note">{{ line.note }}</span>
              </div>
            </div>
          </div>

          <div v-if="ciAnalysis.notes.length" class="notes">
            <p v-for="(n, i) in ciAnalysis.notes" :key="i">{{ n }}</p>
          </div>

          <div class="rhyme-box">
            <strong>合计：</strong>已写 {{ ciAnalysis.totalGot }} 字 / 词谱 {{ ciAnalysis.totalExpected }} 字
          </div>
        </template>

        <!-- ── 乐府 / 曲 ── -->
        <template v-if="tab === 'classical' || tab === 'wenyan'">
          <div class="row">
            <span class="row-label">体裁</span>
            <select v-model="classicalGenre" class="wz-input sel" @change="onClassicalGenreChange">
              <option v-for="g in CLASSICAL_GENRES.filter((x) => (tab === 'wenyan' ? x.genre === '文言文' || x.genre === '赋' : x.genre !== '文言文' && x.genre !== '赋'))" :key="g.id" :value="g.genre">
                {{ g.label }}
              </option>
            </select>
            <span class="row-label">体例</span>
            <select v-model="classicalId" class="wz-input sel" style="width: 180px">
              <option v-for="f in classicalList" :key="f.id" :value="f.id">{{ f.name }}</option>
            </select>
          </div>

          <div v-if="classicalForm" class="cf-card">
            <div class="cf-name">{{ classicalForm.name }} <span class="cf-genre">{{ classicalForm.genre }}</span></div>
            <div class="cf-block">
              <div class="cf-label">结构</div>
              <p>{{ classicalForm.structure }}</p>
            </div>
            <div class="cf-block">
              <div class="cf-label">韵律</div>
              <p>{{ classicalForm.rhyme }}</p>
            </div>
            <div class="cf-block">
              <div class="cf-label">要点</div>
              <ul class="cf-tips">
                <li v-for="(t, i) in classicalForm.tips" :key="i">{{ t }}</li>
              </ul>
            </div>
            <div class="cf-block">
              <div class="cf-label">范例</div>
              <p class="cf-example">例 · {{ classicalForm.exampleAuthor }}：{{ classicalForm.example }}</p>
            </div>
          </div>
        </template>
      </div>

      <div class="wz-modal__actions">
        <button v-if="tab === 'ci' && ciPai" class="wz-btn wz-btn--ghost" @click="insertToEditor(ciText)">填入正文</button>
        <button v-if="tab === 'poem' && poemText.trim()" class="wz-btn wz-btn--ghost" @click="insertToEditor(poemText)">填入正文</button>
        <button class="wz-btn wz-btn--primary" @click="close">完成</button>
      </div>
    </div>
  </div>
</template>

<style scoped>
.hint {
  font-size: 12px;
  color: var(--c-text-tertiary);
  margin: 0 0 12px;
  line-height: 1.6;
}
.row {
  display: flex;
  align-items: center;
  gap: var(--space-3);
  margin-bottom: 10px;
  flex-wrap: wrap;
}
.row-label {
  font-size: 13px;
  color: var(--c-text-secondary);
  white-space: nowrap;
}
.sel {
  width: auto;
  flex: none;
}
.poem-input {
  width: 100%;
  font-family: var(--font-serif);
  font-size: 15px;
  line-height: 1.9;
  resize: vertical;
  margin-bottom: 10px;
}
.legend {
  display: flex;
  gap: 12px;
  font-size: 12px;
  margin-bottom: 12px;
  color: var(--c-text-secondary);
  flex-wrap: wrap;
}
.lg {
  padding: 1px 8px;
  border-radius: var(--radius-sm);
}
.t-ping {
  color: var(--c-accent);
  font-weight: 600;
}
.t-ze {
  color: #8a8f99;
}
.t-unknown {
  color: #b08a3a;
}
.is-bad {
  text-decoration: underline wavy var(--c-error, #ff5a5a);
  text-underline-offset: 3px;
}
.ci-rhyme {
  background: var(--c-accent-soft);
  color: var(--c-accent);
}
.result {
  display: flex;
  flex-direction: column;
  gap: 8px;
  margin-bottom: 12px;
}
.line {
  display: flex;
  align-items: center;
  gap: 10px;
  flex-wrap: wrap;
}
.line-no {
  width: 20px;
  height: 20px;
  flex: none;
  display: grid;
  place-items: center;
  font-size: 11px;
  color: var(--c-text-tertiary);
  border: 1px solid var(--c-border);
  border-radius: 50%;
}
.chars {
  display: flex;
  gap: 2px;
  flex-wrap: wrap;
}
.chars > span {
  font-family: var(--font-serif);
  font-size: 18px;
  line-height: 1.4;
  padding: 0 1px;
  cursor: default;
}
.line-meta {
  display: flex;
  align-items: center;
  gap: 8px;
  font-size: 12px;
  color: var(--c-text-tertiary);
  flex-wrap: wrap;
}
.pat {
  font-family: var(--font-mono);
  letter-spacing: 1px;
}
.rhyme-tag {
  background: var(--c-accent-soft);
  color: var(--c-accent);
  border-radius: var(--radius-full);
  padding: 0 6px;
  font-size: 11px;
}
.ln-note {
  color: var(--c-warn, #e0a83a);
}
.notes {
  background: var(--c-surface-elevated);
  border: 1px solid var(--c-border);
  border-radius: var(--radius-md);
  padding: 10px 12px;
  margin: 0 0 10px;
}
.notes p {
  margin: 2px 0;
  font-size: 13px;
  color: var(--c-text-secondary);
}
.rhyme-box {
  font-size: 13px;
  color: var(--c-text-secondary);
  background: var(--c-surface-elevated);
  border: 1px solid var(--c-border);
  border-radius: var(--radius-md);
  padding: 10px 12px;
}
.rhyme-box.ok {
  border-color: var(--c-accent);
  color: var(--c-accent);
}
.critique {
  margin-top: 12px;
  border: 1px solid var(--c-border-strong);
  border-radius: var(--radius-md);
  padding: 12px;
}
.critique-head {
  font-size: 12px;
  font-weight: 600;
  color: var(--c-accent);
  margin-bottom: 6px;
}
.critique-text {
  margin: 0;
  font-size: 13px;
  line-height: 1.7;
  color: var(--c-text-base);
  white-space: pre-wrap;
}
.error {
  color: var(--c-error, #ff5a5a);
  font-size: 12px;
  margin: 8px 0 0;
}
.msg {
  margin-right: auto;
  font-size: 12px;
  color: var(--c-text-tertiary);
}
.wz-modal--wide {
  width: min(680px, 94vw);
}
.tabs {
  display: flex;
  gap: 6px;
  margin-bottom: 14px;
  flex-wrap: wrap;
}
.tab {
  padding: 6px 14px;
  border-radius: var(--radius-full);
  border: 1px solid var(--c-border);
  background: var(--c-bg-raised);
  color: var(--c-text-secondary);
  font-size: 13px;
  cursor: pointer;
  transition:
    border-color var(--dur-fast) var(--ease-out),
    color var(--dur-fast) var(--ease-out),
    background var(--dur-fast) var(--ease-out);
}
.tab:hover {
  border-color: var(--c-border-strong);
  color: var(--c-text-base);
}
.tab.is-on {
  border-color: var(--c-accent);
  color: var(--c-accent);
  background: var(--c-accent-soft, rgba(128, 128, 128, 0.12));
  font-weight: 600;
}
.tab--ai {
  margin-left: auto;
}
.ai-drawer {
  border: 1px solid var(--c-border-strong);
  border-radius: var(--radius-md);
  padding: 12px;
  margin-bottom: 14px;
  background: var(--c-surface-elevated);
}
.ai-result {
  margin-top: 12px;
}
.ai-result-text {
  white-space: pre-wrap;
  font-family: var(--font-serif);
  font-size: 14px;
  line-height: 1.9;
  color: var(--c-text-base);
  background: var(--c-bg-sunken);
  border-radius: var(--radius-sm);
  padding: 10px 12px;
  max-height: 260px;
  overflow-y: auto;
  margin: 0 0 8px;
}
.ai-result-actions {
  display: flex;
  justify-content: flex-end;
}
.ci-picker {
  display: flex;
  flex-wrap: wrap;
  gap: 6px;
  margin-bottom: 12px;
}
.ci-chip {
  padding: 3px 10px;
  border-radius: var(--radius-full);
  border: 1px solid var(--c-border);
  background: var(--c-bg-raised);
  color: var(--c-text-secondary);
  font-size: 12px;
  cursor: pointer;
  transition: all var(--dur-fast) var(--ease-out);
}
.ci-chip:hover {
  border-color: var(--c-accent);
  color: var(--c-accent);
}
.ci-chip.is-on {
  border-color: var(--c-accent);
  color: var(--c-accent);
  background: var(--c-accent-soft, rgba(128, 128, 128, 0.12));
  font-weight: 600;
}
.ci-more {
  font-size: 12px;
  color: var(--c-text-tertiary);
  align-self: center;
}
.ci-info {
  background: var(--c-surface-elevated);
  border: 1px solid var(--c-border);
  border-radius: var(--radius-md);
  padding: 10px 12px;
  margin-bottom: 10px;
  font-size: 13px;
}
.ci-meta {
  color: var(--c-text-tertiary);
  margin-left: 8px;
  font-size: 12px;
}
.ci-note {
  margin: 6px 0 0;
  color: var(--c-text-secondary);
  font-size: 12px;
  line-height: 1.6;
}
.ci-example {
  margin: 6px 0 0;
  color: var(--c-accent);
  font-size: 12px;
  line-height: 1.6;
}
.ci-sec {
  margin-bottom: 14px;
}
.ci-sec-name {
  font-size: 12px;
  color: var(--c-text-tertiary);
  margin-bottom: 6px;
  letter-spacing: 0.08em;
}
.cf-card {
  display: flex;
  flex-direction: column;
  gap: 10px;
}
.cf-name {
  font-size: 17px;
  font-weight: 700;
  color: var(--c-text-base);
  font-family: var(--font-serif);
}
.cf-genre {
  font-size: 11px;
  color: var(--c-accent);
  border: 1px solid var(--c-accent);
  border-radius: var(--radius-full);
  padding: 1px 8px;
  margin-left: 8px;
  vertical-align: 2px;
  font-weight: 400;
}
.cf-block {
  border-left: 2px solid var(--c-accent-soft);
  padding-left: 12px;
}
.cf-label {
  font-size: 11px;
  color: var(--c-text-tertiary);
  letter-spacing: 0.08em;
  margin-bottom: 4px;
}
.cf-block p {
  margin: 0;
  font-size: 13px;
  line-height: 1.8;
  color: var(--c-text-secondary);
}
.cf-tips {
  margin: 0;
  padding-left: 16px;
  font-size: 13px;
  line-height: 1.8;
  color: var(--c-text-secondary);
}
.cf-example {
  color: var(--c-accent) !important;
}
.wz-modal__actions {
  display: flex;
  justify-content: flex-end;
  gap: var(--space-2);
  margin-top: 14px;
}
</style>
