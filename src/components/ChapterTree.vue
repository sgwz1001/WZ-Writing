<script setup lang="ts">
/**
 * 章节目录树 · 卷 → 章 两层
 *
 * 用户原话：「点进项目应该能看到章节列表，能展开，能拖，能一次导出。」
 * 这里把四件事一次做齐：
 *   1. 层级展开（卷可折叠，记住折叠状态）
 *   2. 每一行显示字数，卷显示合计
 *   3. 原生拖拽排序 —— 拖到行的上/下缘是同级插入，拖到卷正中是收进该卷
 *   4. 重命名 / 删除就地完成，不弹窗打断
 *
 * 术语（章/场/首/则…）由父级按身份传入，本组件不写死任何称呼。
 */
import { computed, ref } from 'vue'
import { useProjectStore, type DocTreeNode } from '../stores/project'

const props = defineProps<{
  /** 当前打开的章节 id */
  activeId: string | null
  /** 身份术语：章节层 / 分组层的叫法 */
  terms: { chapter: string; volume: string; newChapter: string }
}>()

const emit = defineEmits<{
  (e: 'open', id: string): void
  (e: 'create', payload: { kind: 'chapter' | 'folder'; parentId: string | null }): void
}>()

const store = useProjectStore()

/** 折叠起来的卷 id */
const collapsed = ref<Set<string>>(new Set())
function toggle(id: string) {
  const next = new Set(collapsed.value)
  next.has(id) ? next.delete(id) : next.add(id)
  collapsed.value = next
}

/** 就地重命名 */
const editingId = ref<string | null>(null)
const editingText = ref('')
function startRename(node: DocTreeNode) {
  editingId.value = node.id
  editingText.value = node.title
}
async function commitRename() {
  const id = editingId.value
  if (!id) return
  const text = editingText.value.trim()
  editingId.value = null
  if (text) await store.renameDoc(id, text)
}

async function removeNode(node: DocTreeNode) {
  const extra = node.children.length ? `（连同其下 ${node.children.length} ${props.terms.chapter}）` : ''
  if (!confirm(`删除「${node.title}」${extra}？此操作不可撤销。`)) return
  await store.deleteDoc(node.id)
}

// ── 拖拽排序 ────────────────────────────────────

const dragId = ref<string | null>(null)
/** 落点提示：目标行 id + 位置 */
const dropHint = ref<{ id: string; where: 'before' | 'after' | 'inside' } | null>(null)

function onDragStart(node: DocTreeNode, e: DragEvent) {
  if (editingId.value) return
  dragId.value = node.id
  e.dataTransfer?.setData('text/plain', node.id)
  if (e.dataTransfer) e.dataTransfer.effectAllowed = 'move'
}

function onDragOver(node: DocTreeNode, e: DragEvent) {
  if (!dragId.value || dragId.value === node.id) return
  e.preventDefault()
  const el = e.currentTarget as HTMLElement
  const r = el.getBoundingClientRect()
  const y = (e.clientY - r.top) / r.height
  // 卷的中间 40% 区域视为「放进这一卷」
  const canNest = node.kind === 'folder' && !isDescendant(node, dragId.value)
  const where = canNest && y > 0.3 && y < 0.7 ? 'inside' : y < 0.5 ? 'before' : 'after'
  dropHint.value = { id: node.id, where }
}

function onDragLeave(node: DocTreeNode) {
  if (dropHint.value?.id === node.id) dropHint.value = null
}

function isDescendant(node: DocTreeNode, id: string): boolean {
  return node.children.some((c) => c.id === id || isDescendant(c, id))
}

async function onDrop() {
  const src = dragId.value
  const hint = dropHint.value
  dragId.value = null
  dropHint.value = null
  if (!src || !hint || src === hint.id) return

  // 先摘出被拖的节点（连同它的子节点一起走）
  const tree = clone(store.docTree)
  const picked = detach(tree, src)
  if (!picked) return

  if (hint.where === 'inside') {
    const target = find(tree, hint.id)
    if (!target) return
    // 卷不能塞进卷 —— 只做两层
    if (picked.kind === 'folder') {
      insertSibling(tree, hint.id, picked, 'after')
    } else {
      target.children.push(picked)
      collapsed.value.delete(target.id)
    }
  } else {
    insertSibling(tree, hint.id, picked, hint.where)
  }

  const items = flatten(tree)
  if (!items.length) return
  const pid = store.currentProjectId
  if (pid) await store.reorderDocs(pid, items)
}

