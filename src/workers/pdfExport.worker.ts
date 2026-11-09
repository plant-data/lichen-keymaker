/// <reference lib="webworker" />
// Web Worker that turns a flat list of key leads into a PDF (pdfmake) off the
// main thread, so the UI never freezes even for the ~10k-row full key.
//
// It receives an already-materialized `KeyLead[]` (the main thread is
// responsible for resolving "current" vs "full" scope) and emits progress
// messages while building the document, then the finished Blob.

import * as pdfMakeNs from 'pdfmake/build/pdfmake'
import vfs from 'pdfmake/build/vfs_fonts'
import type { Column, Content, TableCell, TDocumentDefinitions } from 'pdfmake/interfaces'
import { htmlToPdfmake } from '@/utils/htmlToPdfmake'

// The browser UMD build's default export is the pdfMake instance; its methods
// live on the instance, so the ESM namespace alone is not callable.
const pdfMake = ((pdfMakeNs as { default?: typeof pdfMakeNs }).default ??
  pdfMakeNs) as typeof pdfMakeNs

pdfMake.addVirtualFileSystem(vfs)

// Minimal, plain (non-reactive) row shape sent across the worker boundary —
// only the fields the PDF needs. Keeping it flat also avoids structured-clone
// errors from Vue reactive proxies and keeps the cloned payload small.
export interface PdfRow {
  parentId: number | string | null
  leadText: string | null
  leadId: number | string | null
  italicId: number | null
  species_description: string | null
  // absolute image URLs, resolved on the main thread; only set when includeImages
  leadImageUrl?: string | null
  speciesImageUrl?: string | null
}

export interface PdfExportRequest {
  rows: PdfRow[]
  includeDescriptions: boolean
  includeImages: boolean
}

export type PdfExportResponse =
  | { type: 'progress'; value: number }
  | { type: 'done'; blob: Blob }
  | { type: 'error'; message: string }

const ctx = self as unknown as DedicatedWorkerGlobalScope

// Layout geometry (A4, ~515pt of usable width inside the page margins).
const COL_COUPLET = 24 // width of the couplet-number gutter
const COLUMN_GAP = 8
const TARGET_WIDTH = 140 // "→ N" or the species name, right-aligned
const LEAD_IMG_WIDTH = 96 // small couplet illustration under a lead
const SPECIES_IMG_WIDTH = 108 // species photo inside the result panel
const SPECIES_IMG_MAX_H = 150

const BUILD_PROGRESS_CEILING = 85
const PROGRESS_CHUNK = 100
// when images are embedded, fetching them is the slow part: give it the lower
// band of the progress bar and shrink the content-build band accordingly
const FETCH_PROGRESS_CEILING = 60

// Palette — deliberately neutral (slate), so the key reads as a clean document.
const COLOR_COUPLET = '#0f172a' // couplet number + species name
const COLOR_TARGET = '#475569' // "→ N" go-to marker
const COLOR_RULE = '#cbd5e1' // separator between couplets
const COLOR_PANEL_BG = '#f1f5f9' // result panel background
const COLOR_DESC_LABEL = '#94a3b8'
const COLOR_DESC_TEXT = '#475569'

// Fetch an image and return a base64 data-URL (pdfmake needs image data, not a
// URL). Runs in the worker; fetch/blob/arrayBuffer are all available here.
async function fetchAsDataUrl(url: string): Promise<string> {
  const res = await fetch(url)
  if (!res.ok) {
    throw new Error(`HTTP ${res.status}`)
  }
  const blob = await res.blob()
  const bytes = new Uint8Array(await blob.arrayBuffer())
  let binary = ''
  const CHUNK = 0x8000
  for (let i = 0; i < bytes.length; i += CHUNK) {
    binary += String.fromCharCode(...bytes.subarray(i, i + CHUNK))
  }
  const mime = blob.type || 'image/jpeg'
  return `data:${mime};base64,${btoa(binary)}`
}

