// ---------------------------------------------------------------------------
// Auth token storage shape
// ---------------------------------------------------------------------------

export interface SpotifyAuth {
  accessToken: string
  refreshToken: string
  expiresAt: number // Unix timestamp in ms
}

// ---------------------------------------------------------------------------
// Raw Spotify API response shapes (used internally by SpotifyService)
// ---------------------------------------------------------------------------

export interface SpotifyTokenResponse {
  access_token: string
  refresh_token: string // may be omitted on refresh — fall back to existing
  expires_in: number    // seconds
  token_type: string
}

// ---------------------------------------------------------------------------
// Service interface
// ---------------------------------------------------------------------------

export interface SpotifyService {
  /** Redirect the browser to the Spotify authorization page (PKCE flow). */
  authenticate(): Promise<void>

  /** Exchange the authorization code (from the callback URL) for tokens. */
  handleCallback(code: string, state: string): Promise<void>

  /** True if a non-expired access token is available. */
  isAuthenticated(): boolean

  /**
   * Return a valid access token, automatically refreshing it if it is close
   * to expiry.  Throws if no auth exists.
   */
  getAccessToken(): Promise<string>

  /** Force an immediate token refresh using the stored refresh token. */
  refreshToken(): Promise<void>

  /** Clear all stored auth tokens. */
  logout(): void
}
