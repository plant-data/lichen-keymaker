<template>
  <!-- main view tabs -->
  <div v-if="variant === 'segmented'" :class="['flex gap-2', block ? 'w-full lg:w-auto' : '']">
    <RouterLink
      v-for="option in options"
      :key="option.label"
      :to="option.to"
      class="flex items-center justify-center whitespace-normal rounded-xl border border-surface-300 bg-white px-4 py-2 text-center text-sm font-medium text-surface-700 transition duration-150 ease-in-out hover:border-primary-500 hover:bg-primary-500/5 lg:whitespace-nowrap"
      :class="block ? 'flex-1 lg:flex-none' : ''"
      activeClass="!border-primary-500 !bg-primary-500 !text-white"
    >
      {{ option.label }}
    </RouterLink>
  </div>

  <!-- display options: same style, smaller (subordinate) -->
  <div v-else class="flex flex-wrap gap-2">
    <RouterLink
      v-for="option in options"
      :key="option.label"
      :to="option.to"
      class="whitespace-nowrap rounded-xl border border-surface-300 bg-white px-3 py-1.5 text-xs font-medium text-surface-700 transition duration-150 ease-in-out hover:border-primary-500 hover:bg-primary-500/5"
      activeClass="!border-primary-500 !bg-primary-500 !text-white"
    >
      {{ option.label }}
    </RouterLink>
  </div>
</template>

<script setup lang="ts">
import type { RouteLocationRaw } from 'vue-router'

export interface ViewSwitcherOption {
  label: string
  to: RouteLocationRaw
}

withDefaults(
  defineProps<{
    options: ViewSwitcherOption[]
    variant?: 'segmented' | 'pills'
    block?: boolean
  }>(),
  {
    variant: 'segmented',
    block: false
  }
)
</script>
