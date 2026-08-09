import { defineStore } from 'pinia'
import { ref } from 'vue'
import { invoke } from '@tauri-apps/api/core'
import type { IdentityId } from '../data/wendao-lineage'

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

export const useProjectStore = defineStore('project', () => {
  const projects = ref<Project[]>([])
  const currentProjectId = ref<string | null>(null)
  const docs = ref<DocNode[]>([])
  const loading = ref(false)

  async function loadProjects(includeArchived = false) {
    loading.value = true
    try {
      projects.value = await invoke('list_projects', { includeArchived })
    } finally {
      loading.value = false
    }
  }

  async function loadProjectsForIdentity(identityId: IdentityId, includeArchived = false) {
    loading.value = true
    try {
      const all = await invoke<Project[]>('list_projects', { includeArchived })
      projects.value = all.filter((p) => p.identity === identityId)
    } finally {
      loading.value = false
    }
    currentProjectId.value = null
    docs.value = []
  }

  async function createProject(name: string, identity: string, description = '', color = '#A0AEC0') {
    const p = await invoke<Project>('create_project', {
      name,
      identity,
      description,
      color,
    })
    projects.value.push(p)
    return p
  }

  async function loadDocs(projectId: string) {
    currentProjectId.value = projectId
    docs.value = await invoke('list_docs', { projectId })
  }

  async function createDoc(projectId: string, title: string, kind = 'chapter', parentId?: string) {
    const d = await invoke<DocNode>('create_doc', {
      projectId,
      parentId: parentId || null,
      title,
      kind,
    })
    docs.value.push(d)
    return d
  }

  function currentProject(): Project | null {
    return projects.value.find((p) => p.id === currentProjectId.value) || null
  }

  function $reset() {
    projects.value = []
    currentProjectId.value = null
    docs.value = []
    loading.value = false
  }

  return {
    projects,
    currentProjectId,
    docs,
    loading,
    loadProjects,
    loadProjectsForIdentity,
    createProject,
    loadDocs,
    createDoc,
    currentProject,
    $reset,
  }
})
