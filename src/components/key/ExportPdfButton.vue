<template>
  <div class="relative" ref="root">
    <button
      type="button"
      @click="togglePanel"
      :disabled="isExporting"
      class="inline-flex w-full items-center justify-center gap-1.5 whitespace-nowrap rounded-xl border border-surface-300 bg-white px-3 py-1.5 text-xs font-medium text-surface-700 transition duration-150 ease-in-out hover:border-primary-500 hover:bg-primary-500/5 disabled:cursor-not-allowed disabled:opacity-60 sm:w-auto"
    >
      <i class="pi pi-file-pdf text-sm"></i>
      <span>Export PDF</span>
    </button>

    <div
      v-if="open"
      class="absolute right-0 z-20 mt-2 w-64 max-w-[calc(100vw-1rem)] rounded-xl border border-surface-300 bg-white p-4 shadow-lg"
    >
      <fieldset class="mb-3">
        <legend class="mb-1.5 text-xs font-semibold uppercase tracking-wide text-surface-400">
          Scope
        </legend>
        <label class="mb-1 flex cursor-pointer items-center gap-2 text-sm text-surface-700">
          <input type="radio" value="whole" v-model="scope" class="accent-primary-500" />
          Whole generated key
        </label>
        <label class="flex cursor-pointer items-center gap-2 text-sm text-surface-700">
          <input type="radio" value="step" v-model="scope" class="accent-primary-500" />
          From current step
        </label>
      </fieldset>

      <label class="mb-2 flex cursor-pointer items-center gap-2 text-sm text-surface-700">
        <input type="checkbox" v-model="includeDescriptions" class="accent-primary-500" />
        Include species descriptions
      </label>

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
        @click="onExport"
        :disabled="isExporting"
        class="w-full rounded-xl border border-primary-500 bg-primary-500 px-3 py-2 text-sm font-medium text-white transition duration-150 ease-in-out hover:bg-primary-600 disabled:cursor-not-allowed disabled:opacity-70"
      >
        {{ isExporting ? 'Generating…' : 'Download PDF' }}
      </button>

      <div v-if="isExporting" class="mt-3">
        <div class="h-1.5 w-full overflow-hidden rounded-full bg-surface-200">
          <div
            class="h-full rounded-full bg-primary-500 transition-[width] duration-200 ease-out"
            :style="{ width: `${progress}%` }"
          ></div>
        </div>
        <p class="mt-1 text-center text-xs text-surface-400">{{ progress }}%</p>
      </div>

      <p v-if="error" class="mt-2 text-xs text-red-600">{{ error }}</p>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, watch, onBeforeUnmount } from 'vue'
import { useKeyPdfExport } from '@/composables/useKeyPdfExport'
import { useKeyStore } from '@/stores/keyStore'

type ExportScope = 'whole' | 'step'

const keyStore = useKeyStore()
const { isExporting, progress, error, exportPdf } = useKeyPdfExport()

const open = ref(false)
const root = ref<HTMLElement | null>(null)
const scope = ref<ExportScope>('step')
const includeDescriptions = ref(false)
const includeImages = ref(false)

// species count of the currently selected scope; images are only offered for
// small keys/steps (≤ 100) to keep the PDF and its image fetches manageable
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
onBeforeUnmount(() => document.removeEventListener('click', onClickOutside))

const onExport = async () => {
  const isStep = scope.value === 'step'
  await exportPdf({
    rows: isStep ? keyStore.currentStepsList : keyStore.stepsList,
    includeDescriptions: includeDescriptions.value,
    includeImages: includeImages.value && imagesAllowed.value,
    fileName: isStep ? 'lichen-key-step.pdf' : 'lichen-key.pdf'
  })
  if (!error.value) {
    open.value = false
  }
}
</script>
