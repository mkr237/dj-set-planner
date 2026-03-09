import { useState } from 'react'
import { useAppContext } from '../context/AppContext'

export function SetHeader() {
  const { state, dispatch } = useAppContext()
  const { currentSet } = state
  const [editing, setEditing] = useState(false)
  const [draft, setDraft] = useState('')

  function startEdit() {
    setDraft(currentSet?.name ?? '')
    setEditing(true)
  }

  function commitEdit() {
    const name = draft.trim()
    if (name) dispatch({ type: 'RENAME_SET', payload: name })
    setEditing(false)
  }

  function handleKeyDown(e: React.KeyboardEvent) {
    if (e.key === 'Enter') commitEdit()
    if (e.key === 'Escape') setEditing(false)
  }

  const trackCount = currentSet?.tracks.length ?? 0

  return (
    <div className="px-6 py-4 border-b border-gray-700 flex items-center justify-between gap-4">
      <div className="flex items-center gap-3 min-w-0">
        {editing ? (
          <input
            autoFocus
            value={draft}
            onChange={e => setDraft(e.target.value)}
            onBlur={commitEdit}
            onKeyDown={handleKeyDown}
            className="bg-gray-800 border border-indigo-500 rounded px-2 py-0.5 text-base font-semibold text-white focus:outline-none w-64"
          />
        ) : (
          <button
            onClick={currentSet ? startEdit : undefined}
            title={currentSet ? 'Click to rename' : undefined}
            className={`text-base font-semibold truncate ${currentSet ? 'hover:text-indigo-400 cursor-text' : 'text-gray-500 cursor-default'}`}
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

      <div className="flex items-center gap-2 shrink-0">
        {/* Save / load controls come in Phase 4 */}
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
