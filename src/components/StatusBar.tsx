import { useMemo } from 'react'
import { useProjectStore } from '../store/projectStore'
import { Tip } from './Tip'

type Props = {
  onOpenResolver: () => void
  onOpenSchema: () => void
}

export function StatusBar({ onOpenResolver, onOpenSchema }: Props) {
  const project = useProjectStore((s) => s.project)
  const getMergePairCount = useProjectStore((s) => s.getMergePairCount)
  const getConflicts = useProjectStore((s) => s.getConflicts)
  const simplify = useProjectStore((s) => s.simplify)

  const mergeCount = useMemo(() => getMergePairCount(), [project])
  const conflictCount = useMemo(() => getConflicts().length, [project])

  return (
    <footer className="status-bar">
      <div className="status-left">
        <span className="status-item">
          {project.rows.length} row{project.rows.length === 1 ? '' : 's'}
        </span>
        <span className="status-sep">·</span>
        <span className={`status-item ${mergeCount > 0 ? 'warn' : ''}`}>
          {mergeCount} mergeable
        </span>
        <span className="status-sep">·</span>
        <Tip preferTop content="Open the resolver">
          <button
            type="button"
            className={`status-item status-link ${conflictCount > 0 ? 'danger' : 'ok'}`}
            onClick={onOpenResolver}
          >
            {conflictCount} conflict{conflictCount === 1 ? '' : 's'}
          </button>
        </Tip>
      </div>
      <div className="status-right">
        <Tip preferTop content="Manage sections, columns, and param tooltips">
          <button type="button" onClick={onOpenSchema}>
            Sections & schema…
          </button>
        </Tip>
        <Tip preferTop content="Open simplify / merge and logical scheme">
          <button type="button" onClick={onOpenResolver}>
            Resolver…
          </button>
        </Tip>
        <Tip preferTop content="Merge similar rows now">
          <button
            type="button"
            className="primary"
            disabled={mergeCount === 0}
            onClick={() => simplify()}
          >
            Merge ({mergeCount})
          </button>
        </Tip>
      </div>
    </footer>
  )
}
