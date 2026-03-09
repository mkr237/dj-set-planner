import Papa from 'papaparse'
import type { Track, CamelotKey, EnergyLevel } from '../types'

const REQUIRED_COLUMNS = ['title', 'artist', 'bpm', 'key', 'energy'] as const

const VALID_CAMELOT_KEYS = new Set<string>([
  '1A', '2A', '3A', '4A', '5A', '6A', '7A', '8A', '9A', '10A', '11A', '12A',
  '1B', '2B', '3B', '4B', '5B', '6B', '7B', '8B', '9B', '10B', '11B', '12B',
])

const VALID_ENERGY_LEVELS = new Set<string>(['Low', 'Mid', 'High'])

export interface ImportResult {
  tracks: Track[]
  errors: ImportError[]    // rows that were skipped entirely
  warnings: ImportError[]  // rows imported but with missing bpm/key
}

export interface ImportError {
  row: number
  field: string
  message: string
}

type RawRow = Record<string, string>

export function parseCSV(csvText: string): ImportResult {
  const { data, errors: parseErrors } = Papa.parse<RawRow>(csvText, {
    header: true,
    skipEmptyLines: true,
    transformHeader: (h) => h.trim().toLowerCase(),
  })

  if (parseErrors.length > 0) {
    return {
      tracks: [],
      errors: parseErrors.map(e => ({
        row: e.row ?? 0,
        field: 'csv',
        message: e.message,
      })),
      warnings: [],
    }
  }

  if (data.length === 0) {
    return { tracks: [], errors: [], warnings: [] }
  }

  const headers = Object.keys(data[0])
  const missingColumns = REQUIRED_COLUMNS.filter(col => !headers.includes(col))
  if (missingColumns.length > 0) {
    return {
      tracks: [],
      errors: [{
        row: 0,
        field: 'header',
        message: `Missing required columns: ${missingColumns.join(', ')}`,
      }],
      warnings: [],
    }
  }

  const tracks: Track[] = []
  const errors: ImportError[] = []
  const warnings: ImportError[] = []

  data.forEach((row, idx) => {
    const rowNum = idx + 2 // 1-based, accounting for header row
    const rowErrors: ImportError[] = []

    // title and artist are identity fields — skip row if missing
    const title = row.title?.trim()
    if (!title) rowErrors.push({ row: rowNum, field: 'title', message: 'title is required' })

    const artist = row.artist?.trim()
    if (!artist) rowErrors.push({ row: rowNum, field: 'artist', message: 'artist is required' })

    if (rowErrors.length > 0) {
      errors.push(...rowErrors)
      return
    }

    // bpm — null if missing/invalid, track still imported
    const bpmRaw = row.bpm?.trim()
    const bpmParsed = Number(bpmRaw)
    const bpm: number | null =
      bpmRaw && Number.isFinite(bpmParsed) && bpmParsed > 0 ? bpmParsed : null
    if (bpm === null) {
      warnings.push({
        row: rowNum,
        field: 'bpm',
        message: `missing or invalid bpm${bpmRaw ? ` "${bpmRaw}"` : ''} — imported as incomplete`,
      })
    }

    // key — null if missing/invalid, track still imported
    const keyRaw = row.key?.trim()
    const key: CamelotKey | null = VALID_CAMELOT_KEYS.has(keyRaw)
      ? (keyRaw as CamelotKey)
      : null
    if (key === null) {
      warnings.push({
        row: rowNum,
        field: 'key',
        message: `missing or invalid Camelot key${keyRaw ? ` "${keyRaw}"` : ''} — imported as incomplete`,
      })
    }

    // energy — 'Unknown' if missing/invalid, no warning
    const energyRaw = row.energy?.trim() ?? ''
    const energyNorm = energyRaw.charAt(0).toUpperCase() + energyRaw.slice(1).toLowerCase()
    const energy: EnergyLevel = VALID_ENERGY_LEVELS.has(energyNorm)
      ? (energyNorm as EnergyLevel)
      : 'Unknown'

    tracks.push({
      id: crypto.randomUUID(),
      title,
      artist,
      bpm,
      key,
      energy,
      genre: row.genre?.trim() || undefined,
      label: row.label?.trim() || undefined,
      notes: row.notes?.trim() || undefined,
    })
  })

  return { tracks, errors, warnings }
}
