import type { Project } from '../domain/types'

const LEGACY_KEY = 'xd-project-v1'
const LIBRARY_KEY = 'xd-library-v1'
const WIDTHS_KEY = 'xd-column-widths-v1'

export type ProjectLibrary = {
  activeId: string
  projects: Project[]
}

function isProject(value: unknown): value is Project {
  if (!value || typeof value !== 'object') return false
  const p = value as Project
  return (
    typeof p.id === 'string' &&
    typeof p.name === 'string' &&
    Array.isArray(p.sections) &&
    Array.isArray(p.rows)
  )
}

function isLibrary(value: unknown): value is ProjectLibrary {
  if (!value || typeof value !== 'object') return false
  const lib = value as ProjectLibrary
  return (
    typeof lib.activeId === 'string' &&
    Array.isArray(lib.projects) &&
    lib.projects.length > 0 &&
    lib.projects.every(isProject)
  )
}

/** Upsert project into the list and mark it active. */
export function upsertProject(library: ProjectLibrary, project: Project): ProjectLibrary {
  const idx = library.projects.findIndex((p) => p.id === project.id)
  const projects = [...library.projects]
  if (idx >= 0) projects[idx] = project
  else projects.push(project)
  return { activeId: project.id, projects }
}

export function saveLibrary(library: ProjectLibrary): void {
  try {
    localStorage.setItem(LIBRARY_KEY, JSON.stringify(library))
    // Keep legacy key in sync for older builds / safety
    const active = library.projects.find((p) => p.id === library.activeId)
    if (active) localStorage.setItem(LEGACY_KEY, JSON.stringify(active))
  } catch {
    // ignore quota errors
  }
}

export function loadLibrary(): ProjectLibrary | null {
  try {
    const raw = localStorage.getItem(LIBRARY_KEY)
    if (raw) {
      const parsed = JSON.parse(raw) as unknown
      if (isLibrary(parsed)) {
        const active =
          parsed.projects.find((p) => p.id === parsed.activeId) ?? parsed.projects[0]!
        return { activeId: active.id, projects: parsed.projects }
      }
    }

    // Migrate single-project storage
    const legacyRaw = localStorage.getItem(LEGACY_KEY)
    if (legacyRaw) {
      const legacy = JSON.parse(legacyRaw) as unknown
      if (isProject(legacy)) {
        const library: ProjectLibrary = { activeId: legacy.id, projects: [legacy] }
        saveLibrary(library)
        return library
      }
    }
  } catch {
    return null
  }
  return null
}

/** @deprecated Prefer saveLibrary — kept for call-site clarity on single-project writes. */
export function saveProject(project: Project): void {
  const existing = loadLibrary()
  const library = existing
    ? upsertProject(existing, project)
    : { activeId: project.id, projects: [project] }
  saveLibrary(library)
}

export function loadProject(): Project | null {
  const library = loadLibrary()
  if (!library) return null
  return library.projects.find((p) => p.id === library.activeId) ?? library.projects[0] ?? null
}

export function saveColumnWidths(widths: Record<string, number>): void {
  try {
    localStorage.setItem(WIDTHS_KEY, JSON.stringify(widths))
  } catch {
    // ignore
  }
}

export function loadColumnWidths(): Record<string, number> {
  try {
    const raw = localStorage.getItem(WIDTHS_KEY)
    if (!raw) return {}
    const parsed = JSON.parse(raw) as Record<string, number>
    return parsed && typeof parsed === 'object' ? parsed : {}
  } catch {
    return {}
  }
}

export function clearStoredProject(): void {
  localStorage.removeItem(LEGACY_KEY)
  localStorage.removeItem(LIBRARY_KEY)
}

export function exportProjectJson(project: Project): string {
  return JSON.stringify(project, null, 2)
}

export function importProjectJson(raw: string): Project {
  const parsed = JSON.parse(raw) as Project
  if (!parsed?.sections || !parsed?.rows) {
    throw new Error('Invalid project JSON')
  }
  return parsed
}

export function downloadText(filename: string, content: string, mime: string) {
  const blob = new Blob([content], { type: mime })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = filename
  a.click()
  URL.revokeObjectURL(url)
}
