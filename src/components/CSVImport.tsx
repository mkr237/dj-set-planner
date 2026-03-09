import { useRef, useState } from 'react'
import { parseCSV, type ImportError } from '../utils/csvImport'
import { useAppContext } from '../context/AppContext'

function UploadIcon({ className }: { className?: string }) {
  return (
    <svg
      width="32"
      height="32"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.5"
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
    >
      <path d="M4 14.899A7 7 0 1 1 15.71 8h1.79a4.5 4.5 0 0 1 2.5 8.242" />
      <path d="M12 12v9" />
      <path d="m8 17 4-4 4 4" />
    </svg>
  )
}

export function CSVImport() {
  const { dispatch } = useAppContext()
  const inputRef = useRef<HTMLInputElement>(null)
  const [errors, setErrors] = useState<ImportError[]>([])
  const [importedCount, setImportedCount] = useState<number | null>(null)
  const [dragging, setDragging] = useState(false)

  function handleFile(file: File) {
    const reader = new FileReader()
    reader.onload = (e) => {
      const text = e.target?.result
      if (typeof text !== 'string') return
      const { tracks, errors: parseErrors } = parseCSV(text)
      setErrors(parseErrors)
      setImportedCount(tracks.length)
      if (tracks.length > 0) {
        dispatch({ type: 'SET_TRACKS', payload: tracks })
      }
    }
    reader.readAsText(file)
  }

  function handleChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (file) handleFile(file)
    e.target.value = ''
  }

  function handleDragOver(e: React.DragEvent) {
    e.preventDefault()
    setDragging(true)
  }

  function handleDragLeave(e: React.DragEvent) {
    if (!e.currentTarget.contains(e.relatedTarget as Node)) {
      setDragging(false)
    }
  }

  function handleDrop(e: React.DragEvent) {
    e.preventDefault()
    setDragging(false)
    const file = e.dataTransfer.files?.[0]
    if (file) handleFile(file)
  }

  return (
    <div className="flex-1 flex flex-col items-center justify-center p-8 bg-surface-0">
      <div
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
        className={`w-full max-w-sm rounded-2xl border-2 border-dashed p-12 flex flex-col items-center gap-5 transition-all duration-300 ${
          dragging
            ? 'border-accent bg-accent-muted scale-[1.02]'
            : 'border-border hover:border-slate-500 hover:bg-surface-1'
        }`}
      >
        {/* Animated icon */}
        <div
          className={`w-16 h-16 rounded-2xl flex items-center justify-center transition-all duration-300 ${
            dragging ? 'bg-accent/20 text-accent-hover scale-110' : 'bg-surface-2 text-slate-500'
          }`}
          style={{ animation: dragging ? 'none' : 'float 3s ease-in-out infinite' }}
        >
          <UploadIcon />
        </div>

        {/* Messaging */}
        <div className="text-center space-y-1">
          <p className={`font-semibold transition-colors duration-200 ${dragging ? 'text-accent-hover' : 'text-white'}`}>
            {dragging ? 'Release to import' : 'Drop your track library here'}
          </p>
          <p className="text-sm text-slate-500">
            {dragging ? 'CSV file detected' : 'Drag a CSV file or browse to import'}
          </p>
        </div>

        <input
          ref={inputRef}
          type="file"
          accept=".csv"
          className="hidden"
          onChange={handleChange}
        />

        <button
          onClick={() => inputRef.current?.click()}
          className="px-6 py-2 bg-accent hover:bg-accent-hover active:scale-95 rounded-lg text-sm font-medium transition-all duration-150 text-white"
        >
          Browse for file
        </button>

        {/* Required columns */}
        <div className="w-full border-t border-border/50 pt-4 space-y-1.5 text-center">
          <p className="text-xs text-slate-600 uppercase tracking-wider font-semibold">Required columns</p>
          <p className="text-xs text-slate-700 font-mono tracking-wide">
            title · artist · bpm · key · energy
          </p>
        </div>
      </div>

      {/* Import result */}
      {importedCount !== null && (
        <div className="mt-6 w-full max-w-sm space-y-1">
          {importedCount > 0 && (
            <p className="text-sm text-green-400 text-center">
              ✓ {importedCount} track{importedCount !== 1 ? 's' : ''} imported
            </p>
          )}
          {errors.length > 0 && (
            <>
              <p className="text-sm text-red-400 text-center">
                {errors.length} row{errors.length !== 1 ? 's' : ''} skipped
              </p>
              <ul className="text-xs text-red-300 space-y-0.5 max-h-32 overflow-y-auto bg-surface-2 rounded-lg p-3">
                {errors.map((err, i) => (
                  <li key={i} className="font-mono">Row {err.row}: {err.message}</li>
                ))}
              </ul>
            </>
          )}
        </div>
      )}
    </div>
  )
}
