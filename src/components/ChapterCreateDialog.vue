<script setup lang="ts">
import { computed, ref, watch, nextTick } from 'vue'
import type { IdentityId } from '../data/wendao-lineage'
import { getHierarchy, type ChapterTerm, nextChapterLabel, composeChapterTitle } from '../data/chapterTerms'

const props = defineProps<{
  identityId: IdentityId
  existingCount: number
}>()

const emit = defineEmits<{
  (e: 'close'): void
  (e: 'create', title: string, term: ChapterTerm, customLabel: string): void
}>()

const hierarchy = computed(() => getHierarchy(props.identityId))
const levelIndex = ref(hierarchy.value.defaultLevelIndex)
const term = computed(() => hierarchy.value.levels[levelIndex.value])

const start = ref(term.value.start)
const prefix = ref(term.value.prefix)
const unit = ref(term.value.label)
const title = ref('')
const inputRef = ref<HTMLInputElement | null>(null)

const autoLabel = computed(() => nextChapterLabel({ ...term.value, start: start.value, prefix: prefix.value, label: unit.value }, props.existingCount))
const fullTitle = computed(() => composeChapterTitle(autoLabel.value, title.value))

watch(levelIndex, (idx) => {
  const t = hierarchy.value.levels[idx]
  start.value = t.start
  prefix.value = t.prefix
   unit.value = t.label
})

watch(() => props.identityId, (id) => {
  const h = getHierarchy(id)
  levelIndex.value = h.defaultLevelIndex
  const t = h.levels[h.defaultLevelIndex]
  start.value = t.start
  prefix.value = t.prefix
  unit.value = t.label
  title.value = ''
})

watch(() => props.existingCount, () => {
  // recompute label
})

watch(() => term.value, (t) => {
  start.value = t.start
  prefix.value = t.prefix
  unit.value = t.label
})

watch(
  () => title.value,
  async () => {
    await nextTick()
    inputRef.value?.focus()
  },
  { once: true },
)

function submit() {
  emit('create', fullTitle.value, term.value, autoLabel.value)
  title.value = ''
}
</script>

<template>
  <Teleport to="body">
    <div class="wz-overlay" @click.self="emit('close')" @keyup.esc="emit('close')">
      <div class="wz-modal chapter-modal">
        <div class="wz-modal__head">
          <h3>新建章节</h3>
          <button class="wz-icon-btn" title="关闭" @click="emit('close')">×</button>
        </div>
        <div class="wz-modal__body">
          <div class="field-row">
            <label class="field">
              <span>层级</span>
              <select v-model="levelIndex" class="wz-input">
                <option v-for="(t, i) in hierarchy.levels" :key="t.id" :value="i">{{ t.label }}</option>
              </select>
            </label>
            <label class="field">
              <span>前缀</span>
              <input v-model="prefix" class="wz-input" placeholder="第" />
            </label>
            <label class="field">
              <span>起始 N</span>
              <input v-model.number="start" type="number" min="0" class="wz-input" />
            </label>
            <label class="field">
              <span>单位</span>
              <input v-model="unit" class="wz-input" placeholder="章" />
            </label>
          </div>

          <label class="field">
            <span>标题</span>
            <input ref="inputRef" v-model="title" class="wz-input" placeholder="输入章节标题" @keyup.enter="submit" />
          </label>

          <div class="preview">
            <span class="preview-label">预览</span>
            <span class="preview-value">{{ fullTitle }}</span>
          </div>
        </div>
        <div class="wz-modal__actions">
          <button class="wz-btn wz-btn--ghost" @click="emit('close')">取消</button>
          <button class="wz-btn wz-btn--primary" @click="submit">创建</button>
        </div>
      </div>
    </div>
  </Teleport>
</template>

<style scoped>
.chapter-modal {
  width: 520px;
}

.field-row {
  display: grid;
  grid-template-columns: 1fr 80px 80px 80px;
  gap: var(--space-2);
  margin-bottom: var(--space-3);
}

.field {
  display: flex;
  flex-direction: column;
  gap: var(--space-1);
  margin-bottom: var(--space-3);
}

.field span {
  font-size: 12px;
  color: var(--c-text-secondary);
}

.preview {
  display: flex;
  gap: var(--space-3);
  align-items: center;
  padding: var(--space-3);
  border-radius: var(--radius-md);
  background: var(--c-bg-sunken);
}

.preview-label {
  font-size: 12px;
  color: var(--c-text-tertiary);
}

.preview-value {
  font-weight: 600;
  color: var(--c-text-base);
}
</style>
