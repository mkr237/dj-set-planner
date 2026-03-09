import { AppProvider, useAppContext } from './context/AppContext'
import { CSVImport } from './components/CSVImport'
import { ConstraintPanel } from './components/ConstraintPanel'
import { TrackLibrary } from './components/TrackLibrary'
import { SetHeader } from './components/SetHeader'
import { SetTimeline } from './components/SetTimeline'
import { CandidatePanel } from './components/CandidatePanel'
import type { Track } from './types'

function MainPanel() {
  const { state } = useAppContext()
  const { currentSet, tracks } = state

  // Derive the last track in the set to feed into CandidatePanel
  const lastSetTrack =
    currentSet && currentSet.tracks.length > 0
      ? currentSet.tracks.reduce((a, b) => (a.position > b.position ? a : b))
      : null

  const currentTrack: Track | undefined = lastSetTrack
    ? tracks.find(t => t.id === lastSetTrack.trackId)
    : undefined

  return (
    <main className="flex-1 flex flex-col overflow-hidden">
      <SetHeader />

      {/* Below the header: split timeline / candidates when a track is selected */}
      <div className="flex-1 flex flex-col overflow-hidden min-h-0">
        <div className={`min-h-0 overflow-hidden flex flex-col ${currentTrack ? 'flex-[2]' : 'flex-1'}`}>
          <SetTimeline />
        </div>

        {currentTrack && (
          <div className="flex-[3] min-h-0 overflow-hidden border-t border-gray-700 flex flex-col">
            <CandidatePanel currentTrack={currentTrack} />
          </div>
        )}
      </div>
    </main>
  )
}

function AppShell() {
  return (
    <div className="min-h-screen bg-gray-900 text-white flex flex-col">
      {/* Header */}
      <header className="border-b border-gray-700 px-6 py-4 flex items-center gap-4">
        <h1 className="text-xl font-bold tracking-wide">DJ Set Planner</h1>
      </header>

      {/* Main layout: sidebar + main panel */}
      <div className="flex flex-1 overflow-hidden">
        {/* Sidebar */}
        <aside className="w-80 border-r border-gray-700 flex flex-col">
          <CSVImport />
          <ConstraintPanel />
          <TrackLibrary />
        </aside>

        <MainPanel />
      </div>
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
