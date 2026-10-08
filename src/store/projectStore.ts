import { create } from 'zustand'
import { temporal } from 'zundo'
import type { Condition, ParamSchema, Project, Row, Section } from '../domain/types'
import {
  createColumn,
  createDemoProject,
  createEmptyProject,
  createRow,
  createSection,
  schemaAfterRename,
} from '../domain/factory'
import { categoryGroupIds, moveRow, relocateRow } from '../domain/categoryNumbers'
import {
  countMergeOpportunities,
  findConflicts,
  simplifyMatrix,
} from '../domain/merge'
import { defaultCellValue } from '../domain/schema'
import { defaultAtom } from '../domain/types'
import {
  loadColumnWidths,
  loadLibrary,
  saveColumnWidths,
  saveLibrary,
  upsertProject,
} from '../persist/local'

export type ViewMode = '2d' | '3d'

type ProjectState = {
  project: Project
  /** All projects in the local library (including the active one). */
  projects: Project[]
  viewMode: ViewMode
  expandArrays: boolean
  selectedRowId: string | null
  columnWidths: Record<string, number>

  setProject: (project: Project) => void
  setName: (name: string) => void
  renameProject: (name: string) => void
  switchProject: (projectId: string) => void
  addProject: (name?: string) => void
  removeProject: (projectId: string) => void
  setViewMode: (mode: ViewMode) => void
  setExpandArrays: (expand: boolean) => void
  setSelectedRowId: (id: string | null) => void
  setColumnWidth: (key: string, width: number) => void
  resetColumnWidth: (key: string) => void

  addColumn: (sectionId: string, name?: string) => void
  renameColumn: (sectionId: string, columnId: string, name: string) => void
  updateColumnSchema: (sectionId: string, columnId: string, schema: ParamSchema) => void
  moveColumn: (sectionId: string, columnId: string, direction: -1 | 1) => void
  removeColumn: (sectionId: string, columnId: string) => void
  addMiddleSection: (name: string) => void
  renameSection: (sectionId: string, name: string) => void
  updateSectionDescription: (sectionId: string, description: string) => void
  updateSectionTint: (sectionId: string, tint: string | undefined) => void
  removeMiddleSection: (sectionId: string) => void

  addRow: (category?: string) => void
  /** Insert a new category row at index (0 = before first). */
  insertRowAt: (index: number, category?: string) => void
  addRowForCategory: (sourceRowId: string) => void
  /** Move a subcategory within its category, or the whole category at the block edge. */
  moveCategoryGroupBy: (rowId: string, direction: -1 | 1) => void
  /** Drag-and-drop: insert row (or its category block) before index. */
  relocateRowBy: (rowId: string, insertBefore: number) => void
  removeRow: (rowId: string) => void
  updateRowMeta: (rowId: string, patch: Partial<Pick<Row, 'category' | 'comment'>>) => void
  /** Rename category for all consecutive rows in the same category block. */
  renameCategoryGroup: (rowId: string, category: string) => void
  setCell: (rowId: string, columnId: string, value: Condition) => void

  simplify: () => void
  getMergePairCount: () => number
  getConflicts: () => ReturnType<typeof findConflicts>

  persist: () => void
  loadDemo: () => void
  startOver: () => void
}

function withUpdated(project: Project): Project {
  return { ...project, updatedAt: new Date().toISOString() }
}

function emptyCellsFor(sections: Section[], rows: Row[]): Record<string, Condition> {
  const cells: Record<string, Condition> = {}
  for (const section of sections) {
    for (const col of section.columns) {
      const existing = rows.map((r) => r.cells[col.id] ?? 'x')
      cells[col.id] = defaultCellValue(col.schema, existing)
    }
  }
  return cells
}

function clearUndoHistory() {
  queueMicrotask(() => {
    useProjectStore.temporal.getState().clear()
  })
}

function syncLibrary(project: Project, projects: Project[]) {
  const library = upsertProject({ activeId: project.id, projects }, project)
  saveLibrary(library)
  return library.projects
}

