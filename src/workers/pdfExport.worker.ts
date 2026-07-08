/// <reference lib="webworker" />
// Web Worker that turns a flat list of key leads into a PDF (pdfmake) off the
// main thread, so the UI never freezes even for the ~10k-row full key.
//
// It receives an already-materialized `KeyLead[]` (the main thread is
// responsible for resolving "current" vs "full" scope) and emits progress
// messages while building the document, then the finished Blob.

import * as pdfMakeNs from 'pdfmake/build/pdfmake'
import vfs from 'pdfmake/build/vfs_fonts'
import type { Content, TDocumentDefinitions } from 'pdfmake/interfaces'
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

const COL_COUPLET = 30
const COL_LEAD_TO = 92
const COLUMN_GAP = 6
const BUILD_PROGRESS_CEILING = 85
const PROGRESS_CHUNK = 250
// when images are embedded, fetching them is the slow part: give it the lower
// band of the progress bar and shrink the content-build band accordingly
const FETCH_PROGRESS_CEILING = 60
const IMG_WIDTH = 120

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

function buildRow(
  row: PdfRow,
  includeDescriptions: boolean,
  imageMap: Map<string, string> | null
): Content[] {
  // `leadId` is the next couplet number, or the species name for a terminal
  // lead (set by Tree.adjustIds).
  const leadTo = String(row.leadId ?? '')

  const blocks: Content[] = [
    {
      columns: [
        { width: COL_COUPLET, text: String(row.parentId ?? ''), bold: true },
        { width: '*', text: htmlToPdfmake(row.leadText) },
        { width: COL_LEAD_TO, text: leadTo }
      ],
      columnGap: COLUMN_GAP,
      margin: [0, 1.5, 0, 1.5]
    }
  ]

  if (includeDescriptions && row.species_description) {
    blocks.push({
      text: htmlToPdfmake(row.species_description),
      fontSize: 8,
      color: '#555555',
      margin: [COL_COUPLET + COLUMN_GAP, 0, 0, 4]
    })
  }

  if (imageMap) {
    // couplet illustration and/or species photo, whichever resolved successfully
    for (const url of [row.leadImageUrl, row.speciesImageUrl]) {
      const dataUrl = url ? imageMap.get(url) : undefined
      if (dataUrl) {
        blocks.push({
          image: dataUrl,
          width: IMG_WIDTH,
          margin: [COL_COUPLET + COLUMN_GAP, 2, 0, 4]
        })
      }
    }
  }

  return blocks
}

async function buildDocDefinition(req: PdfExportRequest): Promise<TDocumentDefinitions> {
  const { rows, includeDescriptions, includeImages } = req
  const total = rows.length

  const imageMap = includeImages ? await fetchImageMap(rows) : null
  // content build occupies the band between fetching and the final createPdf
  const buildFloor = includeImages ? FETCH_PROGRESS_CEILING : 0
  const buildSpan = BUILD_PROGRESS_CEILING - buildFloor

  const content: Content[] = [
    { text: 'ITALIC - THE KEYMAKER', fontSize: 14, bold: true, margin: [0, 0, 0, 10] }
  ]

  for (let i = 0; i < total; i++) {
    content.push(...buildRow(rows[i], includeDescriptions, imageMap))
    if (i % PROGRESS_CHUNK === 0) {
      const value = buildFloor + Math.round((i / total) * buildSpan)
      ctx.postMessage({ type: 'progress', value } satisfies PdfExportResponse)
    }
  }

  return {
    pageSize: 'A4',
    pageMargins: [40, 56, 40, 40],
    defaultStyle: { fontSize: 9, lineHeight: 1.1 },
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