function clone(list: DocTreeNode[]): DocTreeNode[] {
  return list.map((n) => ({ ...n, children: clone(n.children) }))
}

function find(list: DocTreeNode[], id: string): DocTreeNode | null {
  for (const n of list) {
    if (n.id === id) return n
    const hit = find(n.children, id)
    if (hit) return hit
  }
  return null
}

function detach(list: DocTreeNode[], id: string): DocTreeNode | null {
  const i = list.findIndex((n) => n.id === id)
  if (i >= 0) return list.splice(i, 1)[0]
  for (const n of list) {
    const hit = detach(n.children, id)
    if (hit) return hit
  }
  return null
}

/** 把 node 插到 targetId 的前 / 后（同级） */
function insertSibling(list: DocTreeNode[], targetId: string, node: DocTreeNode, where: 'before' | 'after') {
  const i = list.findIndex((n) => n.id === targetId)
  if (i >= 0) {
    list.splice(where === 'before' ? i : i + 1, 0, node)
    return true
  }
  for (const n of list) {
    // 章拖到章旁边时可能落在某一卷内部
    if (insertSibling(n.children, targetId, node, where)) {
      if (node.kind === 'folder') {
        // 卷不允许嵌套，捞回顶层
        detach(n.children, node.id)
        list.push(node)
      }
      return true
    }
  }
  return false
}

/** 深度优先拍平成后端要的 [{id, parentId}] */
function flatten(list: DocTreeNode[], parentId: string | null = null): Array<{ id: string; parentId: string | null }> {
  const out: Array<{ id: string; parentId: string | null }> = []
  for (const n of list) {
    out.push({ id: n.id, parentId })
    out.push(...flatten(n.children, n.id))
  }
  return out
}

const isEmpty = computed(() => store.docTree.length === 0)
</script>

<template>
  <div class="tree">
    <div class="tree-head">
      <span class="tree-title">目录</span>
      <div class="tree-head-actions">
        <button class="wz-icon-btn" :title="`新建${terms.volume}`" @click="emit('create', { kind: 'folder', parentId: null })">
          ▤
        </button>
        <button class="wz-icon-btn" :title="terms.newChapter" @click="emit('create', { kind: 'chapter', parentId: null })">
          +
        </button>
      </div>
    </div>

    <p v-if="isEmpty" class="wz-empty">
      还没有{{ terms.chapter }}，点右上角 + {{ terms.newChapter }}。
    </p>

    <ul v-else class="tree-list" @dragend="dragId = null; dropHint = null">
      <template v-for="node in store.docTree" :key="node.id">
        <li
          class="row"
          :class="[
            `row--${node.kind}`,
            {
              'is-active': node.id === activeId,
              'is-dragging': node.id === dragId,
              'hint-before': dropHint?.id === node.id && dropHint.where === 'before',
              'hint-after': dropHint?.id === node.id && dropHint.where === 'after',
              'hint-inside': dropHint?.id === node.id && dropHint.where === 'inside',
            },
          ]"
          draggable="true"
          @dragstart="onDragStart(node, $event)"
          @dragover="onDragOver(node, $event)"
          @dragleave="onDragLeave(node)"
          @drop.prevent="onDrop"
          @click="node.kind === 'folder' ? toggle(node.id) : emit('open', node.id)"
          @dblclick.stop="startRename(node)"
        >
          <span v-if="node.kind === 'folder'" class="caret">{{ collapsed.has(node.id) ? '▸' : '▾' }}</span>
          <span v-else class="caret caret--leaf">·</span>

          <input
            v-if="editingId === node.id"
            v-model="editingText"
            class="rename-input"
            @click.stop
            @keyup.enter="commitRename"
            @keyup.esc="editingId = null"
            @blur="commitRename"
          />
          <span v-else class="row-title">{{ node.title }}</span>

          <span class="row-chars">{{ node.kind === 'folder' ? node.totalChars : node.charCount }}</span>
          <button class="row-del wz-icon-btn" title="删除" @click.stop="removeNode(node)">×</button>
        </li>

        <template v-if="node.kind === 'folder' && !collapsed.has(node.id)">
          <li
            v-for="child in node.children"
            :key="child.id"
            class="row row--child"
            :class="{
              'is-active': child.id === activeId,
              'is-dragging': child.id === dragId,
              'hint-before': dropHint?.id === child.id && dropHint.where === 'before',
              'hint-after': dropHint?.id === child.id && dropHint.where === 'after',
            }"
            draggable="true"
            @dragstart="onDragStart(child, $event)"
            @dragover="onDragOver(child, $event)"
            @dragleave="onDragLeave(child)"
            @drop.prevent="onDrop"
            @click="emit('open', child.id)"
            @dblclick.stop="startRename(child)"
          >
            <span class="caret caret--leaf">·</span>
            <input
              v-if="editingId === child.id"
              v-model="editingText"
              class="rename-input"
              @click.stop
              @keyup.enter="commitRename"
              @keyup.esc="editingId = null"
              @blur="commitRename"
            />
            <span v-else class="row-title">{{ child.title }}</span>
            <span class="row-chars">{{ child.charCount }}</span>
            <button class="row-del wz-icon-btn" title="删除" @click.stop="removeNode(child)">×</button>
          </li>

          <li class="row row--add" @click="emit('create', { kind: 'chapter', parentId: node.id })">
            <span class="caret caret--leaf">+</span>
            <span class="row-title">在此{{ terms.volume }}内新增</span>
          </li>
        </template>
      </template>
    </ul>

    <p class="tree-tip">双击改名 · 拖动排序 · 拖到{{ terms.volume }}中央可收入其中</p>
  </div>
