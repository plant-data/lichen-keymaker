import * as XLSX from 'xlsx'

export const MAX_FILE_SIZE = 10 * 1024 * 1024 // 10 MB
const ALLOWED_EXTENSIONS = ['xls', 'xlsx', 'csv']

export type ParsedSpreadsheet = {
  headers: string[]
  rows: Record<string, unknown>[]
}

/**
 * Validate an uploaded file by extension and size.
 * Returns an error message, or null when the file is acceptable.
 */
export function validateFile(file: File): string | null {
  const extension = file.name.split('.').pop()?.toLowerCase() ?? ''
  if (!ALLOWED_EXTENSIONS.includes(extension)) {
    return `Unsupported file type ".${extension}". Please upload an .xls, .xlsx or .csv file.`
  }
  if (file.size > MAX_FILE_SIZE) {
    return `File is too large (${(file.size / 1024 / 1024).toFixed(1)} MB). The limit is 10 MB.`
  }
  return null
}

/**
 * Parse the first sheet of a spreadsheet into headers + rows.
 * Empty cells become '' so every row keeps the same keys.
 */
export async function parseSpreadsheet(file: File): Promise<ParsedSpreadsheet> {
  const data = await file.arrayBuffer()
  // CSV bytes must be decoded as UTF-8 explicitly: SheetJS otherwise assumes a
  // single-byte codepage and mangles accented author names (e.g. "Körb.").
  // xls/xlsx are binary containers and store text as UTF-8 internally.
  const isCsv = file.name.split('.').pop()?.toLowerCase() === 'csv'
  const workbook = isCsv
    ? XLSX.read(new TextDecoder('utf-8').decode(data), { type: 'string' })
    : XLSX.read(data, { type: 'array' })
  const firstSheetName = workbook.SheetNames[0]
  if (!firstSheetName) {
    return { headers: [], rows: [] }
  }
  const sheet = workbook.Sheets[firstSheetName]
  const rows = XLSX.utils.sheet_to_json<Record<string, unknown>>(sheet, { defval: '' })
  const headers = rows.length ? Object.keys(rows[0]) : []
  return { headers, rows }
}

/**
 * Clean a cell value into a matchable name. Spreadsheet cells often carry
 * invisible artifacts (in-cell line breaks, tabs, non-breaking/zero-width
 * spaces) that the ITALIC match API rejects, so collapse every run of
 * whitespace to a single space and strip zero-width characters.
 * `\s` already covers tab/newline/CR/nbsp; zero-width joiners do not.
 */
export function normalizeName(value: string): string {
  return value
    .replace(/[\u200B-\u200D\uFEFF]/g, '')
    .replace(/\s+/g, ' ')
    .trim()
}

/**
 * Extract a single column, normalising values and dropping empties.
 */
export function extractColumn(rows: Record<string, unknown>[], header: string): string[] {
  return rows
    .map((row) => normalizeName(String(row[header] ?? '')))
    .filter((value) => value.length > 0)
}

/**
 * Case-insensitive de-duplication that preserves the first spelling seen.
 * Used to minimise the number of match requests.
 */
export function dedupeNames(names: string[]): string[] {
  const seen = new Set<string>()
  const result: string[] = []
  for (const name of names) {
    const key = name.toLowerCase()
    if (!seen.has(key)) {
      seen.add(key)
      result.push(name)
    }
  }
  return result
}
