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
  const { state, dispatch } = useAppContext()

  // Look up the original Spotify values from the session cache
  const spotifyTrack = Object.values(state.playlistTracksCache)
    .flat()
    .find(t => t.spotifyId === track.spotifyId) ?? null

  // Editable form state — initialised from current resolved values
  const [bpm, setBpm] = useState(track.bpm !== null ? String(track.bpm) : '')
  const [key, setKey] = useState<string>(track.key ?? '')
  const [energy, setEnergy] = useState<EnergyLevel>(track.energy)
  const [notes, setNotes] = useState(track.notes ?? '')

  // Revert flags: true means "this field should fall back to Spotify on save"
  const [bpmReverted, setBpmReverted] = useState(false)
  const [keyReverted, setKeyReverted] = useState(false)
  const [energyReverted, setEnergyReverted] = useState(false)

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

  // Spotify original values (null if cache not available)
  const spotifyBpm = spotifyTrack?.bpm ?? null
  const spotifyKey = spotifyTrack?.key ?? null
  const spotifyEnergy = spotifyTrack?.energy ?? null

  function handleRevertBpm() {
    setBpmReverted(true)
    setBpm(spotifyBpm !== null ? String(spotifyBpm) : '')
  }

  function handleRevertKey() {
    setKeyReverted(true)
    setKey(spotifyKey ?? '')
  }

  function handleRevertEnergy() {
    setEnergyReverted(true)
    setEnergy(spotifyEnergy ?? 'Unknown')
  }

  function handleSave() {
    if (!canSave) return

    const override: TrackOverrides = { spotifyId: track.spotifyId }

    if (!bpmReverted && bpmParsed !== undefined) {
      override.bpm = bpmParsed
    }
    if (!keyReverted && VALID_CAMELOT_KEYS.has(key)) {
      override.key = key as CamelotKey
    }
    // Include energy if: not reverted AND (was already overridden OR changed from Spotify's value)
    if (!energyReverted && (track.hasOverrides.energy || energy !== (spotifyEnergy ?? 'Unknown'))) {
      override.energy = energy
    }
    if (notes.trim()) {
      override.notes = notes.trim()
    }

    const hasAnyOverride =
      override.bpm !== undefined ||
      override.key !== undefined ||
      override.energy !== undefined ||
      override.notes !== undefined

    if (hasAnyOverride) {
      dispatch({ type: 'SET_OVERRIDE', payload: override })
    } else {
      dispatch({ type: 'REMOVE_OVERRIDE', payload: track.spotifyId })
    }
    onClose()
  }

  function handleKeyDown(e: React.KeyboardEvent) {
    if (e.key === 'Enter' && (e.metaKey || e.ctrlKey)) handleSave()
  }

  const inputClass =
    'w-full bg-surface-3 border border-border rounded-lg px-3 py-1.5 text-sm text-slate-200 focus:outline-none focus:border-accent placeholder:text-slate-600'
  const labelClass = 'text-xs text-slate-500 font-medium flex items-center gap-1.5'

  const isIncomplete = track.bpm === null || track.key === null
  const hasAnyOverride = track.hasOverrides.bpm || track.hasOverrides.key || track.hasOverrides.energy

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
        <div className="flex items-start justify-between mb-5 gap-3">
          <div className="min-w-0">
            <h2 className="text-base font-semibold text-white truncate">{track.title}</h2>
            <p className="text-xs text-slate-500 mt-0.5 truncate">{track.artist}</p>
            <div className="flex items-center gap-2 mt-1.5">
              {isIncomplete && (
                <span className="text-xs text-amber-600/80">Missing BPM or key</span>
              )}
              {hasAnyOverride && (
                <span className="text-xs text-accent-hover">
                  {[
                    track.hasOverrides.bpm && 'BPM',
                    track.hasOverrides.key && 'Key',
                    track.hasOverrides.energy && 'Energy',
                  ].filter(Boolean).join(', ')} overridden
                </span>
              )}
            </div>
          </div>
          <button
            onClick={onClose}
            className="text-slate-500 hover:text-white transition-colors text-xl leading-none shrink-0"
          >
            ×
          </button>
        </div>

        <div className="space-y-3">
          {/* BPM + Key row */}
          <div className="flex gap-3">
            {/* BPM */}
            <div className="flex-1">
              <div className={labelClass}>
                <span>BPM</span>
                {track.hasOverrides.bpm && !bpmReverted && (
                  <span className="text-accent-hover text-xs font-mono leading-none">●</span>
                )}
                {bpm && !bpmValid && (
                  <span className="text-red-500">invalid</span>
                )}
              </div>
              <div className="flex items-center gap-1 mt-1">
                <input
                  autoFocus
                  type="number"
                  min={1}
                  max={300}
                  value={bpm}
                  onChange={e => { setBpm(e.target.value); setBpmReverted(false) }}
                  className={`${inputClass} ${bpm && !bpmValid ? 'border-red-600' : ''}`}
                  placeholder="e.g. 174"
                />
                {track.hasOverrides.bpm && !bpmReverted && spotifyBpm !== null && (
                  <button
                    type="button"
                    onClick={handleRevertBpm}
                    title={`Revert to Spotify value: ${spotifyBpm}`}
                    className="shrink-0 text-slate-500 hover:text-accent-hover transition-colors text-sm leading-none"
                  >
                    ↺
                  </button>
                )}
              </div>
              {track.hasOverrides.bpm && !bpmReverted && spotifyBpm !== null && (
                <p className="text-xs text-slate-600 mt-0.5 font-mono">Spotify: {spotifyBpm}</p>
              )}
              {bpmReverted && spotifyBpm !== null && (
                <p className="text-xs text-accent-hover/70 mt-0.5">Will revert to Spotify value</p>
              )}
            </div>

            {/* Key */}
            <div className="flex-1">
              <div className={labelClass}>
                <span>Camelot Key</span>
                {track.hasOverrides.key && !keyReverted && (
                  <span className="text-accent-hover text-xs font-mono leading-none">●</span>
                )}
              </div>
              <div className="flex items-center gap-1 mt-1">
                <select
                  value={key}
                  onChange={e => { setKey(e.target.value); setKeyReverted(false) }}
                  className={inputClass}
                >
                  <option value="">— Unknown —</option>
                  {CAMELOT_KEYS.map(k => (
                    <option key={k} value={k}>{k}</option>
                  ))}
                </select>
                {track.hasOverrides.key && !keyReverted && spotifyKey !== null && (
                  <button
                    type="button"
                    onClick={handleRevertKey}
                    title={`Revert to Spotify value: ${spotifyKey}`}
                    className="shrink-0 text-slate-500 hover:text-accent-hover transition-colors text-sm leading-none"
                  >
                    ↺
                  </button>
                )}
              </div>
              {track.hasOverrides.key && !keyReverted && spotifyKey !== null && (
                <p className="text-xs text-slate-600 mt-0.5 font-mono">Spotify: {spotifyKey}</p>
              )}
              {keyReverted && spotifyKey !== null && (
                <p className="text-xs text-accent-hover/70 mt-0.5">Will revert to Spotify value</p>
              )}
            </div>
          </div>

          {/* Energy */}
          <div>
            <div className={labelClass}>
              <span>Energy</span>
              {track.hasOverrides.energy && !energyReverted && (
                <span className="text-accent-hover text-xs font-mono leading-none">●</span>
              )}
            </div>
            <div className="flex items-center gap-1 mt-1">
              <select
                value={energy}
                onChange={e => { setEnergy(e.target.value as EnergyLevel); setEnergyReverted(false) }}
                className={inputClass}
              >
                {ENERGY_LEVELS.map(l => (
                  <option key={l} value={l}>{l}</option>
                ))}
              </select>
              {track.hasOverrides.energy && !energyReverted && spotifyEnergy !== null && (
                <button
                  type="button"
                  onClick={handleRevertEnergy}
                  title={`Revert to Spotify value: ${spotifyEnergy}`}
                  className="shrink-0 text-slate-500 hover:text-accent-hover transition-colors text-sm leading-none"
                >
                  ↺
                </button>
              )}
            </div>
            {track.hasOverrides.energy && !energyReverted && spotifyEnergy !== null && (
              <p className="text-xs text-slate-600 mt-0.5 font-mono">Spotify: {spotifyEnergy}</p>
            )}
            {energyReverted && spotifyEnergy !== null && (
              <p className="text-xs text-accent-hover/70 mt-0.5">Will revert to Spotify value</p>
            )}
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
