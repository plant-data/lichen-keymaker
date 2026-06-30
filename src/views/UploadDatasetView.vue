<template>
  <div>
    <p class="mb-6 text-sm text-surface-700">
      Upload a spreadsheet (.xls, .xlsx or .csv, max 10&nbsp;MB), pick the column with scientific
      names, and we will align them to ITALIC and build a key from your selection.
    </p>

    <!-- STEP 1: upload -->
    <div v-if="step === 'upload'" class="space-y-4">
      <label
        class="flex cursor-pointer flex-col items-center justify-center gap-2 rounded-md border-2 border-dashed border-surface-300 bg-surface-50 px-4 py-10 text-center hover:border-primary-400"
      >
        <i class="pi pi-upload text-2xl text-primary-500"></i>
        <span class="text-sm font-medium text-surface-800">
          Click to choose a file <span class="text-surface-500">(.xls, .xlsx, .csv)</span>
        </span>
        <input type="file" accept=".xls,.xlsx,.csv" class="hidden" @change="handleFileChange" />
      </label>
      <div v-if="isParsing" class="text-center"><LoadingSpinner /></div>
      <div v-if="fileError" class="text-center text-sm font-semibold text-red-500">
        {{ fileError }}
      </div>
    </div>

    <!-- STEP 2: choose column -->
    <div v-else-if="step === 'column'" class="space-y-4">
      <p class="text-sm text-surface-700">
        Loaded <span class="font-semibold">{{ rows.length }}</span> rows. Which column holds the
        scientific names?
      </p>
      <div class="flex flex-col gap-1">
        <label class="text-sm font-medium text-surface-800">Names column</label>
        <Dropdown
          v-model="selectedColumn"
          :options="columnOptions"
          optionLabel="name"
          optionValue="value"
          placeholder="Select a column"
          class="w-full md:w-[400px]"
          append-to="self"
        />
      </div>
      <div v-if="columnPreview.length" class="rounded-md bg-surface-100 p-3 text-sm">
        <div class="mb-1 font-medium text-surface-700">Preview</div>
        <ul class="list-disc pl-5 text-surface-600">
          <li v-for="(value, i) in columnPreview" :key="i">{{ value }}</li>
        </ul>
      </div>
      <div class="flex gap-2">
        <button
          type="button"
          class="rounded-md border border-surface-300 px-4 py-2 text-sm font-medium text-surface-700 hover:bg-surface-100"
          @click="reset"
        >
          Back
        </button>
        <button
          type="button"
          :disabled="!selectedColumn"
          class="rounded-md bg-primary-500 px-4 py-2 text-sm font-medium text-white hover:bg-primary-600 disabled:cursor-not-allowed disabled:opacity-50"
          @click="startMatching"
        >
          Match names
        </button>
      </div>
    </div>

    <!-- STEP 3: matching -->
    <div v-else-if="step === 'matching'" class="space-y-4">
      <p class="text-sm text-surface-700">
        Matching names against ITALIC… ({{ matchProgress.done }} / {{ matchProgress.total }})
      </p>
      <div class="h-3 w-full overflow-hidden rounded-full bg-surface-200">
        <div
          class="h-full rounded-full bg-primary-500 transition-all duration-200"
          :style="{ width: progressPct + '%' }"
        ></div>
      </div>
    </div>

    <!-- STEP 4: results -->
    <div v-else-if="step === 'results'" class="space-y-6">
      <div class="flex flex-wrap items-center justify-between gap-2">
        <p class="text-sm text-surface-700">
          <span class="font-semibold">{{ matchedGroups.length }}</span> unique matched
          {{ matchedGroups.length === 1 ? 'name' : 'names' }},
          <span class="font-semibold">{{ unmatched.length }}</span> not matched.
        </p>
        <button
          type="button"
          class="text-sm font-medium text-primary-600 hover:underline"
          @click="reset"
        >
          Start over
        </button>
      </div>

      <!-- matched -->
      <div v-if="matchedGroups.length" class="space-y-2">
        <h2 class="text-lg font-semibold text-surface-800">Matched names</h2>
        <ul class="divide-y divide-surface-200 rounded-md border border-surface-200">
          <li v-for="group in matchedGroups" :key="group.acceptedName" class="p-3">
            <div class="flex items-start gap-3">
              <input
                type="checkbox"
                :checked="isGroupIncluded(group)"
                class="mt-1 h-5 w-5 cursor-pointer accent-primary-500"
                @change="setGroupIncluded(group, ($event.target as HTMLInputElement).checked)"
              />
              <div class="min-w-0 flex-1">
                <div class="flex flex-wrap items-center gap-x-2 gap-y-1">
                  <span class="font-medium text-surface-900">{{ group.acceptedName }}</span>
                  <ScoreBadges
                    v-if="group.entries.length === 1"
                    :candidate="selected(group.entries[0])!"
                  />
                </div>

                <!-- per-source detail -->
                <div
                  v-for="entry in group.entries"
                  :key="entry.inputName"
                  class="mt-1 text-sm text-surface-600"
                >
                  <div class="flex flex-wrap items-center gap-x-2 gap-y-1">
                    <span class="text-surface-500">from:</span>
                    <span class="italic">{{ entry.inputName }}</span>
                    <ScoreBadges v-if="group.entries.length > 1" :candidate="selected(entry)!" />
                    <button
                      v-if="entry.candidates.length > 1"
                      type="button"
                      class="inline-flex items-center gap-1 text-xs text-primary-600 hover:underline"
                      @click="toggleAlts(entry.inputName)"
                    >
                      <i
                        class="pi text-[10px]"
                        :class="expanded[entry.inputName] ? 'pi-chevron-up' : 'pi-chevron-down'"
                      ></i>
                      {{ entry.candidates.length - 1 }} alternative{{
                        entry.candidates.length - 1 === 1 ? '' : 's'
                      }}
                    </button>
                  </div>

                  <!-- alternatives picker -->
                  <ul v-if="expanded[entry.inputName]" class="mt-2 space-y-1 pl-4">
                    <li
                      v-for="(candidate, index) in entry.candidates"
                      :key="candidate.taxon_id + '-' + index"
                      class="flex items-center gap-2"
                    >
                      <input
                        type="radio"
                        :name="'alt-' + entry.inputName"
                        :checked="entry.selectedIndex === index"
                        class="h-4 w-4 cursor-pointer accent-primary-500"
                        @change="selectCandidate(entry, index)"
                      />
                      <span class="text-surface-800">{{ candidate.accepted_name }}</span>
                      <ScoreBadges :candidate="candidate" />
                    </li>
                  </ul>
                </div>
              </div>
            </div>
          </li>
        </ul>
      </div>

      <!-- unmatched -->
      <div v-if="unmatched.length" class="space-y-2">
        <h2 class="text-lg font-semibold text-surface-800">Not matched</h2>
        <ul class="rounded-md border border-surface-200 bg-surface-50 p-3 text-sm text-surface-600">
          <li v-for="entry in unmatched" :key="entry.inputName" class="italic">
            {{ entry.inputName }}
          </li>
        </ul>
      </div>

      <div v-if="generateError" class="text-sm font-semibold text-red-500">
        {{ generateError }}
      </div>

      <button
        type="button"
        :disabled="!includedNames.length || isGenerating"
        class="w-full rounded-md bg-primary-500 px-4 py-2 text-sm font-medium text-white hover:bg-primary-600 disabled:cursor-not-allowed disabled:opacity-50"
        @click="makeKey"
      >
        <span v-if="isGenerating">Generating key…</span>
        <span v-else>Make key ({{ includedNames.length }} species)</span>
      </button>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed } from 'vue'
