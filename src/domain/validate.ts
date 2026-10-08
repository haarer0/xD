import type { Condition, Project } from './types'
import { isAtom } from './types'

export function validateProject(project: Project): string[] {
  const errors: string[] = []
  if (!project.name.trim()) errors.push('Project name is empty')

  const roles = project.sections.map((s) => s.role)
  if (!roles.includes('inputs')) errors.push('Missing Inputs section')
  if (!roles.includes('outputs')) errors.push('Missing Outputs section')

  const columnIds = new Set<string>()
  for (const section of project.sections) {
    if (!section.name.trim()) errors.push(`Section ${section.id} has empty name`)
    for (const col of section.columns) {
      if (columnIds.has(col.id)) errors.push(`Duplicate column id ${col.id}`)
      columnIds.add(col.id)
      if (!col.name.trim()) errors.push(`Column ${col.id} has empty name`)
    }
  }

  for (const row of project.rows) {
    for (const [colId, value] of Object.entries(row.cells)) {
      if (!columnIds.has(colId)) {
        errors.push(`Row ${row.id} references unknown column ${colId}`)
      }
      if (!isValidCondition(value)) {
        errors.push(`Row ${row.id} column ${colId} has invalid condition`)
      }
    }
  }

  return errors
}

function isValidCondition(value: Condition): boolean {
  if (isAtom(value)) return true
  if (!Array.isArray(value) || value.length === 0) return false
  return value.every(isValidCondition)
}
