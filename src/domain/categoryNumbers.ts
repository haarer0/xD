import type { Row } from './types'

/**
 * Category numbers:
 * - Single-row category → "1", "2", …
 * - Multi-row category → "1.1", "1.2", … / "2.1", "2.2", …
 * Category identity is the category string; major index follows first appearance.
 */
export function computeCategoryNumbers(rows: Row[]): Map<string, string> {
  const majorByCategory = new Map<string, number>()
  const countByCategory = new Map<string, number>()
  let nextMajor = 0

  for (const row of rows) {
    const key = row.category
    if (!majorByCategory.has(key)) {
      nextMajor += 1
      majorByCategory.set(key, nextMajor)
      countByCategory.set(key, 0)
    }
    countByCategory.set(key, (countByCategory.get(key) ?? 0) + 1)
  }

  const result = new Map<string, string>()
  const seenByCategory = new Map<string, number>()

  for (const row of rows) {
    const key = row.category
    const major = majorByCategory.get(key)!
    const total = countByCategory.get(key) ?? 1
    const seen = (seenByCategory.get(key) ?? 0) + 1
    seenByCategory.set(key, seen)

    if (total === 1) {
      result.set(row.id, String(major))
    } else {
      result.set(row.id, `${major}.${seen}`)
    }
  }

  return result
}

/**
 * Rowspan for Category column over consecutive rows with the same category.
 * `0` means this row should not render its own category cell (covered by a prior rowspan).
 */
export function computeCategoryRowSpans(rows: Row[]): Map<string, number> {
  const spans = new Map<string, number>()
  let i = 0
  while (i < rows.length) {
    const cat = rows[i]!.category
    let j = i + 1
    while (j < rows.length && rows[j]!.category === cat) j += 1
    const span = j - i
    spans.set(rows[i]!.id, span)
    for (let k = i + 1; k < j; k++) spans.set(rows[k]!.id, 0)
    i = j
  }
  return spans
}

/** Row ids in the consecutive category block that contains `rowId`. */
export function categoryGroupIds(rows: Row[], rowId: string): string[] {
  const idx = rows.findIndex((r) => r.id === rowId)
  if (idx < 0) return []
  const cat = rows[idx]!.category
  let start = idx
  while (start > 0 && rows[start - 1]!.category === cat) start -= 1
  let end = idx
  while (end + 1 < rows.length && rows[end + 1]!.category === cat) end += 1
  return rows.slice(start, end + 1).map((r) => r.id)
}

/** Inclusive [start, end] of the consecutive category block containing `rowId`. */
export function categoryGroupBounds(
  rows: Row[],
  rowId: string,
): { start: number; end: number } | null {
  const idx = rows.findIndex((r) => r.id === rowId)
  if (idx < 0) return null
  const cat = rows[idx]!.category
  let start = idx
  while (start > 0 && rows[start - 1]!.category === cat) start -= 1
  let end = idx
  while (end + 1 < rows.length && rows[end + 1]!.category === cat) end += 1
  return { start, end }
}

/**
 * Move a category block (all consecutive nested rows) up/down past the
 * neighbouring category block. Returns null if the move is not possible.
 */
export function moveCategoryGroup(
  rows: Row[],
  rowId: string,
  direction: -1 | 1,
): Row[] | null {
  const bounds = categoryGroupBounds(rows, rowId)
  if (!bounds) return null
  const { start, end } = bounds
  const group = rows.slice(start, end + 1)

  if (direction === -1) {
    if (start === 0) return null
    let prevStart = start - 1
    const prevCat = rows[prevStart]!.category
    while (prevStart > 0 && rows[prevStart - 1]!.category === prevCat) prevStart -= 1
    return [
      ...rows.slice(0, prevStart),
      ...group,
      ...rows.slice(prevStart, start),
      ...rows.slice(end + 1),
    ]
  }

  if (end >= rows.length - 1) return null
  let nextEnd = end + 1
  const nextCat = rows[nextEnd]!.category
  while (nextEnd + 1 < rows.length && rows[nextEnd + 1]!.category === nextCat) {
    nextEnd += 1
  }
  return [
    ...rows.slice(0, start),
    ...rows.slice(end + 1, nextEnd + 1),
    ...group,
    ...rows.slice(nextEnd + 1),
  ]
}

/**
 * Reorder a row: swap with the neighbouring subcategory when it shares the
 * same category; otherwise move the whole category block past the neighbour.
 */
export function moveRow(rows: Row[], rowId: string, direction: -1 | 1): Row[] | null {
  const idx = rows.findIndex((r) => r.id === rowId)
  if (idx < 0) return null
  const neighbor = idx + direction
  if (
    neighbor >= 0 &&
    neighbor < rows.length &&
    rows[neighbor]!.category === rows[idx]!.category
  ) {
    const next = [...rows]
    const tmp = next[idx]!
    next[idx] = next[neighbor]!
    next[neighbor] = tmp
    return next
  }
  return moveCategoryGroup(rows, rowId, direction)
}

/** True when Move up/down can do something (sub-row swap or category move). */
export function canMoveRow(rows: Row[], rowId: string, direction: -1 | 1): boolean {
  return moveRow(rows, rowId, direction) !== null
}

/**
 * Drag-and-drop relocate: insert before `insertBefore` (0…rows.length).
 * - Drop inside the same category block → reorder that subcategory row.
 * - Drop outside the block → move the whole category group to that edge.
 */
export function relocateRow(
  rows: Row[],
  rowId: string,
  insertBefore: number,
): Row[] | null {
  const from = rows.findIndex((r) => r.id === rowId)
  if (from < 0) return null
  const bounds = categoryGroupBounds(rows, rowId)
  if (!bounds) return null

  const insert = Math.max(0, Math.min(insertBefore, rows.length))
  const inBlock = insert >= bounds.start && insert <= bounds.end + 1

  if (inBlock) {
    if (insert === from || insert === from + 1) return null
    const next = [...rows]
    const [item] = next.splice(from, 1)
    const dest = insert > from ? insert - 1 : insert
    next.splice(dest, 0, item!)
    return next
  }

  const group = rows.slice(bounds.start, bounds.end + 1)
  const without = [...rows.slice(0, bounds.start), ...rows.slice(bounds.end + 1)]
  const dest = insert < bounds.start ? insert : insert - group.length
  if (dest === bounds.start) return null
  return [...without.slice(0, dest), ...group, ...without.slice(dest)]
}
