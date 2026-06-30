import type { MatchCandidate, NameMatchResponse } from '@/types'
import { normalizeName } from '@/utils/spreadsheet'

/**
 * A single input name after matching: the candidate list (primary match first,
 * then `other_matches`), the currently chosen candidate, and whether the user
 * wants it included in the key. `selectedIndex === -1` means "no match".
 */
export type MatchEntry = {
  inputName: string
  candidates: MatchCandidate[]
  selectedIndex: number
  include: boolean
}

/**
 * Matched entries that resolve to the same accepted name, collapsed into one row.
 */
export type MatchGroup = {
  acceptedName: string
  entries: MatchEntry[]
}

/** Index of the candidate with the highest name_score (ties keep the first). */
export function bestCandidateIndex(candidates: MatchCandidate[]): number {
  let bestIdx = 0
  let bestScore = -Infinity
  candidates.forEach((candidate, index) => {
    if (candidate.name_score > bestScore) {
      bestScore = candidate.name_score
      bestIdx = index
    }
  })
  return bestIdx
}

/** Turn a raw match response into an entry, defaulting to the best candidate. */
export function buildEntry(response: NameMatchResponse): MatchEntry {
  // A miss comes back as a non-null `match` object whose fields are all null
  // (not as `match: null`), so require a real accepted_name to count as a candidate.
  const candidates = [response.match, ...(response.other_matches ?? [])].filter(
    (candidate): candidate is MatchCandidate => candidate != null && candidate.accepted_name != null
  )
  return {
    inputName: response.input_name,
    candidates,
    selectedIndex: candidates.length ? bestCandidateIndex(candidates) : -1,
    include: candidates.length > 0
  }
}

export function buildEntries(responses: NameMatchResponse[]): MatchEntry[] {
  return responses.map(buildEntry)
}

export function isMatched(entry: MatchEntry): boolean {
  return entry.selectedIndex >= 0 && entry.selectedIndex < entry.candidates.length
}

export function selectedCandidate(entry: MatchEntry): MatchCandidate | null {
  return isMatched(entry) ? entry.candidates[entry.selectedIndex] : null
}

/** Group matched entries by their currently-selected accepted name, alphabetically. */
export function groupMatched(entries: MatchEntry[]): MatchGroup[] {
  const groups = new Map<string, MatchGroup>()
  for (const entry of entries) {
    const candidate = selectedCandidate(entry)
    if (!candidate) continue
    if (!groups.has(candidate.accepted_name)) {
      groups.set(candidate.accepted_name, { acceptedName: candidate.accepted_name, entries: [] })
    }
    groups.get(candidate.accepted_name)!.entries.push(entry)
  }
  return Array.from(groups.values()).sort((a, b) => a.acceptedName.localeCompare(b.acceptedName))
}

export function unmatchedEntries(entries: MatchEntry[]): MatchEntry[] {
  return entries.filter((entry) => !isMatched(entry))
}

/** Unique accepted names of the matched entries the user kept toggled on. */
export function includedAcceptedNames(entries: MatchEntry[]): string[] {
  const names = new Set<string>()
  for (const entry of entries) {
    const candidate = selectedCandidate(entry)
    if (candidate && entry.include) {
      names.add(candidate.accepted_name)
    }
  }
  return Array.from(names)
}

/**
 * Build a lookup from a normalised, lower-cased name to its canonical checklist
 * spelling, so input names can be resolved against the checklist locally.
 */
export function buildChecklistIndex(checklist: string[]): Map<string, string> {
  const index = new Map<string, string>()
  for (const name of checklist) {
    index.set(normalizeName(name).toLowerCase(), name)
  }
  return index
}

/** A synthetic, exact (score 100) candidate for a name found in the checklist. */
export function checklistCandidate(canonical: string): MatchCandidate {
  return {
    matched_name: canonical,
    status: 'accepted',
    accepted_name: canonical,
    name_score: 100,
    auth_score: 100,
    taxon_id: null
  }
}

/**
 * Resolve names against the checklist first: anything already an accepted name
 * becomes a local match (no API call); the rest are returned for the match API.
 * The checklist holds ~94% of a typical accepted-name column, which avoids
 * hammering the rate-limited match endpoint.
 */
export function partitionByChecklist(
  names: string[],
  checklistIndex: Map<string, string>
): { localEntries: MatchEntry[]; remaining: string[] } {
  const localEntries: MatchEntry[] = []
  const remaining: string[] = []
  for (const name of names) {
    const canonical = checklistIndex.get(normalizeName(name).toLowerCase())
    if (canonical) {
      localEntries.push({
        inputName: name,
        candidates: [checklistCandidate(canonical)],
        selectedIndex: 0,
        include: true
      })
    } else {
      remaining.push(name)
    }
  }
  return { localEntries, remaining }
}
