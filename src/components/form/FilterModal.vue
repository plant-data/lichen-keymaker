<template>
  <div>
    <!-- Button to open the modal with conditional styling -->
    <button
      @click="openModal"
      :class="[
        props.buttonStyle === 'default'
          ? 'h-10 w-28 rounded-full bg-surface-100 text-sm font-medium leading-none text-surface-700 transition-colors hover:bg-surface-200'
          : 'flex flex-col items-center justify-center'
      ]"
    >
      <template v-if="props.buttonStyle === 'alternative'">
        <i class="pi pi-list mb-1 text-base text-surface-600"></i>
        <span class="text-sm font-medium text-black">Your query</span>
      </template>
      <template v-else> Your query </template>
    </button>

    <!-- Teleport the modal to body -->
    <Teleport to="body">
      <!-- Modal Overlay -->
      <Transition>
        <div
          v-if="isModalOpen"
          @click="closeModal"
          @keydown.esc="closeModal"
          class="fixed inset-0 z-[999999] flex items-center justify-center bg-black bg-opacity-50"
        >
          <!-- Modal Content -->
          <div
            ref="modalRef"
            @click.stop
            @keydown="handleTabKey"
            class="mx-1 flex h-[80vh] w-full max-w-2xl flex-col rounded-lg bg-white"
            tabindex="-1"
          >
            <!-- Fixed Header -->
            <div class="border-b border-surface-200 p-4">
              <h2 class="text-2xl font-semibold">Selected Filters</h2>
            </div>

            <!-- Scrollable Content -->
            <div class="flex-grow overflow-y-auto px-1 py-4 sm:px-4">
              <ul class="space-y-2 text-sm">
                <li
                  v-for="filter in selectedFilters"
                  :key="filter.id"
                  class="relative rounded bg-surface-100 p-3 pr-6"
                >
                  <span class="font-semibold">{{ filter.title }}:</span> {{ filter.text }}
                  <ClearButtonFilter :storeFieldId="filter.id" />
                </li>
              </ul>
            </div>

            <!-- Fixed Footer -->
            <div class="flex justify-center gap-3 border-t border-surface-200 p-4">
              <button
                @click="closeModal"
                class="rounded-full border border-surface-300 bg-surface-500 px-6 py-2 text-surface-0 hover:bg-surface-600 focus:outline-none focus:ring-2 focus:ring-surface-500 focus:ring-opacity-50"
              >
                Close
              </button>
              <button
                type="submit"
                form="filter-form"
                class="rounded-full border border-surface-300 bg-blue-500 px-6 py-2 text-white hover:bg-blue-600 focus:outline-none focus:ring-2 focus:ring-primary-500 focus:ring-opacity-50"
              >
                Make key
              </button>
            </div>
          </div>
        </div>
      </Transition>
    </Teleport>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, watch, onUnmounted, nextTick } from 'vue'
import { useFormStore } from '@/stores/formStore'
import { useScrollLock } from '@/composables/useScrollLock'
import ClearButtonFilter from '@/components/form/ClearButtonFilter.vue'

const props = defineProps({
  buttonStyle: {
    type: String,
    default: 'default',
    validator: (value: string) => ['default', 'alternative'].includes(value)
  }
})

const { blockScroll, unblockScroll } = useScrollLock()
const formStore = useFormStore()
const isModalOpen = ref(false)
const modalRef = ref<HTMLElement | null>(null)
const lastFocusedElement = ref<HTMLElement | null>(null)

const selectedFilters = computed(() => formStore.getSelectedFiltersWithDetails())

const openModal = () => {
  lastFocusedElement.value = document.activeElement as HTMLElement
  isModalOpen.value = true
  nextTick(() => {
    focusFirstElement()
  })
}

const closeModal = () => {
  isModalOpen.value = false
  lastFocusedElement.value?.focus()
}

const focusFirstElement = () => {
  const focusableElements = modalRef.value?.querySelectorAll(
    'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])'
  )
  if (focusableElements && focusableElements.length > 0) {
    ;(focusableElements[0] as HTMLElement).focus()
  }
}

const handleTabKey = (e: KeyboardEvent) => {
  const focusableElements = modalRef.value?.querySelectorAll(
    'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])'
  )
  if (!focusableElements) return

  const firstElement = focusableElements[0] as HTMLElement
  const lastElement = focusableElements[focusableElements.length - 1] as HTMLElement

  if (e.shiftKey) {
    // Shift + Tab
    if (document.activeElement === firstElement) {
      lastElement.focus()
      e.preventDefault()
    }
  } else {
    // Tab
    if (document.activeElement === lastElement) {
      firstElement.focus()
      e.preventDefault()
    }
  }
}

watch(isModalOpen, (newValue) => {
  if (newValue) {
    blockScroll()
  } else {
    unblockScroll()
  }
})

onUnmounted(() => {
  unblockScroll()
})
</script>
