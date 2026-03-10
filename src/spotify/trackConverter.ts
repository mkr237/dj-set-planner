import type { SpotifyTrack, CamelotKey, EnergyLevel } from '../types'
import type { SpotifyApiTrack, SpotifyApiAudioFeatures } from './types'

// ---------------------------------------------------------------------------
// Spotify key+mode → Camelot wheel notation
// Source: https://developer.spotify.com/documentation/web-api/reference/get-audio-features
// ---------------------------------------------------------------------------

const CAMELOT_MAP: Record<string, CamelotKey> = {
  // Major (mode=1)
  '0-1':  '8B',  // C major
  '1-1':  '3B',  // C#/Db major
  '2-1':  '10B', // D major
  '3-1':  '5B',  // D#/Eb major
  '4-1':  '12B', // E major
  '5-1':  '7B',  // F major
  '6-1':  '2B',  // F#/Gb major
  '7-1':  '9B',  // G major
  '8-1':  '4B',  // G#/Ab major
  '9-1':  '11B', // A major
  '10-1': '6B',  // A#/Bb major
  '11-1': '1B',  // B major
  // Minor (mode=0)
  '0-0':  '5A',  // C minor
  '1-0':  '12A', // C#/Db minor
  '2-0':  '7A',  // D minor
  '3-0':  '2A',  // D#/Eb minor
  '4-0':  '9A',  // E minor
  '5-0':  '4A',  // F minor
  '6-0':  '11A', // F#/Gb minor
  '7-0':  '6A',  // G minor
  '8-0':  '1A',  // G#/Ab minor
  '9-0':  '8A',  // A minor
  '10-0': '3A',  // A#/Bb minor
  '11-0': '10A', // B minor
}

/** Convert Spotify key (0-11, -1=unknown) + mode (0=minor, 1=major) to Camelot. */
export function spotifyKeyToCamelot(key: number, mode: number): CamelotKey | null {
  if (key === -1) return null
  return CAMELOT_MAP[`${key}-${mode}`] ?? null
}

/** Derive EnergyLevel from Spotify's 0.0-1.0 energy value. */
export function spotifyEnergyToLevel(energy: number): EnergyLevel {
  if (energy < 0.4) return 'Low'
  if (energy <= 0.7) return 'Mid'
  return 'High'
}

/**
 * Convert a Spotify track + its audio features into the app's SpotifyTrack type.
 * Call only for tracks where `track.id` is non-null (local files are excluded upstream).
 */
export function convertSpotifyTrack(
  track: SpotifyApiTrack,
  features: SpotifyApiAudioFeatures | null,
): SpotifyTrack {
  return {
    spotifyId: track.id!,
    title: track.name,
    artist: track.artists.map(a => a.name).join(', '),
    bpm: features !== null ? Math.round(features.tempo) : null,
    key: features !== null ? spotifyKeyToCamelot(features.key, features.mode) : null,
    energy: features !== null ? spotifyEnergyToLevel(features.energy) : 'Unknown',
    spotifyUri: track.uri,
    previewUrl: track.preview_url ?? undefined,
  }
}
