import type { Condition, ParamSchema } from '../domain/types'
import { cycleAtom, isAtom } from '../domain/types'
import { allowsDontCareAtPath, formatParamTooltip, slotCaption } from '../domain/schema'
import { AtomIcon } from './AtomIcon'
import { Tip } from './Tip'

type Props = {
  value: Condition
  onChange: (value: Condition) => void
  columnName?: string
  schema?: ParamSchema
  /** Base path when this editor is a leaf in expand-arrays mode */
  path?: number[]
}

export function ConditionEditor({
  value,
  onChange,
  columnName = 'param',
  schema,
  path = [],
}: Props) {
  return (
    <NestedEditor
      value={value}
      onChange={onChange}
      columnName={columnName}
      schema={schema}
      path={path}
    />
  )
}

type NestedProps = {
  value: Condition
  onChange: (value: Condition) => void
  columnName: string
  schema?: ParamSchema
  path: number[]
}

function NestedEditor({ value, onChange, columnName, schema, path }: NestedProps) {
  const allowDontCare = allowsDontCareAtPath(schema, path)
  const paramTip = formatParamTooltip(columnName, path, schema)
  const tipContent = isAtom(value)
    ? [
      paramTip,
      allowDontCare
        ? 'Click: cycle yes → no → don’t care'
        : 'Click: cycle yes → no (don’t care disabled for this param)',
    ]
      .filter(Boolean)
      .join('\n\n')
    : paramTip

  const blockMenu = (e: React.MouseEvent) => {
    e.preventDefault()
    e.stopPropagation()
  }

  if (isAtom(value)) {
    return (
      <Tip content={tipContent}>
        <button
          type="button"
          className={`atom-btn atom-${value}`}
          onClick={() => onChange(cycleAtom(value, allowDontCare))}
          onContextMenu={blockMenu}
        >
          <AtomIcon atom={value} size={18} />
        </button>
      </Tip>
    )
  }

  return (
    <div className="nested-array" onContextMenu={blockMenu} title={tipContent}>
      <div className="bracket bracket-open">[</div>
      <div className="nested-items">
        {value.map((child, i) => (
          <div key={i} className="nested-item">
            <NestedEditor
              value={child}
              onChange={(next) => {
                const copy = [...value]
                copy[i] = next
                onChange(copy)
              }}
              columnName={columnName}
              schema={schema}
              path={[...path, i]}
            />
            <span className="dim-short-label">{slotCaption(schema, [...path, i])}</span>
          </div>
        ))}
      </div>
      <div className="bracket bracket-close">]</div>
    </div>
  )
}
