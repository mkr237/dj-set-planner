import { describe, expect, it } from 'vitest'
import { parseCSV } from './csvImport'

const VALID_CSV = `title,artist,bpm,key,energy,genre,label,notes
"Pharaoh","Calyx & TeeBee",174,"4A","High","DnB","RAM","Tech roller"
"Titan","Mefjus",172,"5A","High","DnB","Vision","Heavy hitter"
"Landlord","S.P.Y",174,"4B","Mid","DnB","Hospital","Liquid roller"`

const MINIMAL_CSV = `title,artist,bpm,key,energy
"Track One","Artist A",140,"1A","Low"`

describe('parseCSV', () => {
  // --- Happy path ---

  describe('valid input', () => {
    it('returns the correct number of tracks', () => {
      const { tracks, errors } = parseCSV(VALID_CSV)
      expect(errors).toHaveLength(0)
      expect(tracks).toHaveLength(3)
    })

    it('maps fields correctly', () => {
      const { tracks } = parseCSV(VALID_CSV)
      expect(tracks[0]).toMatchObject({
        title: 'Pharaoh',
        artist: 'Calyx & TeeBee',
        bpm: 174,
        key: '4A',
        energy: 'High',
        genre: 'DnB',
        label: 'RAM',
        notes: 'Tech roller',
      })
    })

    it('assigns a unique uuid to each track', () => {
      const { tracks } = parseCSV(VALID_CSV)
      const ids = tracks.map(t => t.id)
      expect(new Set(ids).size).toBe(ids.length)
      ids.forEach(id => expect(id).toMatch(
        /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/
      ))
    })

    it('parses minimal CSV with only required columns', () => {
      const { tracks, errors } = parseCSV(MINIMAL_CSV)
      expect(errors).toHaveLength(0)
      expect(tracks).toHaveLength(1)
      expect(tracks[0].genre).toBeUndefined()
      expect(tracks[0].label).toBeUndefined()
      expect(tracks[0].notes).toBeUndefined()
    })

    it('returns empty tracks and no errors for header-only CSV', () => {
      const { tracks, errors } = parseCSV('title,artist,bpm,key,energy')
      expect(tracks).toHaveLength(0)
      expect(errors).toHaveLength(0)
    })

    it('normalises header casing (e.g. Title -> title)', () => {
      const csv = `Title,Artist,BPM,Key,Energy\n"X","Y",120,"6B","Mid"`
      const { tracks, errors } = parseCSV(csv)
      expect(errors).toHaveLength(0)
      expect(tracks).toHaveLength(1)
    })

    it('normalises energy casing (high -> High)', () => {
      const csv = `title,artist,bpm,key,energy\n"X","Y",120,"6B","high"`
      const { tracks } = parseCSV(csv)
      expect(tracks[0].energy).toBe('High')
    })

    it('treats blank optional fields as undefined', () => {
      const csv = `title,artist,bpm,key,energy,genre,label,notes\n"X","Y",120,"6B","Mid","","",""`
      const { tracks } = parseCSV(csv)
      expect(tracks[0].genre).toBeUndefined()
      expect(tracks[0].label).toBeUndefined()
      expect(tracks[0].notes).toBeUndefined()
    })

    it('parses all 24 valid Camelot keys without error', () => {
      const rows = [
        '1A','2A','3A','4A','5A','6A','7A','8A','9A','10A','11A','12A',
        '1B','2B','3B','4B','5B','6B','7B','8B','9B','10B','11B','12B',
      ].map((k, i) => `"T${i}","A",120,"${k}","Low"`)
      const csv = `title,artist,bpm,key,energy\n${rows.join('\n')}`
      const { tracks, errors } = parseCSV(csv)
      expect(errors).toHaveLength(0)
      expect(tracks).toHaveLength(24)
    })
  })

  // --- Missing columns ---

  describe('missing required columns', () => {
    it('reports an error when title column is absent', () => {
      const csv = `artist,bpm,key,energy\n"A",120,"1A","Low"`
      const { tracks, errors } = parseCSV(csv)
      expect(tracks).toHaveLength(0)
      expect(errors[0].field).toBe('header')
      expect(errors[0].message).toContain('title')
    })

    it('reports all missing columns in one error', () => {
      const csv = `title,artist\n"T","A"`
      const { errors } = parseCSV(csv)
      expect(errors[0].message).toContain('bpm')
      expect(errors[0].message).toContain('key')
      expect(errors[0].message).toContain('energy')
    })
  })

  // --- Row-level validation ---

  describe('invalid rows', () => {
    it('rejects a row with a blank title', () => {
      const csv = `title,artist,bpm,key,energy\n"","Artist",120,"1A","Low"`
      const { tracks, errors } = parseCSV(csv)
      expect(tracks).toHaveLength(0)
      expect(errors[0].field).toBe('title')
    })

    it('rejects a row with a blank artist', () => {
      const csv = `title,artist,bpm,key,energy\n"Title","",120,"1A","Low"`
      const { errors } = parseCSV(csv)
      expect(errors[0].field).toBe('artist')
    })

    it('rejects a non-numeric bpm', () => {
      const csv = `title,artist,bpm,key,energy\n"T","A","fast","1A","Low"`
      const { errors } = parseCSV(csv)
      expect(errors.some(e => e.field === 'bpm')).toBe(true)
    })

    it('rejects a zero bpm', () => {
      const csv = `title,artist,bpm,key,energy\n"T","A",0,"1A","Low"`
      const { errors } = parseCSV(csv)
      expect(errors.some(e => e.field === 'bpm')).toBe(true)
    })

    it('rejects an invalid Camelot key', () => {
      const csv = `title,artist,bpm,key,energy\n"T","A",120,"13A","Low"`
      const { errors } = parseCSV(csv)
      expect(errors.some(e => e.field === 'key')).toBe(true)
    })

    it('rejects an invalid energy level', () => {
      const csv = `title,artist,bpm,key,energy\n"T","A",120,"1A","Extreme"`
      const { errors } = parseCSV(csv)
      expect(errors.some(e => e.field === 'energy')).toBe(true)
    })

    it('includes the correct 1-based row number in errors', () => {
      const csv = `title,artist,bpm,key,energy\n"Good","A",120,"1A","Low"\n"","B",120,"1A","Low"`
      const { errors } = parseCSV(csv)
      expect(errors[0].row).toBe(3) // header=1, first data row=2, second=3
    })

    it('collects multiple errors from the same invalid row', () => {
      const csv = `title,artist,bpm,key,energy\n"","",0,"bad","wrong"`
      const { errors } = parseCSV(csv)
      expect(errors.length).toBeGreaterThanOrEqual(4)
    })

    it('skips invalid rows but still imports valid ones', () => {
      const csv = `title,artist,bpm,key,energy
"Good","Artist",174,"4A","High"
"","Bad Row",174,"4A","High"
"Also Good","Artist",172,"5A","Mid"`
      const { tracks, errors } = parseCSV(csv)
      expect(tracks).toHaveLength(2)
      expect(errors).toHaveLength(1)
      expect(tracks.map(t => t.title)).toEqual(['Good', 'Also Good'])
    })
  })
})
