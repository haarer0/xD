import type { Condition, MergeConflict, Project, Row, Section } from './types'
import {
  cloneCondition,
  conditionsOverlap,
  deepEqualCondition,
  generalizeConditions,
  specificity,
} from './condition'

function columnIdsByRole(sections: Section[], roles: Section['role'][]): string[] {
  return sections
    .filter((s) => roles.includes(s.role))
    .flatMap((s) => s.columns.map((c) => c.id))
}

function cellsEqualOn(rowA: Row, rowB: Row, columnIds: string[]): boolean {
  return columnIds.every((id) => {
    const a = rowA.cells[id] ?? 'x'
    const b = rowB.cells[id] ?? 'x'
    return deepEqualCondition(a, b)
  })
}

/** P and M are generalized; disagreements become don't-care and never block the merge. */
function generalizeCells(
  rowA: Row,
  rowB: Row,
  columnIds: string[],
): Record<string, Condition> {
  const result: Record<string, Condition> = {}
  for (const id of columnIds) {
    const a = rowA.cells[id] ?? 'x'
    const b = rowB.cells[id] ?? 'x'
    result[id] = generalizeConditions(a, b)
  }
  return result
}

function mergeCellMaps(
  left: Record<string, Condition>,
  right: Record<string, Condition>,
): Record<string, Condition> {
  const ids = new Set([...Object.keys(left), ...Object.keys(right)])
  const result: Record<string, Condition> = {}
  for (const id of ids) {
    const a = left[id] ?? 'x'
    const b = right[id] ?? 'x'
    result[id] = generalizeConditions(a, b)
  }
  return result
}

function inputSpecificity(row: Row, inputIds: string[]): number {
  return inputIds.reduce((sum, id) => sum + specificity(row.cells[id] ?? 'x'), 0)
}

export type MergePair = {
  keepId: string
  dropId: string
  /** Generalized inputs (P) and modifiers (M). Outputs are unchanged. */
  mergedCells: Record<string, Condition>
}

/**
 * Pairwise merges inside one category when outputs (R) are equal.
 * Inputs and modifiers are not required to match.
 */
export function findMergePairs(project: Project): MergePair[] {
  const flexIds = columnIdsByRole(project.sections, ['inputs', 'middle'])
  const outputIds = columnIdsByRole(project.sections, ['outputs'])
  const pairs: MergePair[] = []

  for (let i = 0; i < project.rows.length; i++) {
    for (let j = i + 1; j < project.rows.length; j++) {
      const a = project.rows[i]!
      const b = project.rows[j]!
      if (a.category !== b.category) continue
      if (!cellsEqualOn(a, b, outputIds)) continue

      const specA = inputSpecificity(a, flexIds)
      const specB = inputSpecificity(b, flexIds)
      const keep = specA <= specB ? a : b
      const drop = keep.id === a.id ? b : a

      pairs.push({
        keepId: keep.id,
        dropId: drop.id,
        mergedCells: generalizeCells(a, b, flexIds),
      })
    }
  }
  return pairs
}

/** Rows in the same category that share outputs and can be collapsed. */
export function countMergeOpportunities(project: Project): number {
  return findMergePairs(project).length
}

function antecedentsOverlap(a: Row, b: Row, columnIds: string[]): boolean {
  return columnIds.every((id) =>
    conditionsOverlap(a.cells[id] ?? 'x', b.cells[id] ?? 'x'),
  )
}

export function findConflicts(project: Project): MergeConflict[] {
  // Antecedent = Inputs (P) + Modifiers (M). Don’t-care (x) means any option,
  // so a mostly-x row overlaps a more specific one. Conflict when P+M can match the
  // same case but R differs.
  const antecedentIds = columnIdsByRole(project.sections, ['inputs', 'middle'])
  const outputIds = columnIdsByRole(project.sections, ['outputs'])
  const conflicts: MergeConflict[] = []

  for (let i = 0; i < project.rows.length; i++) {
    for (let j = i + 1; j < project.rows.length; j++) {
      const a = project.rows[i]!
      const b = project.rows[j]!
      if (a.category !== b.category) continue
      if (!antecedentsOverlap(a, b, antecedentIds)) continue

      if (!cellsEqualOn(a, b, outputIds)) {
        conflicts.push({
          rowAId: a.id,
          rowBId: b.id,
          reason: 'Overlapping P+M coverage with different outputs',
        })
      }
    }
  }
  return conflicts
}

/** Apply one round of merges; returns new rows and whether anything changed. */
export function mergeRowsOnce(project: Project): { rows: Row[]; changed: boolean } {
  const pairs = findMergePairs(project)
  if (pairs.length === 0) {
    return { rows: project.rows, changed: false }
  }

  const dropIds = new Set<string>()
  const updates = new Map<string, Record<string, Condition>>()

  for (const pair of pairs) {
    if (dropIds.has(pair.keepId) || dropIds.has(pair.dropId)) continue
    dropIds.add(pair.dropId)
    const prev = updates.get(pair.keepId)
    updates.set(pair.keepId, prev ? mergeCellMaps(prev, pair.mergedCells) : pair.mergedCells)
  }

  const rows = project.rows
    .filter((r) => !dropIds.has(r.id))
    .map((r) => {
      const patch = updates.get(r.id)
      if (!patch) return r
      const cells = { ...r.cells }
      for (const [colId, value] of Object.entries(patch)) {
        cells[colId] = cloneCondition(value)
      }
      return { ...r, cells }
    })

  return { rows, changed: dropIds.size > 0 }
}

/** Collapse same-category rows that share outputs. Categories themselves stay put. */
export function simplifyMatrix(project: Project): Project {
  let rows = project.rows
  let guard = 0
  while (guard++ < 1000) {
    const merged = mergeRowsOnce({ ...project, rows })
    rows = merged.rows
    if (!merged.changed) break
  }
  return { ...project, rows, updatedAt: new Date().toISOString() }
}
