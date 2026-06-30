<template>
  <span class="inline-flex items-center gap-1">
    <span
      class="rounded px-1.5 py-0.5 text-xs font-medium"
      :class="scoreClass(candidate.name_score)"
      :title="'Name score'"
    >
      name {{ candidate.name_score }}
    </span>
    <span
      class="rounded bg-surface-100 px-1.5 py-0.5 text-xs font-medium text-surface-600"
      :title="'Author score'"
    >
      auth {{ candidate.auth_score }}
    </span>
  </span>
</template>

<script setup lang="ts">
import type { MatchCandidate } from '@/types'

defineProps<{ candidate: MatchCandidate }>()

const scoreClass = (score: number) => {
  if (score >= 100) return 'bg-green-100 text-green-700'
  if (score >= 90) return 'bg-amber-100 text-amber-700'
  return 'bg-red-100 text-red-700'
}
</script>
