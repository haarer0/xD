import type { Project } from '../domain/types'
import { formatCondition } from '../domain/condition'
import { expandedColumnLeaves } from '../domain/flatten'
import { expandedLeafLabel } from '../domain/schema'
import { computeCategoryNumbers } from '../domain/categoryNumbers'
import { isAtom } from '../domain/types'

function escapeCsv(value: string): string {
  if (/[",\n\r]/.test(value)) {
    return `"${value.replace(/"/g, '""')}"`
  }
  return value
}

type Header = { key: string; label: string; kind: 'meta' | 'leaf'; columnId?: string; indices?: number[] }

function buildHeaders(project: Project, expandArrays: boolean): Header[] {
  const headers: Header[] = [
    { key: 'catnum', label: '#', kind: 'meta' },
    { key: 'category', label: 'Category', kind: 'meta' },
  ]

  for (const section of project.sections) {
    for (const col of section.columns) {
      if (!expandArrays) {
        headers.push({
          key: col.id,
          label: `${section.name}.${col.name}`,
          kind: 'leaf',
          columnId: col.id,
        })
        continue
      }

      const values = project.rows.map((r) => r.cells[col.id] ?? 'x')
      const leaves = expandedColumnLeaves(values, col.schema)
      if (leaves.length === 0) {
        headers.push({
          key: col.id,
          label: `${section.name}.${col.name}`,
          kind: 'leaf',
          columnId: col.id,
        })
      } else {
        for (const leaf of leaves) {
          headers.push({
            key: `${col.id}${leaf.suffix}`,
            label: `${section.name}.${expandedLeafLabel(col.name, col.schema, leaf.indices)}`,
            kind: 'leaf',
            columnId: col.id,
            indices: leaf.indices,
          })
        }
      }
    }
  }

  headers.push({ key: 'comment', label: 'Comment', kind: 'meta' })
  return headers
}

function cellValue(
  project: Project,
  rowIndex: number,
  header: Header,
  categoryNumbers?: Map<string, string>,
): string {
  const row = project.rows[rowIndex]!
  if (header.key === 'catnum') {
    return categoryNumbers?.get(row.id) ?? ''
  }
  if (header.key === 'category') {
    // Match merged UI: only first row of a consecutive category block shows the name
    if (
      rowIndex > 0 &&
      project.rows[rowIndex - 1]!.category === row.category
    ) {
      return ''
    }
    return row.category
  }
  if (header.key === 'comment') return row.comment ?? ''
  if (!header.columnId) return ''

  const value = row.cells[header.columnId] ?? 'x'
  if (!header.indices || header.indices.length === 0) {
    return formatCondition(value)
  }

  let current = value
  for (const i of header.indices) {
    if (isAtom(current) || i >= current.length) return 'x'
    current = current[i]!
  }
  return formatCondition(current)
}

export function projectToCsv(project: Project, expandArrays = true): string {
  const headers = buildHeaders(project, expandArrays)
  const categoryNumbers = computeCategoryNumbers(project.rows)
  const lines = [headers.map((h) => escapeCsv(h.label)).join(',')]
  for (let i = 0; i < project.rows.length; i++) {
    lines.push(
      headers.map((h) => escapeCsv(cellValue(project, i, h, categoryNumbers))).join(','),
    )
  }
  return lines.join('\n')
}

export { buildHeaders, cellValue }
export type { Header }
