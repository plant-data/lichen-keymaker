<template>
  <div class="container mx-auto max-w-2xl px-4 py-8">
    <LoadingSpinner v-if="keyStore.isLoading" />

    <div v-else-if="keyStore.error" class="error-message">
      {{ keyStore.error }}
    </div>

    <div v-else>
      <h2 class="mb-4 text-xl font-semibold">Your identification steps</h2>

      <ol class="space-y-2">
        <li
          v-for="(step, index) in steps"
          :key="step.leadId"
          class="flex items-center justify-between gap-3 rounded-md border p-3"
          :class="
            index === steps.length - 1
              ? 'border-primary-500 bg-primary-500/5'
              : 'border-surface-200 bg-white'
          "
        >
          <div class="min-w-0">
            <span class="mr-2 font-semibold text-surface-500">{{ index + 1 }}.</span>
            <span
              v-if="step.leadText"
              class="text-sm text-surface-800"
              v-html="step.leadText"
            ></span>
            <span v-else class="text-sm italic text-surface-500">Start of the key</span>
          </div>

          <span
            v-if="index === steps.length - 1"
            class="flex-shrink-0 text-xs font-medium text-primary-600"
          >
            current
          </span>
          <button
            v-else
            @click="returnToStep(step.leadId)"
            class="flex-shrink-0 rounded border border-surface-300 bg-white px-3 py-1.5 text-sm font-medium text-surface-700 transition duration-150 ease-in-out hover:border-primary-500 hover:bg-primary-500/5"
          >
            Return to this step
          </button>
        </li>
      </ol>

      <p v-if="steps.length === 0" class="text-surface-500">No steps yet.</p>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import { useKeyStore } from '@/stores/keyStore'
import { useKeyNavigation } from '@/composables/useKeyNavigation'
import LoadingSpinner from '@/components/LoadingSpinner.vue'

const keyStore = useKeyStore()
const { currentNodeId, goToNode } = useKeyNavigation()

const steps = computed(() => {
  const tree = keyStore.getKeyTree()
  if (!tree || Number.isNaN(currentNodeId.value)) {
    return []
  }
  return tree.getAncestors(currentNodeId.value)
})

const returnToStep = (leadId: number) => {
  // resume identifying at that node in the interactive key
  goToNode(leadId, 'interactive')
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
