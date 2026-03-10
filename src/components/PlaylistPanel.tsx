import { useState } from 'react'
import { useAppContext } from '../context/AppContext'
import { spotifyService } from '../spotify'
import { convertSpotifyTrack } from '../spotify/trackConverter'
import type { ConnectedPlaylist, Track } from '../types'
import type { SpotifyApiAudioFeatures } from '../spotify/types'

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

async function fetchTracksForPlaylist(playlistId: string): Promise<Track[]> {
  const rawTracks = await spotifyService.getPlaylistTracks(playlistId)
  const ids = rawTracks.map(t => t.id!)
  const features = await spotifyService.getAudioFeatures(ids)

  // Build a lookup map: trackId → features (some may be null)
  const featuresById = new Map<string, SpotifyApiAudioFeatures>(
    (features.filter(Boolean) as SpotifyApiAudioFeatures[]).map(f => [f.id, f])
  )

  return rawTracks.map(t => convertSpotifyTrack(t, featuresById.get(t.id!) ?? null))
}

// ---------------------------------------------------------------------------
// PlaylistItem
// ---------------------------------------------------------------------------

function PlaylistItem({
  playlist,
  isFetching,
  onToggle,
}: {
  playlist: ConnectedPlaylist
  isFetching: boolean
  onToggle: () => void
}) {
  return (
    <label className={`flex items-center gap-3 px-4 py-2.5 border-b border-border/50 hover:bg-surface-3 transition-colors duration-150 cursor-pointer group select-none ${isFetching ? 'opacity-60' : ''}`}>
      {isFetching ? (
        <span className="w-3.5 h-3.5 shrink-0 inline-block border-2 border-slate-600 border-t-slate-300 rounded-full animate-spin" />
      ) : (
        <input
          type="checkbox"
          checked={playlist.enabled}
          onChange={onToggle}
          className="w-3.5 h-3.5 rounded accent-accent shrink-0 cursor-pointer"
        />
      )}
      <div className="flex-1 min-w-0">
        <p className="text-sm text-white truncate leading-snug">{playlist.name}</p>
        <p className="text-xs text-slate-600 mt-0.5">
          {isFetching
            ? 'Loading tracks…'
            : `${playlist.trackCount} track${playlist.trackCount !== 1 ? 's' : ''}`}
        </p>
      </div>
    </label>
  )
}

// ---------------------------------------------------------------------------
// PlaylistPanel
// ---------------------------------------------------------------------------

