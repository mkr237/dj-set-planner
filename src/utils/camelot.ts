import type { CamelotKey } from '../types'

/** Minimum wrapping distance between two Camelot numbers (1–12). */
export function camelotDistance(a: number, b: number): number {
  const diff = Math.abs(a - b)
  return Math.min(diff, 12 - diff)
}

/** Parse a CamelotKey into its numeric and letter parts. */
function parse(key: CamelotKey): { num: number; letter: 'A' | 'B' } {
  const letter = key.slice(-1) as 'A' | 'B'
  const num = parseInt(key.slice(0, -1), 10)
  return { num, letter }
}

/**
 * Returns the compatibility tier (1–4) between two Camelot keys.
 *
 * Tier 1 (Perfect):  same key
 * Tier 2 (Strong):   adjacent same-letter keys, or parallel key (same number, different letter)
 * Tier 3 (Works):    two steps same-letter, or adjacent cross-letter
 * Tier 4 (Clash):    everything else
 */
export function getCamelotTier(from: CamelotKey, to: CamelotKey): 1 | 2 | 3 | 4 {
  const f = parse(from)
  const t = parse(to)
  const dist = camelotDistance(f.num, t.num)

  if (f.letter === t.letter) {
    if (dist === 0) return 1
    if (dist === 1) return 2
    if (dist === 2) return 3
    return 4
  } else {
    if (dist === 0) return 2
    if (dist === 1) return 3
    return 4
  }
}

/**
 * Returns all CamelotKeys whose tier from `key` is ≤ maxTier.
 * The source key itself is always included (tier 1).
 */
export function getCompatibleKeys(key: CamelotKey, maxTier: number): CamelotKey[] {
  return ALL_KEYS.filter(candidate => getCamelotTier(key, candidate) <= maxTier)
}

const ALL_KEYS: CamelotKey[] = [
  '1A', '2A', '3A', '4A', '5A', '6A', '7A', '8A', '9A', '10A', '11A', '12A',
  '1B', '2B', '3B', '4B', '5B', '6B', '7B', '8B', '9B', '10B', '11B', '12B',
]
