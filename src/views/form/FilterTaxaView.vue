<template>
  <div>
    <div v-if="isLoading" class="text-center text-lg font-semibold"><LoadingSpinner /></div>
    <div v-else-if="error" class="text-center text-lg font-semibold text-red-500">
      Error: {{ error.message }}
    </div>
    <div v-else>
      <div class="mb-6 flex flex-wrap gap-2">
        <router-link
          v-for="letter in availableLetters"
          :key="letter"
          :to="`/filter-species/${letter.toLowerCase()}`"
          :class="[
            'flex min-h-7 min-w-8 items-center justify-center rounded-md text-sm font-medium',
            currentLetter === letter
              ? 'bg-primary-500 text-white'
              : 'bg-surface-200 text-surface-900 hover:bg-surface-300'
          ]"
        >
          {{ letter }}
        </router-link>
      </div>
      <form @submit.prevent="handleSubmit" class="space-y-4">
        <ul class="space-y-3">
          <li v-for="species in currentPageSpecies" :key="species" class="flex items-center gap-2">
            <div class="relative min-h-5 min-w-5 cursor-pointer" @click="toggleSpecies(species)">
              <input
                type="checkbox"
                :id="species"
                v-model="selectedSpeciesLocal"
                :value="species"
                class="peer absolute h-5 w-5 cursor-pointer opacity-0"
              />
              <div
                class="absolute h-5 w-5 rounded border border-gray-300 bg-white peer-checked:bg-primary-500"
              ></div>
              <svg
                class="absolute left-1/2 top-1/2 hidden h-3.5 w-3.5 -translate-x-1/2 -translate-y-1/2 text-white peer-checked:block"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                stroke-width="4"
                stroke-linecap="round"
                stroke-linejoin="round"
              >
                <polyline points="20 6 9 17 4 12"></polyline>
              </svg>
            </div>
            <label :for="species" class="block text-sm text-gray-900">
              {{ species }}
            </label>
          </li>
        </ul>
        <button
          type="submit"
          class="w-full rounded-md border border-transparent bg-primary-500 px-4 py-2 text-sm font-medium text-white shadow-sm hover:bg-primary-600 focus:outline-none focus:ring-2 focus:ring-primary-500 focus:ring-offset-2"
        >
          Submit
        </button>
      </form>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, watch } from 'vue'
import { useSpeciesQuery } from '@/composables/useKeyApi'
import { useRoute, useRouter } from 'vue-router'
import { useSpeciesStore } from '@/stores/speciesStore'
import { useKeyStore } from '@/stores/keyStore'
import { useFormStore } from '@/stores/formStore'
import { useKeyTaxaFilterMutation } from '@/composables/useKeyApi'
import LoadingSpinner from '@/components/LoadingSpinner.vue'

const route = useRoute()
const router = useRouter()
const speciesStore = useSpeciesStore()
const formStore = useFormStore()
const keyStore = useKeyStore()
const keyTaxaFilterMutation = useKeyTaxaFilterMutation()

const selectedSpeciesLocal = ref<string[]>(speciesStore.selectedSpecies)

const { data: checklist, isLoading, error } = useSpeciesQuery()

const availableLetters = computed(() =>
  checklist.value
    ? [...new Set(checklist.value.map((species) => species[0].toUpperCase()))].sort()
    : []
)

const currentLetter = computed(() => ((route.params.letter as string) || 'a').toUpperCase())

const currentPageSpecies = computed(
  () =>
    checklist.value?.filter((species) => species.toUpperCase().startsWith(currentLetter.value)) ||
    []
)

watch(
  () => route.params.letter,
  (newLetter) => {
    if (newLetter && availableLetters.value.includes(newLetter.toUpperCase())) {
      router.push(`/filter-species/${newLetter.toLowerCase()}`)
    } else if (checklist.value) {
      router.push(`/filter-species/${availableLetters.value[0].toLowerCase()}`)
    }
  },
  { immediate: true }
)

const toggleSpecies = (species: string) => {
  const index = selectedSpeciesLocal.value.indexOf(species)
  if (index === -1) {
    selectedSpeciesLocal.value.push(species)
    speciesStore.addSpecies(species)
  } else {
    selectedSpeciesLocal.value.splice(index, 1)
    speciesStore.removeSpecies(species)
  }
}

const handleSubmit = async () => {
  try {
    formStore.resetPassedFilterFormData()
    keyStore.resetStore()

    const result = await keyTaxaFilterMutation.mutateAsync(speciesStore.selectedSpecies)

    keyStore.setKeyId(result['key-id'])
    speciesStore.reset()
    await router.push(`/${result['key-id']}/nodes/1/species`)
  } catch (error) {
    console.error('Error submitting form:', error)
  }
}

watch(
  () => speciesStore.selectedSpecies,
  (newSelectedSpecies) => {
    selectedSpeciesLocal.value = newSelectedSpecies
  }
)
</script>
