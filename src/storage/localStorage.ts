import type { DJSet, MixConstraints, Track } from '../types'
import type { StorageService } from './types'

const KEYS = {
  tracks: 'djsp:tracks',
  sets: 'djsp:sets',
  constraints: 'djsp:constraints',
} as const

const DEFAULT_CONSTRAINTS: MixConstraints = {
  bpmRange: 10,
  maxCamelotTier: 3,
  energyFilter: 'any',
}

function read<T>(key: string, fallback: T): T {
  const raw = localStorage.getItem(key)
  if (raw === null) return fallback
  return JSON.parse(raw) as T
}

function write<T>(key: string, value: T): void {
  localStorage.setItem(key, JSON.stringify(value))
}

export class LocalStorageService implements StorageService {
  getTracks(): Promise<Track[]> {
    return Promise.resolve(read<Track[]>(KEYS.tracks, []))
  }

  saveTracks(tracks: Track[]): Promise<void> {
    write(KEYS.tracks, tracks)
    return Promise.resolve()
  }

  getSets(): Promise<DJSet[]> {
    return Promise.resolve(read<DJSet[]>(KEYS.sets, []))
  }

  getSet(id: string): Promise<DJSet | null> {
    const sets = read<DJSet[]>(KEYS.sets, [])
    return Promise.resolve(sets.find(s => s.id === id) ?? null)
  }

  saveSet(set: DJSet): Promise<void> {
    const sets = read<DJSet[]>(KEYS.sets, [])
    const idx = sets.findIndex(s => s.id === set.id)
    if (idx >= 0) {
      sets[idx] = set
    } else {
      sets.push(set)
    }
    write(KEYS.sets, sets)
    return Promise.resolve()
  }

  deleteSet(id: string): Promise<void> {
    const sets = read<DJSet[]>(KEYS.sets, []).filter(s => s.id !== id)
    write(KEYS.sets, sets)
    return Promise.resolve()
  }

  getConstraints(): Promise<MixConstraints> {
    return Promise.resolve(read<MixConstraints>(KEYS.constraints, DEFAULT_CONSTRAINTS))
  }

  saveConstraints(constraints: MixConstraints): Promise<void> {
    write(KEYS.constraints, constraints)
    return Promise.resolve()
  }
}
