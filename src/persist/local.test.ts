import { beforeEach, describe, expect, it } from 'vitest'
import { createEmptyProject } from '../domain/factory'
import {
  loadLibrary,
  loadProject,
  saveLibrary,
  saveProject,
  upsertProject,
} from './local'

describe('project library', () => {
  beforeEach(() => {
    localStorage.clear()
  })

  it('migrates a legacy single project into a library', () => {
    const project = createEmptyProject('Legacy')
    localStorage.setItem('xd-project-v1', JSON.stringify(project))
    const lib = loadLibrary()
    expect(lib?.projects).toHaveLength(1)
    expect(lib?.activeId).toBe(project.id)
    expect(loadProject()?.name).toBe('Legacy')
  })

  it('persists multiple projects and restores the active one', () => {
    const a = createEmptyProject('A')
    const b = createEmptyProject('B')
    saveLibrary({ activeId: b.id, projects: [a, b] })
    expect(loadProject()?.id).toBe(b.id)
    expect(loadLibrary()?.projects.map((p) => p.name).sort()).toEqual(['A', 'B'])
  })

  it('upsertProject replaces by id', () => {
    const a = createEmptyProject('A')
    const lib = { activeId: a.id, projects: [a] }
    const renamed = { ...a, name: 'A2' }
    const next = upsertProject(lib, renamed)
    expect(next.projects).toHaveLength(1)
    expect(next.projects[0]!.name).toBe('A2')
  })

  it('saveProject upserts into an existing library', () => {
    const a = createEmptyProject('A')
    const b = createEmptyProject('B')
    saveLibrary({ activeId: a.id, projects: [a, b] })
    saveProject({ ...a, name: 'A-renamed' })
    const lib = loadLibrary()
    expect(lib?.projects).toHaveLength(2)
    expect(lib?.projects.find((p) => p.id === a.id)?.name).toBe('A-renamed')
    expect(lib?.activeId).toBe(a.id)
  })
})
