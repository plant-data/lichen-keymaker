import { describe, it, expect } from 'vitest'
import {
  bestCandidateIndex,
  buildEntry,
  buildEntries,
  buildChecklistIndex,
  partitionByChecklist,
  groupMatched,
  unmatchedEntries,
  includedAcceptedNames,
  isMatched,
  selectedCandidate
} from '../nameMatch'
import type { MatchCandidate, NameMatchResponse } from '@/types'

const candidate = (overrides: Partial<MatchCandidate> = {}): MatchCandidate => ({
  matched_name: 'Xanthoria parietina (L.) Th. Fr.',
  status: 'accepted',
  accepted_name: 'Xanthoria parietina (L.) Th. Fr.',
  name_score: 100,
  auth_score: 0,
  taxon_id: 2594,
  ...overrides
})

const response = (overrides: Partial<NameMatchResponse> = {}): NameMatchResponse => ({
  input_name: 'Xanthoria parietina',
  match: candidate(),
  other_matches: [],
  ...overrides
})

describe('bestCandidateIndex', () => {
  it('returns the index of the highest name_score', () => {
    const candidates = [candidate({ name_score: 80 }), candidate({ name_score: 95 })]
    expect(bestCandidateIndex(candidates)).toBe(1)
  })

  it('keeps the first candidate on a tie', () => {
    const candidates = [candidate({ name_score: 90 }), candidate({ name_score: 90 })]
    expect(bestCandidateIndex(candidates)).toBe(0)
  })
})

describe('buildEntry', () => {
  it('flattens match + other_matches and defaults to the best candidate', () => {
    const entry = buildEntry(
      response({
        match: candidate({ accepted_name: 'A', name_score: 88 }),
        other_matches: [candidate({ accepted_name: 'B', name_score: 97 })]
      })
    )
    expect(entry.candidates).toHaveLength(2)
    expect(entry.selectedIndex).toBe(1)
    expect(entry.include).toBe(true)
    expect(selectedCandidate(entry)?.accepted_name).toBe('B')
  })

  it('marks entries with no candidates as unmatched', () => {
    const entry = buildEntry(response({ match: null, other_matches: [] }))
    expect(entry.candidates).toHaveLength(0)
    expect(entry.selectedIndex).toBe(-1)
    expect(entry.include).toBe(false)
    expect(isMatched(entry)).toBe(false)
  })

  it('treats an all-null match object (API miss) as unmatched', () => {
    // The match API returns a non-null match with null fields for a miss.
    const miss = {
      matched_name: null,
      status: null,
      accepted_name: null,
      name_score: 0,
      auth_score: 0,
      taxon_id: null
    } as unknown as MatchCandidate
    const entry = buildEntry(response({ input_name: 'Lecanora', match: miss, other_matches: [] }))
    expect(isMatched(entry)).toBe(false)
    expect(entry.candidates).toHaveLength(0)
  })
})

describe('groupMatched', () => {
  it('collapses synonyms onto one accepted name and sorts alphabetically', () => {
    const entries = buildEntries([
      response({ input_name: 'Zed name', match: candidate({ accepted_name: 'Zus zus' }) }),
      response({ input_name: 'Syn one', match: candidate({ accepted_name: 'Abus abus' }) }),
      response({ input_name: 'Syn two', match: candidate({ accepted_name: 'Abus abus' }) }),
      response({ input_name: 'No hit', match: null, other_matches: [] })
    ])
    const groups = groupMatched(entries)
    expect(groups.map((g) => g.acceptedName)).toEqual(['Abus abus', 'Zus zus'])
    expect(groups[0].entries.map((e) => e.inputName)).toEqual(['Syn one', 'Syn two'])
  })
})

describe('unmatchedEntries', () => {
  it('returns only entries without a selected candidate', () => {
    const entries = buildEntries([
      response({ input_name: 'ok' }),
      response({ input_name: 'bad', match: null, other_matches: [] })
    ])
    expect(unmatchedEntries(entries).map((e) => e.inputName)).toEqual(['bad'])
  })
})

describe('partitionByChecklist', () => {
  const index = buildChecklistIndex([
    'Xanthoria parietina (L.) Th. Fr.',
    'Cladonia rangiferina (L.) F.H. Wigg.'
  ])

  it('resolves checklist names locally (case/whitespace-insensitive) without the API', () => {
    const { localEntries, remaining } = partitionByChecklist(
      ['xanthoria  parietina (L.) Th. Fr.', 'Some synonym Auct.'],
      index
    )
    expect(remaining).toEqual(['Some synonym Auct.'])
    expect(localEntries).toHaveLength(1)
    const candidate = selectedCandidate(localEntries[0])
    expect(candidate?.accepted_name).toBe('Xanthoria parietina (L.) Th. Fr.')
    expect(candidate?.name_score).toBe(100)
    expect(localEntries[0].include).toBe(true)
  })

  it('sends everything to the API when the checklist is empty', () => {
    const { localEntries, remaining } = partitionByChecklist(['A', 'B'], buildChecklistIndex([]))
    expect(localEntries).toHaveLength(0)
    expect(remaining).toEqual(['A', 'B'])
  })
})

describe('includedAcceptedNames', () => {
  it('returns unique accepted names of included matched entries', () => {
    const entries = buildEntries([
      response({ input_name: 'a', match: candidate({ accepted_name: 'Abus abus' }) }),
      response({ input_name: 'b', match: candidate({ accepted_name: 'Abus abus' }) }),
      response({ input_name: 'c', match: candidate({ accepted_name: 'Bus bus' }) })
    ])
    expect(includedAcceptedNames(entries).sort()).toEqual(['Abus abus', 'Bus bus'])
  })

  it('excludes entries the user toggled off', () => {
    const entries = buildEntries([
      response({ input_name: 'a', match: candidate({ accepted_name: 'Abus abus' }) }),
      response({ input_name: 'c', match: candidate({ accepted_name: 'Bus bus' }) })
    ])
    entries[1].include = false
    expect(includedAcceptedNames(entries)).toEqual(['Abus abus'])
  })
})