export function PlaylistPanel() {
  const { state, dispatch } = useAppContext()
  const { connectedPlaylists, playlistTracksCache } = state

  const [syncing, setSyncing] = useState(false)
  const [syncError, setSyncError] = useState<string | null>(null)
  // Local set of playlist IDs currently being fetched (used for per-row spinners)
  const [fetchingIds, setFetchingIds] = useState<Set<string>>(new Set())

  // ---------------------------------------------------------------------------
  // Fetch + cache tracks for one playlist
  // ---------------------------------------------------------------------------

  async function loadPlaylist(playlistId: string): Promise<void> {
    if (playlistTracksCache[playlistId]) return // already cached

    setFetchingIds(prev => new Set(prev).add(playlistId))
    dispatch({ type: 'SET_PLAYLIST_FETCHING', payload: { playlistId, fetching: true } })

    try {
      const tracks = await fetchTracksForPlaylist(playlistId)
      dispatch({ type: 'CACHE_PLAYLIST_TRACKS', payload: { playlistId, tracks } })
    } finally {
      setFetchingIds(prev => {
        const next = new Set(prev)
        next.delete(playlistId)
        return next
      })
      dispatch({ type: 'SET_PLAYLIST_FETCHING', payload: { playlistId, fetching: false } })
    }
  }

  // ---------------------------------------------------------------------------
  // Handlers
  // ---------------------------------------------------------------------------

  async function handleToggle(playlist: ConnectedPlaylist) {
    const willEnable = !playlist.enabled
    dispatch({ type: 'TOGGLE_PLAYLIST', payload: playlist.spotifyId })
    if (willEnable) {
      try {
        await loadPlaylist(playlist.spotifyId)
      } catch (err) {
        // Roll back the toggle if the fetch fails
        dispatch({ type: 'TOGGLE_PLAYLIST', payload: playlist.spotifyId })
        setSyncError(err instanceof Error ? err.message : 'Failed to load tracks')
      }
    }
  }

  async function handleSelectAll() {
    dispatch({ type: 'SET_ALL_PLAYLISTS_ENABLED', payload: true })
    const uncached = connectedPlaylists.filter(
      p => !p.enabled && !playlistTracksCache[p.spotifyId]
    )
    for (const playlist of uncached) {
      try {
        await loadPlaylist(playlist.spotifyId)
      } catch (err) {
        setSyncError(err instanceof Error ? err.message : `Failed to load "${playlist.name}"`)
      }
    }
  }

  async function handleSync() {
    setSyncing(true)
    setSyncError(null)
    try {
      const fresh = await spotifyService.getUserPlaylists()
      const merged = fresh.map(p => {
        const existing = connectedPlaylists.find(e => e.spotifyId === p.spotifyId)
        return existing ? { ...p, enabled: existing.enabled } : p
      })
      dispatch({ type: 'SET_PLAYLISTS', payload: merged })
    } catch (err) {
      setSyncError(err instanceof Error ? err.message : 'Sync failed')
    } finally {
      setSyncing(false)
    }
  }

  const allEnabled =
    connectedPlaylists.length > 0 && connectedPlaylists.every(p => p.enabled)
  const noneEnabled = connectedPlaylists.every(p => !p.enabled)
  const enabledCount = connectedPlaylists.filter(p => p.enabled).length

  return (
    <div className="flex flex-col h-full bg-surface-1">
      {/* Header */}
      <div className="px-4 py-3 border-b border-border shrink-0 flex items-center justify-between gap-2">
        <div className="min-w-0">
          <p className="text-sm font-semibold text-white leading-none">Your Library</p>
          {enabledCount > 0 && (
            <p className="text-xs text-slate-600 mt-1">
              {enabledCount} playlist{enabledCount !== 1 ? 's' : ''} active
            </p>
          )}
        </div>
        <button
          onClick={handleSync}
          disabled={syncing}
          title="Sync playlists from Spotify"
          className="w-7 h-7 flex items-center justify-center rounded text-slate-500 hover:text-white hover:bg-surface-3 transition-colors disabled:opacity-40 disabled:cursor-not-allowed shrink-0"
        >
          {syncing ? (
            <span className="inline-block w-3.5 h-3.5 border-2 border-slate-600 border-t-slate-300 rounded-full animate-spin" />
          ) : (
            <span className="text-sm leading-none">↻</span>
          )}
        </button>
      </div>

      {/* Select all / deselect all */}
      {connectedPlaylists.length > 0 && (
        <div className="flex items-center gap-1 px-4 py-2 border-b border-border shrink-0">
          <button
            onClick={handleSelectAll}
            disabled={allEnabled || fetchingIds.size > 0}
            className="text-xs text-slate-500 hover:text-accent-hover disabled:opacity-30 disabled:cursor-default transition-colors"
          >
            Select all
          </button>
          <span className="text-slate-700 text-xs">·</span>
          <button
            onClick={() => dispatch({ type: 'SET_ALL_PLAYLISTS_ENABLED', payload: false })}
            disabled={noneEnabled}
            className="text-xs text-slate-500 hover:text-accent-hover disabled:opacity-30 disabled:cursor-default transition-colors"
          >
            Deselect all
          </button>
        </div>
      )}

      {/* Playlist list / empty state */}
      <div className="flex-1 overflow-y-auto">
        {connectedPlaylists.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full gap-3 px-6 text-center py-8">
            <div className="text-3xl text-slate-700 select-none leading-none">♫</div>
            <div>
              <p className="text-xs font-medium text-slate-500">No playlists yet</p>
              <p className="text-xs text-slate-700 mt-1">
                Press ↻ to load your Spotify playlists
              </p>
            </div>
          </div>
        ) : (
          connectedPlaylists.map(playlist => (
            <PlaylistItem
              key={playlist.spotifyId}
              playlist={playlist}
              isFetching={fetchingIds.has(playlist.spotifyId)}
              onToggle={() => handleToggle(playlist)}
            />
          ))
        )}
      </div>

      {/* Error */}
      {syncError && (
        <div className="px-4 py-2 border-t border-red-900/50 bg-red-900/20 shrink-0">
          <p className="text-xs text-red-400">{syncError}</p>
        </div>
      )}
    </div>
  )
}
