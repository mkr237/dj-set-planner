import type { DJSet, MixConstraints, Track, ConnectedPlaylist } from '../types'
import type { SpotifyAuth } from '../spotify/types'

export interface StorageService {
  getTracks(): Promise<Track[]>
  saveTracks(tracks: Track[]): Promise<void>

  getSets(): Promise<DJSet[]>
  getSet(id: string): Promise<DJSet | null>
  saveSet(set: DJSet): Promise<void>
  deleteSet(id: string): Promise<void>

  getConstraints(): Promise<MixConstraints>
  saveConstraints(constraints: MixConstraints): Promise<void>

  getPlaylists(): Promise<ConnectedPlaylist[]>
  savePlaylists(playlists: ConnectedPlaylist[]): Promise<void>

  getSpotifyAuth(): Promise<SpotifyAuth | null>
  saveSpotifyAuth(auth: SpotifyAuth): Promise<void>
  clearSpotifyAuth(): Promise<void>
}
