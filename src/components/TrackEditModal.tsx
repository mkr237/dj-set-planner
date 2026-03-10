import { useState, useEffect } from 'react'
import { useAppContext } from '../context/AppContext'
import type { CamelotKey, EnergyLevel, ResolvedTrack, TrackOverrides } from '../types'

const CAMELOT_KEYS: CamelotKey[] = [
  '1A', '2A', '3A', '4A', '5A', '6A', '7A', '8A', '9A', '10A', '11A', '12A',
  '1B', '2B', '3B', '4B', '5B', '6B', '7B', '8B', '9B', '10B', '11B', '12B',
]

const ENERGY_LEVELS: EnergyLevel[] = ['Low', 'Mid', 'High', 'Unknown']

const VALID_CAMELOT_KEYS = new Set<string>(CAMELOT_KEYS)

export function TrackEditModal({ track, onClose }: { track: ResolvedTrack; onClose: () => void }) {
  const { dispatch } = useAppContext()

  const [bpm, setBpm] = useState(track.bpm !== null ? String(track.bpm) : '')
  const [key, setKey] = useState<string>(track.key ?? '')
  const [energy, setEnergy] = useState<EnergyLevel>(track.energy)
  const [notes, setNotes] = useState(track.notes ?? '')

  useEffect(() => {
    function handleKey(e: KeyboardEvent) {
      if (e.key === 'Escape') onClose()
    }
    window.addEventListener('keydown', handleKey)
    return () => window.removeEventListener('keydown', handleKey)
  }, [onClose])

  const bpmParsed = bpm.trim() ? Number(bpm.trim()) : undefined
  const bpmValid = bpmParsed === undefined || (Number.isFinite(bpmParsed) && bpmParsed > 0)
  const canSave = bpmValid

  function handleSave() {
    if (!canSave) return

    const override: TrackOverrides = {
      spotifyId: track.spotifyId,
      ...(bpmParsed !== undefined && { bpm: bpmParsed }),
      ...(VALID_CAMELOT_KEYS.has(key) && { key: key as CamelotKey }),
      energy,
      notes: notes.trim() || undefined,
    }

    dispatch({ type: 'SET_OVERRIDE', payload: override })
    onClose()
  }

  function handleKeyDown(e: React.KeyboardEvent) {
    if (e.key === 'Enter' && (e.metaKey || e.ctrlKey)) handleSave()
  }

  const inputClass =
    'w-full bg-surface-3 border border-border rounded-lg px-3 py-1.5 text-sm text-slate-200 focus:outline-none focus:border-accent placeholder:text-slate-600'
  const labelClass = 'text-xs text-slate-500 font-medium'
  const isIncomplete = track.bpm === null || track.key === null

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
            <h2 className="text-base font-semibold text-white">{track.title}</h2>
            <p className="text-xs text-slate-500 mt-0.5">{track.artist}</p>
            {isIncomplete && (
              <p className="text-xs text-amber-600/80 mt-1">Missing BPM or key — fill in to enable candidate ranking</p>
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
          {/* BPM + Key row */}
          <div className="flex gap-3">
            <div className="flex-1">
              <label className={labelClass}>
                BPM
                {track.hasOverrides.bpm && <span className="text-accent-hover ml-1">·</span>}
                {bpm && !bpmValid && (
                  <span className="text-red-500 ml-1">invalid</span>
                )}
              </label>
              <input
                autoFocus
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
              <label className={labelClass}>
                Camelot Key
                {track.hasOverrides.key && <span className="text-accent-hover ml-1">·</span>}
              </label>
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
            <label className={labelClass}>
              Energy
              {track.hasOverrides.energy && <span className="text-accent-hover ml-1">·</span>}
            </label>
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

          {/* Notes */}
          <div>
            <label className={labelClass}>Notes</label>
            <input
              value={notes}
              onChange={e => setNotes(e.target.value)}
              className={`${inputClass} mt-1`}
              placeholder="optional DJ notes"
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
