import type { KeyLead } from '@/types'

// A node in the merged path tree: the same shape the recursive KeyPathTree
// component renders. Several root->species paths are collapsed into one tree so
// the shared trunk is shown once and the paths fan out where they diverge.
export type PathTreeNode = {
  data: KeyLead
  children: PathTreeNode[]
}

// Merge a set of root->leaf paths (as produced by Tree.getPathsToSpecies) into a
// single tree. Nodes are considered "the same" by object identity: the shared
// prefix of every path is the exact same KeyLead references, so equal prefixes
// collapse to one node and divergences become sibling children. The distinct
// species-leaf objects at each branch end stay separate even though adjustIds()
// gives every occurrence of a species the same leadId.
export function mergePathsToTree(paths: KeyLead[][]): PathTreeNode | null {
  if (paths.length === 0 || paths[0].length === 0) {
    return null
  }

  const root: PathTreeNode = { data: paths[0][0], children: [] }

  for (const path of paths) {
    let cursor = root
    for (let i = 1; i < path.length; i++) {
      const data = path[i]
      let child = cursor.children.find((c) => c.data === data)
      if (!child) {
        child = { data, children: [] }
        cursor.children.push(child)
      }
      cursor = child
    }
  }

  return root
}