</template>

<style scoped>
.tree {
  display: flex;
  flex-direction: column;
  min-height: 0;
  gap: var(--space-2);
}

.tree-head {
  display: flex;
  align-items: center;
  justify-content: space-between;
}

.tree-title {
  font-size: 12px;
  letter-spacing: 0.08em;
  color: var(--c-text-tertiary);
}

.tree-head-actions {
  display: flex;
  gap: 2px;
}

.tree-list {
  list-style: none;
  margin: 0;
  padding: 0;
  overflow-y: auto;
  min-height: 0;
}

.row {
  display: flex;
  align-items: center;
  gap: var(--space-2);
  padding: 5px var(--space-2);
  border-radius: var(--radius-sm);
  cursor: pointer;
  font-size: 13px;
  color: var(--c-text-secondary);
  border-top: 2px solid transparent;
  border-bottom: 2px solid transparent;
  transition: background var(--dur-fast) var(--ease-out), color var(--dur-fast) var(--ease-out);
}

.row:hover {
  background: var(--c-bg-hover, rgba(128, 128, 128, 0.08));
  color: var(--c-text-base);
}

.row.is-active {
  background: var(--c-accent-soft, rgba(128, 128, 128, 0.14));
  color: var(--c-accent);
  font-weight: 600;
}

.row--folder {
  font-weight: 600;
  color: var(--c-text-base);
}

.row--child {
  padding-left: calc(var(--space-2) + 16px);
}

.row--add {
  padding-left: calc(var(--space-2) + 16px);
  color: var(--c-text-tertiary);
  font-size: 12px;
}

.row.is-dragging {
  opacity: 0.4;
}

.row.hint-before {
  border-top-color: var(--c-accent);
}
.row.hint-after {
  border-bottom-color: var(--c-accent);
}
.row.hint-inside {
  background: var(--c-accent-soft, rgba(128, 128, 128, 0.2));
  box-shadow: inset 0 0 0 1px var(--c-accent);
}

.caret {
  width: 12px;
  flex-shrink: 0;
  text-align: center;
  font-size: 10px;
  color: var(--c-text-tertiary);
}
.caret--leaf {
  opacity: 0.5;
}

.row-title {
  flex: 1;
  min-width: 0;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.rename-input {
  flex: 1;
  min-width: 0;
  font: inherit;
  color: var(--c-text-base);
  background: var(--c-bg-base);
  border: 1px solid var(--c-accent);
  border-radius: var(--radius-sm);
  padding: 1px var(--space-2);
}
.rename-input:focus {
  outline: none;
}

.row-chars {
  font-size: 11px;
  color: var(--c-text-tertiary);
  flex-shrink: 0;
  font-variant-numeric: tabular-nums;
}

.row-del {
  opacity: 0;
  flex-shrink: 0;
}
.row:hover .row-del {
  opacity: 0.6;
}
.row-del:hover {
  opacity: 1;
}

.tree-tip {
  margin: 0;
  font-size: 11px;
  color: var(--c-text-tertiary);
  line-height: 1.5;
}
</style>
