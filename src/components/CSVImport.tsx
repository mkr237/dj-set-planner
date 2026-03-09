import { useRef, useState } from 'react'
import { parseCSV, type ImportError } from '../utils/csvImport'
import { useAppContext } from '../context/AppContext'

export function CSVImport() {
  const { dispatch } = useAppContext()
  const inputRef = useRef<HTMLInputElement>(null)
  const [errors, setErrors] = useState<ImportError[]>([])
  const [importedCount, setImportedCount] = useState<number | null>(null)

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
    // Reset so the same file can be re-imported
    e.target.value = ''
  }

  return (
    <div className="p-4 border-b border-gray-700">
      <h2 className="text-sm font-semibold uppercase tracking-wider text-gray-400 mb-3">
        Import Tracks
      </h2>

      <input
        ref={inputRef}
        type="file"
        accept=".csv"
        className="hidden"
        onChange={handleChange}
      />

      <button
        onClick={() => inputRef.current?.click()}
        className="w-full py-2 px-4 bg-indigo-600 hover:bg-indigo-500 rounded text-sm font-medium transition-colors"
      >
        Choose CSV file
      </button>

      {importedCount !== null && errors.length === 0 && (
        <p className="mt-2 text-sm text-green-400">
          {importedCount} track{importedCount !== 1 ? 's' : ''} imported
        </p>
      )}

      {importedCount !== null && errors.length > 0 && (
        <div className="mt-2">
          {importedCount > 0 && (
            <p className="text-sm text-green-400 mb-1">
              {importedCount} track{importedCount !== 1 ? 's' : ''} imported
            </p>
          )}
          <p className="text-sm text-red-400 mb-1">
            {errors.length} row{errors.length !== 1 ? 's' : ''} skipped:
          </p>
          <ul className="text-xs text-red-300 space-y-0.5 max-h-32 overflow-y-auto">
            {errors.map((err, i) => (
              <li key={i}>Row {err.row}: {err.message}</li>
            ))}
          </ul>
        </div>
      )}
    </div>
  )
}
