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

  // ---------------------------------------------------------------------------
  // Rename
  // ---------------------------------------------------------------------------

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
    if (e.key === 'Escape') {
      setEditing(false)
      setSaveOnCommit(false)
    }
  }

  // ---------------------------------------------------------------------------
  // Save
  // ---------------------------------------------------------------------------

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

  // ---------------------------------------------------------------------------
  // Export
  // ---------------------------------------------------------------------------

  function handleExport() {
    if (!currentSet) return
    exportSetAsJSON(currentSet, tracks)
  }

  // ---------------------------------------------------------------------------
  // Import
  // ---------------------------------------------------------------------------

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
        const { set, newTracks } = parseSetBundle(text, tracks)
        // Merge new tracks into the library
        if (newTracks.length > 0) {
          dispatch({ type: 'SET_TRACKS', payload: [...tracks, ...newTracks] })
        }
        dispatch({ type: 'LOAD_SET', payload: set })
      } catch (err) {
        setImportError(err instanceof SetImportError ? err.message : 'Import failed.')
        setTimeout(() => setImportError(null), 4000)
      }
    }
    reader.readAsText(file)
  }

  // ---------------------------------------------------------------------------
  // Render
  // ---------------------------------------------------------------------------

  const trackCount = currentSet?.tracks.length ?? 0
  const canSave = !!currentSet && trackCount > 0

  return (
    <div className="px-4 py-3 border-b border-gray-700 flex flex-col gap-1 shrink-0">
      <div className="flex items-center justify-between gap-3">
        {/* Set name + track count */}
        <div className="flex items-center gap-2 min-w-0">
          {editing ? (
            <input
              autoFocus
              value={draft}
              onChange={e => setDraft(e.target.value)}
              onBlur={commitEdit}
              onKeyDown={handleKeyDown}
              className="bg-gray-800 border border-indigo-500 rounded px-2 py-0.5 text-base font-semibold text-white focus:outline-none w-48"
            />
          ) : (
            <button
              onClick={currentSet ? () => startEdit(false) : undefined}
              title={currentSet ? 'Click to rename' : undefined}
              className={`text-base font-semibold truncate ${
                currentSet ? 'hover:text-indigo-400 cursor-text' : 'text-gray-500 cursor-default'
              }`}
            >
              {currentSet?.name ?? 'No set'}
            </button>
          )}

          {currentSet && (
            <span className="text-xs text-gray-500 shrink-0">
              {trackCount} track{trackCount !== 1 ? 's' : ''}
            </span>
          )}
        </div>

        {/* Controls */}
        <div className="flex items-center gap-1 shrink-0">
          {savedFlash && (
            <span className="text-xs text-green-400 mr-1">Saved ✓</span>
          )}

          {/* Export */}
          <button
            onClick={handleExport}
            disabled={!canSave}
            title="Export set as JSON"
            className="w-7 h-7 flex items-center justify-center rounded text-gray-400 hover:text-white hover:bg-gray-700 transition-colors disabled:opacity-30 disabled:cursor-not-allowed text-sm"
          >
            ↓
          </button>

          {/* Import */}
          <button
            onClick={() => importRef.current?.click()}
            title="Import set from JSON"
            className="w-7 h-7 flex items-center justify-center rounded text-gray-400 hover:text-white hover:bg-gray-700 transition-colors text-sm"
          >
            ↑
          </button>
          <input
            ref={importRef}
            type="file"
            accept=".json"
            className="hidden"
            onChange={handleImportFile}
          />

          <button
            onClick={handleSave}
            disabled={!canSave}
            className="py-1 px-2.5 text-xs bg-indigo-600 hover:bg-indigo-500 rounded transition-colors disabled:opacity-30 disabled:cursor-not-allowed"
          >
            Save
          </button>

          <button
            onClick={() => dispatch({ type: 'NEW_SET' })}
            className="py-1 px-2.5 text-xs bg-gray-700 hover:bg-gray-600 rounded transition-colors"
          >
            New
          </button>
        </div>
      </div>

      {/* Import error */}
      {importError && (
        <p className="text-xs text-red-400">{importError}</p>
      )}
    </div>
  )
}
