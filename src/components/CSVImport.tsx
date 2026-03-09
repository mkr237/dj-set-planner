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
    // Only clear if leaving the zone entirely (not entering a child)
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
    <div className="flex-1 flex flex-col items-center justify-center p-8">
      {/* Drop zone */}
      <div
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
        className={`w-full max-w-sm rounded-xl border-2 border-dashed p-10 flex flex-col items-center gap-4 transition-colors ${
          dragging
            ? 'border-indigo-400 bg-indigo-950/40'
            : 'border-gray-600 hover:border-gray-500'
        }`}
      >
        <div className="text-4xl text-gray-600 select-none">♫</div>

        <div className="text-center">
          <p className="text-gray-300 font-medium">Drop a CSV to get started</p>
          <p className="text-sm text-gray-500 mt-1">or</p>
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
          className="px-4 py-2 bg-indigo-600 hover:bg-indigo-500 rounded-lg text-sm font-medium transition-colors"
        >
          Browse for file
        </button>

        <p className="text-xs text-gray-600 text-center">
          Required columns: title, artist, bpm, key, energy
        </p>
      </div>

      {/* Feedback */}
      {importedCount !== null && (
        <div className="mt-6 w-full max-w-sm space-y-1">
          {importedCount > 0 && (
            <p className="text-sm text-green-400 text-center">
              {importedCount} track{importedCount !== 1 ? 's' : ''} imported
            </p>
          )}
          {errors.length > 0 && (
            <>
              <p className="text-sm text-red-400 text-center">
                {errors.length} row{errors.length !== 1 ? 's' : ''} skipped
              </p>
              <ul className="text-xs text-red-300 space-y-0.5 max-h-32 overflow-y-auto bg-gray-800/60 rounded p-2">
                {errors.map((err, i) => (
                  <li key={i}>Row {err.row}: {err.message}</li>
                ))}
              </ul>
            </>
          )}
        </div>
      )}
    </div>
  )
}
