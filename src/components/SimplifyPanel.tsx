import { useMemo } from 'react'
import { computeCategoryNumbers } from '../domain/categoryNumbers'
import { useProjectStore } from '../store/projectStore'
import { Tip } from './Tip'

export function SimplifyPanel() {
  const project = useProjectStore((s) => s.project)
  const simplify = useProjectStore((s) => s.simplify)
  const getMergePairCount = useProjectStore((s) => s.getMergePairCount)
  const getConflicts = useProjectStore((s) => s.getConflicts)

  const mergeCount = useMemo(() => getMergePairCount(), [project])
  const conflicts = useMemo(() => getConflicts(), [project])

  const categoryNumbers = useMemo(
    () => computeCategoryNumbers(project.rows),
    [project.rows],
  )

  return (
    <section className="simplify-panel">
      <header className="panel-header">
        <h2>Simplify</h2>
        <Tip content="Merge rows in the same category that share the same outputs. P and M do not have to match.">
          <button type="button" className="primary" onClick={() => simplify()} disabled={mergeCount === 0}>
            Merge similar ({mergeCount})
          </button>
        </Tip>
      </header>
      <p className="muted">
        Merges rows inside one category when their outputs (R) are the same. Inputs (P) and
        Modifiers (M) do not block the merge — where they disagree, the kept row becomes
        don&apos;t-care. Categories are not combined. Conflicts when P+M can match the same case
        (don&apos;t-care overlaps any option) but R differs. Same P with incompatible M (y vs n) is
        not a conflict.
      </p>
      {conflicts.length > 0 && (
        <div className="conflicts">
          <h3>Conflicts</h3>
          <ul>
            {conflicts.map((c) => (
              <li key={`${c.rowAId}-${c.rowBId}`}>
                Rows #{categoryNumbers.get(c.rowAId) ?? '—'} & #{categoryNumbers.get(c.rowBId) ?? '—'}: {c.reason}
              </li>
            ))}
          </ul>
        </div>
      )}
      {conflicts.length === 0 && <p className="ok">No output conflicts detected.</p>}
    </section>
  )
}
