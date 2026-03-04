import type { AppState } from './types'

const KEY = 'my-word:pwa:v3'

export const defaultState: AppState = {
  folders: [{ id: 'ALL', name: 'ALL', createdAt: Date.now() }],
  words: [],
  settings: { sortMode: 'CREATED', wordMaxLen: 20, folderMaxLen: 20 },
}

export function loadState(): AppState {
  try {
    const raw = localStorage.getItem(KEY)
    if (!raw) return defaultState
    const parsed = JSON.parse(raw) as Partial<AppState>
    const folders = Array.isArray(parsed.folders) ? parsed.folders : defaultState.folders
    const words = Array.isArray(parsed.words) ? parsed.words : defaultState.words
    const settings = { ...defaultState.settings, ...(parsed.settings ?? {}) }
    const hasAll = folders.some(f => f.id === 'ALL')
    return {
      folders: hasAll ? folders : [defaultState.folders[0], ...folders],
      words,
      settings,
    }
  } catch {
    return defaultState
  }
}

export function saveState(state: AppState) {
  localStorage.setItem(KEY, JSON.stringify(state))
}

export function exportBackup(state: AppState) {
  return JSON.stringify({ version: 3, exportedAt: new Date().toISOString(), state }, null, 2)
}

export function importBackup(raw: string): AppState {
  const parsed = JSON.parse(raw) as any
  if (!parsed?.state) throw new Error('백업 파일 형식이 올바르지 않습니다.')
  const state = parsed.state as AppState
  if (!Array.isArray(state.folders) || !Array.isArray(state.words) || !state.settings) {
    throw new Error('백업 파일 형식이 올바르지 않습니다.')
  }
  const hasAll = state.folders.some(f => f.id === 'ALL')
  if (!hasAll) state.folders.unshift({ id: 'ALL', name: 'ALL', createdAt: Date.now() })
  return state
}
