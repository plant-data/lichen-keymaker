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
      class="absolute left-0 z-20 mt-2 w-56 max-w-[calc(100vw-1rem)] rounded-xl border border-surface-300 bg-white p-4 shadow-lg sm:left-auto sm:right-0"
    >
      <p class="mb-2 text-xs font-semibold uppercase tracking-wide text-surface-400">
        Copy as table
      </p>
      <button
        type="button"
        @click="copy('whole')"
        class="mb-1 w-full rounded-lg px-3 py-2 text-left text-sm font-medium text-surface-700 transition duration-150 ease-in-out hover:bg-primary-500/5"
      >
        Full key
      </button>
      <button
        type="button"
        @click="copy('step')"
        class="w-full rounded-lg px-3 py-2 text-left text-sm font-medium text-surface-700 transition duration-150 ease-in-out hover:bg-primary-500/5"
      >
        From current step
      </button>

      <p v-if="error" class="mt-2 text-xs text-red-600">{{ error }}</p>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, onBeforeUnmount } from 'vue'
import { useKeyStore } from '@/stores/keyStore'
import type { KeyLead } from '@/types'

type CopyScope = 'whole' | 'step'

const keyStore = useKeyStore()

const open = ref(false)
const copied = ref(false)
const error = ref<string | null>(null)
const root = ref<HTMLElement | null>(null)
let copiedTimer: ReturnType<typeof setTimeout> | null = null

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

const buildHtml = (rows: KeyLead[]): string => {
  const body = rows
    .map(
      (item) => `<tr>
      <td style="padding:4px;border:1px solid #ccc;">${item.parentId}</td>
      <td style="padding:4px;border:1px solid #ccc;">${item.leadText ?? ''}</td>
      <td style="padding:4px;border:1px solid #ccc;">${item.leadId}</td>
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

const copy = async (scope: CopyScope) => {
  error.value = null
  const rows = scope === 'whole' ? keyStore.stepsList : keyStore.currentStepsList
  const html = buildHtml(rows)
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
