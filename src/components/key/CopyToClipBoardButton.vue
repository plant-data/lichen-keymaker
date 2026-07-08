<template>
  <div class="relative" ref="root">
    <button
      type="button"
      @click="togglePanel"
      class="inline-flex w-full items-center justify-center gap-1.5 whitespace-nowrap rounded-xl border border-surface-300 bg-white px-3 py-1.5 text-xs font-medium text-surface-700 transition duration-150 ease-in-out hover:border-primary-500 hover:bg-primary-500/5 sm:w-auto"
    >
      <i class="pi pi-copy text-sm"></i>
      <span>{{ copied ? 'Copied!' : 'Copy' }}</span>
    </button>

    <div
      v-if="open"
      class="absolute left-0 z-20 mt-2 w-64 max-w-[calc(100vw-1rem)] rounded-xl border border-surface-300 bg-white p-4 shadow-lg sm:left-auto sm:right-0"
    >
      <fieldset class="mb-3">
        <label class="mb-1 flex cursor-pointer items-center gap-2 text-sm text-surface-700">
          <input type="radio" value="whole" v-model="scope" class="accent-primary-500" />
          Whole generated key
        </label>
        <label class="flex cursor-pointer items-center gap-2 text-sm text-surface-700">
          <input type="radio" value="step" v-model="scope" class="accent-primary-500" />
          From current step
        </label>
      </fieldset>

      <label
        class="mb-1 flex items-center gap-2 text-sm"
        :class="
          imagesAllowed ? 'cursor-pointer text-surface-700' : 'cursor-not-allowed text-surface-400'
        "
      >
        <input
          type="checkbox"
          v-model="includeImages"
          :disabled="!imagesAllowed"
          class="accent-primary-500"
        />
        Include images
      </label>
      <p v-if="!imagesAllowed" class="mb-4 text-xs text-surface-400">
        Available for ≤ 100 species (this scope has {{ scopeCount ?? 0 }}).
      </p>
      <div v-else class="mb-4"></div>

      <button
        type="button"
        @click="onCopy"
        class="w-full rounded-xl border border-primary-500 bg-primary-500 px-3 py-2 text-sm font-medium text-white transition duration-150 ease-in-out hover:bg-primary-600"
      >
        {{ copied ? 'Copied!' : 'Copy' }}
      </button>

      <p v-if="error" class="mt-2 text-xs text-red-600">{{ error }}</p>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, watch, onBeforeUnmount } from 'vue'
import { useKeyStore } from '@/stores/keyStore'
import { leadImageToUrl, imageUrlToThumbNailUrl } from '@/utils/imageUtils'
import type { KeyLead } from '@/types'

type CopyScope = 'whole' | 'step'

const keyStore = useKeyStore()

const open = ref(false)
const copied = ref(false)
const error = ref<string | null>(null)
const root = ref<HTMLElement | null>(null)
const scope = ref<CopyScope>('step')
const includeImages = ref(false)
let copiedTimer: ReturnType<typeof setTimeout> | null = null

// species count of the selected scope; images are only embedded for ≤ 100 species
const scopeCount = computed(() =>
  scope.value === 'step' ? keyStore.currentSpeciesCount : keyStore.speciesCount
)
const imagesAllowed = computed(() => (scopeCount.value ?? Infinity) <= 100)

// drop the images option when switching to a scope that no longer qualifies
watch(imagesAllowed, (allowed) => {
  if (!allowed) {
    includeImages.value = false
  }
})

const togglePanel = () => {
  open.value = !open.value
}

const onClickOutside = (event: MouseEvent) => {
  if (open.value && root.value && !root.value.contains(event.target as Node)) {
    open.value = false
  }
}
document.addEventListener('click', onClickOutside)
onBeforeUnmount(() => {
  document.removeEventListener('click', onClickOutside)
  if (copiedTimer) {
    clearTimeout(copiedTimer)
  }
})

// leadText is already HTML; resolve tags/entities to clean text for the plain fallback
const stripHtml = (html: string | null): string => {
  if (!html) return ''
  const el = document.createElement('div')
  el.innerHTML = html
  return (el.textContent ?? '').replace(/\s+/g, ' ').trim()
}

// A sized <img> on its own line, referenced by absolute URL (loaded when pasted
// into a rich-text target). The `width` attribute — not just CSS — is set because
// Word ignores `max-height`/`max-width` styles and would otherwise paste the image
// at its full natural size. Height is left out so the aspect ratio is preserved.
const imageTag = (url: string, width: number): string =>
  `<br /><img src="${url}" width="${width}" style="width:${width}px;height:auto;" />`

const buildHtml = (rows: KeyLead[], withImages: boolean): string => {
  // couplet illustration goes in the Lead Text cell, species photo in the Lead to
  // cell (under the species name) — no separate image column
  const leadImg = (item: KeyLead) =>
    withImages && item.leadImage ? imageTag(leadImageToUrl(item.leadImage), 180) : ''
  const speciesImg = (item: KeyLead) =>
    withImages && item.speciesImage ? imageTag(imageUrlToThumbNailUrl(item.speciesImage), 110) : ''

  const body = rows
    .map(
      (item) => `<tr>
      <td style="padding:4px;border:1px solid #ccc;">${item.parentId}</td>
      <td style="padding:4px;border:1px solid #ccc;">${item.leadText ?? ''}${leadImg(item)}</td>
      <td style="padding:4px;border:1px solid #ccc;">${item.leadId}${speciesImg(item)}</td>
    </tr>`
    )
    .join('')

  return `<table style="border-collapse:collapse;">
    <thead>
      <tr>
        <th style="padding:4px;border:1px solid #ccc;">Couplet</th>
        <th style="padding:4px;border:1px solid #ccc;">Lead Text</th>
        <th style="padding:4px;border:1px solid #ccc;">Lead to</th>
      </tr>
    </thead>
    <tbody>${body}</tbody>
  </table>`
}

const buildText = (rows: KeyLead[]): string => {
  const header = ['Couplet', 'Lead Text', 'Lead to'].join('\t')
  const body = rows.map((item) => [item.parentId, stripHtml(item.leadText), item.leadId].join('\t'))
  return [header, ...body].join('\n')
}

const flashCopied = () => {
  copied.value = true
  if (copiedTimer) {
    clearTimeout(copiedTimer)
  }
  copiedTimer = setTimeout(() => {
    copied.value = false
  }, 2000)
}

const onCopy = async () => {
  error.value = null
  const rows = scope.value === 'step' ? keyStore.currentStepsList : keyStore.stepsList
  const withImages = includeImages.value && imagesAllowed.value
  const html = buildHtml(rows, withImages)
  const text = buildText(rows)

  try {
    if (typeof ClipboardItem !== 'undefined' && navigator.clipboard?.write) {
      await navigator.clipboard.write([
        new ClipboardItem({
          'text/html': new Blob([html], { type: 'text/html' }),
          'text/plain': new Blob([text], { type: 'text/plain' })
        })
      ])
    } else {
      await navigator.clipboard.writeText(text)
    }
    open.value = false
    flashCopied()
  } catch (e) {
    console.error('Failed to copy key: ', e)
    error.value = 'Copy failed'
  }
}
</script>
