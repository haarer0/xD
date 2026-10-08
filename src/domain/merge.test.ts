import { describe, expect, it } from 'vitest'
import { conditionsOverlap, mergeConditions } from './condition'
import { createDemoProject, createEmptyProject, createRow } from './factory'
import {
  countMergeableRows,
  countMergeOpportunities,
  findConflicts,
  findMergePairs,
  simplifyMatrix,
} from './merge'

describe('mergeConditions', () => {
  it('merges nested y with x into x', () => {
    const a: ['y', 'y', ['y', 'y']] = ['y', 'y', ['y', 'y']]
    const b: ['y', 'y', ['y', 'x']] = ['y', 'y', ['y', 'x']]
    expect(mergeConditions(a, b)).toEqual(['y', 'y', ['y', 'x']])
  })

  it('rejects y vs n', () => {
    expect(mergeConditions('y', 'n')).toBeNull()
    expect(mergeConditions(['y', 'y', ['n', 'y']], ['y', 'y', ['y', 'x']])).toBeNull()
  })

  it('lets bare don’t-care absorb a nested shape', () => {
    expect(mergeConditions('x', ['y', ['n', 'y']])).toBe('x')
    expect(mergeConditions(['y', 'n'], 'x')).toBe('x')
  })
})

describe('conditionsOverlap', () => {
  it('treats don’t-care as overlapping any option', () => {
    expect(conditionsOverlap('x', 'y')).toBe(true)
    expect(conditionsOverlap('x', ['y', 'n'])).toBe(true)
    expect(conditionsOverlap('y', 'n')).toBe(false)
    expect(conditionsOverlap(['y', 'x'], ['y', 'n'])).toBe(true)
    expect(conditionsOverlap(['y', 'n'], ['n', 'y'])).toBe(false)
  })
})

