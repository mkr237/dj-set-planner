import { useEffect, useRef, useState } from 'react'
import { useAppContext } from '../context/AppContext'
import type { EnergyLevel, MixConstraints, TrackOverrides } from '../types'

const ENERGY_LEVELS: EnergyLevel[] = ['Low', 'Mid', 'High']

const TIER_LABELS: Record<number, string> = {
  1: 'T1 — Perfect only',
  2: 'T2 — Strong',
  3: 'T3 — Works',
  4: 'T4 — All keys',
}

const VALID_CAMELOT_KEYS = new Set<string>([
  '1A','2A','3A','4A','5A','6A','7A','8A','9A','10A','11A','12A',
  '1B','2B','3B','4B','5B','6B','7B','8B','9B','10B','11B','12B',
])
const VALID_ENERGY_LEVELS = new Set<string>(['Low', 'Mid', 'High', 'Unknown'])

function isValidOverride(v: unknown): v is TrackOverrides {
  if (typeof v !== 'object' || v === null) return false
  const o = v as Record<string, unknown>
  if (typeof o.spotifyId !== 'string' || !o.spotifyId) return false
  if (o.bpm !== undefined && (typeof o.bpm !== 'number' || o.bpm <= 0)) return false
  if (o.key !== undefined && !VALID_CAMELOT_KEYS.has(o.key as string)) return false
  if (o.energy !== undefined && !VALID_ENERGY_LEVELS.has(o.energy as string)) return false
  if (o.notes !== undefined && typeof o.notes !== 'string') return false
  return true
}

// ---------------------------------------------------------------------------
// Section heading
// ---------------------------------------------------------------------------

function SectionHeading({ children }: { children: React.ReactNode }) {
  return (
    <p className="text-xs text-slate-500 uppercase tracking-wider font-semibold mb-3">
      {children}
    </p>
  )
}

// ---------------------------------------------------------------------------
// SettingsModal
// ---------------------------------------------------------------------------

