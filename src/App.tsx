import { useState, useEffect } from 'react'
import { AppProvider } from './context/AppContext'
import { useAppContext } from './context/AppContext'
import { spotifyService } from './spotify'
import { SetHeader } from './components/SetHeader'
import { SetTimeline } from './components/SetTimeline'
import { SelectionPanel } from './components/SelectionPanel'
import { PlaylistPanel } from './components/PlaylistPanel'
import { SpotifyConnectScreen } from './components/SpotifyConnectScreen'
import { SettingsModal } from './components/SettingsModal'
import { HelpModal } from './components/HelpModal'
import { SavedSetsDrawer } from './components/SavedSetsDrawer'
import { PerformanceMode } from './components/PerformanceMode'

type AppMode = 'edit' | 'performance'

/**
 * Detects and processes the Spotify OAuth callback on mount.
 * Returns { error, completed, processing } so callers can show appropriate UI.
 */
function useSpotifyCallback() {
  const isCallback = window.location.pathname === '/callback'
  const [error, setError] = useState<string | null>(null)
  const [completed, setCompleted] = useState(false)
  const [processing, setProcessing] = useState(isCallback)

  useEffect(() => {
    if (!isCallback) return

    const params = new URLSearchParams(window.location.search)
    const code = params.get('code')
    const state = params.get('state')
    const callbackError = params.get('error')

    // Clean the URL immediately so a refresh doesn't re-run the callback
    window.history.replaceState({}, '', '/')

    if (callbackError) {
      setError(`Spotify login was denied: ${callbackError}`)
      setProcessing(false)
      return
    }

    if (!code || !state) {
      setError('Invalid callback — missing code or state parameter')
      setProcessing(false)
      return
    }

    spotifyService
      .handleCallback(code, state)
      .then(() => {
        setCompleted(true)
        setProcessing(false)
      })
      .catch(err => {
        setError(err instanceof Error ? err.message : 'Spotify authentication failed')
        setProcessing(false)
      })
  }, []) // eslint-disable-line react-hooks/exhaustive-deps

  return { error, completed, processing }
}

function AppShell() {
  const { state } = useAppContext()
  const [mode, setMode] = useState<AppMode>('edit')
  const [showSettings, setShowSettings] = useState(false)
  const [showHelp, setShowHelp] = useState(false)
  const [showDrawer, setShowDrawer] = useState(false)

  const { error: callbackError, completed: callbackCompleted, processing: callbackProcessing } =
    useSpotifyCallback()

  // Track auth state reactively — re-check after a successful callback
  const [isAuthenticated, setIsAuthenticated] = useState(() =>
    spotifyService.isAuthenticated()
  )
  useEffect(() => {
    if (callbackCompleted) setIsAuthenticated(spotifyService.isAuthenticated())
  }, [callbackCompleted])

  // --- Unauthenticated states ---

  // Brief loading screen while the callback token exchange is in flight
  if (callbackProcessing) {
    return (
      <div className="h-screen bg-surface-0 flex items-center justify-center gap-3">
        <span className="inline-block w-4 h-4 border-2 border-slate-600 border-t-slate-300 rounded-full animate-spin" />
        <span className="text-slate-400 text-sm">Connecting to Spotify…</span>
      </div>
    )
  }

  if (!isAuthenticated) {
    return <SpotifyConnectScreen error={callbackError} />
  }

  // --- Authenticated: edit / performance modes ---

  if (mode === 'performance') {
    return <PerformanceMode onExit={() => setMode('edit')} />
  }

  const hasSetTracks = (state.currentSet?.tracks.length ?? 0) > 0

  return (
    <div className="h-screen bg-surface-0 text-slate-100 flex flex-col overflow-hidden">
      {/* Header */}
      <header className="shrink-0 border-b border-border bg-surface-1 px-6 py-3 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <span className="text-lg font-bold tracking-tight text-white">DJ Set Planner</span>
        </div>
        <div className="flex items-center gap-1">
          <button
            onClick={() => setMode('performance')}
            disabled={!hasSetTracks}
            title="Enter performance mode"
            className="w-8 h-8 flex items-center justify-center rounded-lg text-slate-400 hover:text-white hover:bg-surface-3 transition-colors duration-150 disabled:opacity-20 disabled:cursor-not-allowed text-sm"
          >
            ▶
          </button>
          <button
            onClick={() => setShowDrawer(true)}
            title="Saved sets"
            className="w-8 h-8 flex items-center justify-center rounded-lg text-slate-400 hover:text-white hover:bg-surface-3 transition-colors text-base"
          >
            ☰
          </button>
          <button
            onClick={() => setShowSettings(true)}
            title="Settings"
            className="w-8 h-8 flex items-center justify-center rounded-lg text-slate-400 hover:text-white hover:bg-surface-3 transition-colors text-base"
          >
            ⚙
          </button>
          <button
            onClick={() => setShowHelp(true)}
            title="Help"
            className="w-8 h-8 flex items-center justify-center rounded-lg text-slate-400 hover:text-white hover:bg-surface-3 transition-colors text-sm font-semibold"
          >
            ?
          </button>
          <button
            onClick={() => {
              spotifyService.logout()
              setIsAuthenticated(false)
            }}
            title="Disconnect Spotify"
            className="w-8 h-8 flex items-center justify-center rounded-lg text-slate-400 hover:text-white hover:bg-surface-3 transition-colors text-sm"
          >
            ⏻
          </button>
        </div>
      </header>

      {/* Three-panel layout */}
      <div className="flex flex-1 overflow-hidden">
        {/* PlaylistPanel — left (~250px) */}
        <div className="w-[250px] shrink-0 border-r border-border overflow-hidden">
          <PlaylistPanel />
        </div>

        {/* CandidatePanel — centre (flexible) */}
        <SelectionPanel />

        {/* SetPanel — right (~350px) */}
        <div className="w-[350px] shrink-0 flex flex-col bg-surface-1 border-l border-border">
          <SetHeader />
          <SetTimeline />
        </div>
      </div>

      {showSettings && (
        <SettingsModal onClose={() => setShowSettings(false)} />
      )}
      {showHelp && (
        <HelpModal onClose={() => setShowHelp(false)} />
      )}
      {showDrawer && (
        <SavedSetsDrawer onClose={() => setShowDrawer(false)} />
      )}
    </div>
  )
}

export default function App() {
  return (
    <AppProvider>
      <AppShell />
    </AppProvider>
  )
}

