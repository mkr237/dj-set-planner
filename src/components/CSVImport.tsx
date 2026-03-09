import { useRef, useState } from 'react'
import { parseCSV, type ImportError } from '../utils/csvImport'
import { useAppContext } from '../context/AppContext'

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
        className={`w-full max-w-sm rounded-xl border-2 border-dashed p-10 flex flex-col items-center gap-4 transition-all ${
          dragging
            ? 'border-accent bg-accent-muted scale-[1.01]'
            : 'border-border hover:border-slate-500'
        }`}
      >
        <div className="text-5xl text-slate-700 select-none leading-none">♫</div>

        <div className="text-center">
          <p className="text-slate-300 font-medium">Drop a CSV to get started</p>
          <p className="text-sm text-slate-600 mt-1">or browse for a file</p>
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
          className="px-5 py-2 bg-accent hover:bg-accent-hover rounded-lg text-sm font-medium transition-colors text-white"
        >
          Browse for file
        </button>

        <p className="text-xs text-slate-600 text-center">
          Required columns: title, artist, bpm, key, energy
        </p>
      </div>

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
