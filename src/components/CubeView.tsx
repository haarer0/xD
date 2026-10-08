import { useMemo, useState, type CSSProperties } from 'react'
import { useProjectStore } from '../store/projectStore'
import { formatCondition } from '../domain/condition'
import { isAtom } from '../domain/types'
import type { Condition } from '../domain/types'
import { AtomIcon } from './AtomIcon'

/**
 * Nested "cube" visualization: pick an input column with nested structure,
 * slice outer indices, show inner 2D grid of atoms / deeper cubes.
 */
export function CubeView() {
  const project = useProjectStore((s) => s.project)
  const selectedRowId = useProjectStore((s) => s.selectedRowId)
  const setSelectedRowId = useProjectStore((s) => s.setSelectedRowId)

  const inputColumns = useMemo(
    () => project.sections.filter((s) => s.role === 'inputs').flatMap((s) => s.columns),
    [project.sections],
  )

  const [columnId, setColumnId] = useState(inputColumns[0]?.id ?? '')
  const [slicePath, setSlicePath] = useState<number[]>([])

  const activeColId = inputColumns.some((c) => c.id === columnId)
    ? columnId
    : (inputColumns[0]?.id ?? '')

  const selectedRow = project.rows.find((r) => r.id === selectedRowId) ?? project.rows[0]

  const root: Condition = selectedRow?.cells[activeColId] ?? 'x'

  const focused = useMemo(() => {
    let node: Condition = root
    for (const i of slicePath) {
      if (isAtom(node) || i >= node.length) return node
      node = node[i]!
    }
    return node
  }, [root, slicePath])

  return (
    <div className="cube-view">
      <div className="cube-controls">
        <label>
          Focus column
          <select value={activeColId} onChange={(e) => { setColumnId(e.target.value); setSlicePath([]) }}>
            {inputColumns.map((c) => (
              <option key={c.id} value={c.id}>
                {c.name}
              </option>
            ))}
          </select>
        </label>
        <label>
          Row
          <select
            value={selectedRow?.id ?? ''}
            onChange={(e) => setSelectedRowId(e.target.value)}
          >
            {project.rows.map((r, i) => (
              <option key={r.id} value={r.id}>
                #{i + 1} {r.category}
              </option>
            ))}
          </select>
        </label>
        <div className="slice-path">
          Path:{' '}
          {slicePath.length === 0 ? (
            <em>root</em>
          ) : (
            slicePath.map((p, i) => (
              <button
                key={i}
                type="button"
                className="chip"
                onClick={() => setSlicePath(slicePath.slice(0, i + 1))}
              >
                [{p}]
              </button>
            ))
          )}
          {slicePath.length > 0 && (
            <button type="button" className="linkish" onClick={() => setSlicePath([])}>
              reset
            </button>
          )}
        </div>
      </div>

      <div className="cube-stage">
        <CubeNode
          value={focused}
          depth={0}
          onDrill={(index) => setSlicePath([...slicePath, index])}
        />
      </div>

      <p className="muted cube-hint">
        Click a slice index to drill into deeper dimensions. Inner grids show 2D faces of the nested condition.
      </p>
    </div>
  )
}

function CubeNode({
  value,
  depth,
  onDrill,
}: {
  value: Condition
  depth: number
  onDrill: (index: number) => void
}) {
  if (isAtom(value)) {
    return (
      <div className={`cube-atom atom-${value}`}>
        <AtomIcon atom={value} size={22} />
      </div>
    )
  }

  // Treat first two dimensions as a 2D face when children are atoms or further arrays
  const len = value.length
  const cols = Math.ceil(Math.sqrt(len))
  const rows = Math.ceil(len / cols)

  return (
    <div className={`cube-frame depth-${Math.min(depth, 4)}`} style={{ '--cols': cols } as CSSProperties}>
      <div className="cube-face">
        {Array.from({ length: rows }).map((_, r) => (
          <div key={r} className="cube-row">
            {Array.from({ length: cols }).map((_, c) => {
              const idx = r * cols + c
              if (idx >= len) return <div key={c} className="cube-cell empty" />
              const child = value[idx]!
              return (
                <button
                  key={c}
                  type="button"
                  className="cube-cell"
                  onClick={() => {
                    if (!isAtom(child)) onDrill(idx)
                  }}
                  title={isAtom(child) ? child : `Drill [${idx}]`}
                >
                  {isAtom(child) ? (
                    <span className={`cube-atom atom-${child}`}>
                      <AtomIcon atom={child} size={20} />
                    </span>
                  ) : (
                    <div className="mini-cube">
                      <span className="mini-label">[{idx}]</span>
                      <span className="muted">{formatCondition(child)}</span>
                    </div>
                  )}
                </button>
              )
            })}
          </div>
        ))}
      </div>
    </div>
  )
}