// Pre-fetch every distinct image URL once. Failures are skipped (the URL is
// simply absent from the map) so the PDF still generates without that image.
async function fetchImageMap(rows: PdfRow[]): Promise<Map<string, string>> {
  const urls = new Set<string>()
  for (const row of rows) {
    if (row.leadImageUrl) urls.add(row.leadImageUrl)
    if (row.speciesImageUrl) urls.add(row.speciesImageUrl)
  }
  const map = new Map<string, string>()
  const list = [...urls]
  for (let i = 0; i < list.length; i++) {
    try {
      map.set(list[i], await fetchAsDataUrl(list[i]))
    } catch {
      // ignore: skip unreachable/failed images
    }
    const value = Math.round(((i + 1) / list.length) * FETCH_PROGRESS_CEILING)
    ctx.postMessage({ type: 'progress', value } satisfies PdfExportResponse)
  }
  return map
}

// The result "panel" shown under a terminal (species) lead: the species photo
// beside its description, on a light background so it reads as one unit that
// clearly belongs to that lead.
function buildResultPanel(
  row: PdfRow,
  includeDescriptions: boolean,
  speciesImage: string | undefined
): Content | null {
  const hasDescription = includeDescriptions && !!row.species_description
  if (!speciesImage && !hasDescription) return null

  const inner: Column[] = []
  if (speciesImage) {
    inner.push({
      width: SPECIES_IMG_WIDTH,
      image: speciesImage,
      fit: [SPECIES_IMG_WIDTH, SPECIES_IMG_MAX_H]
    })
  }
  if (hasDescription) {
    inner.push({
      width: '*',
      stack: [
        { text: 'DESCRIPTION', fontSize: 6.5, bold: true, color: COLOR_DESC_LABEL },
        {
          text: htmlToPdfmake(row.species_description),
          fontSize: 8,
          color: COLOR_DESC_TEXT,
          lineHeight: 1.15,
          margin: [0, 2, 0, 0]
        }
      ]
    })
  }

  return {
    table: { widths: ['*'], body: [[{ columns: inner, columnGap: 10 }]] },
    layout: {
      hLineWidth: () => 0,
      vLineWidth: () => 0,
      fillColor: () => COLOR_PANEL_BG,
      paddingLeft: () => 8,
      paddingRight: () => 8,
      paddingTop: () => 6,
      paddingBottom: () => 6
    },
    margin: [0, 5, 0, 1]
  }
}

// One lead (one alternative of a couplet): the descriptive text on the left, and
// on the right either "→ N" (go to couplet N) or, for a terminal lead, the
// resulting species name in bold. Any couplet illustration and the species
// result panel are stacked underneath.
function buildLead(
  row: PdfRow,
  includeDescriptions: boolean,
  imageMap: Map<string, string> | null
): Content {
  // `leadId` is the next couplet number, or the species name for a terminal
  // lead (set by Tree.adjustIds); `italicId` is only set on terminal leads.
  const isSpecies = row.italicId != null
  const target = String(row.leadId ?? '')

  const leadImage = imageMap && row.leadImageUrl ? imageMap.get(row.leadImageUrl) : undefined
  const speciesImage =
    imageMap && row.speciesImageUrl ? imageMap.get(row.speciesImageUrl) : undefined

  const stack: Content[] = [
    {
      columns: [
        { width: '*', text: htmlToPdfmake(row.leadText) },
        {
          width: TARGET_WIDTH,
          text: isSpecies ? target : `→ ${target}`,
          alignment: 'right',
          bold: isSpecies,
          color: isSpecies ? COLOR_COUPLET : COLOR_TARGET
        }
      ],
      columnGap: COLUMN_GAP
    }
  ]

  if (leadImage) {
    stack.push({ image: leadImage, width: LEAD_IMG_WIDTH, margin: [0, 3, 0, 0] })
  }

  if (isSpecies) {
    const panel = buildResultPanel(row, includeDescriptions, speciesImage)
    if (panel) stack.push(panel)
  }

  return { stack, margin: [0, 3, 0, 3] }
}

