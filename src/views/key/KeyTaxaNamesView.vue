<template>
  <div class="container mx-auto max-w-2xl p-4 px-4 py-8">
    <LoadingSpinner v-if="keyStore.isLoading" />

    <div v-else-if="keyStore.error" class="error-message">
      {{ keyStore.error }}
    </div>

    <div v-else class="flex min-h-screen">
      <ul class="max-w-[900px] space-y-2">
        <li v-for="species in displayedData" :key="species.name">
          <a
            class="text-sm font-medium text-blue-600 hover:underline"
            :href="`https://italic.units.it/index.php?procedure=taxonpage&num=${species.italicId}`"
            target="_blank"
            >{{ species.name }}</a
          >
        </li>
        <li v-if="!allLoaded" ref="loadMoreTrigger" class="h-10"></li>
      </ul>
    </div>
  </div>
</template>

<script setup lang="ts">



import { onMounted, watch } from 'vue'
import { useKeyStore } from '@/stores/keyStore'
import { useRoute } from 'vue-router'
import { usePaginatedData } from '@/composables/usePaginatedData'
import LoadingSpinner from '@/components/LoadingSpinner.vue'

const route = useRoute()
const keyStore = useKeyStore()

const { displayedData, allLoaded, loadMoreTrigger, setupIntersectionObserver } = usePaginatedData(
  () => keyStore.currentUniqueSpeciesWithImages
)

// react to Back/Restart node navigation, not just the initial mount
watch(
  () => route.params.nodeId,
  (nodeId) => {
    if (nodeId) {
      keyStore.setUniqueSpeciesWithImagesFromNodeId(nodeId as string)
    }
  },
  { immediate: true }
)

onMounted(() => {
  setupIntersectionObserver()
})
</script>

<style scoped>
.error-message {
  color: red;
  font-weight: bold;
  padding: 20px;
  text-align: center;
}
</style>
