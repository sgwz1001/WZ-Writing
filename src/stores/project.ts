import { defineStore } from 'pinia'
import { computed, ref } from 'vue'
import { invoke } from '@tauri-apps/api/core'

export interface Project {
  id: string
  name: string
  identity: string
  description: string
  color: string
  createdAt: string
  updatedAt: string
  sortOrder: number
  archived: boolean
  docCount: number
  charCount: number
}

export interface DocNode {
  id: string
  projectId: string
  parentId: string | null
  title: string
  kind: 'chapter' | 'folder' | 'note' | string
  sortOrder: number
  charCount: number
  status: string
  createdAt: string
  updatedAt: string
}

/** 目录树节点：卷（folder）下挂章（chapter） */
export interface DocTreeNode extends DocNode {
  children: DocTreeNode[]
  /** 含子节点的合计字数 */
  totalChars: number
}

export interface ExportChapter {
  id: string
  title: string
  content: string
}

export const useProjectStore = defineStore('project', () => {
  const projects = ref<Project[]>([])
  const currentProjectId = ref<string | null>(null)
  const docs = ref<DocNode[]>([])
  const loading = ref(false)

  // ── 读取 ────────────────────────────────────

  async function loadProjects(includeArchived = false) {
    loading.value = true
    try {
      projects.value = await invoke('list_projects', { includeArchived })
    } finally {
      loading.value = false
    }
  }

  /**
   * 按身份取项目 —— 身份隔离的唯一入口。
   * 传 null / 'all' 表示不过滤（首页总览用）。
   */
  function byIdentity(identity: string | null): Project[] {
    if (!identity || identity === 'all') return projects.value
    return projects.value.filter((p) => p.identity === identity)
  }

  /** 最近更新的项目，首页「继续写」用 */
  function recent(limit = 6, identity: string | null = null): Project[] {
    return [...byIdentity(identity)]
      .sort((a, b) => (b.updatedAt || '').localeCompare(a.updatedAt || ''))
      .slice(0, limit)
  }

  /** 各身份的项目数量，身份页小火苗与首页筛选计数用 */
  const countByIdentity = computed<Record<string, number>>(() => {
    const map: Record<string, number> = {}
    for (const p of projects.value) map[p.identity] = (map[p.identity] || 0) + 1
    return map
  })

  async function loadDocs(projectId: string) {
    currentProjectId.value = projectId
    docs.value = await invoke('list_docs', { projectId })
  }

  /** 把扁平章节列表组装成「卷 → 章」两层树，并算出各卷合计字数 */
  const docTree = computed<DocTreeNode[]>(() => {
    const nodes = new Map<string, DocTreeNode>()
    for (const d of docs.value) nodes.set(d.id, { ...d, children: [], totalChars: d.charCount || 0 })

    const roots: DocTreeNode[] = []
    for (const n of nodes.values()) {
      const parent = n.parentId ? nodes.get(n.parentId) : null
      if (parent) parent.children.push(n)
      else roots.push(n)
    }

    const bySort = (a: DocTreeNode, b: DocTreeNode) => a.sortOrder - b.sortOrder
    roots.sort(bySort)
    for (const r of roots) {
      r.children.sort(bySort)
      r.totalChars = (r.charCount || 0) + r.children.reduce((s, c) => s + (c.charCount || 0), 0)
    }
    return roots
  })

  /** 当前项目全部章节（不含卷），按树的先后顺序拍平 —— 上一章 / 下一章导航用 */
  const flatChapters = computed<DocTreeNode[]>(() => {
    const out: DocTreeNode[] = []
    const walk = (list: DocTreeNode[]) => {
      for (const n of list) {
        if (n.kind !== 'folder') out.push(n)
        if (n.children.length) walk(n.children)
      }
    }
    walk(docTree.value)
    return out
  })

  const currentCharCount = computed(() => docs.value.reduce((s, d) => s + (d.charCount || 0), 0))

  // ── 项目写入 ──────────────────────────────────

  async function createProject(name: string, identity: string, description = '', color = '#A0AEC0') {
    const p = await invoke<Project>('create_project', { name, identity, description, color })
    projects.value.push(p)
    return p
  }

  async function renameProject(id: string, name: string) {
    await invoke('rename_project', { id, name })
    const p = projects.value.find((x) => x.id === id)
    if (p) p.name = name
  }

  async function deleteProject(id: string) {
    await invoke('delete_project', { id })
    projects.value = projects.value.filter((p) => p.id !== id)
    if (currentProjectId.value === id) {
      currentProjectId.value = null
      docs.value = []
    }
  }

  async function reorderProjects(orderedIds: string[]) {
    await invoke('reorder_projects', { orderedIds })
    const idx = new Map(orderedIds.map((id, i) => [id, i]))
    projects.value.sort((a, b) => (idx.get(a.id) ?? 0) - (idx.get(b.id) ?? 0))
  }

  // ── 章节写入 ──────────────────────────────────

  async function createDoc(projectId: string, title: string, kind = 'chapter', parentId?: string | null) {
    const d = await invoke<DocNode>('create_doc', {
      projectId,
      parentId: parentId || null,
      title,
      kind,
    })
    docs.value.push(d)
    bumpProjectStat(projectId, 1)
    return d
  }

  async function renameDoc(docId: string, title: string) {
    await invoke('rename_doc', { docId, title })
    const d = docs.value.find((x) => x.id === docId)
    if (d) d.title = title
  }

  async function deleteDoc(docId: string) {
    await invoke('delete_doc', { docId })
    const gone = docs.value.filter((d) => d.id === docId || d.parentId === docId)
    const ids = new Set(gone.map((d) => d.id))
    docs.value = docs.value.filter((d) => !ids.has(d.id))
    if (currentProjectId.value) bumpProjectStat(currentProjectId.value, -gone.length)
  }

  /**
   * 拖拽排序：前端传「拖完之后的完整顺序」，后端一次事务写完。
   * items 顺序即最终 sortOrder。
   */
  async function reorderDocs(projectId: string, items: Array<{ id: string; parentId: string | null }>) {
    await invoke('reorder_docs', { projectId, items })
    const idx = new Map(items.map((it, i) => [it.id, i]))
    for (const d of docs.value) {
      const i = idx.get(d.id)
      if (i !== undefined) {
        d.sortOrder = i
        d.parentId = items[i].parentId
      }
    }
  }

  /** 整本正文，批量导出用 */
  async function readProjectContents(projectId: string): Promise<ExportChapter[]> {
    return await invoke('read_project_contents', { projectId })
  }

  function bumpProjectStat(projectId: string, deltaDocs: number) {
    const p = projects.value.find((x) => x.id === projectId)
    if (p) {
      p.docCount = Math.max(0, (p.docCount || 0) + deltaDocs)
      p.updatedAt = new Date().toISOString()
    }
  }

  function currentProject(): Project | null {
    return projects.value.find((p) => p.id === currentProjectId.value) || null
  }

  return {
    projects,
    currentProjectId,
    docs,
    loading,
    docTree,
    flatChapters,
    currentCharCount,
    countByIdentity,
    loadProjects,
    byIdentity,
    recent,
    createProject,
    renameProject,
    deleteProject,
    reorderProjects,
    loadDocs,
    createDoc,
    renameDoc,
    deleteDoc,
    reorderDocs,
    readProjectContents,
    currentProject,
  }
})
