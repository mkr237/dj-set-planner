import { useEffect } from 'react'
import { useAppContext } from '../context/AppContext'
import type { EnergyLevel, MixConstraints } from '../types'

const ENERGY_LEVELS: EnergyLevel[] = ['Low', 'Mid', 'High']

const TIER_LABELS: Record<number, string> = {
  1: 'T1 — Perfect only',
  2: 'T2 — Strong',
  3: 'T3 — Works',
  4: 'T4 — All keys',
}

export function ConstraintModal({ onClose }: { onClose: () => void }) {
  const { state, dispatch } = useAppContext()
  const { constraints } = state

  // Close on Escape
  useEffect(() => {
    function handleKey(e: KeyboardEvent) {
      if (e.key === 'Escape') onClose()
    }
    window.addEventListener('keydown', handleKey)
    return () => window.removeEventListener('keydown', handleKey)
  }, [onClose])

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

  return (
    /* Backdrop */
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/60"
      onClick={onClose}
    >
      {/* Modal card — stop propagation so clicking inside doesn't close */}
      <div
        className="w-full max-w-sm bg-gray-800 border border-gray-700 rounded-xl shadow-2xl p-6"
        onClick={e => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between mb-5">
          <h2 className="text-base font-semibold text-white">Mix Constraints</h2>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-white transition-colors text-lg leading-none"
          >
            ×
          </button>
        </div>

        {/* BPM Range */}
        <div className="mb-5">
          <div className="flex justify-between items-center mb-1">
            <label className="text-sm text-gray-300">BPM Range</label>
            <span className="text-sm font-mono text-indigo-400">±{constraints.bpmRange}</span>
          </div>
          <input
            type="range"
            min={1}
            max={20}
            value={constraints.bpmRange}
            onChange={e => update({ bpmRange: Number(e.target.value) })}
            className="w-full accent-indigo-500"
          />
          <div className="flex justify-between text-xs text-gray-600 mt-0.5">
            <span>±1</span>
            <span>±20</span>
          </div>
        </div>

        {/* Max Camelot Tier */}
        <div className="mb-5">
          <label className="text-sm text-gray-300 block mb-1.5">Max Camelot Tier</label>
          <select
            value={constraints.maxCamelotTier}
            onChange={e => update({ maxCamelotTier: Number(e.target.value) })}
            className="w-full bg-gray-700 border border-gray-600 rounded-lg px-3 py-2 text-sm text-gray-200 focus:outline-none focus:border-indigo-500"
          >
            {[1, 2, 3, 4].map(tier => (
              <option key={tier} value={tier}>
                {TIER_LABELS[tier]}
              </option>
            ))}
          </select>
        </div>

        {/* Energy Filter */}
        <div>
          <label className="text-sm text-gray-300 block mb-1.5">Energy Filter</label>
          <div className="flex gap-4">
            {ENERGY_LEVELS.map(level => (
              <label key={level} className="flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={isEnergyChecked(level)}
                  onChange={e => handleEnergyChange(level, e.target.checked)}
                  className="accent-indigo-500"
                />
                <span className="text-sm text-gray-300">{level}</span>
              </label>
            ))}
          </div>
        </div>

        <button
          onClick={onClose}
          className="mt-6 w-full py-2 bg-indigo-600 hover:bg-indigo-500 rounded-lg text-sm font-medium transition-colors"
        >
          Done
        </button>
      </div>
    </div>
  )
}