// One couplet: its number is shown once in the left gutter (spanning its leads),
// with a hairline rule under the whole couplet to separate it from the next.
function buildCouplet(
  leads: PdfRow[],
  includeDescriptions: boolean,
  imageMap: Map<string, string> | null
): Content {
  const coupletNo = String(leads[0]?.parentId ?? '')

  const body: TableCell[][] = leads.map((lead, i) => {
    const numberCell: TableCell =
      i === 0
        ? { text: coupletNo, rowSpan: leads.length, bold: true, fontSize: 11, color: COLOR_COUPLET }
        : {}
    return [numberCell, buildLead(lead, includeDescriptions, imageMap)]
  })

  return {
    table: { widths: [COL_COUPLET, '*'], body },
    layout: {
      hLineWidth: (i: number, node) => (i === node.table.body.length ? 0.5 : 0),
      hLineColor: () => COLOR_RULE,
      vLineWidth: () => 0,
      paddingLeft: () => 0,
      paddingRight: () => 0,
      paddingTop: () => 0,
      paddingBottom: () => 0
    }
  }
}

// Group the flat lead list into couplets by their shared `parentId`. The list is
// already ordered so a couplet's leads are adjacent; grouping on change keeps it
// robust without assuming a fixed number of leads per couplet.
function groupCouplets(rows: PdfRow[]): PdfRow[][] {
  const couplets: PdfRow[][] = []
  for (const row of rows) {
    const current = couplets[couplets.length - 1]
    if (current && String(current[0].parentId) === String(row.parentId)) {
      current.push(row)
    } else {
      couplets.push([row])
    }
  }
  return couplets
}

async function buildDocDefinition(req: PdfExportRequest): Promise<TDocumentDefinitions> {
  const { rows, includeDescriptions, includeImages } = req

  const imageMap = includeImages ? await fetchImageMap(rows) : null
  // content build occupies the band between fetching and the final createPdf
  const buildFloor = includeImages ? FETCH_PROGRESS_CEILING : 0
  const buildSpan = BUILD_PROGRESS_CEILING - buildFloor

  const couplets = groupCouplets(rows)

  const content: Content[] = [
    {
      text: 'ITALIC — The Keymaker',
      fontSize: 16,
      bold: true,
      color: COLOR_COUPLET,
      margin: [0, 0, 0, 2]
    },
    {
      text: 'Dichotomous identification key · read each couplet, pick the matching lead, then follow it to the next couplet number or to a species.',
      fontSize: 8,
      color: COLOR_DESC_TEXT,
      margin: [0, 0, 0, 12]
    }
  ]

  for (let i = 0; i < couplets.length; i++) {
    content.push(buildCouplet(couplets[i], includeDescriptions, imageMap))
    if (i % PROGRESS_CHUNK === 0 && couplets.length > 0) {
      const value = buildFloor + Math.round((i / couplets.length) * buildSpan)
      ctx.postMessage({ type: 'progress', value } satisfies PdfExportResponse)
    }
  }

  return {
    pageSize: 'A4',
    pageMargins: [40, 48, 40, 40],
    defaultStyle: { fontSize: 9, lineHeight: 1.15 },
    footer: (currentPage: number, pageCount: number) => ({
      text: `${currentPage} / ${pageCount}`,
      alignment: 'center',
      fontSize: 8,
      color: '#888888',
      margin: [0, 8, 0, 0]
    }),
    content
  }
}

ctx.onmessage = async (event: MessageEvent<PdfExportRequest>) => {
  try {
    const docDefinition = await buildDocDefinition(event.data)
    ctx.postMessage({ type: 'progress', value: BUILD_PROGRESS_CEILING } satisfies PdfExportResponse)

    const blob = await pdfMake.createPdf(docDefinition).getBlob()

    ctx.postMessage({ type: 'progress', value: 100 } satisfies PdfExportResponse)
    ctx.postMessage({ type: 'done', blob } satisfies PdfExportResponse)
  } catch (error) {
    ctx.postMessage({
      type: 'error',
      message: error instanceof Error ? error.message : 'PDF generation failed'
    } satisfies PdfExportResponse)
  }
}
