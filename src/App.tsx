import { useState } from 'react'
import { AppProvider } from './context/AppContext'
import { SetHeader } from './components/SetHeader'
import { SetTimeline } from './components/SetTimeline'
import { SelectionPanel } from './components/SelectionPanel'
import { ConstraintModal } from './components/ConstraintModal'
import { SavedSetsDrawer } from './components/SavedSetsDrawer'

function AppShell() {
  const [showConstraints, setShowConstraints] = useState(false)
  const [showDrawer, setShowDrawer] = useState(false)

  return (
    <div className="h-screen bg-surface-0 text-slate-100 flex flex-col overflow-hidden">
      {/* Header */}
      <header className="shrink-0 border-b border-border bg-surface-1 px-6 py-3 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <span className="text-lg font-bold tracking-tight text-white">DJ Set Planner</span>
        </div>
        <div className="flex items-center gap-1">
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

      {/* Two-panel layout */}
      <div className="flex flex-1 overflow-hidden">
        {/* SetPanel — left */}
        <div className="w-96 shrink-0 flex flex-col bg-surface-1 border-r border-border">
          <SetHeader />
          <SetTimeline />
        </div>

        {/* SelectionPanel — right */}
        <SelectionPanel />
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
