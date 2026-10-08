import {
  useCallback,
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
  type CSSProperties,
  type DragEvent as ReactDragEvent,
  type FocusEvent,
  type MouseEvent as ReactMouseEvent,
} from 'react'
import { useProjectStore } from '../store/projectStore'
import { ConditionEditor } from './ConditionEditor'
import { ColumnResizeHandle } from './ColumnResizeHandle'
import { ContextMenu, type ContextMenuItem } from './ContextMenu'
import { Tip } from './Tip'
import { expandedColumnLeaves } from '../domain/flatten'
import { findConflicts } from '../domain/merge'
import { formatCondition } from '../domain/condition'
import { resolveSectionTint } from '../domain/factory'
import { expandedLeafLabel, formatParamTooltip } from '../domain/schema'
import {
  canMoveRow,
  computeCategoryNumbers,
  computeCategoryRowSpans,
} from '../domain/categoryNumbers'
import { isAtom } from '../domain/types'
import type { Condition } from '../domain/types'

type CatnumMenu = { x: number; y: number; rowId: string }

const CATNUM_KEY = 'catnum'
const DEFAULT_WIDTHS: Record<string, number> = {
  category: 88,
  comment: 260,
  [CATNUM_KEY]: 64,
}

const ROW_DND_MIME = 'application/x-xd-row-id'

