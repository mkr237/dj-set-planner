import { useState, useEffect } from 'react'
import { AppProvider } from './context/AppContext'
import { useAppContext } from './context/AppContext'
import { spotifyService } from './spotify'
import { SetHeader } from './components/SetHeader'
import { SetTimeline } from './components/SetTimeline'
import { SelectionPanel } from './components/SelectionPanel'
import { PlaylistPanel } from './components/PlaylistPanel'
import { ConstraintModal } from './components/ConstraintModal'
import { SavedSetsDrawer } from './components/SavedSetsDrawer'
import { PerformanceMode } from './components/PerformanceMode'

type AppMode = 'edit' | 'performance'

function useSpotifyCallback() {
  const [callbackError, setCallbackError] = useState<string | null>(null)

  useEffect(() => {
    if (window.location.pathname !== '/callback') return

    const params = new URLSearchParams(window.location.search)
    const code = params.get('code')
    const state = params.get('state')
    const error = params.get('error')

    // Clean the URL immediately so a refresh doesn't re-run the callback
    window.history.replaceState({}, '', '/')

    if (error) {
      setCallbackError(`Spotify login was denied: ${error}`)
      return
    }

    if (!code || !state) {
      setCallbackError('Invalid callback — missing code or state parameter')
      return
    }

    spotifyService
      .handleCallback(code, state)
      .catch(err =>
        setCallbackError(
          err instanceof Error ? err.message : 'Spotify authentication failed'
        )
      )
  }, [])

  return callbackError
}

function AppShell() {
  const { state } = useAppContext()
  const [mode, setMode] = useState<AppMode>('edit')
  const [showConstraints, setShowConstraints] = useState(false)
  const [showDrawer, setShowDrawer] = useState(false)
  const callbackError = useSpotifyCallback()

  const hasSetTracks = (state.currentSet?.tracks.length ?? 0) > 0

  if (mode === 'performance') {
    return <PerformanceMode onExit={() => setMode('edit')} />
  }

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
            onClick={() => setShowConstraints(true)}
            title="Mix constraints"
            className="w-8 h-8 flex items-center justify-center rounded-lg text-slate-400 hover:text-white hover:bg-surface-3 transition-colors text-base"
          >
            ⚙
          </button>
        </div>
      </header>

      {/* Spotify callback error banner */}
      {callbackError && (
        <div className="shrink-0 bg-red-900/60 border-b border-red-700 px-6 py-2 text-xs text-red-300">
          {callbackError}
        </div>
      )}

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

      {showConstraints && (
        <ConstraintModal onClose={() => setShowConstraints(false)} />
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

