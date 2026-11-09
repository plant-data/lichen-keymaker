<template>
  <div class="space-y-3 rounded-lg border border-surface-300 bg-surface-0 p-4">
    <h3 class="text-base font-semibold text-surface-800">Geographic area</h3>

    <div v-for="group in selectDataArea" :key="group.id">
      <div class="flex flex-col pb-2">
        <label class="pb-1" :for="group.id">{{ group.title }}:</label>
        <div class="relative flex md:mr-auto">
          <Dropdown
            :options="getFilteredOptions(group)"
            optionLabel="text"
            v-model="formStore.formData[group.id]"
            @change="(option) => updateSelectFormField(group.id, option.value)"
            :placeholder="group.title"
            :autoOptionFocus="true"
            append-to="self"
            class="!z-1 w-full md:w-[400px]"
            :disabled="isDropdownDisabled(group)"
            @show="blockScroll"
            @hide="unblockScroll"
          />
          <button
            v-if="formStore.existsFormField(group.id)"
            @click="removeFormField(group.id)"
            class="z-2 absolute right-[3px] top-[3px] grid h-8 w-10 place-items-center bg-surface-0"
          >
            <i class="pi pi-times-circle text-surface-800"></i>
          </button>
        </div>
      </div>
    </div>

    <!-- Map / geolocation picker: sets area=Italy, region and ecoregion from a point.
         Disabled when the user opts to include species from bordering countries. -->
    <GeoMapPicker :disabled="isMapDisabled" @select="applyGeoSelection" />
  </div>
</template>

<script setup lang="ts">
import Dropdown from 'primevue/dropdown'
import { useFormStore } from '@/stores/formStore'
import { selectDataArea, regionToEcoregionMap } from '@/data/form-area'
import { useScrollLock } from '@/composables/useScrollLock'
import { computed, defineAsyncComponent } from 'vue'
import type { GeoLocation } from '@/utils/geoLocator'

// Lazy chunk: Leaflet + turf + the GeoJSON are only loaded when the picker is used.
const GeoMapPicker = defineAsyncComponent(() => import('@/components/form/GeoMapPicker.vue'))

const { toggleScroll, blockScroll, unblockScroll } = useScrollLock()

const formStore = useFormStore()

// The map only makes sense when working within Italy; disable it once the user opts to
// include species from bordering countries.
const isMapDisabled = computed(() => formStore.getFormField('area')?.value === 'outside-italy')

const findAreaItem = (groupId: string, value: string) =>
  selectDataArea.find((g) => g.id === groupId)?.items.find((i) => i.value === value)

// Apply a map/geolocation result to the area filter, reusing the exact option objects
// so the dropdowns reflect the selection.
const applyGeoSelection = (loc: GeoLocation) => {
  if (loc.outsideItaly) return
  const italyItem = findAreaItem('area', 'italy')
  if (italyItem) formStore.updateFormField('area', italyItem)
  if (loc.region) {
    const regionItem = findAreaItem('region', loc.region.code)
    if (regionItem) formStore.updateFormField('region', regionItem)
  }
  if (loc.ecoregion) {
    const ecoItem = findAreaItem('ecoregion', loc.ecoregion.code)
    if (ecoItem) formStore.updateFormField('ecoregion', ecoItem)
  }
}

const updateSelectFormField = (groupId, option) => {
  formStore.updateFormField(groupId, option)

  // Check if the updated field has any dependents
  const dependents = selectDataArea.filter((group) => group.depend && group.depend.id === groupId)

  // If it does, remove these dependents from the store
  dependents.forEach((dependent) => {
    formStore.removeFormField(dependent.id)
  })

  // If 'area' is changed, we need to reset both 'region' and 'ecoregion'
  if (groupId === 'area') {
    formStore.removeFormField('region')
    formStore.removeFormField('ecoregion')
  }

  // If 'region' is changed, we need to reset 'ecoregion'
  if (groupId === 'region') {
    formStore.removeFormField('ecoregion')
  }
}

const removeFormField = (groupId) => {
  formStore.removeFormField(groupId)

  // If 'area' is removed, we need to reset both 'region' and 'ecoregion'
  if (groupId === 'area') {
    formStore.removeFormField('region')
    formStore.removeFormField('ecoregion')
  }

  // If 'region' is removed, we need to reset 'ecoregion'
  if (groupId === 'region') {
    formStore.removeFormField('ecoregion')
  }
}

const isDropdownDisabled = (group) => {
  if (!group.depend) return false

  let dependentValue = formStore.getFormField(group.depend.id)
  dependentValue = dependentValue ? dependentValue.value : ''

  return dependentValue !== group.depend.item
}

const getFilteredOptions = (group) => {
  if (group.id === 'region' || group.id === 'ecoregion') {
    const selectedArea = formStore.getFormField('area')
    if (!selectedArea || selectedArea.value !== 'italy') {
      return [] // Return empty array if 'area' is not set to 'italy'
    }
  }

  if (group.id === 'ecoregion') {
    const selectedRegion = formStore.getFormField('region')
    if (selectedRegion) {
      const regionId = selectedRegion.value
      const allowedEcoregions = regionToEcoregionMap[regionId] || []

      // Always include 'All ecoregions' option
      return [
        ...group.items.filter(
          (item) => allowedEcoregions.includes(item.value) || item.value === 'All'
        )
      ]
    }
  }

  return group.items
}
</script>
