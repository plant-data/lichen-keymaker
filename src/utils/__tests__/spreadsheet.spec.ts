import { describe, it, expect } from 'vitest'
import * as XLSX from 'xlsx'
import {
  validateFile,
  parseSpreadsheet,
  extractColumn,
  dedupeNames,
  normalizeName,
  MAX_FILE_SIZE
} from '../spreadsheet'

// jsdom's File does not implement arrayBuffer(); polyfill it for the parser.
const withArrayBuffer = (file: File, bytes: Uint8Array): File => {
  Object.defineProperty(file, 'arrayBuffer', { value: async () => bytes.buffer })
  return file
}

const makeFile = (name: string, size: number, content = 'x'): File => {
  const file = new File([content], name)
  Object.defineProperty(file, 'size', { value: size })
  return file
}

const csvFile = (csv: string): File => {
  const bytes = new TextEncoder().encode(csv)
  return withArrayBuffer(new File([bytes], 'data.csv', { type: 'text/csv' }), bytes)
}

describe('validateFile', () => {
  it('accepts allowed extensions within the size limit', () => {
    expect(validateFile(makeFile('a.csv', 100))).toBeNull()
    expect(validateFile(makeFile('a.xlsx', 100))).toBeNull()
    expect(validateFile(makeFile('a.xls', 100))).toBeNull()
  })

  it('rejects unsupported extensions', () => {
    expect(validateFile(makeFile('a.txt', 100))).toMatch(/Unsupported file type/)
  })

  it('rejects files over the size limit', () => {
    expect(validateFile(makeFile('a.csv', MAX_FILE_SIZE + 1))).toMatch(/too large/)
  })
})

describe('parseSpreadsheet', () => {
  it('reads headers and rows from a csv', async () => {
    const { headers, rows } = await parseSpreadsheet(
      csvFile('name,count\nXanthoria parietina,3\nCladonia rangiferina,1')
    )
    expect(headers).toEqual(['name', 'count'])
    expect(rows).toHaveLength(2)
    expect(rows[0].name).toBe('Xanthoria parietina')
  })

  it('decodes UTF-8 accented characters in a csv', async () => {
    const { rows } = await parseSpreadsheet(
      csvFile('name\nAcarospora glaucocarpa (Ach.) Körb.\nLecanora epibryon (Ach.) Ach.')
    )
    expect(rows[0].name).toBe('Acarospora glaucocarpa (Ach.) Körb.')
  })

  it('reads an xlsx buffer', async () => {
    const ws = XLSX.utils.aoa_to_sheet([
      ['name', 'count'],
      ['Lecanora dispersa', 2]
    ])
    const wb = XLSX.utils.book_new()
    XLSX.utils.book_append_sheet(wb, ws, 'Sheet1')
    const written = XLSX.write(wb, { type: 'array', bookType: 'xlsx' })
    const bytes = new Uint8Array(written)
    const file = withArrayBuffer(new File([bytes], 'data.xlsx'), bytes)

    const { headers, rows } = await parseSpreadsheet(file)
    expect(headers).toEqual(['name', 'count'])
    expect(rows[0].name).toBe('Lecanora dispersa')
  })
})

describe('normalizeName', () => {
  it('collapses tabs, newlines and CR between words into a single space', () => {
    expect(normalizeName('Aspicilia\tverruculosa Kremp.')).toBe('Aspicilia verruculosa Kremp.')
    expect(normalizeName('Aspicilia verruculosa\nKremp.')).toBe('Aspicilia verruculosa Kremp.')
    expect(normalizeName('Aspicilia\r\nverruculosa  Kremp.')).toBe('Aspicilia verruculosa Kremp.')
  })

  it('strips zero-width characters and trims', () => {
    expect(normalizeName('\u200BXanthoria\u200D parietina\uFEFF ')).toBe('Xanthoria parietina')
  })

  it('collapses non-breaking spaces', () => {
    expect(normalizeName('Lecanora\u00A0dispersa')).toBe('Lecanora dispersa')
  })
})

describe('extractColumn', () => {
  it('normalizes values and drops empties', () => {
    const rows = [{ name: ' A ' }, { name: '' }, { name: 'B' }, { name: '   ' }]
    expect(extractColumn(rows, 'name')).toEqual(['A', 'B'])
  })

  it('cleans invisible whitespace inside cell values', () => {
    const rows = [{ name: 'Aspicilia\tverruculosa Kremp.' }]
    expect(extractColumn(rows, 'name')).toEqual(['Aspicilia verruculosa Kremp.'])
  })
})

describe('dedupeNames', () => {
  it('removes case-insensitive duplicates keeping the first spelling', () => {
    expect(dedupeNames(['Abc', 'abc', 'ABC', 'Def'])).toEqual(['Abc', 'Def'])
  })
})