import { useRouter } from 'vue-router'
import Dropdown from 'primevue/dropdown'
import LoadingSpinner from '@/components/LoadingSpinner.vue'
import ScoreBadges from '@/components/upload/ScoreBadges.vue'
import { validateFile, parseSpreadsheet, extractColumn, dedupeNames } from '@/utils/spreadsheet'
import {
  buildEntries,
  buildChecklistIndex,
  partitionByChecklist,
  groupMatched,
  unmatchedEntries,
  includedAcceptedNames,
  selectedCandidate,
  type MatchEntry,
  type MatchGroup
} from '@/utils/nameMatch'
import { matchNames, fetchChecklist, useKeyTaxaFilterMutation } from '@/composables/useKeyApi'
import { useKeyStore } from '@/stores/keyStore'
import { useFormStore } from '@/stores/formStore'

const router = useRouter()
const keyStore = useKeyStore()
const formStore = useFormStore()
const keyTaxaFilterMutation = useKeyTaxaFilterMutation()

type Step = 'upload' | 'column' | 'matching' | 'results'
const step = ref<Step>('upload')

const fileError = ref<string | null>(null)
const isParsing = ref(false)
const headers = ref<string[]>([])
const rows = ref<Record<string, unknown>[]>([])
const selectedColumn = ref<string | null>(null)

