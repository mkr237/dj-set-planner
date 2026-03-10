/**
 * Spotify OAuth config — values come from Vite environment variables.
 *
 * Required env vars (set in .env.local):
 *   VITE_SPOTIFY_CLIENT_ID    — from the Spotify Developer Dashboard
 *
 * Optional env vars:
 *   VITE_SPOTIFY_REDIRECT_URI — defaults to http://localhost:5173/callback
 */
export const SPOTIFY_CONFIG = {
  clientId: import.meta.env.VITE_SPOTIFY_CLIENT_ID as string,
  redirectUri:
    (import.meta.env.VITE_SPOTIFY_REDIRECT_URI as string | undefined) ??
    'http://localhost:5173/callback',

  scopes: [
    'playlist-read-private',
    'playlist-read-collaborative',
    'user-read-private',
  ],

  authUrl: 'https://accounts.spotify.com/authorize',
  tokenUrl: 'https://accounts.spotify.com/api/token',
} as const
