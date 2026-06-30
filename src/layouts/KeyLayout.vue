<template>
  <div class="container mx-auto py-2 lg:px-4">
    <LoadingSpinner v-if="keyStore.isLoading" />

    <div
      v-else-if="keyStore.error"
      class="relative rounded border border-red-400 bg-red-100 px-4 py-3 text-red-700"
      role="alert"
    >
      <strong class="font-bold">Error!</strong>
      <span class="block lg:inline">{{ keyStore.error }}</span>
    </div>

    <div v-else>
      <div class="mb-3 flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
        <!-- counts pill -->
        <div
          class="flex w-full items-stretch overflow-hidden rounded-2xl border border-surface-300 bg-white lg:w-auto"
        >
          <p v-if="isFiltered" class="grow whitespace-nowrap px-4 py-2 text-sm text-surface-600">
            <span class="font-bold">{{ keyStore.currentSpeciesCount }}</span> remaining of
            {{ keyStore.speciesCount }}
          </p>
          <p v-else class="grow whitespace-nowrap px-4 py-2 text-sm text-surface-600">
            <span class="font-bold">{{ keyStore.speciesCount }}</span> species
          </p>
          <template v-if="isFiltered">
            <div class="w-px shrink-0 bg-surface-300"></div>
            <button
              @click="goToRoot"
              class="flex items-center whitespace-nowrap px-4 py-2 text-sm font-medium text-surface-600 transition duration-150 ease-in-out hover:bg-primary-500 hover:text-white"
            >
              Restart
            </button>
          </template>
        </div>

        <!-- primary view switcher + options -->
        <div class="flex flex-row items-center gap-2 sm:flex-col sm:gap-3 lg:flex-row lg:gap-2">
          <div class="min-w-0 flex-1 sm:contents">
            <ViewSwitcher :options="routes" variant="segmented" block />
          </div>
          <KeyOptionsMenu />
        </div>
      </div>

      <RouterView></RouterView>
    </div>
  </div>
</template>

<script setup lang="ts">
import { onMounted, watch, computed } from 'vue'
import { useRoute } from 'vue-router'
import { useKeyStore } from '@/stores/keyStore'
import { useKeyNavigation } from '@/composables/useKeyNavigation'
import LoadingSpinner from '@/components/LoadingSpinner.vue'
import KeyOptionsMenu from '@/components/key/KeyOptionsMenu.vue'
import ViewSwitcher from '@/components/key/ViewSwitcher.vue'

const keyStore = useKeyStore()
const route = useRoute()
const { goToRoot } = useKeyNavigation()

const isFiltered = computed(() => keyStore.speciesCount !== keyStore.currentSpeciesCount)

const routes = computed(() => [
  {
    to: { name: 'key', params: { keyId: route.params.keyId } },
    label: 'Textual keys'
  },
  {
    to: { name: 'interactive', params: { keyId: route.params.keyId } },
    label: 'Interactive key'
  },
  {
    to: { name: 'species', params: { keyId: route.params.keyId } },
    label: 'Gallery'
  }
])

const fetchData = async () => {
  if (route.params.keyId === 'full') {
    keyStore.setKeyId('full')
  }
  if (keyStore.keyId) {
    await keyStore.fetchData()
    if (route.params.nodeId) {
      keyStore.setCurrentLeadId(route.params.nodeId as string)
    }
  }
}

onMounted(fetchData)

watch(() => route.params.keyId, fetchData)
watch(
  () => route.params.nodeId,
  (newNodeId) => {
    if (newNodeId) {
      keyStore.setCurrentLeadId(newNodeId as string)
    }
  }
)
</script>
