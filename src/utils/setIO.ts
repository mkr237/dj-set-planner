import type { DJSet, Track } from '../types'

const EXPORT_VERSION = 1

export interface SetExportBundle {
  version: typeof EXPORT_VERSION
  set: DJSet
  tracks: Track[]
}

// ---------------------------------------------------------------------------
// Export
// ---------------------------------------------------------------------------

/** Serialise a set + its referenced tracks and trigger a browser download. */
export function exportSetAsJSON(set: DJSet, library: Track[]): void {
  const referencedIds = new Set(set.tracks.map(st => st.trackId))
  const tracks = library.filter(t => referencedIds.has(t.id))

  const bundle: SetExportBundle = { version: EXPORT_VERSION, set, tracks }
  const json = JSON.stringify(bundle, null, 2)

  const blob = new Blob([json], { type: 'application/json' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = `${set.name.replace(/[^a-z0-9]/gi, '_')}.json`
  a.click()
  URL.revokeObjectURL(url)
}

// ---------------------------------------------------------------------------
// Import
// ---------------------------------------------------------------------------

export interface ImportSetResult {
  set: DJSet
  newTracks: Track[]   // tracks not already in the library (by id)
}

export class SetImportError extends Error {}

/** Parse and validate a set export bundle from raw JSON text. */
export function parseSetBundle(
  jsonText: string,
  existingLibrary: Track[],
): ImportSetResult {
  let parsed: unknown
  try {
    parsed = JSON.parse(jsonText)
  } catch {
    throw new SetImportError('File is not valid JSON.')
  }

  if (
    typeof parsed !== 'object' ||
    parsed === null ||
    (parsed as SetExportBundle).version !== EXPORT_VERSION
  ) {
    throw new SetImportError('Unrecognised file format or version.')
  }

  const bundle = parsed as SetExportBundle

  if (!bundle.set?.id || !bundle.set?.name || !Array.isArray(bundle.set?.tracks)) {
    throw new SetImportError('Missing or invalid set data.')
  }

  if (!Array.isArray(bundle.tracks)) {
    throw new SetImportError('Missing track data.')
  }

  const existingIds = new Set(existingLibrary.map(t => t.id))
  const newTracks = bundle.tracks.filter(t => !existingIds.has(t.id))

  return { set: bundle.set, newTracks }
}
