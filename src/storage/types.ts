import type { DJSet, MixConstraints, TrackOverrides, ConnectedPlaylist } from '../types'
import type { SpotifyAuth } from '../spotify/types'

export interface StorageService {
  // Track overrides (user corrections to Spotify data)
  getOverrides(): Promise<TrackOverrides[]>
  saveOverrides(overrides: TrackOverrides[]): Promise<void>

  // Sets
  getSets(): Promise<DJSet[]>
  getSet(id: string): Promise<DJSet | null>
  saveSet(set: DJSet): Promise<void>
  deleteSet(id: string): Promise<void>

  // Constraints
  getConstraints(): Promise<MixConstraints>
  saveConstraints(constraints: MixConstraints): Promise<void>

  // Connected playlists
  getPlaylists(): Promise<ConnectedPlaylist[]>
  savePlaylists(playlists: ConnectedPlaylist[]): Promise<void>

  // Spotify auth tokens
  getSpotifyAuth(): Promise<SpotifyAuth | null>
  saveSpotifyAuth(auth: SpotifyAuth): Promise<void>
  clearSpotifyAuth(): Promise<void>
}
