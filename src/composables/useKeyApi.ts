import { useMutation, useQuery } from '@tanstack/vue-query'
import type { FullKey, NameMatchResponse } from '@/types'
import {
  getStoredFullKey,
  storeFullKey,
  getLastFetchTime,
  updateLastFetchTime
} from '@/utils/indexedDB'
import axios from 'axios'
import { endpoints } from '@/config/endpoints'

export const fetchFullKey = async (): Promise<FullKey> => {
  const storedKey = await getStoredFullKey()
  const lastFetchTime = await getLastFetchTime()
  const currentTime = new Date().getTime()

  if (storedKey && lastFetchTime && currentTime - lastFetchTime < 24 * 60 * 60 * 1000) {
    return storedKey
  }

  const response = await axios.get<FullKey>(endpoints.fullKey)
  await storeFullKey(response.data)
  await updateLastFetchTime()

  return response.data
}

export const fetchRecords = async (id: string): Promise<string[]> => {
  if (id === 'full') {
    return []
  }
  const response = await axios.post<{ records: string[] }>(endpoints.recordsFromKey, {
    'key-id': id
  })
  return response.data.records
}

const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms))

const noMatch = (name: string): NameMatchResponse => ({
  input_name: name,
  match: null,
  other_matches: []
})

const DEFAULT_RETRY_AFTER_MS = 4000
const MAX_ATTEMPTS = 10

/**
 * Match the names with a bounded worker pool.
 *
 * The match API answers a real miss with HTTP 200 (a null `accepted_name`) and
 * signals rate-limiting with HTTP 429 carrying `{ retry_after: <seconds> }` in
 * the body. So a 200 is trusted immediately (no retry — genuine misses are
 * fast), and only a 429 waits: all workers share a `pauseUntil` deadline so the
 * whole batch backs off together for `retry_after` and then resumes.
 */
export const matchNames = async (
  names: string[],
  onProgress?: (done: number, total: number) => void,
  concurrency = 6
): Promise<NameMatchResponse[]> => {
  const results: NameMatchResponse[] = new Array(names.length)
  let next = 0
  let done = 0
  let pauseUntil = 0

  const fetchOne = async (name: string): Promise<NameMatchResponse> => {
    for (let attempt = 0; attempt < MAX_ATTEMPTS; attempt++) {
      const wait = pauseUntil - Date.now()
      if (wait > 0) await sleep(wait)
      try {
        const response = await axios.get<NameMatchResponse & { retry_after?: number }>(
          endpoints.matchName + encodeURIComponent(name),
          { validateStatus: () => true }
        )
        if (response.status === 429) {
          const retryAfter = Number(response.data?.retry_after) * 1000 || DEFAULT_RETRY_AFTER_MS
          pauseUntil = Math.max(pauseUntil, Date.now() + retryAfter + 250)
          continue
        }
        if (response.status === 200) {
          return response.data
        }
        // Unexpected status: back off briefly, then give up as a no-match.
        await sleep(500)
      } catch {
        await sleep(500)
      }
    }
    return noMatch(name)
  }

  const worker = async () => {
    while (next < names.length) {
      const index = next++
      results[index] = await fetchOne(names[index])
      done++
      onProgress?.(done, names.length)
    }
  }

  const workers = Array.from({ length: Math.min(concurrency, names.length) }, worker)
  await Promise.all(workers)
  return results
}

// for debug
export function useKeyFilterMutation() {
  return useMutation({
    mutationFn: async (filters: any) => {
      const startTime = performance.now()
      const result = await axios.post(endpoints.keyFromFilters, filters).then((res) => res.data)
      const endTime = performance.now()
      //console.log(`useKeyFilterMutation execution time: ${endTime - startTime} milliseconds`)
      return result
    }
  })
}

// use to refine a key
export function useKeyRecordsMutation() {
  return useMutation({
    mutationFn: async (records: any) => {
      const startTime = performance.now()
      const result = await axios
        .post(endpoints.keyFromRecords, { records: records })
        .then((res) => res.data)
      const endTime = performance.now()
      //console.log(`useKeyFilterMutation execution time: ${endTime - startTime} milliseconds`)
      return result
    }
  })
}

export function useKeyTaxaFilterMutation() {
  return useMutation({
    mutationFn: async (filters: any) => {
      const startTime = performance.now()
      const result = await axios.post(endpoints.keyFromSpecies, filters).then((res) => res.data)
      const endTime = performance.now()
      //console.log(`useKeyTaxaFilterMutation execution time: ${endTime - startTime} milliseconds`)
      return result
    }
  })
}

export function useComboboxItemsQuery(fetchKeyName: string, apiEndpoint: string) {
  return useQuery({
    queryKey: ['comboboxItems', apiEndpoint],
    queryFn: async () => {
      const response = await axios.get(apiEndpoint)
      return response.data.map((item: string) => ({
        name: item,
        value: item
      }))
    },
    staleTime: 1000 * 60 * 30, // 5 minutes
    refetchOnMount: false,
    refetchOnWindowFocus: false,
    refetchOnReconnect: false
  })
}

// The full ITALIC checklist (every accepted name, with author citations).
export const fetchChecklist = async (): Promise<string[]> => {
  const response = await fetch(endpoints.speciesList)
  const data = await response.json()
  return data.checklist
}

export function useSpeciesQuery() {
  return useQuery({
    queryKey: ['checklist'],
    queryFn: fetchChecklist,
    staleTime: Infinity,
    refetchOnMount: false,
    refetchOnWindowFocus: false,
    refetchOnReconnect: false
  })
}
