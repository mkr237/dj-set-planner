import { generateCodeVerifier, generateCodeChallenge } from './pkce'
import { SPOTIFY_CONFIG } from './config'
import type { SpotifyAuth, SpotifyService, SpotifyTokenResponse } from './types'

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

/** localStorage key used to persist auth tokens. */
export const SPOTIFY_AUTH_KEY = 'djsp:spotify_auth'

/** Refresh the token this many ms before it actually expires (60 s buffer). */
const EXPIRY_BUFFER_MS = 60_000

/** sessionStorage keys used during the auth redirect round-trip. */
const SESSION = {
  verifier: 'spotify_pkce_verifier',
  state: 'spotify_pkce_state',
} as const

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

    sessionStorage.setItem(SESSION.verifier, verifier)
    sessionStorage.setItem(SESSION.state, state)

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
    const storedState = sessionStorage.getItem(SESSION.state)
    const verifier = sessionStorage.getItem(SESSION.verifier)

    if (state !== storedState) {
      throw new Error('OAuth state mismatch — possible CSRF attempt')
    }
    if (!verifier) {
      throw new Error('Missing PKCE code verifier')
    }

    // Clean up session storage regardless of outcome
    sessionStorage.removeItem(SESSION.state)
    sessionStorage.removeItem(SESSION.verifier)

    const auth = await this.exchangeCode(code, verifier)
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
