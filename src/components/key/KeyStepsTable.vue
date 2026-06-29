<template>
  <div>
    <div class="mb-4 flex items-center gap-2">
      <span class="text-xs font-medium uppercase tracking-wide text-surface-400">Display</span>
      <ViewSwitcher :options="switcherOptions" variant="pills" />
      <ExportPdfButton class="ml-auto" />
    </div>
    <div
      class="steps-table-container mx-auto w-[96vw] max-w-full overflow-hidden rounded-md border border-surface-300"
    >
      <component
        :is="currentVisualization"
        v-bind="visualizationProps"
        @scroll-to-anchor="scrollToAnchor"
      />
      <div v-if="!allLoaded" ref="loadMoreTrigger" class="load-more-trigger"></div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { onMounted, watch, computed } from 'vue'
import { useRoute } from 'vue-router'
import { usePaginatedData } from '@/composables/usePaginatedData'
import DetailedKeyTable from '@/components/key/DetailedKeyTable.vue'
import SimpleKeyTable from '@/components/key/SimpleKeyTable.vue'
import KeyTableDescriptions from '@/components/key/KeyTableDescriptions.vue'
import ViewSwitcher from '@/components/key/ViewSwitcher.vue'
import ExportPdfButton from '@/components/key/ExportPdfButton.vue'
import { paths } from '@/config/endpoints'
import type { KeyLead } from '@/types'

const props = defineProps<{
  stepsList: KeyLead[]
}>()

const route = useRoute()

const viewOptions = [
  { name: 'detailed-all', label: 'Illustrated all' },
  { name: 'detailed', label: 'Illustrated' },
  { name: 'description', label: 'With descriptions' },
  { name: 'simple', label: 'Simple' }
]

const switcherOptions = computed(() =>
  viewOptions.map((option) => ({
    label: option.label,
    to: { name: 'key-view', params: { keyId: route.params.keyId, view: option.name } }
  }))
)

const currentView = computed(() => (route.params.view as string) || 'detailed')

const currentVisualization = computed(() => {
  switch (currentView.value) {
    case 'simple':
      return SimpleKeyTable
    case 'description':
      return KeyTableDescriptions
    default:
      return DetailedKeyTable
  }
})

const {
  displayedData,
  allLoaded,
  loadMoreTrigger,
  setupIntersectionObserver,
  scrollToAnchor,
  resetAndReload
} = usePaginatedData(() => props.stepsList, 50, 'leadId')

const visualizationProps = computed(() => {
  const base = { visibleSteps: displayedData.value, taxonUrl: paths.taxonPagePath }
  return currentView.value === 'detailed-all' ? { ...base, showLeadImages: true } : base
})

let disconnectObserver = setupIntersectionObserver()

onMounted(() => {
  resetAndReload()
  window.removeEventListener('scroll', handleScroll)
  window.addEventListener('scroll', handleScroll)
})

/*onUnmounted(() => {
  window.removeEventListener('scroll', handleScroll)
})*/

const handleScroll = () => {
  disconnectObserver()
  disconnectObserver = setupIntersectionObserver()
}

watch(
  () => route.params.view,
  () => {
    resetAndReload()
  }
)
</script>

<style scoped>
.steps-table-container {
  width: 100%;
}

.load-more-trigger {
  height: 20px;
}

.highlight {
  background-color: #fff3cd;
  transition: background-color 0.5s ease;
}

.steps-table-container::after {
  content: '';
  display: block;
  height: 50px;
}
</style>
