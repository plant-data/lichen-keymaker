<template>
  <div class="mx-auto max-w-3xl p-4">
    <!-- mode switcher: species picker vs upload dataset -->
    <div class="mb-6 flex gap-2">
      <RouterLink
        :to="{ name: 'FilterTaxaLetter', params: { letter: 'a' } }"
        :class="[switcherBase, isUpload ? switcherInactive : switcherActive]"
      >
        Free choice of species
      </RouterLink>
      <RouterLink
        :to="{ name: 'upload-dataset' }"
        :class="[switcherBase, isUpload ? switcherActive : switcherInactive]"
      >
        Upload dataset
      </RouterLink>
    </div>

    <RouterView />
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import { RouterLink, RouterView, useRoute } from 'vue-router'

const route = useRoute()
const isUpload = computed(() => route.name === 'upload-dataset')

const switcherBase =
  'flex flex-1 items-center justify-center whitespace-normal rounded-xl border px-4 py-2 text-center text-sm font-medium transition duration-150 ease-in-out lg:whitespace-nowrap'
const switcherActive = 'border-primary-500 bg-primary-500 text-white'
const switcherInactive =
  'border-surface-300 bg-white text-surface-700 hover:border-primary-500 hover:bg-primary-500/5'
</script>
