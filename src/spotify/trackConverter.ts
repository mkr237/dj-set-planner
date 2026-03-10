import type { SpotifyTrack } from '../types'
import type { SpotifyApiTrack } from './types'

/**
 * Convert a raw Spotify API track into the app's SpotifyTrack type.
 * BPM, key, and energy are not available from the Spotify API (audio features
 * endpoint was deprecated for new apps in November 2024) — they default to
 * null / 'Unknown' and can be set manually via the track override editor.
 */
export function convertSpotifyTrack(track: SpotifyApiTrack): SpotifyTrack {
  return {
    spotifyId: track.id!,
    title: track.name,
    artist: track.artists.map(a => a.name).join(', '),
    bpm: null,
    key: null,
    energy: 'Unknown',
    spotifyUri: track.uri,
    previewUrl: track.preview_url ?? undefined,
  }
}
