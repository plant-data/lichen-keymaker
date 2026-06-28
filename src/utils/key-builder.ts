import type { KeyLead } from '@/types'

class Node {
  data: KeyLead
  children: Node[]
  constructor(data: KeyLead) {
    this.data = data
    this.children = []
  }

  addChild(node: Node) {
    this.children.push(node)
  }

  getSpeciesIds() {
    let speciesIds: string[] = []

    if (this.data.leadSpeciesId !== null) {
      speciesIds.push(this.data.leadSpeciesId)
    }

    for (const child of this.children) {
      speciesIds = speciesIds.concat(child.getSpeciesIds())
    }

    return speciesIds
  }
}

export default class Tree {
  nodes: { [key: number]: Node }
  root: Node | null
  constructor() {
    this.nodes = {}
    this.root = null
  }

  buildTree(data: KeyLead[]) {
    for (const item of data) {
      //const node = new Node(item)
      //this.nodes[item.leadId] = node

      this.nodes[item.leadId] = new Node(item)
    }

    for (const id in this.nodes) {
      const node = this.nodes[id]
      if (this.nodes[node.data.parentId]) {
        this.nodes[node.data.parentId].addChild(node)
      }
    }

    this.root = this.nodes[data[0].leadId]
  }

  isRoot(node: Node) {
    return this.root === node
  }
  find(leadId: number): Node | null {
    // O(1) lookup via the id->Node map (kept in sync by buildTree/adjustIds),
    // instead of an O(n) DFS from the root
    return this.nodes[leadId] ?? null
  }

  // the path of leads from the root down to the given node (root first), i.e. the
  // trail of selected steps that lead to it — used by the History view
  getAncestors(leadId: number): KeyLead[] {
    const path: KeyLead[] = []
    let node = this.find(leadId)
    while (node) {
      path.unshift(node.data)
      node = typeof node.data.parentId === 'number' ? this.find(node.data.parentId) : null
    }
    return path
  }

  /*updateNodes() {
    this.nodes = this.getNodesRecursive(this.root)
  }*/

  /*getNodesRecursive(node) {
    let nodes = { [node.data.leadId]: node }

    for (let child of node.children) {
      nodes = { ...nodes, ...this.getNodesRecursive(child) }
    }

    return nodes
  }*/

  getLeaves(leadId: number) {
    const node = this.find(leadId)
    return node ? this.getLeavesRecursive(node) : null
  }

  getLeavesRecursive(node: Node, leaves: Node[] = []): Node[] {
    if (node.children.length === 0) {
      leaves.push(node)
      return leaves
    }

    for (const child of node.children) {
      this.getLeavesRecursive(child, leaves)
    }

    return leaves
  }

  getNumberOfUniqueLeaves(leadId: number) {
    const node = this.find(leadId)
    if (!node) {
      return null
    }

    const leaves = this.getLeavesRecursive(node)
    const uniqueSpeciesIds = new Set(leaves.map((leaf) => leaf.data.leadSpeciesId))

    return uniqueSpeciesIds.size
  }
  async getTreeAsListByIdAsync(leadId?: number): Promise<KeyLead[]> {
    return new Promise((resolve) => {
      setTimeout(() => {
        const result = this.getTreeAsListById(leadId)
        resolve(result)
      }, 0)
    })
  }
  getTreeAsListById(leadId?: number) {
    if (!leadId) {
      return this.getTreeAsList()
    }

    const startNode = this.find(leadId)
    if (!startNode) {
      return []
    }

    return this.getTreeAsList(startNode)
  }

  getTreeAsList(node = this.root) {
    const list = this.collectSubtree(node)

    // sort once, on the fully flattened list — sorting inside the recursion
    // re-sorted every partial list only to have it overwritten by the parent
    list.sort((a, b) => {
      if (a.parentId < b.parentId) {
        return -1
      }
      if (a.parentId > b.parentId) {
        return 1
      }
      return 0
    })

    return list
  }

