import { useState } from 'react'
import { spotifyService } from '../spotify'

const MISSING_CLIENT_ID = !import.meta.env.VITE_SPOTIFY_CLIENT_ID

export function SpotifyConnectScreen({ error }: { error?: string | null }) {
  const [connecting, setConnecting] = useState(false)
  const [connectError, setConnectError] = useState<string | null>(null)

  async function handleConnect() {
    setConnecting(true)
    setConnectError(null)
    try {
      await spotifyService.authenticate() // redirects away — effectively never returns
    } catch (err) {
      setConnectError(err instanceof Error ? err.message : 'Connection failed')
      setConnecting(false)
    }
  }

  const displayError = error ?? connectError

  return (
    <div className="h-screen bg-surface-0 flex flex-col items-center justify-center gap-0 p-8">
      {/* Icon */}
      <div className="text-5xl text-slate-700 select-none leading-none mb-6">♪</div>

      {/* Title */}
      <h1 className="text-3xl font-bold text-white tracking-tight mb-2">
        DJ Set Planner
      </h1>
      <p className="text-slate-400 text-sm text-center max-w-xs mb-8 leading-relaxed">
        Build harmonic DJ sets from your Spotify library. Filter candidates by
        Camelot key, BPM, and energy — then pick your transitions one by one.
      </p>

      {/* Feature list */}
      <ul className="text-xs text-slate-600 mb-10 space-y-1.5 text-center">
        {[
          'Harmonic mixing via the Camelot wheel',
          'BPM-aware candidate ranking',
          'Energy level filtering',
          'Save, export, and reload your sets',
        ].map(f => (
          <li key={f} className="flex items-center gap-2 justify-center">
            <span className="text-slate-700">✓</span>
            {f}
          </li>
        ))}
      </ul>

      {/* CTA */}
      {MISSING_CLIENT_ID ? (
        <div className="bg-surface-1 border border-amber-700/40 rounded-lg px-6 py-4 text-center max-w-sm">
          <p className="text-xs font-semibold text-amber-400 mb-1">Setup required</p>
          <p className="text-xs text-slate-500 leading-relaxed">
            Add your Spotify Client ID to{' '}
            <code className="text-slate-300">.env.local</code> — see{' '}
            <code className="text-slate-300">.env.example</code> for instructions.
          </p>
        </div>
      ) : (
        <button
          onClick={handleConnect}
          disabled={connecting}
          style={{ backgroundColor: connecting ? '#158a3e' : '#1DB954' }}
          className="px-8 py-3 rounded-full font-semibold text-black text-sm transition-opacity hover:opacity-90 active:opacity-75 disabled:cursor-not-allowed flex items-center gap-2"
        >
          {connecting ? (
            <>
              <span className="inline-block w-3.5 h-3.5 border-2 border-black/30 border-t-black rounded-full animate-spin" />
              Connecting…
            </>
          ) : (
            'Connect with Spotify'
          )}
        </button>
      )}

      {/* Error */}
      {displayError && (
        <p className="mt-5 text-xs text-red-400 text-center max-w-sm leading-relaxed">
          {displayError}
        </p>
      )}
    </div>
  )
}
