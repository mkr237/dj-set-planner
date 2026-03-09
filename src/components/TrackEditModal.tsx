import { useState, useEffect } from 'react'
import { useAppContext } from '../context/AppContext'
import type { CamelotKey, EnergyLevel, Track } from '../types'

const CAMELOT_KEYS: CamelotKey[] = [
  '1A', '2A', '3A', '4A', '5A', '6A', '7A', '8A', '9A', '10A', '11A', '12A',
  '1B', '2B', '3B', '4B', '5B', '6B', '7B', '8B', '9B', '10B', '11B', '12B',
]

const ENERGY_LEVELS: EnergyLevel[] = ['Low', 'Mid', 'High', 'Unknown']

const VALID_CAMELOT_KEYS = new Set<string>(CAMELOT_KEYS)

export function TrackEditModal({ track, onClose }: { track: Track; onClose: () => void }) {
  const { dispatch } = useAppContext()

  const [title, setTitle] = useState(track.title)
  const [artist, setArtist] = useState(track.artist)
  const [bpm, setBpm] = useState(track.bpm !== null ? String(track.bpm) : '')
  const [key, setKey] = useState<string>(track.key ?? '')
  const [energy, setEnergy] = useState<EnergyLevel>(track.energy)
  const [genre, setGenre] = useState(track.genre ?? '')
  const [label, setLabel] = useState(track.label ?? '')
  const [notes, setNotes] = useState(track.notes ?? '')

  useEffect(() => {
    function handleKey(e: KeyboardEvent) {
      if (e.key === 'Escape') onClose()
    }
    window.addEventListener('keydown', handleKey)
    return () => window.removeEventListener('keydown', handleKey)
  }, [onClose])

  const titleTrimmed = title.trim()
  const artistTrimmed = artist.trim()
  const bpmParsed = bpm.trim() ? Number(bpm.trim()) : null
  const bpmValid = bpmParsed === null || (Number.isFinite(bpmParsed) && bpmParsed > 0)
  const canSave = titleTrimmed.length > 0 && artistTrimmed.length > 0 && bpmValid

  function handleSave() {
    if (!canSave) return
    const updatedTrack: Track = {
      ...track,
      title: titleTrimmed,
      artist: artistTrimmed,
      bpm: bpmParsed,
      key: VALID_CAMELOT_KEYS.has(key) ? (key as CamelotKey) : null,
      energy,
      genre: genre.trim() || undefined,
      label: label.trim() || undefined,
      notes: notes.trim() || undefined,
    }
    dispatch({ type: 'EDIT_TRACK', payload: updatedTrack })
    onClose()
  }

  function handleKeyDown(e: React.KeyboardEvent) {
    if (e.key === 'Enter' && (e.metaKey || e.ctrlKey)) handleSave()
  }

  const inputClass =
    'w-full bg-surface-3 border border-border rounded-lg px-3 py-1.5 text-sm text-slate-200 focus:outline-none focus:border-accent placeholder:text-slate-600'
  const labelClass = 'text-xs text-slate-500 font-medium'
  const incompleteIndicator = track.bpm === null || track.key === null

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/70"
      onClick={onClose}
    >
      <div
        className="w-full max-w-md bg-surface-2 border border-border rounded-xl shadow-2xl p-6"
        onClick={e => e.stopPropagation()}
        onKeyDown={handleKeyDown}
      >
        {/* Header */}
        <div className="flex items-center justify-between mb-5">
          <div>
            <h2 className="text-base font-semibold text-white">Edit Track</h2>
            {incompleteIndicator && (
              <p className="text-xs text-amber-600/80 mt-0.5">Missing BPM or key — fill in to enable candidate ranking</p>
            )}
          </div>
          <button
            onClick={onClose}
            className="text-slate-500 hover:text-white transition-colors text-xl leading-none"
          >
            ×
          </button>
        </div>

        <div className="space-y-3">
          {/* Title */}
          <div>
            <label className={labelClass}>Title <span className="text-slate-700">*</span></label>
            <input
              autoFocus
              value={title}
              onChange={e => setTitle(e.target.value)}
              className={`${inputClass} mt-1`}
              placeholder="Track title"
            />
          </div>

          {/* Artist */}
          <div>
            <label className={labelClass}>Artist <span className="text-slate-700">*</span></label>
            <input
              value={artist}
              onChange={e => setArtist(e.target.value)}
              className={`${inputClass} mt-1`}
              placeholder="Artist name"
            />
          </div>

          {/* BPM + Key row */}
          <div className="flex gap-3">
            <div className="flex-1">
              <label className={labelClass}>
                BPM
                {bpm && !bpmValid && (
                  <span className="text-red-500 ml-1">invalid</span>
                )}
              </label>
              <input
                type="number"
                min={1}
                max={300}
                value={bpm}
                onChange={e => setBpm(e.target.value)}
                className={`${inputClass} mt-1 ${bpm && !bpmValid ? 'border-red-600' : ''}`}
                placeholder="e.g. 174"
              />
            </div>
            <div className="flex-1">
              <label className={labelClass}>Camelot Key</label>
              <select
                value={key}
                onChange={e => setKey(e.target.value)}
                className={`${inputClass} mt-1`}
              >
                <option value="">— Unknown —</option>
                {CAMELOT_KEYS.map(k => (
                  <option key={k} value={k}>{k}</option>
                ))}
              </select>
            </div>
          </div>

          {/* Energy */}
          <div>
            <label className={labelClass}>Energy</label>
            <select
              value={energy}
              onChange={e => setEnergy(e.target.value as EnergyLevel)}
              className={`${inputClass} mt-1`}
            >
              {ENERGY_LEVELS.map(l => (
                <option key={l} value={l}>{l}</option>
              ))}
            </select>
          </div>

          {/* Optional fields */}
          <div className="flex gap-3">
            <div className="flex-1">
              <label className={labelClass}>Genre</label>
              <input
                value={genre}
                onChange={e => setGenre(e.target.value)}
                className={`${inputClass} mt-1`}
                placeholder="optional"
              />
            </div>
            <div className="flex-1">
              <label className={labelClass}>Label</label>
              <input
                value={label}
                onChange={e => setLabel(e.target.value)}
                className={`${inputClass} mt-1`}
                placeholder="optional"
              />
            </div>
          </div>

          <div>
            <label className={labelClass}>Notes</label>
            <input
              value={notes}
              onChange={e => setNotes(e.target.value)}
              className={`${inputClass} mt-1`}
              placeholder="optional"
            />
          </div>
        </div>

        {/* Actions */}
        <div className="flex gap-2 mt-5">
          <button
            onClick={handleSave}
            disabled={!canSave}
            className="flex-1 py-2 bg-accent hover:bg-accent-hover rounded-lg text-sm font-medium transition-colors text-white disabled:opacity-40 disabled:cursor-not-allowed"
          >
            Save
          </button>
          <button
            onClick={onClose}
            className="px-4 py-2 bg-surface-3 hover:bg-surface-2 rounded-lg text-sm text-slate-300 transition-colors"
          >
            Cancel
          </button>
        </div>
        <p className="text-xs text-slate-700 text-center mt-2">⌘ Enter to save · Esc to cancel</p>
      </div>
    </div>
  )
}
