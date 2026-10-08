import type { Atom, Condition } from './types'
import { isAtom } from './types'

export function deepEqualCondition(a: Condition, b: Condition): boolean {
  if (isAtom(a) || isAtom(b)) {
    return a === b
  }
  if (!Array.isArray(a) || !Array.isArray(b) || a.length !== b.length) {
    return false
  }
  return a.every((item, i) => deepEqualCondition(item, b[i]!))
}

export function cloneCondition(c: Condition): Condition {
  if (isAtom(c)) return c
  return c.map(cloneCondition)
}

/** Count of non-x atoms; lower = more general when structure matches. */
export function specificity(c: Condition): number {
  if (isAtom(c)) return c === 'x' ? 0 : 1
  return c.reduce((sum, item) => sum + specificity(item), 0)
}

export function formatCondition(c: Condition): string {
  if (isAtom(c)) return c
  return `[${c.map(formatCondition).join(', ')}]`
}

export function parseCondition(raw: string): Condition | null {
  const trimmed = raw.trim()
  if (isAtom(trimmed)) return trimmed
  try {
    const parsed: unknown = JSON.parse(trimmed.replace(/y/g, '"y"').replace(/n/g, '"n"').replace(/x/g, '"x"'))
    if (validateCondition(parsed)) return parsed
  } catch {
    // fall through
  }
  return null
}

export function validateCondition(value: unknown): value is Condition {
  if (isAtom(value)) return true
  if (!Array.isArray(value) || value.length === 0) return false
  return value.every(validateCondition)
}

/**
 * Merge two conditions under don't-care rules.
 * Returns null if incompatible (y vs n, or shape mismatch).
 * A bare don’t-care (x) absorbs any nested shape — tilde means “any option”.
 */
export function mergeConditions(a: Condition, b: Condition): Condition | null {
  if (a === 'x') return 'x'
  if (b === 'x') return 'x'
  if (isAtom(a) && isAtom(b)) {
    return mergeAtoms(a, b)
  }
  if (isAtom(a) || isAtom(b)) {
    return null
  }
  if (a.length !== b.length) return null
  const merged: Condition[] = []
  for (let i = 0; i < a.length; i++) {
    const m = mergeConditions(a[i]!, b[i]!)
    if (m === null) return null
    merged.push(m)
  }
  return merged
}

function mergeAtoms(a: Atom, b: Atom): Atom | null {
  if (a === b) return a
  return null // y vs n (x handled above)
}

/**
 * True when two conditions can match the same concrete case.
 * Don’t-care (x) overlaps everything; y vs n does not.
 */
export function conditionsOverlap(a: Condition, b: Condition): boolean {
  if (a === 'x' || b === 'x') return true
  if (isAtom(a) && isAtom(b)) return a === b
  if (isAtom(a) || isAtom(b)) return false
  if (a.length !== b.length) return false
  return a.every((item, i) => conditionsOverlap(item, b[i]!))
}

/**
 * Consensus used when collapsing rows that share the same outputs.
 * Matching structure is kept; any disagreement (including y vs n) becomes don't-care.
 */
export function generalizeConditions(a: Condition, b: Condition): Condition {
  if (isAtom(a) && isAtom(b)) {
    return a === b ? a : 'x'
  }
  if (isAtom(a) || isAtom(b) || a.length !== b.length) {
    return 'x'
  }
  return a.map((item, i) => generalizeConditions(item, b[i]!))
}

/** True if `general` covers `specific` (general is equal or more don't-care). */
export function covers(general: Condition, specific: Condition): boolean {
  if (general === 'x') return true
  if (specific === 'x') return isAtom(general) ? general === 'x' : false
  const merged = mergeConditions(general, specific)
  if (merged === null) return false
  return deepEqualCondition(merged, general)
}
