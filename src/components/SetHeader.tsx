import { useState } from 'react'
import { useAppContext } from '../context/AppContext'
import { storage } from '../storage'

const DEFAULT_NAME = 'Untitled Set'

export function SetHeader() {
  const { state, dispatch } = useAppContext()
  const { currentSet } = state

  const [editing, setEditing] = useState(false)
  const [draft, setDraft] = useState('')
  const [saveOnCommit, setSaveOnCommit] = useState(false)
  const [savedFlash, setSavedFlash] = useState(false)

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

  function handleSave() {
    if (!currentSet) return
    if (currentSet.name === DEFAULT_NAME) {
      // Prompt for a name first, then auto-save on commit
      startEdit(true)
    } else {
      storage.saveSet(currentSet).then(() => flashSaved())
    }
  }

  function flashSaved() {
    setSavedFlash(true)
    setTimeout(() => setSavedFlash(false), 2000)
  }

  const trackCount = currentSet?.tracks.length ?? 0
  const canSave = !!currentSet && trackCount > 0

  return (
    <div className="px-6 py-4 border-b border-gray-700 flex items-center justify-between gap-4 shrink-0">
      {/* Set name + track count */}
      <div className="flex items-center gap-3 min-w-0">
        {editing ? (
          <input
            autoFocus
            value={draft}
            onChange={e => setDraft(e.target.value)}
            onBlur={commitEdit}
            onKeyDown={handleKeyDown}
            className="bg-gray-800 border border-indigo-500 rounded px-2 py-0.5 text-base font-semibold text-white focus:outline-none w-52"
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
      <div className="flex items-center gap-2 shrink-0">
        {savedFlash && (
          <span className="text-xs text-green-400 transition-opacity">Saved ✓</span>
        )}

        <button
          onClick={handleSave}
          disabled={!canSave}
          className="py-1.5 px-3 text-xs bg-indigo-600 hover:bg-indigo-500 rounded transition-colors disabled:opacity-30 disabled:cursor-not-allowed"
        >
          Save
        </button>

        <button
          onClick={() => dispatch({ type: 'NEW_SET' })}
          className="py-1.5 px-3 text-xs bg-gray-700 hover:bg-gray-600 rounded transition-colors"
        >
          New set
        </button>
      </div>
    </div>
  )
}
