import {
  createContext,
  useContext,
  useReducer,
  useEffect,
  type ReactNode,
  type Dispatch,
} from 'react'
import type { Track, DJSet, MixConstraints, SetTrack, ConnectedPlaylist } from '../types'
import { storage } from '../storage'

// ---------------------------------------------------------------------------
// Derive the effective track pool from the per-playlist cache.
// Includes tracks from enabled playlists + any track already in the current
// set (so the timeline stays intact even if its playlist is disabled).
// ---------------------------------------------------------------------------

function recomputeTracks(
  cache: Record<string, Track[]>,
  playlists: ConnectedPlaylist[],
  currentSet: DJSet | null
): Track[] {
  const enabledIds = new Set(playlists.filter(p => p.enabled).map(p => p.spotifyId))
  const setTrackIds = new Set(currentSet?.tracks.map(t => t.trackId) ?? [])

  const seen = new Set<string>()
  const result: Track[] = []

  for (const [playlistId, tracks] of Object.entries(cache)) {
    const inEnabledPlaylist = enabledIds.has(playlistId)
    for (const track of tracks) {
      if (seen.has(track.id)) continue
      seen.add(track.id)
      if (inEnabledPlaylist || setTrackIds.has(track.id)) {
        result.push(track)
      }
    }
  }

  return result
}

// ---------------------------------------------------------------------------
// State
// ---------------------------------------------------------------------------

export interface AppState {
  tracks: Track[]
  /** Per-playlist track cache (session-only, not persisted). */
  playlistTracksCache: Record<string, Track[]>
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
  fetchingPlaylistIds: [],
  currentSet: null,
  constraints: DEFAULT_CONSTRAINTS,
  connectedPlaylists: [],
}

// ---------------------------------------------------------------------------
// Actions
// ---------------------------------------------------------------------------

export type AppAction =
  | { type: 'SET_TRACKS'; payload: Track[] }
  | { type: 'EDIT_TRACK'; payload: Track }
  | { type: 'SET_CONSTRAINTS'; payload: MixConstraints }
  | { type: 'NEW_SET' }
  | { type: 'LOAD_SET'; payload: DJSet }
  | { type: 'RENAME_SET'; payload: string }
  | { type: 'ADD_TRACK_TO_SET'; payload: string }            // trackId
  | { type: 'REMOVE_TRACK_FROM_SET'; payload: number }       // position index
  | { type: 'REORDER_SET_TRACKS'; payload: SetTrack[] }
  | { type: 'SET_PLAYLISTS'; payload: ConnectedPlaylist[] }
  | { type: 'TOGGLE_PLAYLIST'; payload: string }             // spotifyId
  | { type: 'SET_ALL_PLAYLISTS_ENABLED'; payload: boolean }
  | { type: 'CACHE_PLAYLIST_TRACKS'; payload: { playlistId: string; tracks: Track[] } }
  | { type: 'SET_PLAYLIST_FETCHING'; payload: { playlistId: string; fetching: boolean } }

// ---------------------------------------------------------------------------
// Reducer
// ---------------------------------------------------------------------------

export function appReducer(state: AppState, action: AppAction): AppState {
  switch (action.type) {
    case 'SET_TRACKS':
      return { ...state, tracks: action.payload }

    case 'EDIT_TRACK':
      return {
        ...state,
        tracks: state.tracks.map(t => t.id === action.payload.id ? action.payload : t),
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
        tracks: recomputeTracks(state.playlistTracksCache, updatedPlaylists, state.currentSet),
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
        tracks: recomputeTracks(state.playlistTracksCache, updatedPlaylists, state.currentSet),
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
        tracks: recomputeTracks(newCache, state.connectedPlaylists, state.currentSet),
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
      storage.getTracks(),
      storage.getConstraints(),
      storage.getPlaylists(),
    ]).then(([tracks, constraints, playlists]) => {
      dispatch({ type: 'SET_TRACKS', payload: tracks })
      dispatch({ type: 'SET_CONSTRAINTS', payload: constraints })
      dispatch({ type: 'SET_PLAYLISTS', payload: playlists })
    })
  }, [])

  // Persist tracks whenever they change
  useEffect(() => {
    storage.saveTracks(state.tracks)
  }, [state.tracks])

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
