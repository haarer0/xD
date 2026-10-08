import type { Atom, Condition, Project, Row, Section } from './types'
import { isAtom } from './types'
import { flattenCondition } from './flatten'
import { deepEqualCondition } from './condition'

function columnLabel(
  sections: Section[],
  columnId: string,
): { label: string; section: Section } | null {
  let inputOrdinal = 0
  let outputOrdinal = 0
  let middleColumnOrdinal = 0

  for (const section of sections) {
    for (const col of section.columns) {
      if (section.role === 'inputs') {
        inputOrdinal += 1
        if (col.id === columnId) return { label: `P${inputOrdinal}`, section }
      } else if (section.role === 'outputs') {
        outputOrdinal += 1
        if (col.id === columnId) return { label: `R${outputOrdinal}`, section }
      } else {
        middleColumnOrdinal += 1
        if (col.id === columnId) return { label: `M${middleColumnOrdinal}`, section }
      }
    }
  }
  return null
}

function atomTerm(label: string, atom: Atom): string | null {
  if (atom === 'x') return null
  if (atom === 'y') return label
  return `!${label}`
}

/** Build AND-ed terms for a condition tree under a column label. */
export function conditionToTerms(label: string, value: Condition): string[] {
  if (isAtom(value)) {
    const t = atomTerm(label, value)
    return t ? [t] : []
  }

  // For arrays: OR siblings at the same level when they are alternative branches?
  // Plan: P3[1] || P4[1][0] — indexing into arrays; AND across columns.
  // Within one nested array, each leaf is AND-ed if y/n (structured product of leaves).
  const leaves = flattenCondition(label, value)
  const terms: string[] = []
  for (const leaf of leaves) {
    if (!isAtom(leaf.value)) continue
    const t = atomTerm(leaf.path, leaf.value)
    if (t) terms.push(t)
  }
  return terms
}

function andJoin(terms: string[]): string {
  if (terms.length === 0) return 'true'
  if (terms.length === 1) return terms[0]!
  return terms.join(' & ')
}

function orJoin(terms: string[]): string {
  if (terms.length === 0) return 'false'
  if (terms.length === 1) return terms[0]!
  return terms.map((t) => (t.includes('&') ? `(${t})` : t)).join(' || ')
}

function rowAntecedent(project: Project, row: Row): string {
  const terms: string[] = []
  for (const section of project.sections) {
    if (section.role === 'outputs') continue
    for (const col of section.columns) {
      const meta = columnLabel(project.sections, col.id)
      if (!meta) continue
      const value = row.cells[col.id] ?? 'x'
      terms.push(...conditionToTerms(meta.label, value))
    }
  }
  return andJoin(terms)
}

function rowConsequent(project: Project, row: Row): string {
  const terms: string[] = []
  for (const section of project.sections) {
    if (section.role !== 'outputs') continue
    for (const col of section.columns) {
      const meta = columnLabel(project.sections, col.id)
      if (!meta) continue
      const value = row.cells[col.id] ?? 'x'
      terms.push(...conditionToTerms(meta.label, value))
    }
  }
  return andJoin(terms)
}

function outputSignature(project: Project, row: Row): string {
  const parts: string[] = []
  for (const section of project.sections) {
    if (section.role !== 'outputs') continue
    for (const col of section.columns) {
      parts.push(JSON.stringify(row.cells[col.id] ?? 'x'))
    }
  }
  return parts.join('|')
}

/**
 * Generate logical scheme lines.
 * Rows with identical outputs are OR-ed on the left-hand side.
 */
export function generateLogicScheme(project: Project): string {
  if (project.rows.length === 0) return '// no rows'

  const groups = new Map<string, { consequent: string; antecedents: string[]; categories: string[] }>()

  for (const row of project.rows) {
    const sig = outputSignature(project, row)
    const consequent = rowConsequent(project, row)
    const antecedent = rowAntecedent(project, row)
    const existing = groups.get(sig)
    if (existing) {
      existing.antecedents.push(antecedent)
      existing.categories.push(row.category)
    } else {
      groups.set(sig, {
        consequent,
        antecedents: [antecedent],
        categories: [row.category],
      })
    }
  }

  const lines: string[] = []
  for (const group of groups.values()) {
    const left = orJoin(group.antecedents)
    const cats = [...new Set(group.categories)].join(', ')
    lines.push(`// ${cats}`)
    lines.push(`${left} => ${group.consequent}`)
  }
  return lines.join('\n')
}

export function rowsHaveSameOutputs(project: Project, a: Row, b: Row): boolean {
  for (const section of project.sections) {
    if (section.role !== 'outputs') continue
    for (const col of section.columns) {
      if (!deepEqualCondition(a.cells[col.id] ?? 'x', b.cells[col.id] ?? 'x')) {
        return false
      }
    }
  }
  return true
}
