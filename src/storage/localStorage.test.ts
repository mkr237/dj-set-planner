import { beforeEach, describe, expect, it } from 'vitest'
import { LocalStorageService } from './localStorage'
import type { DJSet, MixConstraints, TrackOverrides } from '../types'

const makeOverride = (overrides: Partial<TrackOverrides> = {}): TrackOverrides => ({
  spotifyId: 'track-1',
  bpm: 174,
  key: '4A',
  energy: 'High',
  ...overrides,
})

const makeSet = (overrides: Partial<DJSet> = {}): DJSet => ({
  id: 'set-1',
  name: 'Test Set',
  tracks: [],
  createdAt: '2024-01-01T00:00:00.000Z',
  updatedAt: '2024-01-01T00:00:00.000Z',
  ...overrides,
})

describe('LocalStorageService', () => {
  let service: LocalStorageService

  beforeEach(() => {
    localStorage.clear()
    service = new LocalStorageService()
  })

  // --- Overrides ---

  describe('overrides', () => {
    it('returns empty array when no overrides stored', async () => {
      expect(await service.getOverrides()).toEqual([])
    })

    it('saves and retrieves overrides', async () => {
      const overrides = [makeOverride(), makeOverride({ spotifyId: 'track-2', bpm: 140 })]
      await service.saveOverrides(overrides)
      expect(await service.getOverrides()).toEqual(overrides)
    })

    it('overwrites existing overrides on save', async () => {
      await service.saveOverrides([makeOverride()])
      await service.saveOverrides([makeOverride({ spotifyId: 'track-2' })])
      const result = await service.getOverrides()
      expect(result).toHaveLength(1)
      expect(result[0].spotifyId).toBe('track-2')
    })
  })

  // --- Sets ---

  describe('sets', () => {
    it('returns empty array when no sets stored', async () => {
      expect(await service.getSets()).toEqual([])
    })

    it('saves a new set and retrieves it', async () => {
      const set = makeSet()
      await service.saveSet(set)
      expect(await service.getSets()).toEqual([set])
    })

    it('updates an existing set in place', async () => {
      const set = makeSet()
      await service.saveSet(set)
      const updated = { ...set, name: 'Renamed Set' }
      await service.saveSet(updated)
      const sets = await service.getSets()
      expect(sets).toHaveLength(1)
      expect(sets[0].name).toBe('Renamed Set')
    })

    it('stores multiple sets independently', async () => {
      await service.saveSet(makeSet({ id: 'set-1' }))
      await service.saveSet(makeSet({ id: 'set-2', name: 'Second Set' }))
      expect(await service.getSets()).toHaveLength(2)
    })

    it('getSet returns the correct set by id', async () => {
      await service.saveSet(makeSet({ id: 'set-1', name: 'First' }))
      await service.saveSet(makeSet({ id: 'set-2', name: 'Second' }))
      const result = await service.getSet('set-2')
      expect(result?.name).toBe('Second')
    })

    it('getSet returns null for unknown id', async () => {
      expect(await service.getSet('nonexistent')).toBeNull()
    })

    it('deleteSet removes the correct set', async () => {
      await service.saveSet(makeSet({ id: 'set-1' }))
      await service.saveSet(makeSet({ id: 'set-2' }))
      await service.deleteSet('set-1')
      const sets = await service.getSets()
      expect(sets).toHaveLength(1)
      expect(sets[0].id).toBe('set-2')
    })

    it('deleteSet on unknown id leaves other sets intact', async () => {
      await service.saveSet(makeSet({ id: 'set-1' }))
      await service.deleteSet('nonexistent')
      expect(await service.getSets()).toHaveLength(1)
    })
  })

  // --- Constraints ---

  describe('constraints', () => {
    it('returns default constraints when none stored', async () => {
      const constraints = await service.getConstraints()
      expect(constraints).toEqual({
        bpmRange: 10,
        maxCamelotTier: 3,
        energyFilter: 'any',
      })
    })

    it('saves and retrieves constraints', async () => {
      const custom: MixConstraints = {
        bpmRange: 5,
        maxCamelotTier: 2,
        energyFilter: ['High', 'Mid'],
      }
      await service.saveConstraints(custom)
      expect(await service.getConstraints()).toEqual(custom)
    })

    it('overwrites previously saved constraints', async () => {
      await service.saveConstraints({ bpmRange: 5, maxCamelotTier: 2, energyFilter: 'any' })
      await service.saveConstraints({ bpmRange: 15, maxCamelotTier: 4, energyFilter: ['Low'] })
      const result = await service.getConstraints()
      expect(result.bpmRange).toBe(15)
      expect(result.maxCamelotTier).toBe(4)
    })
  })

  // --- Isolation ---

  it('overrides and sets are stored under separate keys', async () => {
    await service.saveOverrides([makeOverride()])
    await service.saveSet(makeSet())
    expect(localStorage.getItem('djsp:overrides')).not.toBeNull()
    expect(localStorage.getItem('djsp:sets')).not.toBeNull()
  })
})
