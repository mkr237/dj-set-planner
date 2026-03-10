import type { SpotifyTrack, TrackOverrides, ResolvedTrack } from '../types'

export function resolveTrack(
  track: SpotifyTrack,
  override: TrackOverrides | null,
): ResolvedTrack {
  return {
    spotifyId: track.spotifyId,
    title: track.title,
    artist: track.artist,
    bpm: override?.bpm ?? track.bpm,
    key: override?.key ?? track.key,
    energy: override?.energy ?? track.energy,
    spotifyUri: track.spotifyUri,
    previewUrl: track.previewUrl,
    albumArt: track.albumArt,
    notes: override?.notes,
    hasOverrides: {
      bpm: override?.bpm !== undefined,
      key: override?.key !== undefined,
      energy: override?.energy !== undefined,
    },
  }
}

export function resolveTracks(
  tracks: SpotifyTrack[],
  overrides: TrackOverrides[],
): ResolvedTrack[] {
  const overrideMap = new Map(overrides.map(o => [o.spotifyId, o]))
  return tracks.map(t => resolveTrack(t, overrideMap.get(t.spotifyId) ?? null))
}
