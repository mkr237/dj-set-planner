export type EnergyLevel = 'Low' | 'Mid' | 'High' | 'Unknown'

export type CamelotKey =
  | '1A' | '2A' | '3A' | '4A' | '5A' | '6A'
  | '7A' | '8A' | '9A' | '10A' | '11A' | '12A'
  | '1B' | '2B' | '3B' | '4B' | '5B' | '6B'
  | '7B' | '8B' | '9B' | '10B' | '11B' | '12B'

/** Raw data as returned by the Spotify API + audio features. */
export interface SpotifyTrack {
  spotifyId: string
  title: string
  artist: string
  bpm: number | null       // null when audio features unavailable
  key: CamelotKey | null   // null when audio features unavailable
  energy: EnergyLevel      // 'Unknown' when audio features unavailable
  spotifyUri: string
  previewUrl?: string
  albumArt?: string
}

/** User-supplied corrections to Spotify data, stored locally. */
export interface TrackOverrides {
  spotifyId: string        // References SpotifyTrack.spotifyId
  bpm?: number
  key?: CamelotKey
  energy?: EnergyLevel
  notes?: string
}

/** SpotifyTrack merged with any user overrides — what the app works with. */
export interface ResolvedTrack {
  spotifyId: string
  title: string
  artist: string
  bpm: number | null
  key: CamelotKey | null
  energy: EnergyLevel
  spotifyUri: string
  previewUrl?: string
  albumArt?: string
  notes?: string
  hasOverrides: {
    bpm: boolean
    key: boolean
    energy: boolean
  }
}

export interface SetTrack {
  trackId: string          // References SpotifyTrack.spotifyId
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

export interface ConnectedPlaylist {
  spotifyId: string
  name: string
  trackCount: number
  enabled: boolean
  lastSynced: string
}
