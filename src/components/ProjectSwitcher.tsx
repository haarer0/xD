import { useEffect, useRef, useState } from 'react'
import { useProjectStore } from '../store/projectStore'
import { Tip } from './Tip'

function formatUpdated(iso: string): string {
  try {
    const d = new Date(iso)
    if (Number.isNaN(d.getTime())) return ''
    return d.toLocaleString(undefined, {
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    })
  } catch {
    return ''
  }
}

export function ProjectSwitcher() {
  const project = useProjectStore((s) => s.project)
  const projects = useProjectStore((s) => s.projects)
  const switchProject = useProjectStore((s) => s.switchProject)
  const addProject = useProjectStore((s) => s.addProject)
  const renameProject = useProjectStore((s) => s.renameProject)
  const removeProject = useProjectStore((s) => s.removeProject)

  const [open, setOpen] = useState(false)
  const rootRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (!open) return
    const onDoc = (e: MouseEvent) => {
      if (!rootRef.current?.contains(e.target as Node)) setOpen(false)
    }
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setOpen(false)
    }
    document.addEventListener('mousedown', onDoc)
    document.addEventListener('keydown', onKey)
    return () => {
      document.removeEventListener('mousedown', onDoc)
      document.removeEventListener('keydown', onKey)
    }
  }, [open])

  const sorted = [...projects].sort((a, b) => {
    if (a.id === project.id) return -1
    if (b.id === project.id) return 1
    return (b.updatedAt || '').localeCompare(a.updatedAt || '')
  })

  return (
    <div className="project-switcher" ref={rootRef}>
      <Tip content="Switch project or add a new one (all saved in localStorage)">
        <button
          type="button"
          className={`project-switcher-trigger${open ? ' open' : ''}`}
          aria-haspopup="listbox"
          aria-expanded={open}
          onClick={() => setOpen((v) => !v)}
        >
          <span className="project-switcher-name">{project.name || 'Untitled'}</span>
          <span className="project-switcher-caret" aria-hidden>
            ▾
          </span>
        </button>
      </Tip>

      {open && (
        <div className="project-switcher-menu" role="listbox" aria-label="Projects">
          <ul className="project-switcher-list">
            {sorted.map((p) => (
              <li key={p.id}>
                <button
                  type="button"
                  role="option"
                  aria-selected={p.id === project.id}
                  className={
                    p.id === project.id
                      ? 'project-switcher-item active'
                      : 'project-switcher-item'
                  }
                  onClick={() => {
                    if (p.id !== project.id) switchProject(p.id)
                    setOpen(false)
                  }}
                >
                  <span className="project-switcher-item-name">{p.name || 'Untitled'}</span>
                  <span className="project-switcher-item-meta">
                    {formatUpdated(p.updatedAt)}
                  </span>
                </button>
              </li>
            ))}
          </ul>

          <div className="project-switcher-actions">
            <button
              type="button"
              onClick={() => {
                const name = window.prompt('New project name', 'Untitled xD')
                if (name == null) return
                addProject(name.trim() || 'Untitled xD')
                setOpen(false)
              }}
            >
              + Add new
            </button>
            <button
              type="button"
              onClick={() => {
                const name = window.prompt('Rename project', project.name)
                if (name == null) return
                const next = name.trim()
                if (next) renameProject(next)
                setOpen(false)
              }}
            >
              Rename…
            </button>
            {projects.length > 1 && (
              <button
                type="button"
                className="danger"
                onClick={() => {
                  const ok = window.confirm(
                    `Delete project “${project.name || 'Untitled'}”? This cannot be undone.`,
                  )
                  if (!ok) return
                  removeProject(project.id)
                  setOpen(false)
                }}
              >
                Delete
              </button>
            )}
          </div>
        </div>
      )}
    </div>
  )
}
