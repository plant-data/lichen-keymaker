import { describe, it, expect } from 'vitest'
import { mergePathsToTree } from '../pathTree'
import type { KeyLead } from '@/types'

const lead = (overrides: Partial<KeyLead> = {}): KeyLead => ({
  leadId: 0,
  coupletNumber: 0,
  leadText: null,
  leadTo: null,
  leadRecordId: null,
  leadSpeciesId: null,
  leadSpecies: null,
  species_description: null,
  speciesImage: null,
  leadImage: null,
  parentId: 0,
  italicId: null,
  ...overrides
})

describe('mergePathsToTree', () => {
  it('returns null for no paths', () => {
    expect(mergePathsToTree([])).toBeNull()
    expect(mergePathsToTree([[]])).toBeNull()
  })

  it('keeps a single path as a linear chain', () => {
    const root = lead({ leadId: 1 })
    const c1 = lead({ leadId: 2 })
    const leaf = lead({ leadId: 3, leadSpecies: 'Foo bar' })

    const tree = mergePathsToTree([[root, c1, leaf]])

    expect(tree).not.toBeNull()
    expect(tree!.data).toBe(root)
    expect(tree!.children).toHaveLength(1)
    expect(tree!.children[0].data).toBe(c1)
    expect(tree!.children[0].children[0].data).toBe(leaf)
    expect(tree!.children[0].children[0].children).toHaveLength(0)
  })

  it('merges a shared prefix and diverges into parallel branches', () => {
    // shared prefix nodes are the SAME references across paths
    const root = lead({ leadId: 1 })
    const trunk = lead({ leadId: 2 })
    // two distinct leaves for the same species (same leadId after adjustIds,
    // but different objects), reached via different final couplets
    const branchA = lead({ leadId: 3 })
    const leafA = lead({ leadId: 'Foo bar' as unknown as number, leadSpecies: 'Foo bar' })
    const branchB = lead({ leadId: 4 })
    const leafB = lead({ leadId: 'Foo bar' as unknown as number, leadSpecies: 'Foo bar' })

    const tree = mergePathsToTree([
      [root, trunk, branchA, leafA],
      [root, trunk, branchB, leafB]
    ])

    expect(tree!.data).toBe(root)
    // trunk shared → single child
    expect(tree!.children).toHaveLength(1)
    const trunkNode = tree!.children[0]
    expect(trunkNode.data).toBe(trunk)
    // diverges into two parallel branches
    expect(trunkNode.children).toHaveLength(2)
    expect(trunkNode.children[0].data).toBe(branchA)
    expect(trunkNode.children[1].data).toBe(branchB)
    // each branch ends in its own distinct leaf
    expect(trunkNode.children[0].children[0].data).toBe(leafA)
    expect(trunkNode.children[1].children[0].data).toBe(leafB)
  })
})
