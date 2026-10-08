import type { ParamSchema } from '../domain/types'
import { emptySchemaNode, ensureSchema } from '../domain/schema'
import { Tip } from './Tip'

type Props = {
  columnName: string
  onRename: (name: string) => void
  schema: ParamSchema | undefined
  onChange: (schema: ParamSchema) => void
  onMoveUp?: () => void
  onMoveDown?: () => void
  canMoveUp?: boolean
  canMoveDown?: boolean
  onRemove?: () => void
  canRemove?: boolean
}

export function SchemaEditor({
  columnName,
  onRename,
  schema,
  onChange,
  onMoveUp,
  onMoveDown,
  canMoveUp = false,
  canMoveDown = false,
  onRemove,
  canRemove = true,
}: Props) {
  const root = ensureSchema(schema)

  return (
    <div className="schema-editor">
      <div className="schema-editor-title-row">
        <Tip content="Parameter name (column header in the matrix)">
          <input
            className="schema-column-title"
            value={columnName}
            onChange={(e) => onRename(e.target.value)}
            aria-label="Column title"
          />
        </Tip>
        <div className="schema-order-btns">
          <Tip content="Move column up">
            <button
              type="button"
              className="icon-btn"
              disabled={!canMoveUp}
              onClick={onMoveUp}
              aria-label="Move up"
            >
              ↑
            </button>
          </Tip>
          <Tip content="Move column down">
            <button
              type="button"
              className="icon-btn"
              disabled={!canMoveDown}
              onClick={onMoveDown}
              aria-label="Move down"
            >
              ↓
            </button>
          </Tip>
          {onRemove && (
            <Tip content="Remove column">
              <button
                type="button"
                className="icon-btn"
                disabled={!canRemove}
                onClick={onRemove}
                aria-label="Remove column"
              >
                ×
              </button>
            </Tip>
          )}
        </div>
      </div>

      <div className="schema-editor-head">
        <span>Schema / tooltips</span>
        <Tip content="Description defaults to the column title. Renaming the title updates Description only if it is empty or still matches the old title.">
          <span className="help-dot">?</span>
        </Tip>
      </div>
      <SchemaNodeEditor
        pathLabel={columnName}
        node={root}
        onChange={onChange}
        descriptionPlaceholder={columnName}
        showPath={false}
      />
    </div>
  )
}

function SchemaNodeEditor({
  pathLabel,
  node,
  onChange,
  descriptionPlaceholder,
  showPath = true,
}: {
  pathLabel: string
  node: ParamSchema
  onChange: (node: ParamSchema) => void
  descriptionPlaceholder?: string
  showPath?: boolean
}) {
  const children = node.children ?? []

  const moveChild = (index: number, direction: -1 | 1) => {
    const next = index + direction
    if (next < 0 || next >= children.length) return
    const copy = [...children]
    const [item] = copy.splice(index, 1)
    copy.splice(next, 0, item!)
    onChange({ ...node, children: copy })
  }

  return (
    <div className="schema-node">
      {showPath && <div className="schema-path">{pathLabel}</div>}
      <label>
        Label
        <input
          value={node.label ?? ''}
          placeholder="Short name"
          onChange={(e) => onChange({ ...node, label: e.target.value })}
        />
      </label>
      <label>
        Description (tooltip)
        <textarea
          value={node.description ?? ''}
          placeholder={descriptionPlaceholder ?? 'Shown on hover in the matrix'}
          rows={2}
          onChange={(e) => onChange({ ...node, description: e.target.value })}
        />
      </label>
      <label className="schema-checkbox">
        <input
          type="checkbox"
          checked={node.allowDontCare !== false}
          onChange={(e) => onChange({ ...node, allowDontCare: e.target.checked })}
        />
        <span>Allow don’t care (◆~)</span>
      </label>

      <div className="schema-children">
        <div className="schema-children-head">
          <span>Nested dims</span>
          <Tip content="Add a child for index [0], [1], … matching nested array slots in the matrix.">
            <button
              type="button"
              className="icon-btn nest-btn"
              onClick={() =>
                onChange({
                  ...node,
                  children: [...children, emptySchemaNode()],
                })
              }
            >
              +
            </button>
          </Tip>
        </div>
        {children.map((child, i) => (
          <div key={i} className="schema-child">
            <div className="schema-child-toolbar">
              <span className="schema-path">{`${pathLabel}[${i}]`}</span>
              <div className="schema-order-btns">
                <button
                  type="button"
                  className="icon-btn"
                  disabled={i === 0}
                  title="Move up"
                  onClick={() => moveChild(i, -1)}
                >
                  ↑
                </button>
                <button
                  type="button"
                  className="icon-btn"
                  disabled={i >= children.length - 1}
                  title="Move down"
                  onClick={() => moveChild(i, 1)}
                >
                  ↓
                </button>
                <button
                  type="button"
                  className="icon-btn"
                  title="Remove this nested schema slot"
                  onClick={() =>
                    onChange({
                      ...node,
                      children: children.filter((_, j) => j !== i),
                    })
                  }
                >
                  ×
                </button>
              </div>
            </div>
            <SchemaNodeEditor
              pathLabel={`${pathLabel}[${i}]`}
              node={ensureSchema(child)}
              onChange={(next) => {
                const nextChildren = [...children]
                nextChildren[i] = next
                onChange({ ...node, children: nextChildren })
              }}
              showPath={false}
            />
          </div>
        ))}
      </div>
    </div>
  )
}
