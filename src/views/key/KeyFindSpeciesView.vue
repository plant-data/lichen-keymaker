<template>
  <div class="container mx-auto px-4 pb-8">
    <LoadingSpinner v-if="keyStore.isLoading" />

    <div v-else-if="keyStore.error" class="error-message">
      {{ keyStore.error }}
    </div>

    <div v-else>
      <!-- Search -->
      <div class="mx-auto mb-6 max-w-2xl">
        <label for="species-search" class="mb-1 block text-sm font-medium text-surface-700">
          Find a species
        </label>
        <div class="relative">
          <input
            id="species-search"
            v-model="query"
            type="text"
            autocomplete="off"
            placeholder="Type a species name…"
            class="w-full rounded-xl border border-surface-300 py-2 pl-4 pr-10 text-sm text-surface-700 transition duration-150 ease-in-out focus:border-primary-500 focus:outline-none focus:ring-1 focus:ring-primary-500"
          />
          <button
            v-if="query"
            type="button"
            @click="clearSearch"
            aria-label="Clear search"
            class="absolute inset-y-0 right-0 flex items-center pr-3 text-surface-400 transition duration-150 ease-in-out hover:text-surface-700"
          >
            <svg class="h-5 w-5" viewBox="0 0 20 20" fill="currentColor" aria-hidden="true">
              <path
                d="M6.28 5.22a.75.75 0 00-1.06 1.06L8.94 10l-3.72 3.72a.75.75 0 101.06 1.06L10 11.06l3.72 3.72a.75.75 0 101.06-1.06L11.06 10l3.72-3.72a.75.75 0 00-1.06-1.06L10 8.94 6.28 5.22z"
              />
            </svg>
          </button>
        </div>
      </div>

      <div class="grid gap-8 lg:grid-cols-[minmax(0,20rem)_1fr]">
        <!-- Species list -->
        <div>
          <p class="mb-2 text-xs font-medium uppercase tracking-wide text-surface-400">
            {{ filtered.length }} species
          </p>
          <ul class="space-y-1">
            <li v-for="species in displayedData" :key="species.name">
              <button
                type="button"
                @click="selectSpecies(species)"
                class="block w-full rounded-md px-3 py-2 text-left text-sm font-medium transition duration-150 ease-in-out hover:bg-primary-500/5"
                :class="
                  selectedSpecies === species.name
                    ? 'bg-primary-500/10 text-primary-700'
                    : 'text-surface-700'
                "
              >
                {{ species.name }}
              </button>
            </li>
          </ul>
          <p v-if="filtered.length === 0" class="px-3 py-2 text-sm text-surface-400">
            No species match “{{ debouncedQuery }}”.
          </p>
          <div v-if="!allLoaded" ref="loadMoreTrigger" class="h-10"></div>
        </div>

        <!-- Steps leading to the selected species -->
        <div>
          <div v-if="!selectedSpecies" class="pt-2 text-sm text-surface-400">
            Select a species to see the steps that lead to it.
          </div>

          <div v-else>
            <div class="mb-4">
              <h2 class="text-xl font-semibold text-surface-800">{{ selectedSpecies }}</h2>
              <p v-if="pathCount > 1" class="text-sm text-surface-500">
                This species is reachable through {{ pathCount }} different paths in the key — the
                shared steps are shown once and the branches diverge below. Click a step to open it
                in the interactive key.
              </p>
              <p v-else class="text-sm text-surface-500">
                Click a step to open it in the interactive key.
              </p>
            </div>

            <div v-if="pathTree" class="overflow-x-auto pb-4">
              <KeyPathTree :node="pathTree" :depth="1" />
            </div>

            <p v-else class="text-sm text-surface-400">No path to this species was found.</p>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed, onMounted, onUnmounted, ref, watch } from 'vue'
import { useKeyStore } from '@/stores/keyStore'
import { usePaginatedData } from '@/composables/usePaginatedData'
import LoadingSpinner from '@/components/LoadingSpinner.vue'
import KeyPathTree from '@/components/key/KeyPathTree.vue'
import { mergePathsToTree, type PathTreeNode } from '@/utils/pathTree'
import type { KeyUniqueSpeciesData } from '@/types'

const keyStore = useKeyStore()

// live input + debounced value used for the actual filtering
const query = ref('')
const debouncedQuery = ref('')
let debounceTimer: ReturnType<typeof setTimeout> | null = null

watch(query, (value) => {
  if (debounceTimer) {
    clearTimeout(debounceTimer)
  }
  debounceTimer = setTimeout(() => {
    debouncedQuery.value = value
  }, 200)
})

onUnmounted(() => {
  if (debounceTimer) {
    clearTimeout(debounceTimer)
  }
})

const clearSearch = () => {
  if (debounceTimer) {
    clearTimeout(debounceTimer)
  }
  query.value = ''
  debouncedQuery.value = ''
}

// prefix matches ranked first, substring matches still shown; each group stays
// alphabetical because uniqueSpeciesWithImages is already sorted by name
const filtered = computed<KeyUniqueSpeciesData[]>(() => {
  const q = debouncedQuery.value.trim().toLowerCase()
  const source = keyStore.uniqueSpeciesWithImages
  if (!q) {
    return source
  }

  const prefix: KeyUniqueSpeciesData[] = []
  const contains: KeyUniqueSpeciesData[] = []
  for (const species of source) {
    const name = species.name.toLowerCase()
    if (name.startsWith(q)) {
      prefix.push(species)
    } else if (name.includes(q)) {
      contains.push(species)
    }
  }
  return [...prefix, ...contains]
})

// usePaginatedData watches the source getter and resets on every change,
// so the list re-pages automatically when the query changes
const { displayedData, allLoaded, loadMoreTrigger, setupIntersectionObserver } = usePaginatedData(
  () => filtered.value,
  50,
  'name'
)

onMounted(() => {
  setupIntersectionObserver()
})

// selected species + its paths merged into one tree (shared trunk, diverging branches)
const selectedSpecies = ref<string | null>(null)
const pathTree = ref<PathTreeNode | null>(null)
const pathCount = ref(0)

const selectSpecies = (species: KeyUniqueSpeciesData) => {
  selectedSpecies.value = species.name
  const speciesPaths = keyStore.getKeyTree()?.getPathsToSpecies(species.name) ?? []
  pathCount.value = speciesPaths.length
  pathTree.value = mergePathsToTree(speciesPaths)
}
</script>

<style scoped>
.error-message {
  color: red;
  font-weight: bold;
  padding: 20px;
  text-align: center;
}
</style>
