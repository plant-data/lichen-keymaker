<template>
  <div v-if="currentNode">
    <div class="mb-4 flex h-10 w-full justify-center">
      <div class="flex w-full max-w-2xl justify-between">
        <button
          v-if="!isRoot"
          @click="navigateToParent"
          class="min-w-20 rounded-xl border border-surface-300 bg-white px-3 py-2 text-sm font-medium text-surface-700 transition duration-150 ease-in-out hover:border-primary-500 hover:bg-primary-500/5"
        >
          Back
        </button>
        <button
          v-if="!isRoot"
          @click="navigateToRoot"
          class="min-w-20 rounded-xl border border-surface-300 bg-white px-3 py-2 text-sm font-medium text-surface-700 transition duration-150 ease-in-out hover:border-primary-500 hover:bg-primary-500/5"
        >
          Restart
        </button>
      </div>
    </div>

    <div v-if="currentNode.children.length > 0" class="space-y-4">
      <div class="flex flex-col items-center space-y-4">
        <div
          v-for="child in currentNode.children"
          :key="child.data.leadId"
          :class="[
            'w-full max-w-2xl overflow-hidden rounded-md border border-gray-200 bg-white pt-2 shadow-sm',
            {
              'cursor-pointer hover:border-primary-500 hover:bg-primary-500/5':
                !child.data.leadSpecies
            }
          ]"
          @click="!child.data.leadSpecies && navigateToNode(child)"
        >
          <div class="grid h-28 place-items-center overflow-hidden sm:h-36">
            <img
              :src="getInteractiveImageUrl(child.data)"
              :alt="child.data.leadText"
              class="h-28 w-auto rounded-md object-contain sm:h-36"
            />
          </div>
          <div class="flex min-h-20 items-center justify-center p-2 sm:h-[78px] sm:min-h-[78px]">
            <p class="text-center text-sm font-medium text-gray-800">
              <span v-html="child.data.leadText"></span>
              <span v-if="child.data.leadSpecies" class="block">
                <a
                  class="font-medium text-blue-600 hover:underline"
                  :href="`${paths.taxonPagePath}${child.data.italicId}`"
                  target="_blank"
                >
                  ({{ child.data.leadSpecies }})
                </a>
              </span>
            </p>
          </div>
        </div>
      </div>
    </div>

    <div v-else class="text-center text-lg font-semibold">
      <p>Not available</p>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed, ref, onMounted, watch } from 'vue'
import { useKeyStore } from '@/stores/keyStore'
import { paths } from '@/config/endpoints'
import placeholderImage from '@/assets/placeholder.svg'

const props = defineProps({
  currentNode: {
    type: Object,
    required: true
  }
})

const emit = defineEmits(['update:currentNode'])

const keyStore = useKeyStore()
const localKeyTree = ref(null)

onMounted(() => {
  localKeyTree.value = keyStore.getKeyTree()
})

watch(
  () => keyStore.isLoading,
  (newValue) => {
    if (!newValue) {
      localKeyTree.value = keyStore.getKeyTree()
    }
  }
)

const isRoot = computed(() => {
  return props.currentNode && localKeyTree.value && localKeyTree.value.isRoot(props.currentNode)
})

function navigateToRoot() {
  if (localKeyTree.value) {
    emit('update:currentNode', localKeyTree.value.root)
  }
}

function navigateToNode(node) {
  emit('update:currentNode', node)
}

function navigateToParent() {
  if (props.currentNode && props.currentNode.data.parentId && localKeyTree.value) {
    const parentNode = localKeyTree.value.find(props.currentNode.data.parentId)
    if (parentNode) {
      emit('update:currentNode', parentNode)
    }
  }
}

const getInteractiveImageUrl = (nodeData) => {
  if (nodeData.speciesImage) {
    let imgPath = nodeData.speciesImage
    imgPath = imgPath.replace('images/species/images', 'images/species/thumbnails')
    return `${paths.imagesPath}${imgPath}`
  }
  if (nodeData.leadImage) {
    return `${paths.imagesPath}${nodeData.leadImage}`
  }
  return placeholderImage
}
</script>
