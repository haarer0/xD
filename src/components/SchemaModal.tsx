import { Fragment } from 'react'
import { DEFAULT_SECTION_TINTS, resolveSectionTint } from '../domain/factory'
import { useProjectStore } from '../store/projectStore'
import { Modal } from './Modal'
import { SchemaEditor } from './SchemaEditor'
import { Tip } from './Tip'

type Props = {
  open: boolean
  onClose: () => void
}

export function SchemaModal({ open, onClose }: Props) {
  const project = useProjectStore((s) => s.project)
  const addColumn = useProjectStore((s) => s.addColumn)
  const renameColumn = useProjectStore((s) => s.renameColumn)
  const removeColumn = useProjectStore((s) => s.removeColumn)
  const moveColumn = useProjectStore((s) => s.moveColumn)
  const updateColumnSchema = useProjectStore((s) => s.updateColumnSchema)
  const addMiddleSection = useProjectStore((s) => s.addMiddleSection)
  const renameSection = useProjectStore((s) => s.renameSection)
  const updateSectionDescription = useProjectStore((s) => s.updateSectionDescription)
  const updateSectionTint = useProjectStore((s) => s.updateSectionTint)
  const removeMiddleSection = useProjectStore((s) => s.removeMiddleSection)

  return (
    <Modal title="Sections & schema" open={open} onClose={onClose} wide>
      <p className="muted section-hint">
        Manage Inputs / Modifiers / Outputs columns and their tooltips (including nested indices).
        Use ↑ ↓ to reorder columns.
      </p>

      <div className="schema-modal-grid">
        {project.sections.map((section) => (
          <Fragment key={section.id}>
            {section.role === 'outputs' && (
              <div className="schema-insert-middle">
                <Tip content="Insert a Modifiers section before Outputs">
                  <button
                    type="button"
                    onClick={() => {
                      const name = window.prompt('Modifiers section name', 'Modifiers')
                      if (name != null) addMiddleSection(name)
                    }}
                  >
                    + Modifiers section
                  </button>
                </Tip>
              </div>
            )}
            <section
              className={`schema-modal-card role-${section.role}`}
              style={{ ['--cell-tint' as string]: resolveSectionTint(section) }}
            >
              <div className="section-card-head">
                <input
                  className="section-name"
                  value={section.name}
                  onChange={(e) => renameSection(section.id, e.target.value)}
                />
                <span className="role-tag">
                  {section.role === 'middle' ? 'modifiers' : section.role}
                </span>
                {section.role === 'middle' && (
                  <Tip content="Remove this Modifiers section">
                    <button
                      type="button"
                      className="icon-btn"
                      onClick={() => removeMiddleSection(section.id)}
                    >
                      ×
                    </button>
                  </Tip>
                )}
              </div>
              <label className="section-desc-label">
                Section tooltip
                <textarea
                  value={section.description ?? ''}
                  rows={2}
                  placeholder="Shown when hovering the section header"
                  onChange={(e) => updateSectionDescription(section.id, e.target.value)}
                />
              </label>
              <div className="section-tint-row">
                <label className="section-tint-label">
                  Matrix tint
                  <input
                    type="color"
                    className="section-tint-swatch"
                    value={resolveSectionTint(section)}
                    onChange={(e) => updateSectionTint(section.id, e.target.value)}
                    title="Background tint for this section in the matrix"
                  />
                </label>
                {section.tint ? (
                  <button
                    type="button"
                    className="linkish"
                    onClick={() => updateSectionTint(section.id, undefined)}
                  >
                    Reset to default ({DEFAULT_SECTION_TINTS[section.role]})
                  </button>
                ) : (
                  <span className="muted section-tint-default">Default</span>
                )}
              </div>

              {section.columns.map((col, index) => (
                <div key={col.id} className="schema-modal-column">
                  <SchemaEditor
                    columnName={col.name}
                    onRename={(name) => renameColumn(section.id, col.id, name)}
                    schema={col.schema}
                    onChange={(schema) => updateColumnSchema(section.id, col.id, schema)}
                    canMoveUp={index > 0}
                    canMoveDown={index < section.columns.length - 1}
                    onMoveUp={() => moveColumn(section.id, col.id, -1)}
                    onMoveDown={() => moveColumn(section.id, col.id, 1)}
                    canRemove={section.columns.length > 1}
                    onRemove={() => removeColumn(section.id, col.id)}
                  />
                </div>
              ))}

              <Tip content="Add a parameter column to this section">
                <button type="button" className="add-col" onClick={() => addColumn(section.id)}>
                  + Column
                </button>
              </Tip>
            </section>
          </Fragment>
        ))}
      </div>
    </Modal>
  )
}
