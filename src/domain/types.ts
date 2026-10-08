export type Atom = 'y' | 'n' | 'x'
export type Condition = Atom | Condition[]

export type SectionRole = 'inputs' | 'middle' | 'outputs'

/** Nested parameter schema: root = column; children[i] = dimension index i. */
export type ParamSchema = {
  label?: string
  description?: string
  /**
   * When false, this param (or nested slot) cannot be don’t-care (x).
   * Default / omitted = allowed.
   */
  allowDontCare?: boolean
  children?: ParamSchema[]
}

export type Column = {
  id: string
  name: string
  /** Documentation / tooltip tree for this param and nested indices */
  schema?: ParamSchema
}

export type Section = {
  id: string
  role: SectionRole
  name: string
  description?: string
  /** Matrix background tint (hex). Omit to use the role default. */
  tint?: string
  columns: Column[]
}

export type Row = {
  id: string
  category: string
  comment?: string
  cells: Record<string, Condition>
}

export type Project = {
  id: string
  name: string
  sections: Section[]
  rows: Row[]
  updatedAt: string
}

export type MergeConflict = {
  rowAId: string
  rowBId: string
  reason: string
}

export const ATOMS: Atom[] = ['y', 'n', 'x']

export function isAtom(value: unknown): value is Atom {
  return value === 'y' || value === 'n' || value === 'x'
}

export function cycleAtom(atom: Atom, allowDontCare = true): Atom {
  if (atom === 'y') return 'n'
  if (atom === 'n') return allowDontCare ? 'x' : 'y'
  return 'y'
}

export function defaultAtom(): Atom {
  return 'x'
}
