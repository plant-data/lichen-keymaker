import { defineStore } from 'pinia'
import { ref, computed } from 'vue'
import Tree from '@/utils/key-builder'
import { fetchFullKey, fetchRecords } from '@/composables/useKeyApi'

import type { KeyLead, KeyUniqueSpeciesData, FullKey } from '@/types'

export const useKeyStore = defineStore('key', () => {
  const isLoading = ref(false)
  const error = ref<string | null>(null)

  const keyId = ref<string | null>(null)
  const rootLeadId = ref<string | null>(null)
  const currentLeadId = ref<string | null>(null)

  const recordsList = ref<string[]>([])
  let fullKey: FullKey | null = null
  let keyTree: Tree | null = null
  const stepsList = ref<KeyLead[]>([])
  const uniqueSpeciesWithImages = computed(() => getUniqueSpeciesWithImages(stepsList.value))
  const speciesCount = ref<number | null>(0)

  const nodeIdOfCurrentSteps = ref<string | null>(null)
  const nodeIdOfCurrentSpeciesImages = ref<string | null>(null)
  const isCurrentNodeValid = ref(true)
  const currentStepsList = ref<KeyLead[]>([])
  const currentUniqueSpeciesWithImages = ref<KeyUniqueSpeciesData[]>([])
  const currentSpeciesCount = computed(() => getSpeciesCount(parseInt(currentLeadId.value ?? '0')))

  // utils
  const reviseStepList = (stepsList: KeyLead[]) => {
    const speciesMap = new Map<string, KeyUniqueSpeciesData>()
    stepsList.forEach((item) => {
      if (item.leadSpecies !== null) {
        if (!speciesMap.has(item.leadSpecies)) {
          speciesMap.set(item.leadSpecies, {
            name: item.leadSpecies,
            image: item.speciesImage,
            italicId: item.italicId,
            records: []
          })
        }
        speciesMap.get(item.leadSpecies)!.records.push(item.leadRecordId)
      }
    })
    return Array.from(speciesMap.values()).sort((a, b) => a.name.localeCompare(b.name))
  }

  const buildKeyTree = (key: FullKey, records: string[]): Tree => {
    const tree = new Tree()
    tree.buildTree(key.keyData)
    if (keyId.value === 'full') {
      tree.prune4()
    } else {
      tree.prune3(records)
    }
    return tree
  }

  const fetchData = async () => {
    if (!keyId.value) {
      error.value = 'Key ID is not set'
      return
    }

    isLoading.value = true
    error.value = null

    try {
      const [retrievedFullKey, retrievedRecords] = await Promise.all([
        fetchFullKey(),
        fetchRecords(keyId.value)
      ])

      const newTree = buildKeyTree(retrievedFullKey, retrievedRecords)
      // total species count for the whole key (set for both the full and filtered keys)
      speciesCount.value = newTree.getNumberOfUniqueLeaves(1)

      // tentative for one species
      let stepsListFromTree = []
      if (newTree.root && newTree.root.children.length === 0) {
        stepsListFromTree = [newTree.root.data]
      } else {
        stepsListFromTree = newTree.getTreeAsListById() as KeyLead[]
        stepsListFromTree.shift()
      }

      fullKey = retrievedFullKey
      recordsList.value = retrievedRecords
      keyTree = newTree
      stepsList.value = stepsListFromTree

      if (newTree.root) {
        setRootLeadId(newTree.root.data.leadId.toString())
      }
    } catch (e) {
      error.value = e instanceof Error ? e.message : 'An unknown error occurred'
    } finally {
      isLoading.value = false
    }
  }

  const setKeyId = (keyUUID: string) => {
    if (keyId.value !== keyUUID) {
      resetAllExceptKey()
    }
    keyId.value = keyUUID
  }

  const setRootLeadId = (leadId: string) => {
    rootLeadId.value = leadId
    currentLeadId.value = leadId
  }

  const setCurrentLeadId = (leadId: string) => {
    currentLeadId.value = leadId
  }

  const resetCurrentLeadIdToRoot = () => {
    currentLeadId.value = rootLeadId.value
  }

  const getSpeciesCount = (nodeId: number | null = null) => {
    if (keyId.value === 'no-data' || !keyTree) {
      return 0
    }
    if (uniqueSpeciesWithImages.value.length === 1) {
      return 1
    }
    return keyTree.getNumberOfUniqueLeaves(nodeId ?? 1)
  }

  const getUniqueSpeciesWithImages = (stepsList: KeyLead[]) => {
    const computedSpeciesList = reviseStepList(stepsList)
    return computedSpeciesList
  }

  const getNodeIdFromLeadId = (leadId: number) => {
    if (!keyTree || !keyTree.root) {
      return null
    }
    if (keyTree.root.children.length === 0) {
      isCurrentNodeValid.value = true
      return keyTree.root
    }

    const actualNode = keyTree.find(leadId)
    // reset the flag on every lookup, otherwise a single invalid node keeps the
    // "passage does not exist" error stuck for all later valid nodes
    isCurrentNodeValid.value = actualNode !== null

    return actualNode
  }

  const setStepsListFromNodeId = async (nodeId: string) => {
    if (nodeId === nodeIdOfCurrentSteps.value) {
      return
    }

    if (parseInt(nodeId) === 1) {
      currentStepsList.value = stepsList.value
      isCurrentNodeValid.value = true
      return
    }

    if (!keyTree) {
      return
    }

    isLoading.value = true

    const tempStepsList = await keyTree.getTreeAsListByIdAsync(parseInt(nodeId))

    if (tempStepsList.length === 0) {
      error.value = 'Passage not found'
      isLoading.value = false
      isCurrentNodeValid.value = false
      return
    }

    tempStepsList.shift()
    nodeIdOfCurrentSteps.value = nodeId
    isCurrentNodeValid.value = true

    const adjustment = parseInt(nodeId) - 1
    const adjustedStepsList = tempStepsList.map((step) => ({
      ...step,
      leadId: typeof step.leadId === 'number' ? step.leadId - adjustment : step.leadId,
      parentId: typeof step.parentId === 'number' ? step.parentId - adjustment : step.parentId
    }))

    currentStepsList.value = adjustedStepsList
    isLoading.value = false
  }

  const setUniqueSpeciesWithImagesFromNodeId = (nodeId: string) => {
    if (nodeId === nodeIdOfCurrentSpeciesImages.value) {
      return
    }

    if (parseInt(nodeId) === 1) {
      currentUniqueSpeciesWithImages.value = uniqueSpeciesWithImages.value
      isCurrentNodeValid.value = true
      return
    }

    if (!keyTree) {
      return
    }

    const tempStepsList = keyTree.getTreeAsListById(parseInt(nodeId))

    if (tempStepsList.length === 0) {
      isCurrentNodeValid.value = false
      return
    }

    currentUniqueSpeciesWithImages.value = reviseStepList(tempStepsList)
    nodeIdOfCurrentSpeciesImages.value = nodeId
    isCurrentNodeValid.value = true
  }

  // builds the sub-key (steps) leading to every occurrence of a single species,
  // used by the "duplicate species" view
  const getMiniTree = async (speciesName: string): Promise<KeyLead[]> => {
    if (!keyTree) {
      return []
    }

    const uniqueRecords = keyTree
      .getTreeSpeciesData(speciesName)
      .filter((record): record is string => record !== null)

    const retrievedFullKey = fullKey ?? (await fetchFullKey())
    const miniTree = buildKeyTree(retrievedFullKey, uniqueRecords)

    const miniStepsListFromTree = miniTree.getTreeAsListById() as KeyLead[]
    miniStepsListFromTree.shift()
    return miniStepsListFromTree
  }

  const resetAllExceptKey = () => {
    isLoading.value = false
    rootLeadId.value = null
    currentLeadId.value = null
    error.value = null
    recordsList.value = []
    fullKey = null
    keyTree = null
    stepsList.value = []
    nodeIdOfCurrentSteps.value = null
    nodeIdOfCurrentSpeciesImages.value = null
    isCurrentNodeValid.value = true
    currentStepsList.value = []
    currentUniqueSpeciesWithImages.value = []
  }

  const resetStore = () => {
    resetAllExceptKey()
    keyId.value = null
  }

  return {
    keyId,
    currentLeadId,
    isLoading,
    error,
    recordsList,
    fullKey,
    speciesCount,
    getKeyTree: () => keyTree,
    stepsList,
    uniqueSpeciesWithImages,

    isCurrentNodeValid,
    nodeIdOfCurrentSteps,
    nodeIdOfCurrentSpeciesImages,
    currentStepsList,
    currentUniqueSpeciesWithImages,
    currentSpeciesCount,

    fetchData,
    getMiniTree,

    setKeyId,
    setCurrentLeadId,
    setStepsListFromNodeId,
    setUniqueSpeciesWithImagesFromNodeId,

    getNodeIdFromLeadId,
    getUniqueSpeciesWithImages,

    resetCurrentLeadIdToRoot,
    resetStore
  }
})
