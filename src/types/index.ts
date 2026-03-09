export type EnergyLevel = 'Low' | 'Mid' | 'High' | 'Unknown'

export type CamelotKey =
  | '1A' | '2A' | '3A' | '4A' | '5A' | '6A'
  | '7A' | '8A' | '9A' | '10A' | '11A' | '12A'
  | '1B' | '2B' | '3B' | '4B' | '5B' | '6B'
  | '7B' | '8B' | '9B' | '10B' | '11B' | '12B'

export interface Track {
  id: string
  title: string
  artist: string
  bpm: number | null       // null = missing, track excluded from candidate ranking
  key: CamelotKey | null   // null = missing, track excluded from candidate ranking
  energy: EnergyLevel      // 'Unknown' passes through all energy filters
  genre?: string
  label?: string
  notes?: string
}

export interface SetTrack {
  trackId: string
  position: number
  transitionNote?: string
}

export interface DJSet {
  id: string
  name: string
  tracks: SetTrack[]
  createdAt: string
  updatedAt: string
}

export interface MixConstraints {
  bpmRange: number
  maxCamelotTier: number
  energyFilter: EnergyLevel[] | 'any'
}
