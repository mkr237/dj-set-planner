import { generateCodeVerifier, generateCodeChallenge } from './pkce'
import { SPOTIFY_CONFIG } from './config'
import type { SpotifyAuth, SpotifyService, SpotifyTokenResponse, SpotifyPlaylistsPage } from './types'
import type { ConnectedPlaylist } from '../types'

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

/** localStorage key used to persist auth tokens. */
export const SPOTIFY_AUTH_KEY = 'djsp:spotify_auth'

/** Refresh the token this many ms before it actually expires (60 s buffer). */
const EXPIRY_BUFFER_MS = 60_000

/** PKCE state expires after 10 minutes (well within Spotify's auth code TTL). */
const PKCE_MAX_AGE_MS = 10 * 60 * 1000

// ---------------------------------------------------------------------------
// PKCE round-trip storage via window.name
//
// sessionStorage and localStorage are both origin-scoped, so they fail when
// the app is accessed at http://localhost:5173 but Spotify redirects back to
// http://127.0.0.1:5173/callback (a different origin).
//
// window.name persists across same-tab navigations regardless of origin,
// making it the correct storage primitive for this short-lived PKCE state.
// The value is cleared immediately after it is read (single-use).
// ---------------------------------------------------------------------------

interface PkceStore {
  verifier: string
  state: string
  ts: number // Unix ms — used to reject stale stores
}

function savePkce(verifier: string, state: string): void {
  window.name = JSON.stringify({ verifier, state, ts: Date.now() } satisfies PkceStore)
}

function loadAndClearPkce(): PkceStore | null {
  const raw = window.name
  window.name = '' // clear immediately — single use
  try {
    const store = JSON.parse(raw) as Partial<PkceStore>
    if (
      typeof store.verifier === 'string' &&
      typeof store.state === 'string' &&
      typeof store.ts === 'number' &&
      Date.now() - store.ts < PKCE_MAX_AGE_MS
    ) {
      return store as PkceStore
    }
  } catch { /* window.name contained something else — ignore */ }
  return null
}

// ---------------------------------------------------------------------------
// Implementation
// ---------------------------------------------------------------------------

export class SpotifyServiceImpl implements SpotifyService {
  /**
   * In-memory auth cache.  Initialised from localStorage at construction so
   * that `isAuthenticated()` can be called synchronously at any time.
   */
  private auth: SpotifyAuth | null = null

  constructor() {
    const raw = localStorage.getItem(SPOTIFY_AUTH_KEY)
    if (raw) {
      try {
        this.auth = JSON.parse(raw) as SpotifyAuth
      } catch {
        // Corrupt data — start unauthenticated
        localStorage.removeItem(SPOTIFY_AUTH_KEY)
      }
    }
  }

  // -------------------------------------------------------------------------
  // Public interface
  // -------------------------------------------------------------------------

  async authenticate(): Promise<void> {
    if (!SPOTIFY_CONFIG.clientId) {
      throw new Error(
        'VITE_SPOTIFY_CLIENT_ID is not set. ' +
          'Add it to your .env.local file (see .env.example).'
      )
    }

    const verifier = generateCodeVerifier()
    const challenge = await generateCodeChallenge(verifier)
    const state = generateState()

    savePkce(verifier, state)

    const params = new URLSearchParams({
      client_id: SPOTIFY_CONFIG.clientId,
      response_type: 'code',
      redirect_uri: SPOTIFY_CONFIG.redirectUri,
      code_challenge_method: 'S256',
      code_challenge: challenge,
      state,
      scope: SPOTIFY_CONFIG.scopes.join(' '),
    })

    window.location.href = `${SPOTIFY_CONFIG.authUrl}?${params}`
  }

  async handleCallback(code: string, state: string): Promise<void> {
    const pkce = loadAndClearPkce()

    if (!pkce || state !== pkce.state) {
      throw new Error('OAuth state mismatch — possible CSRF attempt')
    }

    const auth = await this.exchangeCode(code, pkce.verifier)
    this.persist(auth)
  }

