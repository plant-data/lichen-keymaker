// src/stores/useKeyStore.ts
import { defineStore } from 'pinia'
import { ref, computed } from 'vue'
import axios from 'axios'
import { openDB } from 'idb'

import Tree from '@/utils/key-builder'

interface KeyItem {
  leadId: number
  parentId: number
  leadText: string
  leadImage: string | null
  speciesImage: string | null
  leadSpecies: string | null
}

interface SpeciesInfo {
  name: string
  image: string | null
}

interface FullKey {
  keyData: KeyItem[]
}

interface KeyDB {
  fullKey: {
    key: string
    value: FullKey
  }
  lastFetch: {
    key: string
    value: number
  }
}

const dbPromise = openDB<KeyDB>('keyStore', 1, {
  upgrade(db) {
    db.createObjectStore('fullKey')
    db.createObjectStore('lastFetch')
  }
})

export const useKeyStore = defineStore('key', () => {
  const isLoading = ref(false)
  const error = ref<string | null>(null)
  const keyId = ref<string | null>(null)

  // used by the interactive key
  const rootLeadId = ref<string | null>(null)
  const currentLeadId = ref<string | null>(null)

  const recordsList = ref<number[]>([])
  const fullKey = ref<FullKey | null>(null)
  const keyTree = ref<Tree | null>(null)
  const stepsList = ref<KeyItem[]>([])

  const speciesList = ref<SpeciesInfo[] | null>(null)
  const uniqueSpeciesWithImages = computed(() => getUniqueSpeciesWithImages())
  const speciesCount = computed(() => uniqueSpeciesWithImages.value.length)

  // for the interactive key
  // in this way I can check if the current steps are based on the current node
  const nodeIdOfCurrentSteps = ref<string | null>(null)
  const nodeIdOfCurrentSpecies = ref<string | null>(null)
  const nodeIdOfCurrentSpeciesImages = ref<string | null>(null)
  const isCurrentNodeValid = ref(true)
  const currentStepsList = ref<KeyItem[]>([])

  const setKeyId = (keyUUID: string) => {
    if (keyId.value !== keyUUID) {
      resetAllExceptKey()
    }
    keyId.value = keyUUID
  }

  // not exported, for internal use only
  const setRootLeadId = (leadId: string) => {
    rootLeadId.value = leadId
    currentLeadId.value = leadId // Initialize current to root
  }

  const setCurrentLeadId = (leadId: string) => {
    currentLeadId.value = leadId
  }

  const resetCurrentLeadIdToRoot = () => {
    currentLeadId.value = rootLeadId.value
  }

  const fetchFullKey = async (): Promise<FullKey> => {
    const db = await dbPromise
    const storedKey = await db.get('fullKey', 'currentKey')
    const lastFetchTime = await db.get('lastFetch', 'fullKeyFetch')
    const currentTime = new Date().getTime()

    // Check if a month has passed since the last fetch
    if (storedKey && lastFetchTime && currentTime - lastFetchTime < 24 * 60 * 60 * 1000) {
      return storedKey
    }

    // Fetch new data if not in IndexedDB or a month has passed
    const response = await axios.get<FullKey>('https://italic.units.it/api/v1/full-key')

    // Store the new data and fetch time
    await db.put('fullKey', response.data, 'currentKey')
    await db.put('lastFetch', currentTime, 'fullKeyFetch')

    return response.data
  }

  const fetchRecords = async (id: string): Promise<number[]> => {
    if (id === 'full') {
      return [] // Return an empty array for 'full' key
    }
    const response = await axios.post<{ records: number[] }>(
      'https://italic.units.it/api/v1/key-records',
      { 'key-id': id }
    )
    return response.data.records
  }

  const buildKeyTree = (key: FullKey, records: number[]): Tree => {
    const tree = new Tree()
    tree.buildTree(key.keyData)
    if (keyId.value === 'full') {
      tree.prune4()
      return tree
    }
    tree.prune3(records)
    return tree
  }

  const fetchData = async () => {
    if (!keyId.value) {
      error.value = 'Key ID is not set'
      return
    }
    console.log('CORROOOOOOOOOOOO')

    isLoading.value = true
    error.value = null

    try {
      const [retrievedFullKey, retrievedRecords] = await Promise.all([
        fetchFullKey(),
        fetchRecords(keyId.value)
      ])

      const newTree = buildKeyTree(retrievedFullKey, retrievedRecords)
      const stepsListFromTree = newTree.getTreeAsListById() as KeyItem[]
      stepsListFromTree.shift() // Remove the first item

      fullKey.value = retrievedFullKey
      recordsList.value = retrievedRecords
      keyTree.value = newTree
      stepsList.value = stepsListFromTree

      // set the id for the interactive keys
      if (newTree.root) {
        setRootLeadId(newTree.root.data.leadId.toString())
        // don't assign it if is setted from the outside
        /*if (!currentLeadId.value) {
          setCurrentLeadId(newTree.root.data.leadId.toString())
        }*/
      }

      speciesList.value = getUniqueSpeciesWithImages()
    } catch (e) {
      error.value = e instanceof Error ? e.message : 'An unknown error occurred'
    } finally {
      isLoading.value = false
    }
  }

  const getUniqueSpeciesWithImages = () => {
    // If speciesList is already computed, return it
    if (speciesList.value !== null) {
      return speciesList.value
    }

    const speciesMap = new Map<string, SpeciesInfo>()

    stepsList.value.forEach((item) => {
      if (item.leadSpecies !== null) {
        speciesMap.set(item.leadSpecies, {
          name: item.leadSpecies,
          image: item.speciesImage
        })
      }
    })

    const computedSpeciesList = Array.from(speciesMap.values()).sort((a, b) =>
      a.name.localeCompare(b.name)
    )

    // Store the computed list
    return computedSpeciesList
  }

  const getUniqueSpeciesWithRecords = () => {
    const speciesMap = new Map<string, { name: string; records: number[] }>()

    stepsList.value.forEach((item) => {
      if (item.leadSpecies !== null) {
        if (!speciesMap.has(item.leadSpecies)) {
          speciesMap.set(item.leadSpecies, { name: item.leadSpecies, records: [] })
        }

        speciesMap.get(item.leadSpecies)!.records.push(item.leadRecordId)
      }
    })
    return Array.from(speciesMap.values()).sort((a, b) => a.name.localeCompare(b.name))
  }

  /*const getStepsListFromNodeId = (nodeId) => {
    const tree = keyTree.value
    if (!tree) {
      return []
    }
    // turn nodeId into a number

    const stepsList = tree.getTreeAsListById(parseInt(nodeId))
    if (!stepsList) {
      return []
    }

    stepsList.shift()
    return stepsList
  }*/

  const setStepsListFromNodeId = (nodeId) => {
    // if already computed, return the current list
    if (nodeId === nodeIdOfCurrentSteps.value) {
      return
    }
    if (parseInt(nodeId) === 1) {
      console.log('non ricalcolo')
      currentStepsList.value = stepsList.value
      return
    }

    const tree = keyTree.value
    if (!tree) {
      return
    }

    console.log('ricalcolo i passaggi')
    const tempStepsList = tree.getTreeAsListById(parseInt(nodeId))

    if (tempStepsList.length === 0) {
      isCurrentNodeValid.value = false
      return
    }

    tempStepsList.shift()
    nodeIdOfCurrentSteps.value = nodeId

    // to reset table values to start from 1
    // remove to get original values
    const adjustment = parseInt(nodeId) - 1
    const adjustedStepsList = tempStepsList.map((step) => ({
      ...step,
      leadId: typeof step.leadId === 'number' ? step.leadId - adjustment : step.leadId,
      parentId: typeof step.parentId === 'number' ? step.parentId - adjustment : step.parentId
    }))

    currentStepsList.value = adjustedStepsList
  }

  const getNodeIdFromLeadId = (leadId: number) => {
    const tree = keyTree.value
    if (!tree) {
      return null
    }

    const actualNode = tree.find(leadId)
    console.log('actualNode', actualNode)
    // assign the node as invalid
    if (!actualNode) {
      isCurrentNodeValid.value = false
    }

    return actualNode
  }

  const resetAllExceptKey = () => {
    isLoading.value = false
    rootLeadId.value = null
    currentLeadId.value = null

    error.value = null
    recordsList.value = []
    fullKey.value = null
    keyTree.value = null
    stepsList.value = []

    speciesList.value = null
  }

  const resetStore = () => {
    isLoading.value = false
    error.value = null
    recordsList.value = []
    fullKey.value = null
    keyTree.value = null
    stepsList.value = []
    speciesList.value = null
    keyId.value = null
    rootLeadId.value = null
    currentLeadId.value = null
    isCurrentNodeValid.value = true
  }

  return {
    keyId,
    currentLeadId,
    isLoading,
    error,
    recordsList,
    fullKey,
    speciesCount,
    keyTree,
    stepsList,

    setKeyId,
    setCurrentLeadId,
    resetCurrentLeadIdToRoot,
    fetchData,
    getNodeIdFromLeadId,
    getUniqueSpeciesWithImages,
    getUniqueSpeciesWithRecords,
    /* getStepsListFromNodeId,*/

    // for interactive
    setStepsListFromNodeId,
    nodeIdOfCurrentSteps,
    isCurrentNodeValid,
    currentStepsList,

    uniqueSpeciesWithImages,
    resetStore
  }
})
