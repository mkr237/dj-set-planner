import { describe, expect, it } from 'vitest'
import { rankCandidates } from './ranker'
import type { ResolvedTrack, MixConstraints } from '../types'

// ---------------------------------------------------------------------------
// Fixtures
// ---------------------------------------------------------------------------

const defaults: MixConstraints = {
  bpmRange: 10,
  maxCamelotTier: 3,
  energyFilter: 'any',
}

const NO_OVERRIDES = { bpm: false, key: false, energy: false }

const makeTrack = (overrides: Partial<ResolvedTrack>): ResolvedTrack => ({
  spotifyId: 'default',
  title: 'Default',
  artist: 'Artist',
  bpm: 174,
  key: '4A',
  energy: 'High',
  spotifyUri: 'spotify:track:default',
  hasOverrides: NO_OVERRIDES,
  ...overrides,
})

// Current track used in most tests
const current = makeTrack({ spotifyId: 'current', title: 'Current', bpm: 174, key: '4A', energy: 'High' })

// A library that covers every filter dimension
const library: ResolvedTrack[] = [
  // Tier 1, BPM in range
  makeTrack({ spotifyId: 't1', title: 'T1-same', bpm: 174, key: '4A', energy: 'High' }),
  // Tier 2, BPM in range
  makeTrack({ spotifyId: 't2a', title: 'T2-adjacent', bpm: 175, key: '5A', energy: 'High' }),
  makeTrack({ spotifyId: 't2b', title: 'T2-parallel', bpm: 174, key: '4B', energy: 'Mid' }),
  // Tier 3, BPM in range
  makeTrack({ spotifyId: 't3a', title: 'T3-two-steps', bpm: 172, key: '6A', energy: 'Mid' }),
  makeTrack({ spotifyId: 't3b', title: 'T3-cross', bpm: 173, key: '5B', energy: 'Low' }),
  // Tier 4 — should be filtered out with maxCamelotTier=3
  makeTrack({ spotifyId: 't4', title: 'T4-clash', bpm: 174, key: '7A', energy: 'High' }),
  // BPM out of range (delta=15, default range=10)
  makeTrack({ spotifyId: 'bpm-out', title: 'BPM-out', bpm: 189, key: '4A', energy: 'High' }),
  // Current track itself
  current,
]

// ---------------------------------------------------------------------------
// Basic filtering
// ---------------------------------------------------------------------------

describe('rankCandidates — filtering', () => {
  it('excludes the current track from results', () => {
    const results = rankCandidates(current, library, defaults)
    expect(results.map(r => r.track.spotifyId)).not.toContain('current')
  })

  it('excludes tracks whose Camelot tier exceeds maxCamelotTier', () => {
    const results = rankCandidates(current, library, defaults)
    expect(results.map(r => r.track.spotifyId)).not.toContain('t4')
    results.forEach(r => expect(r.camelotTier).toBeLessThanOrEqual(defaults.maxCamelotTier))
  })

  it('excludes tracks outside the BPM range', () => {
    const results = rankCandidates(current, library, defaults)
    expect(results.map(r => r.track.spotifyId)).not.toContain('bpm-out')
    results.forEach(r => expect(r.bpmDelta).toBeLessThanOrEqual(defaults.bpmRange))
  })

  it('returns an empty array when no tracks pass the filters', () => {
    const results = rankCandidates(current, [current], defaults)
    expect(results).toHaveLength(0)
  })

  it('returns an empty array for an empty library', () => {
    const results = rankCandidates(current, [], defaults)
    expect(results).toHaveLength(0)
  })

  it('includes tracks at exactly the BPM boundary (bpmDelta === bpmRange)', () => {
    const atEdge = makeTrack({ spotifyId: 'edge', bpm: 184, key: '4A', energy: 'High' })
    const results = rankCandidates(current, [atEdge], defaults)
    expect(results).toHaveLength(1)
    expect(results[0].bpmDelta).toBe(10)
  })

  it('excludes tracks one BPM beyond the boundary', () => {
    const beyond = makeTrack({ spotifyId: 'beyond', bpm: 185, key: '4A', energy: 'High' })
    const results = rankCandidates(current, [beyond], defaults)
    expect(results).toHaveLength(0)
  })
})

// ---------------------------------------------------------------------------
// Energy filtering
// ---------------------------------------------------------------------------

