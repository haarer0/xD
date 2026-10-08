import * as XLSX from 'xlsx'
import type { Project } from '../domain/types'
import { computeCategoryNumbers } from '../domain/categoryNumbers'
import { buildHeaders, cellValue } from './csv'

const SECTION_COLORS: Record<string, string> = {
  inputs: 'FFD6EAF8',
  middle: 'FFE8F5E9',
  outputs: 'FFFFF3E0',
  meta: 'FFF5F5F5',
}

export function projectToWorkbook(project: Project, expandArrays = true): XLSX.WorkBook {
  const headers = buildHeaders(project, expandArrays)
  const categoryNumbers = computeCategoryNumbers(project.rows)
  const aoa: string[][] = [headers.map((h) => h.label)]
  for (let i = 0; i < project.rows.length; i++) {
    aoa.push(headers.map((h) => cellValue(project, i, h, categoryNumbers)))
  }

  const sheet = XLSX.utils.aoa_to_sheet(aoa)
  sheet['!freeze'] = { xSplit: 1, ySplit: 1 }
  sheet['!cols'] = headers.map((h) => ({
    wch: Math.min(40, Math.max(10, h.label.length + 2)),
  }))

  // Style header cells when possible (SheetJS community has limited styles;
  // cell metadata still helps Excel online / compatible readers via fills when supported)
  for (let c = 0; c < headers.length; c++) {
    const addr = XLSX.utils.encode_cell({ r: 0, c })
    const cell = sheet[addr]
    if (!cell) continue
    const header = headers[c]!
    let role = 'meta'
    if (header.columnId) {
      const section = project.sections.find((s) =>
        s.columns.some((col) => col.id === header.columnId),
      )
      role = section?.role ?? 'meta'
    }
    cell.s = {
      font: { bold: true },
      fill: { patternType: 'solid', fgColor: { rgb: SECTION_COLORS[role] ?? SECTION_COLORS.meta } },
      alignment: { wrapText: true, vertical: 'center' },
    }
  }

  // Comment column wrap on body
  const commentIdx = headers.findIndex((h) => h.key === 'comment')
  if (commentIdx >= 0) {
    for (let r = 1; r <= project.rows.length; r++) {
      const addr = XLSX.utils.encode_cell({ r, c: commentIdx })
      const cell = sheet[addr]
      if (cell) {
        cell.s = { ...(cell.s ?? {}), alignment: { wrapText: true } }
      }
    }
  }

  const wb = XLSX.utils.book_new()
  XLSX.utils.book_append_sheet(wb, sheet, 'xD Matrix')

  // Legend / sections sheet
  const legend = XLSX.utils.aoa_to_sheet([
    ['Section', 'Role', 'Columns'],
    ...project.sections.map((s) => [
      s.name,
      s.role,
      s.columns.map((c) => c.name).join(', '),
    ]),
    [],
    ['Atoms', 'y = yes', 'n = no', 'x = does not matter'],
    ['Project', project.name, project.updatedAt],
  ])
  XLSX.utils.book_append_sheet(wb, legend, 'Legend')

  return wb
}

export function downloadXlsx(project: Project, expandArrays = true, filename?: string) {
  const wb = projectToWorkbook(project, expandArrays)
  XLSX.writeFile(wb, filename ?? `${sanitizeFilename(project.name)}.xlsx`)
}

function sanitizeFilename(name: string): string {
  return name.replace(/[^\w\-]+/g, '_').slice(0, 64) || 'xd-export'
}
