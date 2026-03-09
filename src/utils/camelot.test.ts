import { describe, expect, it } from 'vitest'
import { camelotDistance, getCamelotTier, getCompatibleKeys } from './camelot'
import type { CamelotKey } from '../types'

// ---------------------------------------------------------------------------
// camelotDistance
// ---------------------------------------------------------------------------

describe('camelotDistance', () => {
  it('returns 0 for the same number', () => {
    expect(camelotDistance(4, 4)).toBe(0)
    expect(camelotDistance(1, 1)).toBe(0)
    expect(camelotDistance(12, 12)).toBe(0)
  })

  it('returns 1 for adjacent numbers', () => {
    expect(camelotDistance(4, 5)).toBe(1)
    expect(camelotDistance(5, 4)).toBe(1)
  })

  it('wraps correctly: 12 and 1 are distance 1 apart', () => {
    expect(camelotDistance(12, 1)).toBe(1)
    expect(camelotDistance(1, 12)).toBe(1)
  })

  it('wraps correctly: 11 and 1 are distance 2 apart', () => {
    expect(camelotDistance(11, 1)).toBe(2)
    expect(camelotDistance(1, 11)).toBe(2)
  })

  it('returns 6 for maximally opposite numbers (1 and 7)', () => {
    expect(camelotDistance(1, 7)).toBe(6)
    expect(camelotDistance(7, 1)).toBe(6)
  })

  it('returns 5 for 1 and 6', () => {
    expect(camelotDistance(1, 6)).toBe(5)
  })

  it('is symmetric for all pairs', () => {
    for (let a = 1; a <= 12; a++) {
      for (let b = 1; b <= 12; b++) {
        expect(camelotDistance(a, b)).toBe(camelotDistance(b, a))
      }
    }
  })

  it('never exceeds 6', () => {
    for (let a = 1; a <= 12; a++) {
      for (let b = 1; b <= 12; b++) {
        expect(camelotDistance(a, b)).toBeLessThanOrEqual(6)
      }
    }
  })
})

// ---------------------------------------------------------------------------
// getCamelotTier
// ---------------------------------------------------------------------------

describe('getCamelotTier', () => {
  // Tier 1 — same key
  describe('Tier 1 (Perfect — same key)', () => {
    it('nA → nA is tier 1', () => {
      expect(getCamelotTier('4A', '4A')).toBe(1)
      expect(getCamelotTier('1A', '1A')).toBe(1)
      expect(getCamelotTier('12A', '12A')).toBe(1)
    })

    it('nB → nB is tier 1', () => {
      expect(getCamelotTier('4B', '4B')).toBe(1)
      expect(getCamelotTier('12B', '12B')).toBe(1)
    })
  })

  // Tier 2 — adjacent same-letter or parallel
  describe('Tier 2 (Strong)', () => {
    it('nA → (n+1)A is tier 2', () => {
      expect(getCamelotTier('4A', '5A')).toBe(2)
    })

    it('nA → (n-1)A is tier 2', () => {
      expect(getCamelotTier('4A', '3A')).toBe(2)
    })

    it('nB → (n+1)B is tier 2', () => {
      expect(getCamelotTier('4B', '5B')).toBe(2)
    })

    it('nB → (n-1)B is tier 2', () => {
      expect(getCamelotTier('4B', '3B')).toBe(2)
    })

    it('nA → nB (parallel) is tier 2', () => {
      expect(getCamelotTier('4A', '4B')).toBe(2)
    })

    it('nB → nA (parallel) is tier 2', () => {
      expect(getCamelotTier('4B', '4A')).toBe(2)
    })

    // Wrap edges
    it('1A → 12A wraps to tier 2', () => {
      expect(getCamelotTier('1A', '12A')).toBe(2)
    })

    it('12A → 1A wraps to tier 2', () => {
      expect(getCamelotTier('12A', '1A')).toBe(2)
    })

    it('1B → 12B wraps to tier 2', () => {
      expect(getCamelotTier('1B', '12B')).toBe(2)
    })

    it('12B → 1B wraps to tier 2', () => {
      expect(getCamelotTier('12B', '1B')).toBe(2)
    })
  })

  // Tier 3 — two steps same-letter, or adjacent cross-letter
  describe('Tier 3 (Works)', () => {
    it('nA → (n+2)A is tier 3', () => {
      expect(getCamelotTier('4A', '6A')).toBe(3)
    })

    it('nA → (n-2)A is tier 3', () => {
      expect(getCamelotTier('4A', '2A')).toBe(3)
    })

    it('nA → (n+1)B is tier 3', () => {
      expect(getCamelotTier('4A', '5B')).toBe(3)
    })

    it('nA → (n-1)B is tier 3', () => {
      expect(getCamelotTier('4A', '3B')).toBe(3)
    })

    it('nB → (n+2)B is tier 3', () => {
      expect(getCamelotTier('4B', '6B')).toBe(3)
    })

    it('nB → (n-2)B is tier 3', () => {
      expect(getCamelotTier('4B', '2B')).toBe(3)
    })

    it('nB → (n+1)A is tier 3', () => {
      expect(getCamelotTier('4B', '5A')).toBe(3)
    })

    it('nB → (n-1)A is tier 3', () => {
      expect(getCamelotTier('4B', '3A')).toBe(3)
    })

    // Wrap edges for tier 3
    it('1A → 11A wraps to tier 3', () => {
      expect(getCamelotTier('1A', '11A')).toBe(3)
    })

    it('12A → 2A wraps to tier 3', () => {
      expect(getCamelotTier('12A', '2A')).toBe(3)
    })

    it('1A → 12B wraps to tier 3 (cross-letter, dist 1)', () => {
      expect(getCamelotTier('1A', '12B')).toBe(3)
    })

    it('12B → 1A wraps to tier 3 (cross-letter, dist 1)', () => {
      expect(getCamelotTier('12B', '1A')).toBe(3)
    })
  })

  // Tier 4 — everything else
  describe('Tier 4 (Clash)', () => {
    it('nA → (n+3)A is tier 4', () => {
      expect(getCamelotTier('4A', '7A')).toBe(4)
    })

    it('nA → (n+2)B is tier 4', () => {
      expect(getCamelotTier('4A', '6B')).toBe(4)
    })

    it('opposite side of the wheel is tier 4', () => {
      expect(getCamelotTier('1A', '7A')).toBe(4)
      expect(getCamelotTier('1A', '7B')).toBe(4)
    })

    it('cross-letter with dist 2 is tier 4', () => {
      expect(getCamelotTier('4A', '6B')).toBe(4)
      expect(getCamelotTier('4A', '2B')).toBe(4)
    })
  })

  // Symmetry — tier should be the same in both directions
  describe('symmetry', () => {
    const pairs: Array<[CamelotKey, CamelotKey]> = [
      ['4A', '5A'], ['4A', '4B'], ['4A', '6A'], ['4A', '5B'],
      ['1A', '12A'], ['12A', '1A'], ['1A', '12B'],
    ]

    it.each(pairs)('getCamelotTier(%s, %s) equals getCamelotTier(%s, %s)', (a, b) => {
      expect(getCamelotTier(a, b)).toBe(getCamelotTier(b, a))
    })
  })
})

