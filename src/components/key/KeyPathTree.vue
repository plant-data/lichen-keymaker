<template>
  <div class="tree-node">
    <!-- couplet step -->
    <div v-if="isCouplet" class="node-box border-surface-200 bg-white">
      <div class="flex justify-center">
        <span
          class="rounded-full bg-surface-100 px-2.5 py-0.5 text-xs font-semibold text-surface-500"
        >
          {{ depth }}
        </span>
      </div>
      <div
        v-if="node.data.leadText"
        class="mt-2 text-center text-sm text-surface-800"
        v-html="node.data.leadText"
      ></div>
      <div v-else class="mt-2 text-center text-sm italic text-surface-700">Start of the key</div>
      <div class="mt-3 flex justify-center">
        <button
          type="button"
          @click="goToNode(node.data.leadId, 'interactive')"
          class="rounded-full border border-surface-300 bg-white px-3 py-1 text-xs font-medium text-surface-700 transition duration-150 ease-in-out hover:border-primary-500 hover:bg-primary-500/5 hover:text-primary-700"
        >
          Move to this step
        </button>
      </div>
    </div>

    <!-- species leaf (plain text, not a link) -->
    <div v-else class="node-box border-primary-500 bg-primary-500/5 text-center">
      <span class="text-sm font-semibold text-primary-700">{{ node.data.leadSpecies }}</span>
    </div>

    <!-- children -->
    <template v-if="node.children.length">
      <!-- single child: continuous vertical trunk -->
      <div v-if="node.children.length === 1" class="trunk">
        <KeyPathTree :node="node.children[0]" :depth="depth + 1" />
      </div>

      <!-- multiple children: branch out with connector lines -->
      <div v-else class="children">
        <div v-for="(child, index) in node.children" :key="index" class="child">
          <KeyPathTree :node="child" :depth="depth + 1" />
        </div>
      </div>
    </template>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import { useKeyNavigation } from '@/composables/useKeyNavigation'
import type { PathTreeNode } from '@/utils/pathTree'

const props = withDefaults(
  defineProps<{
    node: PathTreeNode
    depth?: number
  }>(),
  { depth: 1 }
)

const { goToNode } = useKeyNavigation()

// couplet steps are navigable (numeric leadId); species leaves are not
const isCouplet = computed(
  () => props.node.data.leadSpecies === null && typeof props.node.data.leadId === 'number'
)
</script>

<style scoped>
.tree-node {
  display: flex;
  flex-direction: column;
  align-items: center;
}

.node-box {
  width: 14rem;
  max-width: 100%;
  border-width: 1px;
  border-radius: 0.375rem;
  padding: 0.75rem;
}

/* single-child trunk: a vertical line above the child */
.trunk {
  display: flex;
  flex-direction: column;
  align-items: center;
  padding-top: 1.25rem;
  position: relative;
}
.trunk::before {
  content: '';
  position: absolute;
  top: 0;
  left: 50%;
  width: 1px;
  height: 1.25rem;
  background: var(--p-surface-300, #d1d5db);
}

/* multi-child branch: horizontal bar + vertical drops (canonical CSS tree) */
.children {
  display: flex;
  justify-content: center;
  padding-top: 1.25rem;
  position: relative;
}
/* vertical drop from the parent box down to the horizontal bar */
.children::before {
  content: '';
  position: absolute;
  top: 0;
  left: 50%;
  width: 1px;
  height: 1.25rem;
  background: var(--p-surface-300, #d1d5db);
}
.child {
  position: relative;
  padding: 1.25rem 0.75rem 0;
}
/* each child draws half of the horizontal bar (border-top) plus a vertical drop
   down to its box; ::after normally carries the drop, ::before for the last child */
.child::before,
.child::after {
  content: '';
  position: absolute;
  top: 0;
  right: 50%;
  width: 50%;
  height: 1.25rem;
  border-top: 1px solid var(--p-surface-300, #d1d5db);
}
.child::after {
  right: auto;
  left: 50%;
  border-left: 1px solid var(--p-surface-300, #d1d5db);
}
/* trim the outer half-bars so the top line spans only between the outer children,
   moving the drop onto the remaining pseudo-element */
.child:first-child::before {
  border: 0;
}
.child:last-child::after {
  border: 0;
}
.child:last-child::before {
  border-right: 1px solid var(--p-surface-300, #d1d5db);
}
</style>
