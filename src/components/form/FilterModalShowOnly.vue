<template>
  <button
    v-if="!hideTrigger"
    @click="openModal"
    class="rounded border border-surface-300 bg-white px-3 py-2 text-sm font-medium text-surface-700 transition duration-150 ease-in-out hover:border-primary-500 hover:bg-primary-500/5"
  >
    Your query
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
              </li>
            </ul>
          </div>

          <!-- Fixed Footer -->
          <div class="grid grid-cols-1 gap-4 border-t border-surface-200 p-4">
            <button
              @click="closeModal"
              class="w-full rounded border border-surface-300 bg-surface-500 px-4 py-2 text-surface-0 hover:bg-surface-600 focus:outline-none focus:ring-2 focus:ring-surface-500 focus:ring-opacity-50"
            >
              Close
            </button>
          </div>
        </div>
      </div>
    </Transition>
  </Teleport>
</template>

<script setup lang="ts">
import { ref, computed, watch, onUnmounted, nextTick } from 'vue'
import { useFormStore } from '@/stores/formStore'
import { useScrollLock } from '@/composables/useScrollLock'

withDefaults(defineProps<{ hideTrigger?: boolean }>(), { hideTrigger: false })

const { toggleScroll, blockScroll, unblockScroll } = useScrollLock()
const formStore = useFormStore()
const isModalOpen = ref(false)
const modalRef = ref<HTMLElement | null>(null)
const lastFocusedElement = ref<HTMLElement | null>(null)

const selectedFilters = computed(() => formStore.getSelectedFiltersWithDetails('old'))

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

// allow a parent (e.g. the key options menu) to open the modal without the trigger
defineExpose({ openModal })

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

// Function to toggle body scroll
/*const toggleBodyScroll = (disable: boolean) => {
  if (disable) {
    document.body.style.overflow = 'hidden'
    document.documentElement.style.overflow = 'hidden'
  } else {
    document.body.style.overflow = ''
    document.documentElement.style.overflow = ''
  }
}*/

// Watch for changes in isModalOpen and toggle body scroll accordingly
watch(isModalOpen, (newValue) => {
  if (newValue) {
    //toggleBodyScroll(true)
    blockScroll()
  } else {
    //toggleBodyScroll(false)
    unblockScroll()
  }
})

// Ensure body scroll is re-enabled when component is unmounted
onUnmounted(() => {
  //toggleBodyScroll(false)
  unblockScroll()
})
</script>
