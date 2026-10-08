import { useEffect, useRef, useState } from 'react'
import { useProjectStore } from '../store/projectStore'
import { projectToCsv } from '../export/csv'
import { downloadXlsx } from '../export/xlsx'
import { downloadText, importProjectJson } from '../persist/local'
import { ExportJsonModal } from './ExportJsonModal'
import { ProjectSwitcher } from './ProjectSwitcher'
import { Tip } from './Tip'

export function Toolbar() {
  const project = useProjectStore((s) => s.project)
  const viewMode = useProjectStore((s) => s.viewMode)
  const setViewMode = useProjectStore((s) => s.setViewMode)
  const expandArrays = useProjectStore((s) => s.expandArrays)
  const setExpandArrays = useProjectStore((s) => s.setExpandArrays)
  const setProject = useProjectStore((s) => s.setProject)
  const persist = useProjectStore((s) => s.persist)
  const loadDemo = useProjectStore((s) => s.loadDemo)
  const startOver = useProjectStore((s) => s.startOver)
  const fileRef = useRef<HTMLInputElement>(null)
  const [jsonExportOpen, setJsonExportOpen] = useState(false)

  const temporal = useProjectStore.temporal

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const mod = e.ctrlKey || e.metaKey
      if (!mod) return
      if (e.key === 'z' && !e.shiftKey) {
        e.preventDefault()
        temporal.getState().undo()
      } else if (e.key === 'y' || (e.key === 'z' && e.shiftKey)) {
        e.preventDefault()
        temporal.getState().redo()
      } else if (e.key === 's') {
        e.preventDefault()
        persist()
      }
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [persist, temporal])

  // Periodical autosave + flush when leaving the page / tab
  useEffect(() => {
    const id = window.setInterval(() => persist(), 30_000)
    const flush = () => persist()
    const onVisibility = () => {
      if (document.visibilityState === 'hidden') flush()
    }
    window.addEventListener('beforeunload', flush)
    document.addEventListener('visibilitychange', onVisibility)
    return () => {
      window.clearInterval(id)
      window.removeEventListener('beforeunload', flush)
      document.removeEventListener('visibilitychange', onVisibility)
    }
  }, [persist, project])

  return (
    <>
      <header className="toolbar">
        <div className="brand">
          <Tip content="Multidimensional decision tables with don’t-care simplification">
            <span className="logo">xD</span>
          </Tip>
          <ProjectSwitcher />
        </div>

        <div className="toolbar-group">
          <Tip content="Undo last edit (Ctrl+Z)">
            <button type="button" onClick={() => temporal.getState().undo()}>
              Undo
            </button>
          </Tip>
          <Tip content="Redo (Ctrl+Y)">
            <button type="button" onClick={() => temporal.getState().redo()}>
              Redo
            </button>
          </Tip>
        </div>

        <div className="toolbar-group">
          <Tip content="Spreadsheet view of all requirement rows">
            <button
              type="button"
              className={viewMode === '2d' ? 'active' : undefined}
              onClick={() => setViewMode('2d')}
            >
              2D
            </button>
          </Tip>
          <Tip content="Nested cube view — drill into array dimensions of a selected cell">
            <button
              type="button"
              className={viewMode === '3d' ? 'active' : undefined}
              onClick={() => setViewMode('3d')}
            >
              3D
            </button>
          </Tip>
          <Tip content="Expand nested arrays into separate columns: param title, then each subdimension’s short label">
            <button
              type="button"
              className={expandArrays ? 'active' : undefined}
              onClick={() => setExpandArrays(!expandArrays)}
            >
              Expand arrays
            </button>
          </Tip>
        </div>

        <div className="toolbar-group">
          <Tip content="Download matrix as CSV (spreadsheet-friendly)">
            <button
              type="button"
              onClick={() => {
                const csv = projectToCsv(project, expandArrays)
                downloadText(`${project.name || 'xd'}.csv`, csv, 'text/csv;charset=utf-8')
              }}
            >
              Export CSV
            </button>
          </Tip>
          <Tip content="Download styled Excel workbook (matrix + legend)">
            <button type="button" onClick={() => downloadXlsx(project, expandArrays)}>
              Export XLS
            </button>
          </Tip>
          <Tip content="View, copy, or download full project JSON (includes schema / tooltips)">
            <button type="button" onClick={() => setJsonExportOpen(true)}>
              Export JSON
            </button>
          </Tip>
          <Tip content="Load a previously exported project JSON">
            <button type="button" onClick={() => fileRef.current?.click()}>
              Import JSON
            </button>
          </Tip>
          <input
            ref={fileRef}
            type="file"
            accept="application/json,.json"
            hidden
            onChange={async (e) => {
              const file = e.target.files?.[0]
              if (!file) return
              try {
                const text = await file.text()
                setProject(importProjectJson(text))
              } catch (err) {
                window.alert(err instanceof Error ? err.message : 'Import failed')
              }
              e.target.value = ''
            }}
          />
          <Tip content="Save all projects to browser localStorage now (also autosaves every 30s)">
            <button type="button" onClick={() => persist()}>
              Save
            </button>
          </Tip>
          <Tip content="Replace the current project with the sample nested-requirements demo">
            <button type="button" onClick={() => loadDemo()}>
              Demo
            </button>
          </Tip>
          <Tip preferTop content="Clear the current project (other saved projects are kept)">
            <button
              type="button"
              onClick={() => {
                const ok = window.confirm(
                  'Start over? This clears the current project only. Other projects in the library stay saved.',
                )
                if (ok) startOver()
              }}
            >
              Start over
            </button>
          </Tip>
        </div>
      </header>
      <ExportJsonModal open={jsonExportOpen} onClose={() => setJsonExportOpen(false)} />
    </>
  )
}