  collectSubtree(node: Node | null = this.root, list: KeyLead[] = []): KeyLead[] {
    if (!node) {
      return list
    }

    list.push(node.data)

    for (const child of node.children) {
      this.collectSubtree(child, list)
    }

    return list
  }

  getNumberOfLeaves(leadId: number) {
    const node = this.find(leadId)
    return node ? this.getLeavesRecursive(node).length : null
  }

  getNumberOfChildrenLeaves(leadId: number) {
    const node = this.find(leadId)
    if (!node) {
      return null
    }

    const numberOfChildrenLeaves = node.children.map(
      (child) => this.getLeavesRecursive(child).length
    )
    return numberOfChildrenLeaves
  }

  prune3(leadRecordIds: string[]) {
    this.root = this.pruneRecursive3(this.root, leadRecordIds)
    this.adjustIds()
  }
  prune4() {
    this.adjustIds()
  }

  pruneRecursive3(node: Node, leadRecordIds: string[]) {
    node.children = node.children
      .map((child) => this.pruneRecursive3(child, leadRecordIds))
      .filter(Boolean)

    if (node.data.leadRecordId !== null && leadRecordIds.includes(node.data.leadRecordId)) {
      return node
    }

    if (node.children.length > 1) {
      return node
    }

    if (node.children.length === 1) {
      // direct map lookup; pruning is post-order so the parent is still present
      const parentNode = this.nodes[node.data.parentId]
      // this cover singles before the first couplet
      // still keeps 0
      if (!parentNode) {
        return node.children[0]
      }

      if (parentNode.children.length > 1) {
        node.children[0].data.parentId = node.data.parentId
        node.children[0].data.leadText = node.data.leadText
        node.children[0].data.leadImage = node.data.leadImage

        return node.children[0]
      } else {
        node.children[0].data.parentId = parentNode.data.parentId
        return node.children[0]
      }
    }

    return null
  }
  setNewRoot() {
    let currentNode = this.root

    while (currentNode) {
      if (currentNode.children.length >= 2) {
        this.root = currentNode
        return
      }

      currentNode = currentNode.children[0]
    }
  }
  getRootNodeLeadId() {
    return this.root ? this.root.data.leadId : null
  }

  // potrebbe non funzionare correttamente con typescript
  adjustIds() {
    if (!this.root) return

    let idCounter = 1
    // rebuild the id->Node map from scratch: renumbering in place with
    // `delete this.nodes[oldId]` corrupts it because the new ids (1,2,3,…)
    // collide with the original lead ids and delete already-renumbered entries
    const newNodes: { [key: number]: Node } = {}

    const adjustIdsRecursive = (node: Node, parentId: number | null) => {
      if (node.data.leadSpeciesId !== null) {
        node.data.leadId = node.data.leadSpecies
      } else {
        node.data.leadId = idCounter++
      }

      node.data.parentId = parentId

      newNodes[node.data.leadId] = node

      for (const child of node.children) {
        adjustIdsRecursive(child, node.data.leadId)
      }
    }

    adjustIdsRecursive(this.root, null)
    this.nodes = newNodes
  }

  findAllOccurrencesOfSpecies(speciesName: string): { leadId: number; leadRecordId: string }[] {
    const occurrences: { leadId: number; leadRecordId: string }[] = []

    const findRecursive = (node: Node) => {
      if (node.data.leadSpecies === speciesName) {
        occurrences.push({ leadId: node.data.leadId, leadRecordId: node.data.leadRecordId })
      }
      for (const child of node.children) {
        findRecursive(child)
      }
    }

    findRecursive(this.root)
    return occurrences
  }

  getTreeSpeciesData(speciesName: string) {
    const occurrences = this.findAllOccurrencesOfSpecies(speciesName)
    const leadRecordIds = occurrences.map((o) => o.leadRecordId)
    return leadRecordIds
  }
}
