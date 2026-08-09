/**
 * 身份会话层 · Identity Session
 *
 * 负责身份切换时的状态隔离：
 *   1. 保存当前身份
 *   2. 切换身份前做 panicSave
 *   3. 清空 editor / project / correction 的当前状态
 *   4. 加载该身份下的项目列表
 *   5. 应用该身份的默认皮肤与布局
 *
 * 规则：切换身份后，上一个身份的项目、章节、纠错记录、面板状态必须完全不可见。
 */

import { defineStore } from 'pinia'
import { computed, ref } from 'vue'
import type { IdentityId } from '../data/wendao-lineage'
import { getIdentity } from '../data/wendao-lineage'
import { getLayoutProfile } from '../data/layoutProfiles'
import { useAppearanceStore } from './appearance'
import { useCorrectionStore } from './correction'
import { useEditorStore } from './editor'
import { useProjectStore } from './project'

const STORAGE_KEY = 'wenzai:last-identity'

export const useIdentitySessionStore = defineStore('identitySession', () => {
  const appearance = useAppearanceStore()
  const projectStore = useProjectStore()
  const editorStore = useEditorStore()
  const correctionStore = useCorrectionStore()

  const identityId = ref<IdentityId>(
    (localStorage.getItem(STORAGE_KEY) as IdentityId) || 'general',
  )

  const identity = computed(() => getIdentity(identityId.value))
  const layout = computed(() => getLayoutProfile(identityId.value))

  /** 设置当前身份（不触发加载，仅用于初始化） */
  function setIdentityId(id: IdentityId) {
    identityId.value = id
    localStorage.setItem(STORAGE_KEY, id)
  }

  /** 切换身份：保存、清空、加载、应用皮肤 */
  async function switchIdentity(id: IdentityId) {
    if (identityId.value === id) return

    // 1. 紧急保存当前文档
    await editorStore.panicSave()

    // 2. 清空状态
    editorStore.$reset?.()
    editorStore.open('', '', '未命名')
    projectStore.$reset?.()
    correctionStore.$reset?.()
    correctionStore.clearIgnore()

    // 3. 设置身份
    setIdentityId(id)

    // 4. 应用默认皮肤与布局
    const profile = getLayoutProfile(id)
    appearance.setSkin(profile.preferredSkin)

    // 5. 加载该身份下的项目
    await projectStore.loadProjectsForIdentity(id)
  }

  /** 初始化：恢复上一次身份并加载项目 */
  async function init() {
    const saved = localStorage.getItem(STORAGE_KEY) as IdentityId | null
    const id = saved && getIdentity(saved).id === saved ? saved : 'general'
    setIdentityId(id)

    const profile = getLayoutProfile(id)
    appearance.setSkin(profile.preferredSkin)
    await projectStore.loadProjectsForIdentity(id)
  }

  return {
    identityId,
    identity,
    layout,
    setIdentityId,
    switchIdentity,
    init,
  }
})