export function MatrixTable() {
  const project = useProjectStore((s) => s.project)
  const expandArrays = useProjectStore((s) => s.expandArrays)
  const columnWidths = useProjectStore((s) => s.columnWidths)
  const setSelectedRowId = useProjectStore((s) => s.setSelectedRowId)
  const setColumnWidth = useProjectStore((s) => s.setColumnWidth)
  const resetColumnWidth = useProjectStore((s) => s.resetColumnWidth)
  const setCell = useProjectStore((s) => s.setCell)
  const updateRowMeta = useProjectStore((s) => s.updateRowMeta)
  const renameCategoryGroup = useProjectStore((s) => s.renameCategoryGroup)
  const insertRowAt = useProjectStore((s) => s.insertRowAt)
  const addRowForCategory = useProjectStore((s) => s.addRowForCategory)
  const moveCategoryGroupBy = useProjectStore((s) => s.moveCategoryGroupBy)
  const relocateRowBy = useProjectStore((s) => s.relocateRowBy)
  const removeRow = useProjectStore((s) => s.removeRow)
  const [catnumMenu, setCatnumMenu] = useState<CatnumMenu | null>(null)
  const [dragRowId, setDragRowId] = useState<string | null>(null)
  const [dropBefore, setDropBefore] = useState<number | null>(null)

  const categoryNumbers = useMemo(
    () => computeCategoryNumbers(project.rows),
    [project.rows],
  )
  const conflictRowIds = useMemo(() => {
    const ids = new Set<string>()
    for (const conflict of findConflicts(project)) {
      ids.add(conflict.rowAId)
      ids.add(conflict.rowBId)
    }
    return ids
  }, [project])
  const categoryRowSpans = useMemo(
    () => computeCategoryRowSpans(project.rows),
    [project.rows],
  )
  const sectionTintById = useMemo(() => {
    const map = new Map<string, string>()
    for (const section of project.sections) {
      map.set(section.id, resolveSectionTint(section))
    }
    return map
  }, [project.sections])

  const tintStyle = (sectionId: string | undefined): CSSProperties | undefined => {
    if (!sectionId) return undefined
    const tint = sectionTintById.get(sectionId)
    if (!tint) return undefined
    return { ['--cell-tint' as string]: tint }
  }

  /** First row id of each consecutive category block, keyed by every row in the block. */
  const categoryAnchorByRowId = useMemo(() => {
    const map = new Map<string, string>()
    const rows = project.rows
    let i = 0
    while (i < rows.length) {
      const cat = rows[i]!.category
      let j = i + 1
      while (j < rows.length && rows[j]!.category === cat) j += 1
      const anchor = rows[i]!.id
      for (let k = i; k < j; k++) map.set(rows[k]!.id, anchor)
      i = j
    }
    return map
  }, [project.rows])

  /** Crosshair: hover, or sticky focus while a cell is being edited */
  const [hover, setHover] = useState<{ rowId: string | null; colKey: string | null }>({
    rowId: null,
    colKey: null,
  })
  const [focusCell, setFocusCell] = useState<{ rowId: string; colKey: string } | null>(null)

  const hlRowId = focusCell?.rowId ?? hover.rowId
  const hlColKey = focusCell?.colKey ?? hover.colKey
  const hlCategoryAnchor = hlRowId ? (categoryAnchorByRowId.get(hlRowId) ?? null) : null

  const cellChrome = (rowId: string, colKey: string) => {
    const classes = ['matrix-cell']
    if (hlRowId === rowId) classes.push('hl-row')
    if (hlColKey === colKey) classes.push('hl-col')
    if (focusCell?.rowId === rowId && focusCell.colKey === colKey) classes.push('hl-focus')
    else if (hlRowId === rowId && hlColKey === colKey) classes.push('hl-cross')
    return classes.join(' ')
  }

  /** Merged category cell: highlight when any nested row in the block is active. */
  const categoryCellChrome = (anchorRowId: string) => {
    const classes = ['matrix-cell', 'category-cell', 'category-merged']
    const groupActive = hlCategoryAnchor === anchorRowId
    if (groupActive) classes.push('hl-row')
    if (hlColKey === 'category') classes.push('hl-col')
    if (focusCell?.rowId === anchorRowId && focusCell.colKey === 'category') {
      classes.push('hl-focus')
    } else if (groupActive && hlColKey === 'category') {
      classes.push('hl-cross')
    }
    return classes.join(' ')
  }

  const bindCellPointer = (rowId: string, colKey: string) => ({
    onMouseEnter: () => setHover({ rowId, colKey }),
    onFocusCapture: () => {
      setSelectedRowId(rowId)
      setFocusCell({ rowId, colKey })
    },
    onBlurCapture: (e: FocusEvent<HTMLElement>) => {
      const next = e.relatedTarget as Node | null
      if (next && e.currentTarget.contains(next)) return
      setFocusCell((f) =>
        f?.rowId === rowId && f.colKey === colKey ? null : f,
      )
    },
  })

  const openCatnumMenu = (e: ReactMouseEvent, rowId: string) => {
    e.preventDefault()
    e.stopPropagation()
    setSelectedRowId(rowId)
    setCatnumMenu({ x: e.clientX, y: e.clientY, rowId })
  }

  const onRowDragStart = (e: ReactDragEvent, rowId: string) => {
    e.dataTransfer.setData(ROW_DND_MIME, rowId)
    e.dataTransfer.setData('text/plain', rowId)
    e.dataTransfer.effectAllowed = 'move'
    setDragRowId(rowId)
    setSelectedRowId(rowId)
  }

  const onRowDragEnd = () => {
    setDragRowId(null)
    setDropBefore(null)
  }

  const onRowDragOver = (e: ReactDragEvent, rowIndex: number) => {
    if (!dragRowId) return
    e.preventDefault()
    e.dataTransfer.dropEffect = 'move'
    const rect = (e.currentTarget as HTMLElement).getBoundingClientRect()
    const before = e.clientY < rect.top + rect.height / 2
    setDropBefore(before ? rowIndex : rowIndex + 1)
  }

  const onRowDrop = (e: ReactDragEvent) => {
    e.preventDefault()
    const rowId =
      e.dataTransfer.getData(ROW_DND_MIME) ||
      e.dataTransfer.getData('text/plain') ||
      dragRowId
    const insertBefore = dropBefore
    setDragRowId(null)
    setDropBefore(null)
    if (!rowId || insertBefore == null) return
    relocateRowBy(rowId, insertBefore)
  }

  const catnumMenuItems = useMemo((): ContextMenuItem[] => {
    if (!catnumMenu) return []
    const { rowId } = catnumMenu
    const canUp = canMoveRow(project.rows, rowId, -1)
    const canDown = canMoveRow(project.rows, rowId, 1)
    return [
      {
        id: 'add-row',
        label: 'Add subcategory row',
        action: () => addRowForCategory(rowId),
      },
      {
        id: 'move-up',
        label: 'Move up',
        disabled: !canUp,
        action: () => moveCategoryGroupBy(rowId, -1),
      },
      {
        id: 'move-down',
        label: 'Move down',
        disabled: !canDown,
        action: () => moveCategoryGroupBy(rowId, 1),
      },
      {
        id: 'remove',
        label: 'Remove',
        danger: true,
        action: () => removeRow(rowId),
      },
    ]
  }, [
    catnumMenu,
    project.rows,
    addRowForCategory,
    moveCategoryGroupBy,
    removeRow,
  ])

  const onResize = useCallback(
    (key: string, width: number) => setColumnWidth(key, width),
    [setColumnWidth],
  )
  const onReset = useCallback(
    (key: string) => resetColumnWidth(key),
    [resetColumnWidth],
  )

  const topHeaderRef = useRef<HTMLTableRowElement>(null)
  const tableRef = useRef<HTMLTableElement>(null)
  const [topHeaderH, setTopHeaderH] = useState(36)
  const [tableWidth, setTableWidth] = useState(0)

  useLayoutEffect(() => {
    const el = topHeaderRef.current
    if (!el) return
    const update = () => {
      // Integer px avoids sticky leaf top jitter (1px border flicker).
      const h = Math.round(el.getBoundingClientRect().height)
      if (h > 0) setTopHeaderH(h)
    }
    update()
    const ro = new ResizeObserver(update)
    ro.observe(el)
    return () => ro.disconnect()
  }, [project.sections, expandArrays, columnWidths])

  useLayoutEffect(() => {
    const el = tableRef.current
    if (!el) return
    const update = () => setTableWidth(el.offsetWidth)
    update()
    const ro = new ResizeObserver(update)
    ro.observe(el)
    return () => ro.disconnect()
  }, [project.sections, project.rows.length, expandArrays, columnWidths])

  function widthFor(key: string, kind: 'meta' | 'data'): number | undefined {
    if (columnWidths[key] != null) return columnWidths[key]
    if (DEFAULT_WIDTHS[key] != null) return DEFAULT_WIDTHS[key]
    if (kind === 'data') return 88
    return undefined
  }

  const flatColumns = useMemo(() => {
    type Col =
      | { kind: 'meta'; key: string; label: string }
      | {
        kind: 'data'
        key: string
        label: string
        sectionId: string
        columnId: string
        role: string
        indices?: number[]
      }

    const cols: Col[] = [
      { kind: 'meta', key: CATNUM_KEY, label: '#' },
      { kind: 'meta', key: 'category', label: 'Category' },
    ]

    for (const section of project.sections) {
      for (const col of section.columns) {
        if (!expandArrays) {
          cols.push({
            kind: 'data',
            key: col.id,
            label: col.name,
            sectionId: section.id,
            columnId: col.id,
            role: section.role,
          })
          continue
        }
        const values = project.rows.map((r) => r.cells[col.id] ?? 'x')
        const leaves = expandedColumnLeaves(values, col.schema)
        if (leaves.length === 0) {
          cols.push({
            kind: 'data',
            key: col.id,
            label: col.name,
            sectionId: section.id,
            columnId: col.id,
            role: section.role,
          })
        } else {
          for (const leaf of leaves) {
            cols.push({
              kind: 'data',
              key: `${col.id}${leaf.suffix}`,
              label: expandedLeafLabel(col.name, col.schema, leaf.indices),
              sectionId: section.id,
              columnId: col.id,
              role: section.role,
              indices: leaf.indices,
            })
          }
        }
      }
    }

    cols.push({ kind: 'meta', key: 'comment', label: 'Comment' })
    return cols
  }, [project, expandArrays])

  /** Top row groups + merged meta cells; bottom row = leaf headers only (skips rowspan merges). */
  const headerPlan = useMemo(() => {
    type FlatCol = (typeof flatColumns)[number]
    type TopCell =
      | {
        kind: 'merged'
        key: string
        label: string
        tip: string
        role: string
        resizeKey: string
        sectionId?: string
      }
      | {
        kind: 'group'
        key: string
        label: string
        tip: string
        role: string
        span: number
        sectionId: string
      }
    type BottomCell = {
      key: string
      label: string
      tip: string
      role: string
      resizeKey: string
      sectionId?: string
    }

    const top: TopCell[] = []
    const bottom: BottomCell[] = []
    let i = 0
    while (i < flatColumns.length) {
      const col = flatColumns[i]!
      if (col.kind === 'meta') {
        top.push({
          kind: 'merged',
          key: `merge-${col.key}`,
          label: col.label,
          tip:
            col.key === CATNUM_KEY
              ? 'Category number (1, 2, …) and sub-rows (1.1, 1.2, …)'
              : col.key === 'category'
                ? 'Requirement group / category'
                : 'Free-text comment for the row',
          role: 'meta',
          resizeKey: col.key,
        })
        i += 1
        continue
      }

      const section = project.sections.find((s) => s.id === col.sectionId)!
      const group: FlatCol[] = []
      while (i < flatColumns.length) {
        const next = flatColumns[i]!
        if (next.kind !== 'data' || next.sectionId !== section.id) break
        group.push(next)
        i += 1
      }

      const only = group.length === 1 && group[0]!.kind === 'data' ? group[0] : null
      const sameName =
        only &&
        only.kind === 'data' &&
        section.name.trim().toLowerCase() === only.label.trim().toLowerCase()

      if (sameName && only && only.kind === 'data') {
        const meta = project.sections
          .flatMap((s) => s.columns.map((c) => ({ c })))
          .find(({ c }) => c.id === only.columnId)
        const tip =
          formatParamTooltip(meta?.c.name ?? only.label, only.indices ?? [], meta?.c.schema) ||
          section.description ||
          only.label
        top.push({
          kind: 'merged',
          key: `merge-${only.key}`,
          label: only.label,
          tip,
          role: only.role,
          resizeKey: only.key,
          sectionId: section.id,
        })
        continue
      }

      top.push({
        kind: 'group',
        key: `group-${section.id}-${group[0]!.key}`,
        label: section.name,
        tip: section.description || `${section.role} section`,
        role: section.role,
        span: group.length,
        sectionId: section.id,
      })
      for (const leaf of group) {
        if (leaf.kind !== 'data') continue
        const meta = project.sections
          .flatMap((s) => s.columns.map((c) => ({ c })))
          .find(({ c }) => c.id === leaf.columnId)
        const tip =
          formatParamTooltip(
            meta?.c.name ?? leaf.label,
            leaf.indices ?? [],
            meta?.c.schema,
          ) || leaf.label
        bottom.push({
          key: leaf.key,
          label: leaf.label,
          tip,
          role: leaf.role,
          resizeKey: leaf.key,
          sectionId: section.id,
        })
      }
    }

    return { top, bottom }
  }, [flatColumns, project.sections])

  function columnMeta(columnId: string) {
    for (const section of project.sections) {
      const col = section.columns.find((c) => c.id === columnId)
      if (col) return { column: col, section }
    }
    return null
  }

  function readLeaf(value: Condition, indices?: number[]): Condition {
    if (!indices || indices.length === 0) return value
    let current = value
    for (const i of indices) {
      if (isAtom(current) || i >= current.length) return 'x'
      current = current[i]!
    }
    return current
  }

  function writeLeaf(
    original: Condition,
    indices: number[] | undefined,
    nextAtom: Condition,
  ): Condition {
    if (!indices || indices.length === 0) return nextAtom
    const path = indices
    function setAt(node: Condition, depth: number): Condition {
      if (depth >= path.length) return nextAtom
      const idx = path[depth]!
      if (isAtom(node)) {
        const arr: Condition[] = Array.from({ length: idx + 1 }, () => 'x')
        arr[idx] = setAt('x', depth + 1)
        return arr
      }
      const copy = [...node]
      while (copy.length <= idx) copy.push('x')
      copy[idx] = setAt(copy[idx]!, depth + 1)
      return copy
    }
    return setAt(original, 0)
  }

  return (
    <div
      className="matrix-wrap"
      onMouseLeave={() => setHover({ rowId: null, colKey: null })}
    >
      {catnumMenu && (
        <ContextMenu
          x={catnumMenu.x}
          y={catnumMenu.y}
          items={catnumMenuItems}
          onClose={() => setCatnumMenu(null)}
        />
      )}
      <table
        ref={tableRef}
        className="matrix-table matrix-table-resizable"
        style={{ ['--matrix-header-top-h' as string]: `${topHeaderH}px` }}
      >
        <colgroup>
          {flatColumns.map((col) => {
            const w = widthFor(col.key, col.kind === 'meta' ? 'meta' : 'data')
            return <col key={col.key} style={w != null ? { width: w, minWidth: w } : undefined} />
          })}
        </colgroup>
        <thead>
          <tr className="header-row-top" ref={topHeaderRef}>
            {headerPlan.top.map((cell) =>
              cell.kind === 'merged' ? (
                <th
                  key={cell.key}
                  rowSpan={2}
                  className={`role-${cell.role} sticky-span resizable-th${hlColKey === cell.resizeKey ? ' hl-col' : ''
                    }`}
                  style={tintStyle(cell.sectionId)}
                  onMouseEnter={() =>
                    setHover((h) => ({ rowId: h.rowId, colKey: cell.resizeKey }))
                  }
                >
                  {cell.label ? (
                    <Tip content={cell.tip}>
                      <span className="th-label">{cell.label}</span>
                    </Tip>
                  ) : null}
                  <ColumnResizeHandle
                    columnKey={cell.resizeKey}
                    onResize={onResize}
                    onReset={onReset}
                  />
                </th>
              ) : (
                <th
                  key={cell.key}
                  colSpan={cell.span}
                  className={`role-${cell.role}`}
                  style={tintStyle(cell.sectionId)}
                >
                  <Tip content={cell.tip}>
                    <span className="th-label">{cell.label}</span>
                  </Tip>
                </th>
              ),
            )}
          </tr>
          <tr className="header-row-leaf">
            {headerPlan.bottom.map((cell) => (
              <th
                key={cell.key}
                className={`role-${cell.role} resizable-th${hlColKey === cell.resizeKey ? ' hl-col' : ''
                  }`}
                style={tintStyle(cell.sectionId)}
                onMouseEnter={() =>
                  setHover((h) => ({ rowId: h.rowId, colKey: cell.resizeKey }))
                }
              >
                <Tip content={cell.tip}>
                  <span className="th-label">{cell.label}</span>
                </Tip>
                <ColumnResizeHandle
                  columnKey={cell.resizeKey}
                  onResize={onResize}
                  onReset={onReset}
                />
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {project.rows.map((row, rowIndex) => {
            const prevSame =
              rowIndex > 0 && project.rows[rowIndex - 1]!.category === row.category
            const nextSame =
              rowIndex < project.rows.length - 1 &&
              project.rows[rowIndex + 1]!.category === row.category
            return (
              <tr
                key={row.id}
                className={[
                  'matrix-data-row',
                  focusCell?.rowId === row.id ? 'selected' : '',
                  hlRowId === row.id ? 'hl-row' : '',
                  conflictRowIds.has(row.id) ? 'conflict-row' : '',
                  prevSame ? 'cat-row-continue' : '',
                  nextSame ? 'cat-row-followed' : '',
                  dragRowId === row.id ? 'row-dragging' : '',
                  dragRowId && dropBefore === rowIndex ? 'drop-before' : '',
                  dragRowId &&
                    dropBefore === rowIndex + 1 &&
                    rowIndex === project.rows.length - 1
                    ? 'drop-after'
                    : '',
                ]
                  .filter(Boolean)
                  .join(' ') || undefined}
                onClick={() => setSelectedRowId(row.id)}
                onDragOver={(e) => onRowDragOver(e, rowIndex)}
                onDrop={onRowDrop}
              >
                {flatColumns.map((col) => {
                  if (col.kind === 'meta' && col.key === CATNUM_KEY) {
                    return (
                      <td
                        key={col.key}
                        className={`catnum-cell ${cellChrome(row.id, col.key)}`}
                        {...bindCellPointer(row.id, col.key)}
                        onContextMenu={(e) => openCatnumMenu(e, row.id)}
                      >
                        <div
                          className={
                            prevSame
                              ? 'row-insert-zone row-insert-zone-before row-insert--sub'
                              : 'row-insert-zone row-insert-zone-before row-insert--category'
                          }
                          title={
                            prevSame
                              ? 'Insert subcategory row here'
                              : 'Insert new category here'
                          }
                          onClick={(e) => {
                            e.stopPropagation()
                            // Between two rows of the same category → subcategory.
                            // At a category edge (or top of table) → new category.
                            if (prevSame) insertRowAt(rowIndex, row.category)
                            else insertRowAt(rowIndex)
                          }}
                        >
                          <button
                            type="button"
                            className="row-insert-btn"
                            aria-label={
                              prevSame
                                ? 'Insert subcategory row'
                                : 'Insert new category'
                            }
                            tabIndex={-1}
                          >
                            +
                          </button>
                          <span
                            className="row-insert-line"
                            aria-hidden
                            style={{ width: tableWidth || undefined }}
                          />
                        </div>
                        {rowIndex === project.rows.length - 1 && (
                          <div
                            className="row-insert-zone row-insert-zone-after row-insert--category"
                            title="Insert new category here"
                            onClick={(e) => {
                              e.stopPropagation()
                              insertRowAt(project.rows.length)
                            }}
                          >
                            <button
                              type="button"
                              className="row-insert-btn"
                              aria-label="Insert new category"
                              tabIndex={-1}
                            >
                              +
                            </button>
                            <span
                              className="row-insert-line"
                              aria-hidden
                              style={{ width: tableWidth || undefined }}
                            />
                          </div>
                        )}
                        <button
                          type="button"
                          className="icon-btn row-drag-handle"
                          aria-label="Drag to reorder"
                          title="Drag to reorder subcategory or category"
                          draggable
                          onDragStart={(e) => onRowDragStart(e, row.id)}
                          onDragEnd={onRowDragEnd}
                          onClick={(e) => e.stopPropagation()}
                        >
                          ⋮⋮
                        </button>
                        <span className="catnum">{categoryNumbers.get(row.id) ?? '—'}</span>
                        <button
                          type="button"
                          className="icon-btn catnum-menu-btn"
                          aria-label="Row actions"
                          title="Row actions"
                          onClick={(e) => openCatnumMenu(e, row.id)}
                        >
                          …
                        </button>
                      </td>
                    )
                  }
                  if (col.kind === 'meta' && col.key === 'category') {
                    const span = categoryRowSpans.get(row.id) ?? 1
                    if (span === 0) return null
                    return (
                      <td
                        key={col.key}
                        className={categoryCellChrome(row.id)}
                        rowSpan={span}
                        {...bindCellPointer(row.id, col.key)}
                      >
                        <input
                          value={row.category}
                          onChange={(e) => renameCategoryGroup(row.id, e.target.value)}
                        />
                      </td>
                    )
                  }
                  if (col.kind === 'meta' && col.key === 'comment') {
                    return (
                      <td
                        key={col.key}
                        className={cellChrome(row.id, col.key)}
                        {...bindCellPointer(row.id, col.key)}
                      >
                        <input
                          value={row.comment ?? ''}
                          onChange={(e) => updateRowMeta(row.id, { comment: e.target.value })}
                        />
                      </td>
                    )
                  }
                  if (col.kind !== 'data') return null

                  const meta = columnMeta(col.columnId)
                  const columnName = meta?.column.name ?? col.label
                  const schema = meta?.column.schema
                  const raw = row.cells[col.columnId] ?? 'x'
                  if (expandArrays && col.indices) {
                    const leaf = readLeaf(raw, col.indices)
                    return (
                      <td
                        key={col.key}
                        className={`role-${col.role} ${cellChrome(row.id, col.key)}`}
                        style={tintStyle(col.sectionId)}
                        {...bindCellPointer(row.id, col.key)}
                      >
                        {isAtom(leaf) ? (
                          <ConditionEditor
                            value={leaf}
                            columnName={columnName}
                            schema={schema}
                            path={col.indices}
                            onChange={(next) =>
                              setCell(row.id, col.columnId, writeLeaf(raw, col.indices, next))
                            }
                          />
                        ) : (
                          <span className="muted">{formatCondition(leaf)}</span>
                        )}
                      </td>
                    )
                  }

                  return (
                    <td
                      key={col.key}
                      className={`role-${col.role} ${cellChrome(row.id, col.key)}`}
                      style={tintStyle(col.sectionId)}
                      {...bindCellPointer(row.id, col.key)}
                    >
                      <ConditionEditor
                        value={raw}
                        columnName={columnName}
                        schema={schema}
                        onChange={(next) => setCell(row.id, col.columnId, next)}
                      />
                    </td>
                  )
                })}
              </tr>
            )
          })}
        </tbody>
      </table>
    </div>
  )
}