describe('simplifyMatrix nested example', () => {
  it('collapses rows that share outputs even when nested inputs disagree', () => {
    const project = createDemoProject()
    const p3 = project.sections[0]!.columns[2]!.id

    const simplified = simplifyMatrix(project)
    expect(simplified.rows).toHaveLength(1)
    expect(simplified.rows[0]!.cells[p3]).toEqual(['y', 'y', ['x', 'x']])
    expect(new Set(simplified.rows.map((r) => r.category)).size).toBe(1)
  })

  it('merges duplicate dont-care rows on flat inputs', () => {
    const project = createEmptyProject()
    const [p1, p2, p3] = project.sections[0]!.columns
    const c1 = project.sections[1]!.columns[0]!
    const r1 = project.sections[2]!.columns[0]!

    project.rows = [
      createRow('Cat', {
        [p1!.id]: 'y',
        [p2!.id]: 'y',
        [p3!.id]: 'x',
        [c1.id]: 'y',
        [r1.id]: 'y',
      }),
      createRow('Cat', {
        [p1!.id]: 'y',
        [p2!.id]: 'y',
        [p3!.id]: 'n',
        [c1.id]: 'y',
        [r1.id]: 'y',
      }),
    ]

    const pairs = findMergePairs(project)
    expect(pairs.length).toBeGreaterThan(0)

    const simplified = simplifyMatrix(project)
    expect(simplified.rows).toHaveLength(1)
    expect(simplified.rows[0]!.cells[p3!.id]).toBe('x')
  })

  it('allows same P with different C and different R (no conflict, no merge)', () => {
    const project = createEmptyProject()
    const [p1, p2, p3] = project.sections[0]!.columns
    const c1 = project.sections[1]!.columns[0]!
    const r1 = project.sections[2]!.columns[0]!

    project.rows = [
      createRow('Cat', {
        [p1!.id]: 'y',
        [p2!.id]: 'y',
        [p3!.id]: 'y',
        [c1.id]: 'y',
        [r1.id]: 'y',
      }),
      createRow('Cat', {
        [p1!.id]: 'y',
        [p2!.id]: 'y',
        [p3!.id]: 'y',
        [c1.id]: 'n',
        [r1.id]: 'n',
      }),
    ]

    expect(findConflicts(project)).toHaveLength(0)
    expect(findMergePairs(project)).toHaveLength(0)
    expect(simplifyMatrix(project).rows).toHaveLength(2)
  })

  it('merges same outputs when M differs (P/M do not block)', () => {
    const project = createEmptyProject()
    const [p1, p2, p3] = project.sections[0]!.columns
    const c1 = project.sections[1]!.columns[0]!
    const r1 = project.sections[2]!.columns[0]!

    project.rows = [
      createRow('Cat', {
        [p1!.id]: 'y',
        [p2!.id]: 'y',
        [p3!.id]: 'y',
        [c1.id]: 'y',
        [r1.id]: 'y',
      }),
      createRow('Cat', {
        [p1!.id]: 'y',
        [p2!.id]: 'y',
        [p3!.id]: 'y',
        [c1.id]: 'n',
        [r1.id]: 'y',
      }),
    ]

    expect(findConflicts(project)).toHaveLength(0)
    expect(findMergePairs(project)).toHaveLength(1)
    const simplified = simplifyMatrix(project)
    expect(simplified.rows).toHaveLength(1)
    expect(simplified.rows[0]!.cells[c1.id]).toBe('x')
    expect(simplified.rows[0]!.cells[r1.id]).toBe('y')
  })

  it('flags conflict when P and M overlap but R differs', () => {
    const project = createEmptyProject()
    const [p1, p2, p3] = project.sections[0]!.columns
    const c1 = project.sections[1]!.columns[0]!
    const r1 = project.sections[2]!.columns[0]!

    project.rows = [
      createRow('Cat', {
        [p1!.id]: 'y',
        [p2!.id]: 'y',
        [p3!.id]: 'x',
        [c1.id]: 'y',
        [r1.id]: 'y',
      }),
      createRow('Cat', {
        [p1!.id]: 'y',
        [p2!.id]: 'y',
        [p3!.id]: 'n',
        [c1.id]: 'y',
        [r1.id]: 'n',
      }),
    ]

    expect(findConflicts(project).length).toBeGreaterThan(0)
  })

  it('flags conflict when a mostly don’t-care row overlaps a specific row with different R', () => {
    const project = createEmptyProject()
    const [p1, p2, p3] = project.sections[0]!.columns
    const c1 = project.sections[1]!.columns[0]!
    const r1 = project.sections[2]!.columns[0]!

    project.rows = [
      createRow('DD', {
        [p1!.id]: 'y',
        [p2!.id]: 'x',
        [p3!.id]: 'y',
        [c1.id]: 'y',
        [r1.id]: [['y', 'n'], 'y'],
      }),
      createRow('DD', {
        [p1!.id]: 'x',
        [p2!.id]: 'y',
        [p3!.id]: 'x',
        [c1.id]: 'x',
        [r1.id]: 'x',
      }),
    ]

    // Neither row covers the other, but (y,y,y,y) matches both antecedents.
    expect(findConflicts(project)).toHaveLength(1)
  })

  it('flags conflict when bare don’t-care overlaps a nested antecedent with different R', () => {
    const project = createEmptyProject()
    const [p1, p2, p3] = project.sections[0]!.columns
    const c1 = project.sections[1]!.columns[0]!
    const r1 = project.sections[2]!.columns[0]!

    project.rows = [
      createRow('DD', {
        [p1!.id]: 'y',
        [p2!.id]: 'y',
        [p3!.id]: ['y', 'n'],
        [c1.id]: 'x',
        [r1.id]: 'y',
      }),
      createRow('DD', {
        [p1!.id]: 'y',
        [p2!.id]: 'y',
        [p3!.id]: 'x',
        [c1.id]: 'x',
        [r1.id]: 'n',
      }),
    ]

    expect(findConflicts(project)).toHaveLength(1)
  })

  it('merges rows inside a category and does not combine categories', () => {
    const project = createEmptyProject()
    const [p1, p2, p3] = project.sections[0]!.columns
    const c1 = project.sections[1]!.columns[0]!
    const r1 = project.sections[2]!.columns[0]!

    const cellsY = {
      [p1!.id]: 'y' as const,
      [p2!.id]: 'y' as const,
      [p3!.id]: 'y' as const,
      [c1.id]: 'y' as const,
      [r1.id]: 'y' as const,
    }
    const cellsN = {
      [p1!.id]: 'n' as const,
      [p2!.id]: 'y' as const,
      [p3!.id]: 'y' as const,
      [c1.id]: 'y' as const,
      [r1.id]: 'y' as const,
    }

    project.rows = [
      createRow('Alpha', cellsY),
      createRow('Alpha', cellsN),
      createRow('Beta', cellsY),
      createRow('Beta', cellsN),
    ]

    expect(findMergePairs(project)).toHaveLength(2)
    // Four rows, each pairable within its category → 4 distinct mergeable rows
    expect(countMergeOpportunities(project)).toBe(4)

    const simplified = simplifyMatrix(project)
    expect(simplified.rows).toHaveLength(2)
    expect(simplified.rows.map((r) => r.category)).toEqual(['Alpha', 'Beta'])
    expect(simplified.rows.every((r) => r.cells[p1!.id] === 'x')).toBe(true)
  })

  it('merges duplicate subcategory rows such as 2.3 and 2.4 without absorbing another category', () => {
    const project = createEmptyProject()
    const [p1, p2, p3] = project.sections[0]!.columns
    const c1 = project.sections[1]!.columns[0]!
    const r1 = project.sections[2]!.columns[0]!

    const blank = {
      [p1!.id]: 'x' as const,
      [p2!.id]: 'x' as const,
      [p3!.id]: 'x' as const,
      [c1.id]: 'x' as const,
      [r1.id]: 'x' as const,
    }

    project.rows = [
      createRow('Docas', { ...blank, [r1.id]: 'y' }),
      createRow('DD', { ...blank, [p1!.id]: 'y', [r1.id]: 'n' }),
      createRow('DD', { ...blank, [p1!.id]: 'n', [r1.id]: 'y' }),
      createRow('DD', blank),
      createRow('DD', blank),
    ]

    const simplified = simplifyMatrix(project)
    expect(simplified.rows.map((r) => r.category)).toEqual(['Docas', 'DD', 'DD', 'DD'])
    expect(simplified.rows.filter((r) => r.category === 'DD' && r.cells[r1.id] === 'x')).toHaveLength(1)
  })

  it('counts distinct mergeable rows, not pairwise opportunities', () => {
    const project = createEmptyProject()
    const [p1, p2, p3] = project.sections[0]!.columns
    const c1 = project.sections[1]!.columns[0]!
    const r1 = project.sections[2]!.columns[0]!
    const blank = {
      [p1!.id]: 'x' as const,
      [p2!.id]: 'x' as const,
      [p3!.id]: 'x' as const,
      [c1.id]: 'x' as const,
      [r1.id]: 'x' as const,
    }
    project.rows = Array.from({ length: 7 }, () => createRow('New category', blank))
    expect(findMergePairs(project)).toHaveLength(21)
    expect(countMergeableRows(project)).toBe(7)
  })

  it('combines several same-output rows into one don’t-care consensus', () => {
    const project = createEmptyProject()
    const [p1, p2, p3] = project.sections[0]!.columns
    const c1 = project.sections[1]!.columns[0]!
    const r1 = project.sections[2]!.columns[0]!

    const base = {
      [p2!.id]: 'y' as const,
      [p3!.id]: 'x' as const,
      [c1.id]: 'x' as const,
      [r1.id]: 'y' as const,
    }
    project.rows = [
      createRow('DD', { ...base, [p1!.id]: 'y' }),
      createRow('DD', { ...base, [p1!.id]: 'n' }),
      createRow('DD', { ...base, [p1!.id]: 'x' }),
    ]

    const simplified = simplifyMatrix(project)
    expect(simplified.rows).toHaveLength(1)
    expect(simplified.rows[0]!.category).toBe('DD')
    expect(simplified.rows[0]!.cells[p1!.id]).toBe('x')
    expect(simplified.rows[0]!.cells[p2!.id]).toBe('y')
  })
})
