import { useEffect, useRef, useState } from 'react'
import { useAppContext } from '../context/AppContext'
import { storage } from '../storage'
import type { DJSet } from '../types'

function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString(undefined, {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  })
}

function SetRow({
  set,
  isActive,
  onLoad,
  onRename,
  onDelete,
}: {
  set: DJSet
  isActive: boolean
  onLoad: () => void
  onRename: (name: string) => void
  onDelete: () => void
}) {
  const [editing, setEditing] = useState(false)
  const [draft, setDraft] = useState('')

  function startEdit() {
    setDraft(set.name)
    setEditing(true)
  }

  function commitEdit() {
    const name = draft.trim()
    if (name && name !== set.name) onRename(name)
    setEditing(false)
  }

  function handleKeyDown(e: React.KeyboardEvent) {
    if (e.key === 'Enter') commitEdit()
    if (e.key === 'Escape') setEditing(false)
  }

  return (
    <div
      className={`flex items-center gap-3 px-4 py-3 border-b border-border/50 group ${
        isActive ? 'bg-accent-muted' : 'hover:bg-surface-3'
      }`}
    >
      {/* Name + meta */}
      <div className="flex-1 min-w-0">
        {editing ? (
          <input
            autoFocus
            value={draft}
            onChange={e => setDraft(e.target.value)}
            onBlur={commitEdit}
            onKeyDown={handleKeyDown}
            className="w-full bg-surface-3 border border-accent rounded px-2 py-0.5 text-sm text-white focus:outline-none"
          />
        ) : (
          <button
            onClick={startEdit}
            title="Click to rename"
            className={`text-sm font-medium text-left w-full truncate hover:text-accent-hover cursor-text ${
              isActive ? 'text-accent-hover' : 'text-white'
            }`}
          >
            {set.name}
          </button>
        )}
        <p className="text-xs text-slate-500 mt-0.5">
          {set.tracks.length} track{set.tracks.length !== 1 ? 's' : ''} · {formatDate(set.updatedAt)}
        </p>
      </div>

      {/* Actions */}
      <div className="flex items-center gap-1 shrink-0 opacity-0 group-hover:opacity-100 transition-opacity">
        <button
          onClick={onLoad}
          disabled={isActive}
          title="Load set"
          className="px-2 py-1 text-xs rounded bg-surface-3 hover:bg-accent transition-colors disabled:opacity-30 disabled:cursor-not-allowed text-slate-300 hover:text-white"
        >
          Load
        </button>
        <button
          onClick={onDelete}
          title="Delete set"
          className="w-6 h-6 flex items-center justify-center rounded text-slate-600 hover:text-red-400 hover:bg-surface-3 transition-colors text-base leading-none"
        >
          ×
        </button>
      </div>
    </div>
  )
}

export function SavedSetsDrawer({ onClose }: { onClose: () => void }) {
  const { state, dispatch } = useAppContext()
  const [sets, setSets] = useState<DJSet[]>([])
  const drawerRef = useRef<HTMLDivElement>(null)

  // Load saved sets on mount
  useEffect(() => {
    storage.getSets().then(setSets)
  }, [])

  // Close on Escape
  useEffect(() => {
    function handleKey(e: KeyboardEvent) {
      if (e.key === 'Escape') onClose()
    }
    window.addEventListener('keydown', handleKey)
    return () => window.removeEventListener('keydown', handleKey)
  }, [onClose])

  function handleLoad(set: DJSet) {
    dispatch({ type: 'LOAD_SET', payload: set })
    onClose()
  }

  async function handleRename(id: string, name: string) {
    const set = sets.find(s => s.id === id)
    if (!set) return
    const updated = { ...set, name, updatedAt: new Date().toISOString() }
    await storage.saveSet(updated)
    setSets(prev => prev.map(s => (s.id === id ? updated : s)))
    // Keep current set in sync if it's the one being renamed
    if (state.currentSet?.id === id) {
      dispatch({ type: 'RENAME_SET', payload: name })
    }
  }

  async function handleDelete(id: string) {
    await storage.deleteSet(id)
    setSets(prev => prev.filter(s => s.id !== id))
  }

  return (
    <>
      {/* Backdrop */}
      <div
        className="fixed inset-0 z-40 bg-black/50"
        onClick={onClose}
      />

      {/* Drawer panel — slides in from the right */}
      <div
        ref={drawerRef}
        className="fixed top-0 right-0 bottom-0 z-50 w-80 bg-surface-2 border-l border-border flex flex-col shadow-2xl"
      >
        {/* Drawer header */}
        <div className="flex items-center justify-between px-4 py-4 border-b border-border">
          <h2 className="text-base font-semibold text-white">Saved Sets</h2>
          <button
            onClick={onClose}
            className="text-slate-500 hover:text-white transition-colors text-lg leading-none"
          >
            ×
          </button>
        </div>

        {/* Set list */}
        {sets.length === 0 ? (
          <div className="flex-1 flex items-center justify-center px-6">
            <p className="text-sm text-slate-500 text-center">
              No saved sets yet. Build a set and hit Save.
            </p>
          </div>
        ) : (
          <div className="flex-1 overflow-y-auto">
            {sets
              .slice()
              .sort((a, b) => b.updatedAt.localeCompare(a.updatedAt))
              .map(set => (
                <SetRow
                  key={set.id}
                  set={set}
                  isActive={state.currentSet?.id === set.id}
                  onLoad={() => handleLoad(set)}
                  onRename={name => handleRename(set.id, name)}
                  onDelete={() => handleDelete(set.id)}
                />
              ))}
          </div>
        )}
      </div>
    </>
  )
}