  isAuthenticated(): boolean {
    return (
      this.auth !== null &&
      this.auth.expiresAt > Date.now() + EXPIRY_BUFFER_MS
    )
  }

  async getAccessToken(): Promise<string> {
    if (!this.auth) throw new Error('Not authenticated with Spotify')

    if (this.auth.expiresAt <= Date.now() + EXPIRY_BUFFER_MS) {
      await this.refreshToken()
    }

    // auth is updated by refreshToken()
    return this.auth!.accessToken
  }

  async refreshToken(): Promise<void> {
    if (!this.auth?.refreshToken) {
      throw new Error('No refresh token available')
    }

    const body = new URLSearchParams({
      grant_type: 'refresh_token',
      refresh_token: this.auth.refreshToken,
      client_id: SPOTIFY_CONFIG.clientId,
    })

    const response = await fetch(SPOTIFY_CONFIG.tokenUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body,
    })

    if (!response.ok) {
      // Refresh token is invalid — clear auth so the user must log in again
      this.logout()
      throw new Error(`Token refresh failed (HTTP ${response.status})`)
    }

    const data = (await response.json()) as SpotifyTokenResponse
    const newAuth: SpotifyAuth = {
      accessToken: data.access_token,
      // Spotify may not return a new refresh token — keep the existing one
      refreshToken: data.refresh_token ?? this.auth.refreshToken,
      expiresAt: Date.now() + data.expires_in * 1000,
    }
    this.persist(newAuth)
  }

  logout(): void {
    this.auth = null
    localStorage.removeItem(SPOTIFY_AUTH_KEY)
  }

  async getUserPlaylists(): Promise<ConnectedPlaylist[]> {
    const playlists: ConnectedPlaylist[] = []
    const now = new Date().toISOString()
    let url: string | null =
      'https://api.spotify.com/v1/me/playlists?limit=50'

    while (url) {
      const token = await this.getAccessToken()
      const response = await fetch(url, {
        headers: { Authorization: `Bearer ${token}` },
      })

      if (!response.ok) {
        throw new Error(`Failed to fetch playlists (HTTP ${response.status})`)
      }

      const page = (await response.json()) as SpotifyPlaylistsPage
      for (const item of page.items) {
        // Spotify occasionally returns null entries — skip them
        if (!item) continue
        playlists.push({
          spotifyId: item.id,
          name: item.name ?? 'Untitled playlist',
          trackCount: item.tracks?.total ?? 0,
          enabled: false,
          lastSynced: now,
        })
      }
      url = page.next
    }

    return playlists
  }

  // -------------------------------------------------------------------------
  // Private helpers
  // -------------------------------------------------------------------------

  private async exchangeCode(
    code: string,
    verifier: string
  ): Promise<SpotifyAuth> {
    const body = new URLSearchParams({
      client_id: SPOTIFY_CONFIG.clientId,
      grant_type: 'authorization_code',
      code,
      redirect_uri: SPOTIFY_CONFIG.redirectUri,
      code_verifier: verifier,
    })

    const response = await fetch(SPOTIFY_CONFIG.tokenUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body,
    })

    if (!response.ok) {
      throw new Error(`Authorization code exchange failed (HTTP ${response.status})`)
    }

    const data = (await response.json()) as SpotifyTokenResponse
    return {
      accessToken: data.access_token,
      refreshToken: data.refresh_token,
      expiresAt: Date.now() + data.expires_in * 1000,
    }
  }

  /** Update the in-memory cache and persist to localStorage. */
  private persist(auth: SpotifyAuth): void {
    this.auth = auth
    localStorage.setItem(SPOTIFY_AUTH_KEY, JSON.stringify(auth))
  }
}

// ---------------------------------------------------------------------------
// Helper
// ---------------------------------------------------------------------------

/** Generate a random hex state parameter for CSRF protection. */
function generateState(): string {
  const bytes = new Uint8Array(16)
  crypto.getRandomValues(bytes)
  return Array.from(bytes, b => b.toString(16).padStart(2, '0')).join('')
}
