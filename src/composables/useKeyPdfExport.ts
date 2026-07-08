import { ref } from 'vue'
import type { KeyLead } from '@/types'
import type { PdfExportRequest, PdfExportResponse, PdfRow } from '@/workers/pdfExport.worker'
import { leadImageToUrl, imageUrlToThumbNailUrl } from '@/utils/imageUtils'

// Map to a plain, non-reactive shape with only the fields the PDF needs. This
// strips Vue reactive proxies (which cannot be structured-cloned by postMessage)
// and keeps the payload small even for the whole multi-thousand-row key.
// Image URLs are resolved here (main thread has access to the env-based paths)
// and only when requested; the species photo uses its thumbnail to keep size down.
function toPdfRow(row: KeyLead, includeImages: boolean): PdfRow {
  return {
    parentId: row.parentId,
    leadText: row.leadText,
    leadId: row.leadId,
    italicId: row.italicId,
    species_description: row.species_description,
    leadImageUrl: includeImages && row.leadImage ? leadImageToUrl(row.leadImage) : null,
    speciesImageUrl:
      includeImages && row.speciesImage ? imageUrlToThumbNailUrl(row.speciesImage) : null
  }
}

export interface ExportOptions {
  // the already-resolved leads to export (caller picks which list from the store)
  rows: KeyLead[]
  includeDescriptions: boolean
  includeImages: boolean
  fileName: string
}

export function useKeyPdfExport() {
  const isExporting = ref(false)
  const progress = ref(0)
  const error = ref<string | null>(null)

  const triggerDownload = (blob: Blob, fileName: string) => {
    const url = URL.createObjectURL(blob)
    const anchor = document.createElement('a')
    anchor.href = url
    anchor.download = fileName
    document.body.appendChild(anchor)
    anchor.click()
    document.body.removeChild(anchor)
    URL.revokeObjectURL(url)
  }

  const exportPdf = async (options: ExportOptions): Promise<void> => {
    if (isExporting.value) return

    isExporting.value = true
    progress.value = 0
    error.value = null

    const { rows, includeDescriptions, includeImages, fileName } = options

    const worker = new Worker(new URL('../workers/pdfExport.worker.ts', import.meta.url), {
      type: 'module'
    })

    const cleanup = () => {
      worker.terminate()
      isExporting.value = false
    }

    try {
      await new Promise<void>((resolve, reject) => {
        worker.onmessage = (event: MessageEvent<PdfExportResponse>) => {
          const data = event.data
          if (data.type === 'progress') {
            progress.value = data.value
          } else if (data.type === 'done') {
            triggerDownload(data.blob, fileName)
            progress.value = 100
            resolve()
          } else if (data.type === 'error') {
            reject(new Error(data.message))
          }
        }
        worker.onerror = (e) => reject(new Error(e.message || 'Worker failed'))

        const request: PdfExportRequest = {
          rows: rows.map((row) => toPdfRow(row, includeImages)),
          includeDescriptions,
          includeImages
        }
        worker.postMessage(request)
      })
    } catch (e) {
      error.value = e instanceof Error ? e.message : 'PDF export failed'
    } finally {
      cleanup()
    }
  }

  return { isExporting, progress, error, exportPdf }
}