// ---------------------------------------------------------------------------
// getCompatibleKeys
// ---------------------------------------------------------------------------

describe('getCompatibleKeys', () => {
  describe('maxTier=1', () => {
    it('returns only the key itself', () => {
      expect(getCompatibleKeys('4A', 1)).toEqual(['4A'])
      expect(getCompatibleKeys('12B', 1)).toEqual(['12B'])
    })
  })

  describe('maxTier=2', () => {
    it('returns tier-1 + tier-2 keys for a mid-wheel key', () => {
      const keys = getCompatibleKeys('4A', 2)
      expect(keys.sort()).toEqual(['3A', '4A', '4B', '5A'].sort())
    })

    it('wraps correctly at boundary (1A)', () => {
      const keys = getCompatibleKeys('1A', 2)
      expect(keys.sort()).toEqual(['12A', '1A', '1B', '2A'].sort())
    })

    it('wraps correctly at boundary (12A)', () => {
      const keys = getCompatibleKeys('12A', 2)
      expect(keys.sort()).toEqual(['11A', '12A', '12B', '1A'].sort())
    })
  })

  describe('maxTier=3', () => {
    it('returns 8 keys for a mid-wheel key', () => {
      const keys = getCompatibleKeys('4A', 3)
      expect(keys).toHaveLength(8)
      expect(keys.sort()).toEqual(['2A', '3A', '3B', '4A', '4B', '5A', '5B', '6A'].sort())
    })

    it('wraps correctly for 1A', () => {
      const keys = getCompatibleKeys('1A', 3)
      expect(keys).toHaveLength(8)
      expect(keys.sort()).toEqual(['11A', '12A', '12B', '1A', '1B', '2A', '2B', '3A'].sort())
    })

    it('wraps correctly for 12B', () => {
      const keys = getCompatibleKeys('12B', 3)
      expect(keys).toHaveLength(8)
      expect(keys.sort()).toEqual(['10B', '11A', '11B', '12A', '12B', '1A', '1B', '2B'].sort())
    })
  })

  describe('maxTier=4', () => {
    it('returns all 24 keys', () => {
      expect(getCompatibleKeys('4A', 4)).toHaveLength(24)
      expect(getCompatibleKeys('1A', 4)).toHaveLength(24)
      expect(getCompatibleKeys('12B', 4)).toHaveLength(24)
    })
  })
})
