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
  errors: ImportError[]
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
    }
  }

  if (data.length === 0) {
    return { tracks: [], errors: [] }
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
    }
  }

  const tracks: Track[] = []
  const errors: ImportError[] = []

  data.forEach((row, idx) => {
    const rowNum = idx + 2 // 1-based, accounting for header row
    const rowErrors: ImportError[] = []

    const title = row.title?.trim()
    if (!title) rowErrors.push({ row: rowNum, field: 'title', message: 'title is required' })

    const artist = row.artist?.trim()
    if (!artist) rowErrors.push({ row: rowNum, field: 'artist', message: 'artist is required' })

    const bpmRaw = row.bpm?.trim()
    const bpm = Number(bpmRaw)
    if (!bpmRaw || !Number.isFinite(bpm) || bpm <= 0) {
      rowErrors.push({ row: rowNum, field: 'bpm', message: `invalid bpm: "${bpmRaw}"` })
    }

    const keyRaw = row.key?.trim()
    if (!VALID_CAMELOT_KEYS.has(keyRaw)) {
      rowErrors.push({ row: rowNum, field: 'key', message: `invalid Camelot key: "${keyRaw}"` })
    }

    const energyRaw = row.energy?.trim()
    const energy = energyRaw.charAt(0).toUpperCase() + energyRaw.slice(1).toLowerCase()
    if (!VALID_ENERGY_LEVELS.has(energy)) {
      rowErrors.push({ row: rowNum, field: 'energy', message: `invalid energy: "${energyRaw}" (expected Low, Mid, or High)` })
    }

    if (rowErrors.length > 0) {
      errors.push(...rowErrors)
      return
    }

    tracks.push({
      id: crypto.randomUUID(),
      title,
      artist,
      bpm,
      key: keyRaw as CamelotKey,
      energy: energy as EnergyLevel,
      genre: row.genre?.trim() || undefined,
      label: row.label?.trim() || undefined,
      notes: row.notes?.trim() || undefined,
    })
  })

  return { tracks, errors }
}
