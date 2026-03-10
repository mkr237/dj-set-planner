export type { SpotifyAuth, SpotifyService } from './types'
export { SpotifyServiceImpl, SPOTIFY_AUTH_KEY } from './SpotifyService'

import { SpotifyServiceImpl } from './SpotifyService'

/** App-wide singleton instance. */
export const spotifyService = new SpotifyServiceImpl()