export function SettingsModal({ onClose }: { onClose: () => void }) {
  const { state, dispatch } = useAppContext()
  const { constraints, overrides } = state

  const importRef = useRef<HTMLInputElement>(null)
  const [importResult, setImportResult] = useState<{ merged: number; skipped: number } | null>(null)
  const [importError, setImportError] = useState<string | null>(null)

  useEffect(() => {
    function handleKey(e: KeyboardEvent) {
      if (e.key === 'Escape') onClose()
    }
    window.addEventListener('keydown', handleKey)
    return () => window.removeEventListener('keydown', handleKey)
  }, [onClose])

  // ---- Constraints ----

  function update(patch: Partial<MixConstraints>) {
    dispatch({ type: 'SET_CONSTRAINTS', payload: { ...constraints, ...patch } })
  }

  function handleEnergyChange(level: EnergyLevel, checked: boolean) {
    if (constraints.energyFilter === 'any') {
      update({ energyFilter: ENERGY_LEVELS.filter(l => l !== level || checked) })
    } else {
      const next = checked
        ? [...constraints.energyFilter, level]
        : constraints.energyFilter.filter(l => l !== level)
      update({ energyFilter: next.length === 0 || next.length === 3 ? 'any' : next })
    }
  }

  function isEnergyChecked(level: EnergyLevel): boolean {
    return constraints.energyFilter === 'any' || constraints.energyFilter.includes(level)
  }

  // ---- Overrides export ----

  function handleExport() {
    const json = JSON.stringify(overrides, null, 2)
    const blob = new Blob([json], { type: 'application/json' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `dj-overrides-${new Date().toISOString().slice(0, 10)}.json`
    a.click()
    URL.revokeObjectURL(url)
  }

  // ---- Overrides import ----

  function handleImportFile(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    e.target.value = ''
    if (!file) return

    setImportResult(null)
    setImportError(null)

    const reader = new FileReader()
    reader.onload = (ev) => {
      try {
        const parsed = JSON.parse(ev.target?.result as string)
        if (!Array.isArray(parsed)) throw new Error('File must contain a JSON array')

        const valid: TrackOverrides[] = []
        let skipped = 0
        for (const item of parsed) {
          if (isValidOverride(item)) {
            valid.push(item as TrackOverrides)
          } else {
            skipped++
          }
        }

        // Merge: start from existing overrides, upsert each imported entry
        const merged = new Map(overrides.map(o => [o.spotifyId, o]))
        for (const o of valid) {
          merged.set(o.spotifyId, { ...merged.get(o.spotifyId), ...o } as TrackOverrides)
        }

        dispatch({ type: 'LOAD_OVERRIDES', payload: Array.from(merged.values()) })
        setImportResult({ merged: valid.length, skipped })
      } catch (err) {
        setImportError(err instanceof Error ? err.message : 'Failed to parse file')
      }
    }
    reader.readAsText(file)
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/70"
      onClick={onClose}
    >
      <div
        className="w-full max-w-sm bg-surface-2 border border-border rounded-xl shadow-2xl p-6"
        onClick={e => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between mb-5">
          <h2 className="text-base font-semibold text-white">Settings</h2>
          <button
            onClick={onClose}
            className="text-slate-500 hover:text-white transition-colors text-xl leading-none"
          >
            ×
          </button>
        </div>

        {/* ── Mix Constraints ── */}
        <SectionHeading>Mix Constraints</SectionHeading>

        {/* BPM Range */}
        <div className="mb-4">
          <div className="flex justify-between items-center mb-1.5">
            <label className="text-sm text-slate-300">BPM Range</label>
            <span className="text-sm font-mono text-accent-hover">±{constraints.bpmRange}</span>
          </div>
          <input
            type="range"
            min={1}
            max={20}
            value={constraints.bpmRange}
            onChange={e => update({ bpmRange: Number(e.target.value) })}
            className="w-full accent-accent"
          />
          <div className="flex justify-between text-xs text-slate-600 mt-1">
            <span>±1</span><span>±20</span>
          </div>
        </div>

        {/* Max Camelot Tier */}
        <div className="mb-4">
          <label className="text-sm text-slate-300 block mb-1.5">Max Camelot Tier</label>
          <select
            value={constraints.maxCamelotTier}
            onChange={e => update({ maxCamelotTier: Number(e.target.value) })}
            className="w-full bg-surface-3 border border-border rounded-lg px-3 py-2 text-sm text-slate-200 focus:outline-none focus:border-accent"
          >
            {[1, 2, 3, 4].map(tier => (
              <option key={tier} value={tier}>{TIER_LABELS[tier]}</option>
            ))}
          </select>
        </div>

        {/* Energy Filter */}
        <div className="mb-6">
          <label className="text-sm text-slate-300 block mb-1.5">Energy Filter</label>
          <div className="flex gap-5">
            {ENERGY_LEVELS.map(level => (
              <label key={level} className="flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={isEnergyChecked(level)}
                  onChange={e => handleEnergyChange(level, e.target.checked)}
                  className="accent-accent"
                />
                <span className="text-sm text-slate-300">{level}</span>
              </label>
            ))}
          </div>
        </div>

        {/* ── Library Data ── */}
        <div className="border-t border-border pt-5 mb-5">
          <SectionHeading>Library Data</SectionHeading>

          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-slate-300">Track overrides</p>
              <p className="text-xs text-slate-600 mt-0.5">
                {overrides.length} track{overrides.length !== 1 ? 's' : ''} edited
              </p>
            </div>
            <div className="flex gap-2 shrink-0">
              <button
                onClick={handleExport}
                disabled={overrides.length === 0}
                title="Download overrides as JSON"
                className="px-3 py-1.5 bg-surface-3 hover:bg-surface-1 border border-border rounded-lg text-xs text-slate-300 transition-colors disabled:opacity-30 disabled:cursor-not-allowed"
              >
                Export
              </button>
              <button
                onClick={() => { setImportResult(null); setImportError(null); importRef.current?.click() }}
                title="Import overrides from a previously exported JSON file"
                className="px-3 py-1.5 bg-surface-3 hover:bg-surface-1 border border-border rounded-lg text-xs text-slate-300 transition-colors"
              >
                Import
              </button>
              <input
                ref={importRef}
                type="file"
                accept=".json"
                className="hidden"
                onChange={handleImportFile}
              />
            </div>
          </div>

          {importResult && (
            <p className="text-xs text-green-400 mt-2">
              ✓ {importResult.merged} override{importResult.merged !== 1 ? 's' : ''} imported
              {importResult.skipped > 0 && (
                <span className="text-slate-500"> · {importResult.skipped} skipped (invalid)</span>
              )}
            </p>
          )}
          {importError && (
            <p className="text-xs text-red-400 mt-2">{importError}</p>
          )}
        </div>

        <button
          onClick={onClose}
          className="w-full py-2 bg-accent hover:bg-accent-hover rounded-lg text-sm font-medium transition-colors text-white"
        >
          Done
        </button>
      </div>
    </div>
  )
}
