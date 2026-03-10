import { beforeEach, describe, expect, it } from 'vitest'
import { LocalStorageService } from './localStorage'
import type { DJSet, MixConstraints, TrackOverrides, ConnectedPlaylist } from '../types'
import type { SpotifyAuth } from '../spotify/types'

const makeOverride = (overrides: Partial<TrackOverrides> = {}): TrackOverrides => ({
  spotifyId: 'track-1',
  bpm: 174,
  key: '4A',
  energy: 'High',
  ...overrides,
})

const makePlaylist = (overrides: Partial<ConnectedPlaylist> = {}): ConnectedPlaylist => ({
  spotifyId: 'playlist-1',
  name: 'Test Playlist',
  trackCount: 10,
  enabled: false,
  lastSynced: '2024-01-01T00:00:00.000Z',
  ...overrides,
})

const makeAuth = (overrides: Partial<SpotifyAuth> = {}): SpotifyAuth => ({
  accessToken: 'access-token',
  refreshToken: 'refresh-token',
  expiresAt: 9999999999999,
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

    it('getOverride returns null when not found', async () => {
      expect(await service.getOverride('unknown')).toBeNull()
    })

    it('getOverride returns the correct entry by spotifyId', async () => {
      await service.saveOverrides([makeOverride(), makeOverride({ spotifyId: 'track-2', bpm: 140 })])
      const result = await service.getOverride('track-2')
      expect(result?.bpm).toBe(140)
    })

    it('saveOverride inserts a new entry', async () => {
      await service.saveOverride(makeOverride({ spotifyId: 'track-1' }))
      await service.saveOverride(makeOverride({ spotifyId: 'track-2', bpm: 140 }))
      expect(await service.getOverrides()).toHaveLength(2)
    })

    it('saveOverride updates an existing entry in place', async () => {
      await service.saveOverride(makeOverride({ bpm: 174 }))
      await service.saveOverride(makeOverride({ bpm: 180 }))
      const all = await service.getOverrides()
      expect(all).toHaveLength(1)
      expect(all[0].bpm).toBe(180)
    })

    it('deleteOverride removes the correct entry', async () => {
      await service.saveOverrides([makeOverride({ spotifyId: 'track-1' }), makeOverride({ spotifyId: 'track-2' })])
      await service.deleteOverride('track-1')
      const all = await service.getOverrides()
      expect(all).toHaveLength(1)
      expect(all[0].spotifyId).toBe('track-2')
    })

    it('deleteOverride on unknown id leaves other entries intact', async () => {
      await service.saveOverrides([makeOverride()])
      await service.deleteOverride('nonexistent')
      expect(await service.getOverrides()).toHaveLength(1)
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

  // --- Playlists ---

  describe('playlists', () => {
    it('returns empty array when no playlists stored', async () => {
      expect(await service.getPlaylists()).toEqual([])
    })

    it('saves and retrieves playlists', async () => {
      const playlists = [makePlaylist(), makePlaylist({ spotifyId: 'playlist-2', name: 'Second' })]
      await service.savePlaylists(playlists)
      expect(await service.getPlaylists()).toEqual(playlists)
    })

    it('overwrites previously saved playlists on save', async () => {
      await service.savePlaylists([makePlaylist()])
      await service.savePlaylists([makePlaylist({ spotifyId: 'playlist-2' })])
      const result = await service.getPlaylists()
      expect(result).toHaveLength(1)
      expect(result[0].spotifyId).toBe('playlist-2')
    })

    it('persists the enabled flag', async () => {
      await service.savePlaylists([makePlaylist({ enabled: true })])
      const result = await service.getPlaylists()
      expect(result[0].enabled).toBe(true)
    })
  })

  // --- Spotify auth ---

  describe('spotify auth', () => {
    it('returns null when no auth stored', async () => {
      expect(await service.getSpotifyAuth()).toBeNull()
    })

    it('saves and retrieves auth', async () => {
      const auth = makeAuth()
      await service.saveSpotifyAuth(auth)
      expect(await service.getSpotifyAuth()).toEqual(auth)
    })

    it('overwrites previously saved auth', async () => {
      await service.saveSpotifyAuth(makeAuth({ accessToken: 'old' }))
      await service.saveSpotifyAuth(makeAuth({ accessToken: 'new' }))
      const result = await service.getSpotifyAuth()
      expect(result?.accessToken).toBe('new')
    })

    it('clearSpotifyAuth removes stored auth', async () => {
      await service.saveSpotifyAuth(makeAuth())
      await service.clearSpotifyAuth()
      expect(await service.getSpotifyAuth()).toBeNull()
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
