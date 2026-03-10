import {
  createContext,
  useContext,
  useReducer,
  useEffect,
  type ReactNode,
  type Dispatch,
} from 'react'
import type {
  SpotifyTrack,
  TrackOverrides,
  ResolvedTrack,
  DJSet,
  MixConstraints,
  SetTrack,
  ConnectedPlaylist,
} from '../types'
import { resolveTrack } from '../utils/trackResolver'
import { storage } from '../storage'

// ---------------------------------------------------------------------------
// Derive the effective resolved track pool from the per-playlist cache.
// Includes tracks from enabled playlists + any track already in the current
// set (so the timeline stays intact even if its playlist is disabled).
// ---------------------------------------------------------------------------

function recomputeTracks(
  cache: Record<string, SpotifyTrack[]>,
  playlists: ConnectedPlaylist[],
  currentSet: DJSet | null,
  overrides: TrackOverrides[],
): ResolvedTrack[] {
  const enabledIds = new Set(playlists.filter(p => p.enabled).map(p => p.spotifyId))
  const setTrackIds = new Set(currentSet?.tracks.map(t => t.trackId) ?? [])
  const overrideMap = new Map(overrides.map(o => [o.spotifyId, o]))

  const seen = new Set<string>()
  const result: ResolvedTrack[] = []

  for (const [playlistId, tracks] of Object.entries(cache)) {
    const inEnabledPlaylist = enabledIds.has(playlistId)
    for (const track of tracks) {
      if (seen.has(track.spotifyId)) continue
      seen.add(track.spotifyId)
      if (inEnabledPlaylist || setTrackIds.has(track.spotifyId)) {
        result.push(resolveTrack(track, overrideMap.get(track.spotifyId) ?? null))
      }
    }
  }

  return result
}

// ---------------------------------------------------------------------------
// State
// ---------------------------------------------------------------------------

export interface AppState {
  tracks: ResolvedTrack[]
  /** Per-playlist Spotify track cache (session-only, not persisted). */
  playlistTracksCache: Record<string, SpotifyTrack[]>
  /** User overrides to Spotify data (persisted). */
  overrides: TrackOverrides[]
  /** IDs of playlists whose tracks are currently being fetched. */
  fetchingPlaylistIds: string[]
  currentSet: DJSet | null
  constraints: MixConstraints
  connectedPlaylists: ConnectedPlaylist[]
}

const DEFAULT_CONSTRAINTS: MixConstraints = {
  bpmRange: 10,
  maxCamelotTier: 3,
  energyFilter: 'any',
}

const initialState: AppState = {
  tracks: [],
  playlistTracksCache: {},
  overrides: [],
  fetchingPlaylistIds: [],
  currentSet: null,
  constraints: DEFAULT_CONSTRAINTS,
  connectedPlaylists: [],
}

// ---------------------------------------------------------------------------
// Actions
// ---------------------------------------------------------------------------

export type AppAction =
  | { type: 'LOAD_OVERRIDES'; payload: TrackOverrides[] }
  | { type: 'SET_OVERRIDE'; payload: TrackOverrides }
  | { type: 'SET_CONSTRAINTS'; payload: MixConstraints }
  | { type: 'NEW_SET' }
  | { type: 'LOAD_SET'; payload: DJSet }
  | { type: 'RENAME_SET'; payload: string }
  | { type: 'ADD_TRACK_TO_SET'; payload: string }            // spotifyId
  | { type: 'REMOVE_TRACK_FROM_SET'; payload: number }       // position index
  | { type: 'REORDER_SET_TRACKS'; payload: SetTrack[] }
  | { type: 'SET_PLAYLISTS'; payload: ConnectedPlaylist[] }
  | { type: 'TOGGLE_PLAYLIST'; payload: string }             // spotifyId
  | { type: 'SET_ALL_PLAYLISTS_ENABLED'; payload: boolean }
  | { type: 'CACHE_PLAYLIST_TRACKS'; payload: { playlistId: string; tracks: SpotifyTrack[] } }
  | { type: 'SET_PLAYLIST_FETCHING'; payload: { playlistId: string; fetching: boolean } }

// ---------------------------------------------------------------------------
// Reducer
// ---------------------------------------------------------------------------

