import type { Condition, ParamSchema } from './types'
import { isAtom } from './types'
import { formatCondition } from './condition'
import { schemaLeafIndices } from './schema'

export type FlatLeaf = {
  path: string
  indices: number[]
  value: Condition // always Atom when fully flat; kept as Condition for partial
}

/**
 * Expand a nested condition into leaf paths relative to a column label.
 * e.g. label P3, value [y, [n, x]] → P3[0]=y, P3[1][0]=n, P3[1][1]=x
 */
export function flattenCondition(label: string, value: Condition): FlatLeaf[] {
  const leaves: FlatLeaf[] = []

  function walk(c: Condition, indices: number[]) {
    if (isAtom(c)) {
      const path =
        indices.length === 0
          ? label
          : `${label}${indices.map((i) => `[${i}]`).join('')}`
      leaves.push({ path, indices, value: c })
      return
    }
    c.forEach((child, i) => walk(child, [...indices, i]))
  }

  walk(value, [])
  return leaves
}

export function conditionToDisplay(value: Condition, expanded: boolean, label: string): string {
  if (!expanded || isAtom(value)) return formatCondition(value)
  return flattenCondition(label, value)
    .map((l) => `${l.path}=${formatCondition(l.value)}`)
    .join('; ')
}

export type ExpandedLeaf = { suffix: string; indices: number[] }

/**
 * Leaf columns for one param when arrays are expanded.
 * Schema dimensions are included even if every stored value is still a single atom,
 * so a new row does not collapse R2[0], R2[1], … into one icon.
 */
export function expandedColumnLeaves(
  values: Condition[],
  schema: ParamSchema | undefined,
): ExpandedLeaf[] {
  const map = new Map<string, number[]>()
  const add = (indices: number[]) => {
    const suffix = indices.map((i) => `[${i}]`).join('')
    if (!map.has(suffix)) map.set(suffix, indices)
  }

  for (const value of values) {
    if (isAtom(value)) continue
    for (const leaf of flattenCondition('', value)) add(leaf.indices)
  }
  for (const indices of schemaLeafIndices(schema)) add(indices)

  return [...map.entries()]
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([suffix, indices]) => ({ suffix, indices }))
}

/** Collect union of leaf path suffixes for a set of conditions under one column. */
export function collectLeafPaths(values: Condition[]): string[] {
  const paths = new Set<string>()
  for (const v of values) {
    for (const leaf of flattenCondition('', v)) {
      const suffix = leaf.indices.map((i) => `[${i}]`).join('')
      paths.add(suffix)
    }
  }
  return [...paths].sort()
}

export function getAtPath(value: Condition, indices: number[]): Condition | undefined {
  let current: Condition = value
  for (const i of indices) {
    if (isAtom(current) || i >= current.length) return undefined
    current = current[i]!
  }
  return current
}