const loadedLibrary = loadLibrary()
const initial = loadedLibrary
  ? (loadedLibrary.projects.find((p) => p.id === loadedLibrary.activeId) ??
    loadedLibrary.projects[0]!)
  : createEmptyProject()
const initialProjects = loadedLibrary?.projects ?? [initial]

export const useProjectStore = create<ProjectState>()(
  temporal(
    (set, get) => ({
      project: initial,
      projects: initialProjects,
      viewMode: '2d',
      expandArrays: true,
      selectedRowId: initial.rows[0]?.id ?? null,
      columnWidths: loadColumnWidths(),

      setProject: (incoming) => {
        const prevId = get().project.id
        const project = withUpdated(incoming)
        // Replace the active slot (import / external load) without duplicating.
        const withoutPrev = get().projects.filter(
          (p) => p.id !== prevId && p.id !== project.id,
        )
        const projects = syncLibrary(project, withoutPrev)
        set({
          project,
          projects,
          selectedRowId: project.rows[0]?.id ?? null,
        })
        clearUndoHistory()
      },
      setName: (name) => {
        const project = withUpdated({ ...get().project, name })
        const projects = syncLibrary(project, get().projects)
        set({ project, projects })
      },
      renameProject: (name) => get().setName(name),
      switchProject: (projectId) => {
        if (projectId === get().project.id) return
        const saved = syncLibrary(get().project, get().projects)
        const next = saved.find((p) => p.id === projectId)
        if (!next) return
        saveLibrary({ activeId: next.id, projects: saved })
        set({
          project: next,
          projects: saved,
          selectedRowId: next.rows[0]?.id ?? null,
        })
        clearUndoHistory()
      },
      addProject: (name) => {
        const saved = syncLibrary(get().project, get().projects)
        const project = createEmptyProject(name?.trim() || 'Untitled xD')
        const projects = [...saved, project]
        saveLibrary({ activeId: project.id, projects })
        set({ project, projects, selectedRowId: null })
        clearUndoHistory()
      },
      removeProject: (projectId) => {
        const { project, projects } = get()
        if (projects.length <= 1) return
        const flushed = syncLibrary(project, projects)
        const remaining = flushed.filter((p) => p.id !== projectId)
        if (remaining.length === 0) return
        const next =
          projectId === project.id
            ? remaining[0]!
            : (remaining.find((p) => p.id === project.id) ?? remaining[0]!)
        saveLibrary({ activeId: next.id, projects: remaining })
        set({
          project: next,
          projects: remaining,
          selectedRowId: next.rows[0]?.id ?? null,
        })
        if (projectId === project.id) clearUndoHistory()
      },
      setViewMode: (viewMode) => set({ viewMode }),
      setExpandArrays: (expandArrays) => set({ expandArrays }),
      setSelectedRowId: (selectedRowId) => set({ selectedRowId }),
      setColumnWidth: (key, width) => {
        const columnWidths = { ...get().columnWidths, [key]: Math.max(28, Math.round(width)) }
        saveColumnWidths(columnWidths)
        set({ columnWidths })
      },
      resetColumnWidth: (key) => {
        const { [key]: _, ...rest } = get().columnWidths
        saveColumnWidths(rest)
        set({ columnWidths: rest })
      },

      addColumn: (sectionId, name) => {
        const project = get().project
        const sections = project.sections.map((s) => {
          if (s.id !== sectionId) return s
          const colName = name ?? `${s.name[0] ?? 'C'}${s.columns.length + 1}`
          const col = createColumn(colName)
          return { ...s, columns: [...s.columns, col] }
        })
        const sectionCols = sections.find((s) => s.id === sectionId)?.columns
        const newCol = sectionCols?.[sectionCols.length - 1]
        const rows = project.rows.map((r) =>
          newCol ? { ...r, cells: { ...r.cells, [newCol.id]: defaultAtom() } } : r,
        )
        set({ project: withUpdated({ ...project, sections, rows }) })
      },

      renameColumn: (sectionId, columnId, name) => {
        const project = get().project
        const sections = project.sections.map((s) => {
          if (s.id !== sectionId) return s
          return {
            ...s,
            columns: s.columns.map((c) => {
              if (c.id !== columnId) return c
              return {
                ...c,
                name,
                schema: schemaAfterRename(c.schema, c.name, name),
              }
            }),
          }
        })
        set({ project: withUpdated({ ...project, sections }) })
      },

      updateColumnSchema: (sectionId, columnId, schema) => {
        const project = get().project
        const sections = project.sections.map((s) => {
          if (s.id !== sectionId) return s
          return {
            ...s,
            columns: s.columns.map((c) => (c.id === columnId ? { ...c, schema } : c)),
          }
        })
        set({ project: withUpdated({ ...project, sections }) })
      },

      moveColumn: (sectionId, columnId, direction) => {
        const project = get().project
        const sections = project.sections.map((s) => {
          if (s.id !== sectionId) return s
          const idx = s.columns.findIndex((c) => c.id === columnId)
          if (idx < 0) return s
          const next = idx + direction
          if (next < 0 || next >= s.columns.length) return s
          const columns = [...s.columns]
          const [item] = columns.splice(idx, 1)
          columns.splice(next, 0, item!)
          return { ...s, columns }
        })
        set({ project: withUpdated({ ...project, sections }) })
      },

      removeColumn: (sectionId, columnId) => {
        const project = get().project
        const section = project.sections.find((s) => s.id === sectionId)
        if (!section || section.columns.length <= 1) return
        const sections = project.sections.map((s) => {
          if (s.id !== sectionId) return s
          return { ...s, columns: s.columns.filter((c) => c.id !== columnId) }
        })
        const rows = project.rows.map((r) => {
          const { [columnId]: _, ...cells } = r.cells
          return { ...r, cells }
        })
        set({ project: withUpdated({ ...project, sections, rows }) })
      },

      addMiddleSection: (name) => {
        const project = get().project
        const section = createSection('middle', name || 'Modifiers', ['M1'])
        const outputsIdx = project.sections.findIndex((s) => s.role === 'outputs')
        const sections = [...project.sections]
        const insertAt = outputsIdx === -1 ? sections.length : outputsIdx
        sections.splice(insertAt, 0, section)
        const rows = project.rows.map((r) => ({
          ...r,
          cells: { ...r.cells, [section.columns[0]!.id]: defaultAtom() },
        }))
        set({ project: withUpdated({ ...project, sections, rows }) })
      },

      renameSection: (sectionId, name) => {
        const project = get().project
        const sections = project.sections.map((s) =>
          s.id === sectionId ? { ...s, name } : s,
        )
        set({ project: withUpdated({ ...project, sections }) })
      },

      updateSectionDescription: (sectionId, description) => {
        const project = get().project
        const sections = project.sections.map((s) =>
          s.id === sectionId ? { ...s, description } : s,
        )
        set({ project: withUpdated({ ...project, sections }) })
      },

      updateSectionTint: (sectionId, tint) => {
        const project = get().project
        const sections = project.sections.map((s) => {
          if (s.id !== sectionId) return s
          if (tint == null || tint === '') {
            const { tint: _, ...rest } = s
            return rest
          }
          return { ...s, tint }
        })
        set({ project: withUpdated({ ...project, sections }) })
      },

      removeMiddleSection: (sectionId) => {
        const project = get().project
        const section = project.sections.find((s) => s.id === sectionId)
        if (!section || section.role !== 'middle') return
        const colIds = new Set(section.columns.map((c) => c.id))
        const sections = project.sections.filter((s) => s.id !== sectionId)
        const rows = project.rows.map((r) => {
          const cells = { ...r.cells }
          for (const id of colIds) delete cells[id]
          return { ...r, cells }
        })
        set({ project: withUpdated({ ...project, sections, rows }) })
      },

      addRow: (category = 'New category') => {
        const project = get().project
        const row = createRow(category, emptyCellsFor(project.sections, project.rows))
        const rows = [...project.rows, row]
        set({ project: withUpdated({ ...project, rows }), selectedRowId: row.id })
      },

      insertRowAt: (index, category = 'New category') => {
        const project = get().project
        const row = createRow(category, emptyCellsFor(project.sections, project.rows))
        const rows = [...project.rows]
        const at = Math.max(0, Math.min(index, rows.length))
        rows.splice(at, 0, row)
        set({ project: withUpdated({ ...project, rows }), selectedRowId: row.id })
      },

      addRowForCategory: (sourceRowId) => {
        const project = get().project
        const idx = project.rows.findIndex((r) => r.id === sourceRowId)
        if (idx < 0) return
        const source = project.rows[idx]!
        let insertAt = idx + 1
        while (
          insertAt < project.rows.length &&
          project.rows[insertAt]!.category === source.category
        ) {
          insertAt += 1
        }
        const row = createRow(source.category, emptyCellsFor(project.sections, project.rows))
        const rows = [...project.rows]
        rows.splice(insertAt, 0, row)
        set({ project: withUpdated({ ...project, rows }), selectedRowId: row.id })
      },

      moveCategoryGroupBy: (rowId, direction) => {
        const project = get().project
        const next = moveRow(project.rows, rowId, direction)
        if (!next) return
        set({ project: withUpdated({ ...project, rows: next }) })
      },

      relocateRowBy: (rowId, insertBefore) => {
        const project = get().project
        const next = relocateRow(project.rows, rowId, insertBefore)
        if (!next) return
        set({ project: withUpdated({ ...project, rows: next }) })
      },

      removeRow: (rowId) => {
        const project = get().project
        const rows = project.rows.filter((r) => r.id !== rowId)
        set({
          project: withUpdated({ ...project, rows }),
          selectedRowId: get().selectedRowId === rowId ? (rows[0]?.id ?? null) : get().selectedRowId,
        })
      },

      updateRowMeta: (rowId, patch) => {
        const project = get().project
        const rows = project.rows.map((r) => (r.id === rowId ? { ...r, ...patch } : r))
        set({ project: withUpdated({ ...project, rows }) })
      },

      renameCategoryGroup: (rowId, category) => {
        const project = get().project
        const group = new Set(categoryGroupIds(project.rows, rowId))
        if (group.size === 0) return
        const rows = project.rows.map((r) =>
          group.has(r.id) ? { ...r, category } : r,
        )
        set({ project: withUpdated({ ...project, rows }) })
      },

      setCell: (rowId, columnId, value) => {
        const project = get().project
        const rows = project.rows.map((r) =>
          r.id === rowId ? { ...r, cells: { ...r.cells, [columnId]: value } } : r,
        )
        set({ project: withUpdated({ ...project, rows }) })
      },

      simplify: () => {
        const simplified = simplifyMatrix(get().project)
        set({
          project: simplified,
          selectedRowId: simplified.rows.some((r) => r.id === get().selectedRowId)
            ? get().selectedRowId
            : (simplified.rows[0]?.id ?? null),
        })
      },

      getMergePairCount: () => countMergeOpportunities(get().project),
      getConflicts: () => findConflicts(get().project),

      persist: () => {
        const projects = syncLibrary(get().project, get().projects)
        set({ projects })
      },

      loadDemo: () => {
        const id = get().project.id
        const project = withUpdated({ ...createDemoProject(), id })
        const projects = syncLibrary(project, get().projects)
        set({ project, projects, selectedRowId: project.rows[0]?.id ?? null })
        clearUndoHistory()
      },

      startOver: () => {
        const id = get().project.id
        const name = get().project.name
        const project = withUpdated({ ...createEmptyProject(name), id })
        const projects = syncLibrary(project, get().projects)
        set({ project, projects, selectedRowId: null })
        clearUndoHistory()
      },
    }),
    {
      partialize: (state) => ({ project: state.project }),
      limit: 100,
    },
  ),
)
