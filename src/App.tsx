import React, { useEffect, useMemo, useRef, useState } from 'react'
import BottomSheet from './components/BottomSheet'
import type { AppState, Folder, SortMode, WordItem, ColorKey } from './types'
import { COLOR_HEX, COLOR_KEYS, COLOR_LABEL } from './colors'
import { clampLen, localeCmp, normalizeText, uid } from './utils'
import { defaultState, exportBackup, importBackup, loadState, saveState } from './storage'

type Mode = 'NORMAL' | 'SELECT'

const SORT_LABEL: Record<SortMode, string> = {
  CREATED: '등록순',
  ASC: '오름차순',
  DESC: '내림차순',
}

function sortWords(words: WordItem[], mode: SortMode) {
  const copy = [...words]
  if (mode === 'CREATED') return copy.sort((a, b) => b.createdAt - a.createdAt)
  if (mode === 'ASC') return copy.sort((a, b) => localeCmp(a.text, b.text))
  return copy.sort((a, b) => localeCmp(b.text, a.text))
}

export default function App() {
  const [state, setState] = useState<AppState>(defaultState)

  const [activeFolderId, setActiveFolderId] = useState('ALL')
  const [mode, setMode] = useState<Mode>('NORMAL')
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set())

  // sheets
  const [folderOpen, setFolderOpen] = useState(false)
  const [sortOpen, setSortOpen] = useState(false)
  const [searchOpen, setSearchOpen] = useState(false)
  const [wordOpen, setWordOpen] = useState(false)
  const [moreOpen, setMoreOpen] = useState(false)
  const [confirmDeleteOpen, setConfirmDeleteOpen] = useState(false)

  // folder add sheet
  const [addFolderOpen, setAddFolderOpen] = useState(false)
  const [draftFolderName, setDraftFolderName] = useState('')

  // word sheet
  const [editingId, setEditingId] = useState<string | null>(null)
  const [draftText, setDraftText] = useState('')
  const [draftColor, setDraftColor] = useState<ColorKey>('GRAY')
  const [draftFolderId, setDraftFolderId] = useState('ALL')

  // search
  const [q, setQ] = useState('')
  const [hitIdx, setHitIdx] = useState(0)

  // backup import
  const fileInputRef = useRef<HTMLInputElement | null>(null)

  // long press
  const pressTimerRef = useRef<number | null>(null)

  useEffect(() => {
    const loaded = loadState()
    setState(loaded)
  }, [])

  useEffect(() => {
    if (!state.folders.length) return
    saveState(state)
  }, [state])

  const activeFolderName = useMemo(() => state.folders.find(f => f.id === activeFolderId)?.name ?? 'ALL', [state.folders, activeFolderId])

  const filteredWords = useMemo(() => {
    const base = activeFolderId === 'ALL' ? state.words : state.words.filter(w => w.folderId === activeFolderId)
    return sortWords(base, state.settings.sortMode)
  }, [state.words, state.settings.sortMode, activeFolderId])

  const wordCountLabel = useMemo(() => `${filteredWords.length} words`, [filteredWords.length])

  const searchResults = useMemo(() => {
    const text = normalizeText(q)
    if (!text) return []
    const lowered = text.toLowerCase()
    return filteredWords
      .map((w, idx) => ({ w, idx }))
      .filter(({ w }) => w.text.toLowerCase().includes(lowered))
  }, [q, filteredWords])

  useEffect(() => setHitIdx(0), [q])

  const highlightedId = useMemo(() => {
    if (!searchResults.length) return null
    const i = Math.max(0, Math.min(hitIdx, searchResults.length - 1))
    return searchResults[i]?.w.id ?? null
  }, [searchResults, hitIdx])

  function openAddWord() {
    setEditingId(null)
    setDraftText('')
    setDraftColor('GRAY')
    setDraftFolderId(activeFolderId || 'ALL')
    setWordOpen(true)
    setMode('NORMAL')
    setSelectedIds(new Set())
  }

  function openEditWord(w: WordItem) {
    setEditingId(w.id)
    setDraftText(w.text)
    setDraftColor(w.color)
    setDraftFolderId(w.folderId)
    setWordOpen(true)
  }

  function saveWord() {
    const maxLen = state.settings.wordMaxLen
    const text = clampLen(draftText, maxLen)
    if (!text) return alert('단어를 입력해 주세요.')
    const folderId = draftFolderId || 'ALL'
    const now = Date.now()

    setState(prev => {
      if (editingId) {
        return {
          ...prev,
          words: prev.words.map(w => w.id === editingId ? { ...w, text, folderId, color: draftColor, updatedAt: now } : w),
        }
      }
      const item: WordItem = { id: uid('w'), text, folderId, color: draftColor, createdAt: now, updatedAt: now }
      return { ...prev, words: [...prev.words, item] }
    })
    setWordOpen(false)
  }

  function toggleSelect(id: string) {
    setSelectedIds(prev => {
      const n = new Set(prev)
      if (n.has(id)) n.delete(id)
      else n.add(id)
      return n
    })
  }

  function enterSelectMode(firstId: string) {
    setMode('SELECT')
    setSelectedIds(new Set([firstId]))
  }

  function exitSelectMode() {
    setMode('NORMAL')
    setSelectedIds(new Set())
  }

  function requestDeleteSelected() {
    if (selectedIds.size === 0) return
    setConfirmDeleteOpen(true)
  }

  function deleteSelected() {
    setState(prev => ({ ...prev, words: prev.words.filter(w => !selectedIds.has(w.id)) }))
    setConfirmDeleteOpen(false)
    exitSelectMode()
  }

  function moveSelected(folderId: string) {
    if (selectedIds.size === 0) return
    setState(prev => ({
      ...prev,
      words: prev.words.map(w => selectedIds.has(w.id) ? { ...w, folderId, updatedAt: Date.now() } : w),
    }))
    exitSelectMode()
  }

  function addFolder() {
    const name = clampLen(draftFolderName, state.settings.folderMaxLen)
    if (!name) return alert('폴더 이름을 입력해 주세요.')
    if (name.toLowerCase() === 'all') return alert('ALL은 사용할 수 없습니다.')
    const exists = state.folders.some(f => f.name.trim().toLowerCase() === name.trim().toLowerCase())
    if (exists) return alert('이미 존재하는 폴더 이름입니다.')

    const folder: Folder = { id: uid('f'), name, createdAt: Date.now() }
    setState(prev => ({ ...prev, folders: [...prev.folders, folder] }))
    setDraftFolderName('')
    setAddFolderOpen(false)
  }

  function exportToFile() {
    const json = exportBackup(state)
    const blob = new Blob([json], { type: 'application/json' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `myword_backup_${new Date().toISOString().slice(0, 10)}.json`
    a.click()
    URL.revokeObjectURL(url)
  }

  function importFromFile(file: File) {
    const reader = new FileReader()
    reader.onload = () => {
      try {
        const st = importBackup(String(reader.result ?? ''))
        setState(st)
        setMoreOpen(false)
        alert('가져오기가 완료되었습니다.')
      } catch (e: any) {
        alert(e?.message ?? '가져오기에 실패했습니다.')
      }
    }
    reader.readAsText(file, 'utf-8')
  }

  function clearPressTimer() {
    if (pressTimerRef.current) {
      window.clearTimeout(pressTimerRef.current)
      pressTimerRef.current = null
    }
  }

  function onPressStart(w: WordItem) {
    clearPressTimer()
    pressTimerRef.current = window.setTimeout(() => {
      enterSelectMode(w.id)
      pressTimerRef.current = null
    }, 700)
  }

  return (
    <>
      <div className="app">
        <div className="top">
          <div className="titleRow">
            <div className="title">MY WORD</div>
          </div>

          <div className="row">
            <button className="folderBtn" onClick={() => setFolderOpen(true)} aria-label="폴더 선택">
              {activeFolderName} <span className="chev">▼</span>
            </button>
            <div className="count">{wordCountLabel}</div>
          </div>
        </div>

        <div className="card">
          {filteredWords.length === 0 ? (
            <div className="empty">아직 단어가 없습니다. 아래 + 버튼으로 추가해 주세요.</div>
          ) : (
            <div className="chips">
              {filteredWords.map(w => {
                const isSel = selectedIds.has(w.id)
                const isHit = highlightedId === w.id
                return (
                  <button
                    key={w.id}
                    className={'chip' + (isSel ? ' selected' : '')}
                    style={{
                      background: COLOR_HEX[w.color],
                      outline: isHit ? '2px solid rgba(0,0,0,.35)' : undefined,
                      outlineOffset: isHit ? '2px' : undefined,
                    }}
                    onClick={() => {
                      if (mode === 'SELECT') toggleSelect(w.id)
                      else openEditWord(w)
                    }}
                    onPointerDown={() => onPressStart(w)}
                    onPointerUp={clearPressTimer}
                    onPointerCancel={clearPressTimer}
                    onPointerLeave={clearPressTimer}
                    onContextMenu={(e) => { e.preventDefault(); enterSelectMode(w.id) }}
                    title="터치: 수정 / 길게 누르기: 선택"
                  >
                    {mode === 'SELECT' ? <span className="check">{isSel ? '✓' : ''}</span> : null}
                    <span style={{ paddingLeft: mode === 'SELECT' ? 18 : 0 }}>{w.text}</span>
                  </button>
                )
              })}
            </div>
          )}
        </div>
      </div>

      {/* bottom nav */}
      <div className="nav">
        <div className="navInner">
          <button className="navBtn navBtnCol" onClick={() => mode === 'SELECT' ? setSortOpen(false) : setSortOpen(true)} aria-label="정렬">
            <div className="ico">⇅</div>
            <div className="lbl">정렬</div>
          </button>

          <button className="navBtn navBtnCol" onClick={() => setSearchOpen(true)} aria-label="검색">
            <div className="ico">⌕</div>
            <div className="lbl">검색</div>
          </button>

          <div className="fabWrap">
            <button className="fab" onClick={openAddWord} aria-label="추가">+</button>
          </div>

          <button className="navBtn navBtnCol" onClick={() => mode === 'SELECT' ? requestDeleteSelected() : setMoreOpen(true)} aria-label="더보기/삭제">
            <div className="ico">{mode === 'SELECT' ? '🗑' : '⋯'}</div>
            <div className="lbl">{mode === 'SELECT' ? '삭제' : '더보기'}</div>
          </button>

          <button className="navBtn navBtnCol" onClick={() => mode === 'SELECT' ? exitSelectMode() : setFolderOpen(true)} aria-label="취소/폴더">
            <div className="ico">{mode === 'SELECT' ? '✕' : '☰'}</div>
            <div className="lbl">{mode === 'SELECT' ? '취소' : '폴더'}</div>
          </button>
        </div>
      </div>

      {/* Folder sheet */}
      <BottomSheet open={folderOpen} title="폴더" onClose={() => setFolderOpen(false)}>
        <div className="pillRow">
          {state.folders.map(f => (
            <button
              key={f.id}
              className={'pill' + (activeFolderId === f.id ? ' active' : '')}
              onClick={() => {
                setActiveFolderId(f.id)
                setFolderOpen(false)
                exitSelectMode()
              }}
            >
              {f.name}
            </button>
          ))}
        </div>
        <div className="sep" />
        <button className="listBtn" onClick={() => { setFolderOpen(false); setAddFolderOpen(true) }}>
          + 폴더 추가
          <div className="listBtnSub">폴더 이름은 최대 {state.settings.folderMaxLen}자</div>
        </button>
      </BottomSheet>

      {/* Add folder sheet */}
      <BottomSheet open={addFolderOpen} title="폴더 추가" onClose={() => setAddFolderOpen(false)}>
        <div className="field">
          <label>폴더 이름</label>
          <input
            className="input"
            value={draftFolderName}
            onChange={(e) => setDraftFolderName(e.target.value)}
            placeholder="폴더 이름을 입력해 주세요"
            maxLength={state.settings.folderMaxLen}
            autoFocus
          />
          <div className="counter">{normalizeText(draftFolderName).length}/{state.settings.folderMaxLen}</div>
        </div>
        <div className="btnRow">
          <button className="btn" onClick={() => setAddFolderOpen(false)}>취소</button>
          <button className="btn primary" onClick={addFolder}>확인</button>
        </div>
      </BottomSheet>

      {/* Sort sheet */}
      <BottomSheet open={sortOpen} title="정렬" onClose={() => setSortOpen(false)}>
        <div className="pillRow">
          {(['CREATED','ASC','DESC'] as SortMode[]).map(m => (
            <button
              key={m}
              className={'pill' + (state.settings.sortMode === m ? ' active' : '')}
              onClick={() => {
                setState(prev => ({ ...prev, settings: { ...prev.settings, sortMode: m } }))
                setSortOpen(false)
              }}
            >
              {SORT_LABEL[m]}
            </button>
          ))}
        </div>
        <div className="note">선택한 정렬은 폴더를 바꿔도 유지됩니다.</div>
      </BottomSheet>

      {/* Search sheet */}
      <BottomSheet open={searchOpen} title="검색" onClose={() => { setSearchOpen(false); setQ('') }}>
        <div className="field">
          <label>검색어</label>
          <input className="input" value={q} onChange={(e) => setQ(e.target.value)} placeholder="텍스트를 입력해 검색해 주세요" autoFocus />
        </div>
        <div className="btnRow">
          <button className="btn" onClick={() => setHitIdx(i => Math.max(0, i - 1))} disabled={!searchResults.length || hitIdx <= 0}>이전</button>
          <button className="btn" onClick={() => setHitIdx(i => Math.min(searchResults.length - 1, i + 1))} disabled={!searchResults.length || hitIdx >= searchResults.length - 1}>다음</button>
        </div>
        <div className="note">
          {q ? `${searchResults.length ? Math.min(hitIdx, searchResults.length - 1) + 1 : 0}/${searchResults.length}` : '0/0'} &nbsp;|&nbsp;
          검색은 현재 폴더의 단어 목록에서만 수행됩니다.
        </div>
      </BottomSheet>

      {/* Word add/edit sheet */}
      <BottomSheet open={wordOpen} title={editingId ? '단어 수정' : '단어 추가'} onClose={() => setWordOpen(false)}>
        <div className="field">
          <label>단어</label>
          <input
            className="input"
            value={draftText}
            onChange={(e) => setDraftText(e.target.value)}
            placeholder="단어를 입력해 주세요"
            maxLength={state.settings.wordMaxLen}
            autoFocus
            onKeyDown={(e) => {
              if (e.key === 'Enter') saveWord()
            }}
          />
          <div className="counter">{normalizeText(draftText).length}/{state.settings.wordMaxLen}</div>
        </div>

        <div className="field">
          <label>배경 색상</label>
          <div className="colorRow">
            {COLOR_KEYS.map(k => (
              <button
                key={k}
                className={'colorDot' + (draftColor === k ? ' active' : '')}
                style={{ background: COLOR_HEX[k] }}
                onClick={() => setDraftColor(k)}
                aria-label={COLOR_LABEL[k]}
              />
            ))}
          </div>
        </div>

        <div className="field">
          <label>폴더</label>
          <select className="select" value={draftFolderId} onChange={(e) => setDraftFolderId(e.target.value)}>
            {state.folders.map(f => <option key={f.id} value={f.id}>{f.name}</option>)}
          </select>
        </div>

        <div className="btnRow">
          <button className="btn" onClick={() => setWordOpen(false)}>취소</button>
          <button className="btn primary" onClick={saveWord}>확인</button>
        </div>
      </BottomSheet>

      {/* More sheet */}
      <BottomSheet open={moreOpen} title="더보기" onClose={() => setMoreOpen(false)}>
        <button className="listBtn" onClick={exportToFile}>
          장치로 백업 파일 내보내기
          <div className="listBtnSub">JSON 파일로 저장됩니다.</div>
        </button>
        <button className="listBtn" onClick={() => fileInputRef.current?.click()}>
          장치에서 백업 파일 가져오기
          <div className="listBtnSub">기존 데이터가 덮어씌워집니다.</div>
        </button>
        <input
          ref={fileInputRef}
          type="file"
          accept="application/json"
          style={{ display: 'none' }}
          onChange={(e) => {
            const f = e.target.files?.[0]
            if (f) importFromFile(f)
            e.currentTarget.value = ''
          }}
        />
        <div className="note">
          * 이 앱은 로컬 저장(localStorage) 기반입니다. 브라우저 데이터 삭제/기기 변경 시 데이터가 사라질 수 있어 백업을 권장드립니다.
        </div>
      </BottomSheet>

      {/* Select mode action sheet (move) */}
      <BottomSheet open={mode === 'SELECT' && !confirmDeleteOpen && !wordOpen && !searchOpen && !sortOpen && !folderOpen && !moreOpen && selectedIds.size > 0 && false} onClose={() => {}}>
        {/* not used: actions are in nav for simplicity */}
      </BottomSheet>

      {/* Confirm delete */}
      <BottomSheet open={confirmDeleteOpen} title="삭제" onClose={() => setConfirmDeleteOpen(false)}>
        <div className="note">{selectedIds.size}개 단어를 삭제하시겠습니까?</div>
        <div className="btnRow">
          <button className="btn" onClick={() => setConfirmDeleteOpen(false)}>취소</button>
          <button className="btn danger" onClick={deleteSelected}>확인</button>
        </div>
      </BottomSheet>

      {/* Move selected: reuse folder sheet when in select mode */}
      {mode === 'SELECT' ? (
        <BottomSheet open={false} onClose={() => {}}>
          {/* placeholder */}
        </BottomSheet>
      ) : null}

      {/* Quick move via folder sheet in select mode */}
      {mode === 'SELECT' ? (
        <BottomSheet open={folderOpen} title="이동할 폴더" onClose={() => setFolderOpen(false)}>
          <div className="pillRow">
            {state.folders.map(f => (
              <button key={f.id} className="pill" onClick={() => { moveSelected(f.id); setFolderOpen(false) }}>
                {f.name}
              </button>
            ))}
          </div>
          <div className="note">선택된 {selectedIds.size}개 단어를 이동합니다.</div>
        </BottomSheet>
      ) : null}
    </>
  )
}