describe('rankCandidates — energy filtering', () => {
  it('includes all energy levels when energyFilter is "any"', () => {
    const results = rankCandidates(current, library, { ...defaults, energyFilter: 'any' })
    const energies = results.map(r => r.track.energy)
    expect(energies).toContain('High')
    expect(energies).toContain('Mid')
    expect(energies).toContain('Low')
  })

  it('filters to only High energy tracks', () => {
    const results = rankCandidates(current, library, { ...defaults, energyFilter: ['High'] })
    results.forEach(r => expect(r.track.energy).toBe('High'))
  })

  it('filters to multiple specified energy levels', () => {
    const results = rankCandidates(current, library, { ...defaults, energyFilter: ['High', 'Mid'] })
    results.forEach(r => expect(r.track.energy).not.toBe('Low'))
  })

  it('returns empty array when no tracks match the energy filter', () => {
    const onlyLow = [makeTrack({ spotifyId: 'low', bpm: 174, key: '4A', energy: 'Low' })]
    const results = rankCandidates(current, onlyLow, { ...defaults, energyFilter: ['High'] })
    expect(results).toHaveLength(0)
  })
})

// ---------------------------------------------------------------------------
// Ranking order
// ---------------------------------------------------------------------------

describe('rankCandidates — ranking order', () => {
  it('sorts by tier ascending (tier 1 before tier 2 before tier 3)', () => {
    const results = rankCandidates(current, library, defaults)
    const tiers = results.map(r => r.camelotTier)
    for (let i = 1; i < tiers.length; i++) {
      expect(tiers[i]).toBeGreaterThanOrEqual(tiers[i - 1])
    }
  })

  it('tier-1 candidates appear first', () => {
    const results = rankCandidates(current, library, defaults)
    expect(results[0].camelotTier).toBe(1)
  })

  it('uses BPM proximity as a tiebreaker within the same tier', () => {
    const closer = makeTrack({ spotifyId: 'closer', bpm: 175, key: '4A', energy: 'High' }) // delta 1
    const farther = makeTrack({ spotifyId: 'farther', bpm: 180, key: '4A', energy: 'High' }) // delta 6
    const results = rankCandidates(current, [farther, closer], defaults)
    expect(results[0].track.spotifyId).toBe('closer')
    expect(results[1].track.spotifyId).toBe('farther')
  })

  it('a tier-2 track with delta 0 scores lower than a tier-1 track with delta 10', () => {
    const tier1far = makeTrack({ spotifyId: 'tier1-far', bpm: 184, key: '4A', energy: 'High' }) // tier1, delta=10
    const tier2close = makeTrack({ spotifyId: 'tier2-close', bpm: 174, key: '5A', energy: 'High' }) // tier2, delta=0
    const results = rankCandidates(current, [tier2close, tier1far], defaults)
    expect(results[0].track.spotifyId).toBe('tier1-far')
    expect(results[1].track.spotifyId).toBe('tier2-close')
  })

  it('populates overallScore correctly', () => {
    const t = makeTrack({ spotifyId: 'x', bpm: 177, key: '5A', energy: 'High' }) // tier2, delta=3
    const results = rankCandidates(current, [t], defaults)
    // overallScore = (tier-1)*1000 + bpmDelta = 1*1000 + 3 = 1003
    expect(results[0].overallScore).toBe(1003)
    expect(results[0].bpmDelta).toBe(3)
    expect(results[0].camelotTier).toBe(2)
  })
})

// ---------------------------------------------------------------------------
// Overrides
// ---------------------------------------------------------------------------

describe('rankCandidates — overrides', () => {
  it('a tighter bpmRange override excludes tracks the global range would allow', () => {
    const farBpm = makeTrack({ spotifyId: 'far', bpm: 182, key: '4A', energy: 'High' }) // delta=8
    const withGlobal = rankCandidates(current, [farBpm], defaults) // bpmRange=10, passes
    const withOverride = rankCandidates(current, [farBpm], defaults, { bpmRange: 5 })
    expect(withGlobal).toHaveLength(1)
    expect(withOverride).toHaveLength(0)
  })

  it('a looser maxCamelotTier override admits tier-4 tracks', () => {
    const clash = makeTrack({ spotifyId: 'clash', bpm: 174, key: '7A', energy: 'High' }) // tier 4
    const withGlobal = rankCandidates(current, [clash], defaults) // maxTier=3, excluded
    const withOverride = rankCandidates(current, [clash], defaults, { maxCamelotTier: 4 })
    expect(withGlobal).toHaveLength(0)
    expect(withOverride).toHaveLength(1)
  })

  it('an energyFilter override replaces the global filter', () => {
    const low = makeTrack({ spotifyId: 'low', bpm: 174, key: '4A', energy: 'Low' })
    const withGlobal = rankCandidates(current, [low], { ...defaults, energyFilter: ['High'] })
    const withOverride = rankCandidates(current, [low], { ...defaults, energyFilter: ['High'] }, { energyFilter: ['Low'] })
    expect(withGlobal).toHaveLength(0)
    expect(withOverride).toHaveLength(1)
  })

  it('does not mutate the original constraints object', () => {
    const frozen = Object.freeze({ ...defaults })
    expect(() => rankCandidates(current, library, frozen, { bpmRange: 5 })).not.toThrow()
  })
})