const matchProgress = ref({ done: 0, total: 0 })
const entries = ref<MatchEntry[]>([])
const expanded = ref<Record<string, boolean>>({})

const isGenerating = ref(false)
const generateError = ref<string | null>(null)

const columnOptions = computed(() =>
  headers.value.map((header) => ({ name: header, value: header }))
)

const columnPreview = computed(() =>
  selectedColumn.value ? extractColumn(rows.value, selectedColumn.value).slice(0, 3) : []
)

const progressPct = computed(() =>
  matchProgress.value.total
    ? Math.round((matchProgress.value.done / matchProgress.value.total) * 100)
    : 0
)

const matchedGroups = computed(() => groupMatched(entries.value))
const unmatched = computed(() => unmatchedEntries(entries.value))
const includedNames = computed(() => includedAcceptedNames(entries.value))

const selected = selectedCandidate

const handleFileChange = async (event: Event) => {
  fileError.value = null
  const file = (event.target as HTMLInputElement).files?.[0]
  if (!file) return

  const validationError = validateFile(file)
  if (validationError) {
    fileError.value = validationError
    return
  }

  isParsing.value = true
  try {
    const parsed = await parseSpreadsheet(file)
    if (!parsed.headers.length) {
      fileError.value = 'No columns found in the file.'
      return
    }
    headers.value = parsed.headers
    rows.value = parsed.rows
    selectedColumn.value = null
    step.value = 'column'
  } catch (e) {
    fileError.value = e instanceof Error ? e.message : 'Could not read the file.'
  } finally {
    isParsing.value = false
  }
}

const startMatching = async () => {
  if (!selectedColumn.value) return
  const names = dedupeNames(extractColumn(rows.value, selectedColumn.value))
  if (!names.length) {
    fileError.value = 'The selected column has no values.'
    step.value = 'column'
    return
  }

  matchProgress.value = { done: 0, total: names.length }
  step.value = 'matching'

  // Resolve names already present in the ITALIC checklist locally; only send the
  // rest to the rate-limited match API.
  const checklist = await fetchChecklist()
  const { localEntries, remaining } = partitionByChecklist(names, buildChecklistIndex(checklist))
  matchProgress.value = { done: localEntries.length, total: names.length }

  const results = await matchNames(remaining, (done) => {
    matchProgress.value = { done: localEntries.length + done, total: names.length }
  })

  entries.value = [...localEntries, ...buildEntries(results)]
  expanded.value = {}
  step.value = 'results'
}

const toggleAlts = (inputName: string) => {
  expanded.value[inputName] = !expanded.value[inputName]
}

const selectCandidate = (entry: MatchEntry, index: number) => {
  entry.selectedIndex = index
}

const isGroupIncluded = (group: MatchGroup) => group.entries.every((entry) => entry.include)

const setGroupIncluded = (group: MatchGroup, value: boolean) => {
  group.entries.forEach((entry) => {
    entry.include = value
  })
}

const makeKey = async () => {
  const names = includedNames.value
  if (!names.length) return

  isGenerating.value = true
  generateError.value = null
  try {
    formStore.resetPassedFilterFormData()
    keyStore.resetStore()
    const result = await keyTaxaFilterMutation.mutateAsync(names)
    keyStore.setKeyId(result['key-id'])
    await router.push(`/${result['key-id']}/nodes/1/species`)
  } catch (e) {
    generateError.value = e instanceof Error ? e.message : 'Failed to generate the key.'
    isGenerating.value = false
  }
}

const reset = () => {
  step.value = 'upload'
  fileError.value = null
  headers.value = []
  rows.value = []
  selectedColumn.value = null
  entries.value = []
  expanded.value = {}
  matchProgress.value = { done: 0, total: 0 }
  generateError.value = null
}
</script>
