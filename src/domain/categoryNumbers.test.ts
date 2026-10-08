import { describe, expect, it } from 'vitest'
import {
  canMoveRow,
  categoryGroupIds,
  computeCategoryNumbers,
  computeCategoryRowSpans,
  moveCategoryGroup,
  moveRow,
  relocateRow,
} from './categoryNumbers'
import { createRow } from './factory'

describe('computeCategoryNumbers', () => {
  it('uses bare majors for single-row categories and N.M for multi-row', () => {
    const rows = [
      createRow('Alpha', {}),
      createRow('Alpha', {}),
      createRow('Beta', {}),
      createRow('Beta', {}),
      createRow('Alpha', {}),
    ]
    const nums = computeCategoryNumbers(rows)
    expect(nums.get(rows[0]!.id)).toBe('1.1')
    expect(nums.get(rows[1]!.id)).toBe('1.2')
    expect(nums.get(rows[2]!.id)).toBe('2.1')
    expect(nums.get(rows[3]!.id)).toBe('2.2')
    expect(nums.get(rows[4]!.id)).toBe('1.3')
  })

  it('uses bare number when a category has only one row', () => {
    const rows = [createRow('Solo', {}), createRow('Pair', {}), createRow('Pair', {})]
    const nums = computeCategoryNumbers(rows)
    expect(nums.get(rows[0]!.id)).toBe('1')
    expect(nums.get(rows[1]!.id)).toBe('2.1')
    expect(nums.get(rows[2]!.id)).toBe('2.2')
  })
})

describe('computeCategoryRowSpans', () => {
  it('merges consecutive same-category rows', () => {
    const rows = [
      createRow('Alpha', {}),
      createRow('Alpha', {}),
      createRow('Beta', {}),
      createRow('Alpha', {}),
    ]
    const spans = computeCategoryRowSpans(rows)
    expect(spans.get(rows[0]!.id)).toBe(2)
    expect(spans.get(rows[1]!.id)).toBe(0)
    expect(spans.get(rows[2]!.id)).toBe(1)
    expect(spans.get(rows[3]!.id)).toBe(1)
  })
})

describe('categoryGroupIds', () => {
  it('returns the consecutive block for a row', () => {
    const rows = [
      createRow('Alpha', {}),
      createRow('Alpha', {}),
      createRow('Beta', {}),
    ]
    expect(categoryGroupIds(rows, rows[1]!.id)).toEqual([rows[0]!.id, rows[1]!.id])
  })
})

describe('moveCategoryGroup', () => {
  it('moves the whole consecutive block past the neighbour', () => {
    const a1 = createRow('Alpha', {})
    const a2 = createRow('Alpha', {})
    const b1 = createRow('Beta', {})
    const c1 = createRow('Gamma', {})
    const rows = [a1, a2, b1, c1]

    const down = moveCategoryGroup(rows, a2.id, 1)
    expect(down?.map((r) => r.id)).toEqual([b1.id, a1.id, a2.id, c1.id])

    const up = moveCategoryGroup(rows, b1.id, -1)
    expect(up?.map((r) => r.id)).toEqual([b1.id, a1.id, a2.id, c1.id])
  })

  it('returns null at the edges', () => {
    const a = createRow('Alpha', {})
    const b = createRow('Beta', {})
    const rows = [a, b]
    expect(moveCategoryGroup(rows, a.id, -1)).toBeNull()
    expect(moveCategoryGroup(rows, b.id, 1)).toBeNull()
  })
})

describe('moveRow', () => {
  it('swaps subcategory rows inside the same category', () => {
    const a1 = createRow('Alpha', {})
    const a2 = createRow('Alpha', {})
    const a3 = createRow('Alpha', {})
    const b1 = createRow('Beta', {})
    const rows = [a1, a2, a3, b1]

    const up = moveRow(rows, a3.id, -1)
    expect(up?.map((r) => r.id)).toEqual([a1.id, a3.id, a2.id, b1.id])
    expect(canMoveRow(rows, a2.id, -1)).toBe(true)
    expect(canMoveRow(rows, a1.id, -1)).toBe(false)
  })

  it('moves the whole category when the row is at the block edge', () => {
    const a1 = createRow('Alpha', {})
    const a2 = createRow('Alpha', {})
    const b1 = createRow('Beta', {})
    const rows = [a1, a2, b1]

    const down = moveRow(rows, a2.id, 1)
    expect(down?.map((r) => r.id)).toEqual([b1.id, a1.id, a2.id])
  })
})

describe('relocateRow', () => {
  it('reorders a subcategory inside its category', () => {
    const a1 = createRow('Alpha', {})
    const a2 = createRow('Alpha', {})
    const a3 = createRow('Alpha', {})
    const b1 = createRow('Beta', {})
    const rows = [a1, a2, a3, b1]

    expect(relocateRow(rows, a3.id, 1)?.map((r) => r.id)).toEqual([
      a1.id,
      a3.id,
      a2.id,
      b1.id,
    ])
  })

  it('moves a whole category block when dropped outside it', () => {
    const a1 = createRow('Alpha', {})
    const a2 = createRow('Alpha', {})
    const b1 = createRow('Beta', {})
    const c1 = createRow('Gamma', {})
    const rows = [a1, a2, b1, c1]

    expect(relocateRow(rows, a1.id, 4)?.map((r) => r.id)).toEqual([
      b1.id,
      c1.id,
      a1.id,
      a2.id,
    ])
  })
})
