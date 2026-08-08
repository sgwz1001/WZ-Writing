import { defineStore } from 'pinia'
import { ref } from 'vue'
import type { IdentityId } from '../data/wendao-lineage'

/**
 * 足迹 · Trace
 *
 * 用户要的「小火苗」：软件自己记住你最近常用哪个身份，在那张卡上点一簇火，
 * 点进去直接回到上次写到的那一章 —— 而不是每次都从头选一遍。
 *
 * 只记「在哪、写到哪、什么时候」，不记内容，全部落在本地。
 */

export interface TraceEntry {
  identity: IdentityId
  projectId: string
  projectName: string
  docId: string | null
  docTitle: string | null
  /** ISO 时间 */
  at: string
  /** 累计进入次数，用来判断「常用」 */
  count: number
}

const KEY = 'wenzai:trace'

function load(): Record<string, TraceEntry> {
  try {
    return JSON.parse(localStorage.getItem(KEY) || '{}')
  } catch {
    return {}
  }
}

export const useTraceStore = defineStore('trace', () => {
  const entries = ref<Record<string, TraceEntry>>(load())

  function persist() {
    localStorage.setItem(KEY, JSON.stringify(entries.value))
  }

  /** 进入某项目 / 打开某章节时调用 */
  function mark(
    identity: IdentityId,
    projectId: string,
    projectName: string,
    docId: string | null = null,
    docTitle: string | null = null,
  ) {
    const prev = entries.value[identity]
    entries.value = {
      ...entries.value,
      [identity]: {
        identity,
        projectId,
        projectName,
        docId: docId ?? prev?.docId ?? null,
        docTitle: docTitle ?? prev?.docTitle ?? null,
        at: new Date().toISOString(),
        count: (prev?.count || 0) + 1,
      },
    }
    persist()
  }

  function get(identity: IdentityId): TraceEntry | null {
    return entries.value[identity] || null
  }

  /** 项目被删掉后清掉对应足迹，免得点了火苗跳到空处 */
  function forgetProject(projectId: string) {
    const next: Record<string, TraceEntry> = {}
    for (const [k, v] of Object.entries(entries.value)) {
      if (v.projectId !== projectId) next[k] = v
    }
    entries.value = next
    persist()
  }

  /**
   * 「热」身份：近 14 天内写过，按「最近 + 频次」排序。
   * 只给前两名点火 —— 满屏都是火苗就等于没有火苗。
   */
  function hot(limit = 2): IdentityId[] {
    const now = Date.now()
    const span = 14 * 24 * 3600 * 1000
    return Object.values(entries.value)
      .filter((e) => now - new Date(e.at).getTime() < span)
      .sort((a, b) => {
        const recency = new Date(b.at).getTime() - new Date(a.at).getTime()
        // 一天之内的差距忽略不计，转而比频次
        if (Math.abs(recency) < 24 * 3600 * 1000) return b.count - a.count
        return recency
      })
      .slice(0, limit)
      .map((e) => e.identity)
  }

  return { entries, mark, get, forgetProject, hot }
})
