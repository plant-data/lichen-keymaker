<template>
  <div class="flex-shrink-0">
    <button
      @click="toggleMenu"
      class="flex items-center gap-1 whitespace-nowrap rounded-xl border border-surface-300 bg-white px-3 py-2 text-sm font-medium text-surface-700 transition duration-150 ease-in-out hover:border-primary-500 hover:bg-primary-500/5"
      :aria-expanded="isOpen"
      aria-haspopup="true"
      aria-label="Options"
    >
      <i class="pi pi-cog text-base sm:hidden"></i>
      <span class="hidden sm:inline">Options</span>
      <svg class="hidden h-4 w-4 sm:block" viewBox="0 0 20 20" fill="currentColor" aria-hidden="true">
        <path
          fill-rule="evenodd"
          d="M5.23 7.21a.75.75 0 011.06.02L10 11.17l3.71-3.94a.75.75 0 111.08 1.04l-4.25 4.5a.75.75 0 01-1.08 0l-4.25-4.5a.75.75 0 01.02-1.06z"
          clip-rule="evenodd"
        />
      </svg>
    </button>

    <!-- centered popup, above everything -->
    <Teleport to="body">
      <Transition>
        <div
          v-if="isOpen"
          @click="closeMenu"
          @keydown.esc="closeMenu"
          class="fixed inset-0 z-[999999] flex items-center justify-center bg-black bg-opacity-50"
        >
          <div
            @click.stop
            class="mx-4 w-full max-w-xs overflow-hidden rounded-lg bg-white shadow-xl"
          >
            <div class="flex items-center justify-between border-b border-surface-200 p-4">
              <h2 class="text-lg font-semibold">Options</h2>
              <button
                @click="closeMenu"
                class="text-surface-500 hover:text-surface-800"
                aria-label="Close"
              >
                <svg class="h-5 w-5" viewBox="0 0 20 20" fill="currentColor" aria-hidden="true">
                  <path
                    d="M6.28 5.22a.75.75 0 00-1.06 1.06L8.94 10l-3.72 3.72a.75.75 0 101.06 1.06L10 11.06l3.72 3.72a.75.75 0 101.06-1.06L11.06 10l3.72-3.72a.75.75 0 00-1.06-1.06L10 8.94 6.28 5.22z"
                  />
                </svg>
              </button>
            </div>

            <div class="flex flex-col py-2">
              <button
                @click="onYourQuery"
                class="block w-full px-4 py-3 text-center text-sm font-medium text-surface-700 hover:bg-primary-500/5"
              >
                Your query
              </button>
              <RouterLink
                :to="{
                  name: 'history',
                  params: { keyId: route.params.keyId, nodeId: route.params.nodeId }
                }"
                class="block w-full px-4 py-3 text-center text-sm font-medium text-surface-700 hover:bg-primary-500/5"
                @click="closeMenu"
              >
                Identification steps
              </RouterLink>

              <div class="my-1 border-t border-surface-200"></div>

              <RouterLink
                :to="{
                  name: 'refine',
                  params: { keyId: route.params.keyId, nodeId: route.params.nodeId }
                }"
                class="block w-full px-4 py-3 text-center text-sm font-medium text-surface-700 hover:bg-primary-500/5"
                @click="closeMenu"
              >
                Adjust Key
              </RouterLink>
            </div>
          </div>
        </div>
      </Transition>
    </Teleport>

    <FilterModalShowOnly ref="queryModal" hide-trigger />
  </div>
</template>

<script setup lang="ts">
import { ref } from 'vue'
import { useRoute } from 'vue-router'
import FilterModalShowOnly from '@/components/form/FilterModalShowOnly.vue'

const route = useRoute()

const isOpen = ref(false)
const queryModal = ref<InstanceType<typeof FilterModalShowOnly> | null>(null)

const toggleMenu = () => {
  isOpen.value = !isOpen.value
}
const closeMenu = () => {
  isOpen.value = false
}

const onYourQuery = () => {
  queryModal.value?.openModal()
  closeMenu()
}
</script>
