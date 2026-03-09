import type { Track, MixConstraints } from '../types'
import { getCamelotTier } from './camelot'

export interface RankedCandidate {
  track: Track
  camelotTier: 1 | 2 | 3 | 4
  bpmDelta: number
  overallScore: number
}

/**
 * Filters and ranks tracks from `library` as candidates to follow `currentTrack`.
 *
 * Filtering (applied in order):
 *   1. The current track itself is excluded
 *   2. Camelot tier must be ≤ effectiveConstraints.maxCamelotTier
 *   3. BPM delta must be ≤ effectiveConstraints.bpmRange
 *   4. Energy level must be in effectiveConstraints.energyFilter (or 'any')
 *
 * Ranking:
 *   Sorted ascending by overallScore = (tier − 1) × 1000 + bpmDelta,
 *   so tier is the primary key and BPM proximity is the tiebreaker.
 *
 * @param currentTrack  The last track in the set
 * @param library       Full track library to draw candidates from
 * @param constraints   Global mixing constraints
 * @param overrides     Per-step overrides merged on top of constraints
 */
export function rankCandidates(
  currentTrack: Track,
  library: Track[],
  constraints: MixConstraints,
  overrides?: Partial<MixConstraints>,
): RankedCandidate[] {
  const effective: MixConstraints = { ...constraints, ...overrides }

  const results: RankedCandidate[] = []

  for (const track of library) {
    if (track.id === currentTrack.id) continue

    const camelotTier = getCamelotTier(currentTrack.key, track.key)
    if (camelotTier > effective.maxCamelotTier) continue

    const bpmDelta = Math.abs(track.bpm - currentTrack.bpm)
    if (bpmDelta > effective.bpmRange) continue

    if (effective.energyFilter !== 'any' && !effective.energyFilter.includes(track.energy)) continue

    const overallScore = (camelotTier - 1) * 1000 + bpmDelta

    results.push({ track, camelotTier, bpmDelta, overallScore })
  }

  return results.sort((a, b) => a.overallScore - b.overallScore)
}