export function appReducer(state: AppState, action: AppAction): AppState {
  switch (action.type) {
    case 'LOAD_OVERRIDES':
      return {
        ...state,
        overrides: action.payload,
        tracks: recomputeTracks(
          state.playlistTracksCache,
          state.connectedPlaylists,
          state.currentSet,
          action.payload,
        ),
      }

    case 'SET_OVERRIDE': {
      const idx = state.overrides.findIndex(o => o.spotifyId === action.payload.spotifyId)
      const newOverrides = idx >= 0
        ? state.overrides.map((o, i) => (i === idx ? action.payload : o))
        : [...state.overrides, action.payload]
      return {
        ...state,
        overrides: newOverrides,
        tracks: recomputeTracks(
          state.playlistTracksCache,
          state.connectedPlaylists,
          state.currentSet,
          newOverrides,
        ),
      }
    }

    case 'SET_CONSTRAINTS':
      return { ...state, constraints: action.payload }

    case 'NEW_SET':
      return {
        ...state,
        currentSet: {
          id: crypto.randomUUID(),
          name: 'Untitled Set',
          tracks: [],
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        },
      }

    case 'LOAD_SET':
      return { ...state, currentSet: action.payload }

    case 'RENAME_SET': {
      if (!state.currentSet) return state
      return {
        ...state,
        currentSet: {
          ...state.currentSet,
          name: action.payload,
          updatedAt: new Date().toISOString(),
        },
      }
    }

    case 'ADD_TRACK_TO_SET': {
      const base: DJSet = state.currentSet ?? {
        id: crypto.randomUUID(),
        name: 'Untitled Set',
        tracks: [],
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      }
      return {
        ...state,
        currentSet: {
          ...base,
          tracks: [
            ...base.tracks,
            { trackId: action.payload, position: base.tracks.length },
          ],
          updatedAt: new Date().toISOString(),
        },
      }
    }

    case 'REMOVE_TRACK_FROM_SET': {
      if (!state.currentSet) return state
      const reindexed = state.currentSet.tracks
        .filter(t => t.position !== action.payload)
        .map((t, idx) => ({ ...t, position: idx }))
      return {
        ...state,
        currentSet: {
          ...state.currentSet,
          tracks: reindexed,
          updatedAt: new Date().toISOString(),
        },
      }
    }

    case 'REORDER_SET_TRACKS': {
      if (!state.currentSet) return state
      return {
        ...state,
        currentSet: {
          ...state.currentSet,
          tracks: action.payload,
          updatedAt: new Date().toISOString(),
        },
      }
    }

    case 'SET_PLAYLISTS':
      return { ...state, connectedPlaylists: action.payload }

    case 'TOGGLE_PLAYLIST': {
      const updatedPlaylists = state.connectedPlaylists.map(p =>
        p.spotifyId === action.payload ? { ...p, enabled: !p.enabled } : p
      )
      return {
        ...state,
        connectedPlaylists: updatedPlaylists,
        tracks: recomputeTracks(
          state.playlistTracksCache,
          updatedPlaylists,
          state.currentSet,
          state.overrides,
        ),
      }
    }

    case 'SET_ALL_PLAYLISTS_ENABLED': {
      const updatedPlaylists = state.connectedPlaylists.map(p => ({
        ...p,
        enabled: action.payload,
      }))
      return {
        ...state,
        connectedPlaylists: updatedPlaylists,
        tracks: recomputeTracks(
          state.playlistTracksCache,
          updatedPlaylists,
          state.currentSet,
          state.overrides,
        ),
      }
    }

    case 'CACHE_PLAYLIST_TRACKS': {
      const newCache = {
        ...state.playlistTracksCache,
        [action.payload.playlistId]: action.payload.tracks,
      }
      return {
        ...state,
        playlistTracksCache: newCache,
        tracks: recomputeTracks(
          newCache,
          state.connectedPlaylists,
          state.currentSet,
          state.overrides,
        ),
      }
    }

    case 'SET_PLAYLIST_FETCHING': {
      const { playlistId, fetching } = action.payload
      return {
        ...state,
        fetchingPlaylistIds: fetching
          ? [...state.fetchingPlaylistIds, playlistId]
          : state.fetchingPlaylistIds.filter(id => id !== playlistId),
      }
    }

    default:
      return state
  }
}

// ---------------------------------------------------------------------------
// Context
// ---------------------------------------------------------------------------

interface AppContextValue {
  state: AppState
  dispatch: Dispatch<AppAction>
}

const AppContext = createContext<AppContextValue | null>(null)

// ---------------------------------------------------------------------------
// Provider
// ---------------------------------------------------------------------------

export function AppProvider({ children }: { children: ReactNode }) {
  const [state, dispatch] = useReducer(appReducer, initialState)

  // Load persisted data on mount
  useEffect(() => {
    Promise.all([
      storage.getOverrides(),
      storage.getConstraints(),
      storage.getPlaylists(),
    ]).then(([overrides, constraints, playlists]) => {
      dispatch({ type: 'LOAD_OVERRIDES', payload: overrides })
      dispatch({ type: 'SET_CONSTRAINTS', payload: constraints })
      dispatch({ type: 'SET_PLAYLISTS', payload: playlists })
    })
  }, [])

  // Persist overrides whenever they change
  useEffect(() => {
    storage.saveOverrides(state.overrides)
  }, [state.overrides])

  // Persist constraints whenever they change
  useEffect(() => {
    storage.saveConstraints(state.constraints)
  }, [state.constraints])

  // Persist playlists whenever they change
  useEffect(() => {
    storage.savePlaylists(state.connectedPlaylists)
  }, [state.connectedPlaylists])

  return (
    <AppContext.Provider value={{ state, dispatch }}>
      {children}
    </AppContext.Provider>
  )
}

// ---------------------------------------------------------------------------
// Hook
// ---------------------------------------------------------------------------

export function useAppContext(): AppContextValue {
  const ctx = useContext(AppContext)
  if (!ctx) throw new Error('useAppContext must be used within AppProvider')
  return ctx
}
