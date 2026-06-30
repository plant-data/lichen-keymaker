import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'

vi.mock('axios', () => ({
  default: { get: vi.fn() }
}))

import axios from 'axios'
import { matchNames } from '../useKeyApi'

const get = axios.get as unknown as ReturnType<typeof vi.fn>

const okResponse = (name: string, acceptedName: string | null) => ({
  status: 200,
  data: {
    input_name: name,
    match: {
      matched_name: acceptedName,
      status: acceptedName ? 'accepted' : null,
      accepted_name: acceptedName,
      name_score: acceptedName ? 100 : 0,
      auth_score: 0,
      taxon_id: acceptedName ? 1 : null
    },
    other_matches: []
  }
})

const rateLimited = (retryAfter: number) => ({
  status: 429,
  data: { error: 'Rate limit exceeded', retry_after: retryAfter }
})

beforeEach(() => {
  get.mockReset()
})
afterEach(() => {
  vi.useRealTimers()
})

describe('matchNames', () => {
  it('returns a 200 match on the first call (no retry)', async () => {
    get.mockResolvedValueOnce(okResponse('Xanthoria parietina', 'Xanthoria parietina (L.) Th. Fr.'))
    const [result] = await matchNames(['Xanthoria parietina'])
    expect(result.match?.accepted_name).toBe('Xanthoria parietina (L.) Th. Fr.')
    expect(get).toHaveBeenCalledTimes(1)
  })

  it('treats a 200 with null accepted_name as an instant no-match (no retry)', async () => {
    get.mockResolvedValueOnce(okResponse('Lecanora', null))
    const [result] = await matchNames(['Lecanora'])
    expect(result.match?.accepted_name).toBeNull()
    expect(get).toHaveBeenCalledTimes(1)
  })

  it('waits retry_after on a 429 then retries and returns the 200', async () => {
    vi.useFakeTimers()
    get
      .mockResolvedValueOnce(rateLimited(1))
      .mockResolvedValueOnce(okResponse('Usnea barbata', 'Usnea barbata (L.) F.H. Wigg.'))

    const promise = matchNames(['Usnea barbata'])
    await vi.advanceTimersByTimeAsync(1300) // past retry_after (1s) + buffer
    const [result] = await promise

    expect(get).toHaveBeenCalledTimes(2)
    expect(result.match?.accepted_name).toBe('Usnea barbata (L.) F.H. Wigg.')
  })

  it('preserves input order and reports progress for every name', async () => {
    const names = ['a', 'b', 'c']
    let call = 0
    get.mockImplementation(() => {
      const name = names[call++]
      return Promise.resolve(okResponse(name, `${name} Auth.`))
    })
    const progress: Array<[number, number]> = []
    const results = await matchNames(names, (done, total) => progress.push([done, total]))

    expect(results.map((r) => r.input_name)).toEqual(['a', 'b', 'c'])
    expect(progress).toHaveLength(3)
    expect(progress.at(-1)).toEqual([3, 3])
  })
})
