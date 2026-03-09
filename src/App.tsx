import { useState } from 'react'
import { AppProvider } from './context/AppContext'
import { SetHeader } from './components/SetHeader'
import { SetTimeline } from './components/SetTimeline'
import { SelectionPanel } from './components/SelectionPanel'
import { ConstraintModal } from './components/ConstraintModal'

function AppShell() {
  const [showConstraints, setShowConstraints] = useState(false)

  return (
    <div className="min-h-screen bg-gray-900 text-white flex flex-col">
      {/* Header */}
      <header className="border-b border-gray-700 px-6 py-4 flex items-center justify-between">
        <h1 className="text-xl font-bold tracking-wide">DJ Set Planner</h1>
        <button
          onClick={() => setShowConstraints(true)}
          title="Mix constraints"
          className="w-8 h-8 flex items-center justify-center rounded-lg text-gray-400 hover:text-white hover:bg-gray-700 transition-colors text-base"
        >
          ⚙
        </button>
      </header>

      {/* Two-panel layout */}
      <div className="flex flex-1 overflow-hidden">
        {/* SetPanel — left */}
        <div className="w-96 flex flex-col border-r border-gray-700 shrink-0">
          <SetHeader />
          <SetTimeline />
        </div>

        {/* SelectionPanel — right */}
        <SelectionPanel />
      </div>

      {/* Global constraints modal */}
      {showConstraints && (
        <ConstraintModal onClose={() => setShowConstraints(false)} />
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