// ---------------------------------------------------------------------------
// Null bpm / key handling
// ---------------------------------------------------------------------------

describe('rankCandidates — null bpm / key on current track', () => {
  it('returns [] when currentTrack has null bpm', () => {
    const nullBpm = makeTrack({ spotifyId: 'cur', bpm: null, key: '4A' })
    const results = rankCandidates(nullBpm, library, defaults)
    expect(results).toHaveLength(0)
  })

  it('returns [] when currentTrack has null key', () => {
    const nullKey = makeTrack({ spotifyId: 'cur', bpm: 174, key: null })
    const results = rankCandidates(nullKey, library, defaults)
    expect(results).toHaveLength(0)
  })
})

describe('rankCandidates — null bpm / key on candidates', () => {
  it('excludes candidates with null bpm', () => {
    const nullBpm = makeTrack({ spotifyId: 'null-bpm', bpm: null, key: '4A', energy: 'High' })
    const results = rankCandidates(current, [nullBpm], defaults)
    expect(results).toHaveLength(0)
  })

  it('excludes candidates with null key', () => {
    const nullKey = makeTrack({ spotifyId: 'null-key', bpm: 174, key: null, energy: 'High' })
    const results = rankCandidates(current, [nullKey], defaults)
    expect(results).toHaveLength(0)
  })

  it('still returns valid candidates when some have null bpm/key', () => {
    const valid = makeTrack({ spotifyId: 'valid', bpm: 174, key: '5A', energy: 'High' })
    const nullBpm = makeTrack({ spotifyId: 'null-bpm', bpm: null, key: '4A', energy: 'High' })
    const results = rankCandidates(current, [valid, nullBpm], defaults)
    expect(results).toHaveLength(1)
    expect(results[0].track.spotifyId).toBe('valid')
  })
})

// ---------------------------------------------------------------------------
// Unknown energy pass-through
// ---------------------------------------------------------------------------

describe('rankCandidates — Unknown energy', () => {
  it('includes Unknown energy tracks when energyFilter is "any"', () => {
    const unknown = makeTrack({ spotifyId: 'unk', bpm: 174, key: '4A', energy: 'Unknown' })
    const results = rankCandidates(current, [unknown], defaults)
    expect(results).toHaveLength(1)
  })

  it('includes Unknown energy tracks even when energyFilter is set to High only', () => {
    const unknown = makeTrack({ spotifyId: 'unk', bpm: 174, key: '4A', energy: 'Unknown' })
    const results = rankCandidates(current, [unknown], { ...defaults, energyFilter: ['High'] })
    expect(results).toHaveLength(1)
  })

  it('includes Unknown energy tracks even when energyFilter is set to Low only', () => {
    const unknown = makeTrack({ spotifyId: 'unk', bpm: 174, key: '4A', energy: 'Unknown' })
    const results = rankCandidates(current, [unknown], { ...defaults, energyFilter: ['Low'] })
    expect(results).toHaveLength(1)
  })

  it('excludes non-Unknown tracks that do not match the energy filter', () => {
    const unknown = makeTrack({ spotifyId: 'unk', bpm: 174, key: '4A', energy: 'Unknown' })
    const low = makeTrack({ spotifyId: 'low', bpm: 174, key: '4A', energy: 'Low' })
    const results = rankCandidates(current, [unknown, low], { ...defaults, energyFilter: ['High'] })
    expect(results).toHaveLength(1)
    expect(results[0].track.spotifyId).toBe('unk')
  })
})

// ---------------------------------------------------------------------------
// Wrap-around Camelot edge cases
// ---------------------------------------------------------------------------

describe('rankCandidates — Camelot wrap-around', () => {
  const at1A = makeTrack({ spotifyId: 'cur', bpm: 174, key: '1A', energy: 'High' })

  it('12A is a tier-2 candidate from 1A', () => {
    const wrap = makeTrack({ spotifyId: 'wrap', bpm: 174, key: '12A', energy: 'High' })
    const results = rankCandidates(at1A, [wrap], defaults)
    expect(results).toHaveLength(1)
    expect(results[0].camelotTier).toBe(2)
  })

  it('11A is a tier-3 candidate from 1A', () => {
    const wrap = makeTrack({ spotifyId: 'wrap', bpm: 174, key: '11A', energy: 'High' })
    const results = rankCandidates(at1A, [wrap], defaults)
    expect(results).toHaveLength(1)
    expect(results[0].camelotTier).toBe(3)
  })

  it('12B is a tier-3 candidate from 1A (cross-letter, dist 1)', () => {
    const wrap = makeTrack({ spotifyId: 'wrap', bpm: 174, key: '12B', energy: 'High' })
    const results = rankCandidates(at1A, [wrap], defaults)
    expect(results).toHaveLength(1)
    expect(results[0].camelotTier).toBe(3)
  })
})
