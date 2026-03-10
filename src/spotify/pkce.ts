/**
 * PKCE (Proof Key for Code Exchange) utilities for Spotify OAuth 2.0.
 *
 * Spec: https://datatracker.ietf.org/doc/html/rfc7636
 */

/** Generate a cryptographically random code verifier (96 bytes → 128 base64url chars). */
export function generateCodeVerifier(): string {
  const bytes = new Uint8Array(96)
  crypto.getRandomValues(bytes)
  return base64url(bytes)
}

/** Derive the S256 code challenge from a verifier: base64url(SHA-256(verifier)). */
export async function generateCodeChallenge(verifier: string): Promise<string> {
  const encoded = new TextEncoder().encode(verifier)
  const hash = await crypto.subtle.digest('SHA-256', encoded)
  return base64url(new Uint8Array(hash))
}

/** Encode a byte array as URL-safe base64 with no padding. */
function base64url(bytes: Uint8Array): string {
  return btoa(String.fromCharCode(...bytes))
    .replace(/\+/g, '-')
    .replace(/\//g, '_')
    .replace(/=+$/, '')
}
