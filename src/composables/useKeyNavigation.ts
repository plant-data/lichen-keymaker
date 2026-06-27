import { computed } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { useKeyStore } from '@/stores/keyStore'

// Node navigation for a generated key: every move is just "change the URL nodeId,
// keep the current view". Shared by the options menu, the History page and the
// remaining-species Restart button.
export function useKeyNavigation() {
  const route = useRoute()
  const router = useRouter()
  const keyStore = useKeyStore()

  const currentNodeId = computed(() => parseInt(route.params.nodeId as string))

  const isRoot = computed(() => {
    const tree = keyStore.getKeyTree()
    if (!tree) {
      return true
    }
    return currentNodeId.value === tree.getRootNodeLeadId()
  })

  const goToNode = (nodeId: number, name?: string) => {
    router.push({
      name: (name ?? route.name) as string,
      params: { ...route.params, nodeId: nodeId.toString() }
    })
  }

  const goToParent = () => {
    const tree = keyStore.getKeyTree()
    const node = tree?.find(currentNodeId.value)
    if (node && typeof node.data.parentId === 'number') {
      goToNode(node.data.parentId)
    }
  }

  const goToRoot = () => {
    const tree = keyStore.getKeyTree()
    const rootLeadId = tree?.getRootNodeLeadId()
    if (typeof rootLeadId === 'number') {
      goToNode(rootLeadId)
    }
  }

  return { currentNodeId, isRoot, goToParent, goToRoot, goToNode }
}
