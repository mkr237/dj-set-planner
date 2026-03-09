import {
  createContext,
  useContext,
  useReducer,
  useEffect,
  type ReactNode,
  type Dispatch,
} from 'react'
import type { Track, DJSet, MixConstraints, SetTrack } from '../types'
import { storage } from '../storage'

// ---------------------------------------------------------------------------
// State
// ---------------------------------------------------------------------------

export interface AppState {
  tracks: Track[]
  currentSet: DJSet | null
  constraints: MixConstraints
}

const DEFAULT_CONSTRAINTS: MixConstraints = {
  bpmRange: 10,
  maxCamelotTier: 3,
  energyFilter: 'any',
}

const initialState: AppState = {
  tracks: [],
  currentSet: null,
  constraints: DEFAULT_CONSTRAINTS,
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
  | { type: 'ADD_TRACK_TO_SET'; payload: string }      // trackId
  | { type: 'REMOVE_TRACK_FROM_SET'; payload: number } // position index
  | { type: 'REORDER_SET_TRACKS'; payload: SetTrack[] }

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

  // Load persisted tracks and constraints on mount
  useEffect(() => {
    Promise.all([storage.getTracks(), storage.getConstraints()]).then(
      ([tracks, constraints]) => {
        dispatch({ type: 'SET_TRACKS', payload: tracks })
        dispatch({ type: 'SET_CONSTRAINTS', payload: constraints })
      }
    )
  }, [])

  // Persist tracks whenever they change
  useEffect(() => {
    storage.saveTracks(state.tracks)
  }, [state.tracks])

  // Persist constraints whenever they change
  useEffect(() => {
    storage.saveConstraints(state.constraints)
  }, [state.constraints])

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
