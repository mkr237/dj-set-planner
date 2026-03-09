import type { DJSet, MixConstraints, Track } from '../types'

export interface StorageService {
  getTracks(): Promise<Track[]>
  saveTracks(tracks: Track[]): Promise<void>

  getSets(): Promise<DJSet[]>
  getSet(id: string): Promise<DJSet | null>
  saveSet(set: DJSet): Promise<void>
  deleteSet(id: string): Promise<void>

  getConstraints(): Promise<MixConstraints>
  saveConstraints(constraints: MixConstraints): Promise<void>
}
