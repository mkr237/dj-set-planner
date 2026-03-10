import { useRef, useState } from 'react'
import { useAppContext } from '../context/AppContext'
import { storage } from '../storage'
import { exportSetAsJSON, parseSetBundle, SetImportError } from '../utils/setIO'

const DEFAULT_NAME = 'Untitled Set'

export function SetHeader() {
  const { state, dispatch } = useAppContext()
  const { currentSet, tracks } = state

  const [editing, setEditing] = useState(false)
  const [draft, setDraft] = useState('')
  const [saveOnCommit, setSaveOnCommit] = useState(false)
  const [savedFlash, setSavedFlash] = useState(false)
  const [importError, setImportError] = useState<string | null>(null)
  const importRef = useRef<HTMLInputElement>(null)

  function startEdit(autoSave = false) {
    setDraft(currentSet?.name ?? '')
    setSaveOnCommit(autoSave)
    setEditing(true)
  }

  function commitEdit() {
    const name = draft.trim() || DEFAULT_NAME
    dispatch({ type: 'RENAME_SET', payload: name })
    setEditing(false)
    if (saveOnCommit && currentSet) {
      setSaveOnCommit(false)
      const updated = { ...currentSet, name, updatedAt: new Date().toISOString() }
      storage.saveSet(updated).then(() => flashSaved())
    }
  }

  function handleKeyDown(e: React.KeyboardEvent) {
    if (e.key === 'Enter') commitEdit()
    if (e.key === 'Escape') { setEditing(false); setSaveOnCommit(false) }
  }

  function handleSave() {
    if (!currentSet) return
    if (currentSet.name === DEFAULT_NAME) {
      startEdit(true)
    } else {
      storage.saveSet(currentSet).then(() => flashSaved())
    }
  }

  function flashSaved() {
    setSavedFlash(true)
    setTimeout(() => setSavedFlash(false), 2000)
  }

  function handleExport() {
    if (!currentSet) return
    exportSetAsJSON(currentSet, tracks)
  }

  function handleImportFile(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return
    e.target.value = ''
    setImportError(null)
    const reader = new FileReader()
    reader.onload = (ev) => {
      const text = ev.target?.result
      if (typeof text !== 'string') return
      try {
        const { set } = parseSetBundle(text, tracks)
        dispatch({ type: 'LOAD_SET', payload: set })
      } catch (err) {
        setImportError(err instanceof SetImportError ? err.message : 'Import failed.')
        setTimeout(() => setImportError(null), 4000)
      }
    }
    reader.readAsText(file)
  }

  const trackCount = currentSet?.tracks.length ?? 0
  const canSave = !!currentSet && trackCount > 0

  return (
    <div className="px-4 py-3 border-b border-border bg-surface-1 shrink-0 flex flex-col gap-1">
      <div className="flex items-center justify-between gap-2">
        {/* Name + count */}
        <div className="flex items-center gap-2 min-w-0">
          {editing ? (
            <input
              autoFocus
              value={draft}
              onChange={e => setDraft(e.target.value)}
              onBlur={commitEdit}
              onKeyDown={handleKeyDown}
              className="bg-surface-2 border border-accent rounded px-2 py-0.5 text-sm font-semibold text-white focus:outline-none w-44"
            />
          ) : (
            <button
              onClick={currentSet ? () => startEdit(false) : undefined}
              title={currentSet ? 'Click to rename' : undefined}
              className={`text-sm font-semibold truncate ${
                currentSet ? 'hover:text-accent-hover cursor-text text-white' : 'text-slate-600 cursor-default'
              }`}
            >
              {currentSet?.name ?? 'No set'}
            </button>
          )}
          {currentSet && (
            <span className="text-xs text-slate-600 shrink-0">
              {trackCount} track{trackCount !== 1 ? 's' : ''}
            </span>
          )}
        </div>

        {/* Controls */}
        <div className="flex items-center gap-1 shrink-0">
          {savedFlash && (
            <span className="text-xs text-green-400 mr-1">Saved ✓</span>
          )}
          <button
            onClick={handleExport}
            disabled={!canSave}
            title="Export set as JSON"
            className="w-7 h-7 flex items-center justify-center rounded text-slate-500 hover:text-white hover:bg-surface-3 transition-colors disabled:opacity-25 disabled:cursor-not-allowed"
          >
            ↓
          </button>
          <button
            onClick={() => importRef.current?.click()}
            title="Import set from JSON"
            className="w-7 h-7 flex items-center justify-center rounded text-slate-500 hover:text-white hover:bg-surface-3 transition-colors"
          >
            ↑
          </button>
          <input ref={importRef} type="file" accept=".json" className="hidden" onChange={handleImportFile} />
          <button
            onClick={handleSave}
            disabled={!canSave}
            className="py-1 px-2.5 text-xs bg-accent hover:bg-accent-hover rounded transition-colors disabled:opacity-25 disabled:cursor-not-allowed text-white font-medium"
          >
            Save
          </button>
          <button
            onClick={() => dispatch({ type: 'NEW_SET' })}
            className="py-1 px-2.5 text-xs bg-surface-3 hover:bg-surface-2 rounded transition-colors text-slate-300"
          >
            New
          </button>
        </div>
      </div>

      {importError && (
        <p className="text-xs text-red-400">{importError}</p>
      )}
    </div>
  )
}
