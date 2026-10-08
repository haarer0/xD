import { useMemo } from 'react'
import { generateLogicScheme } from '../domain/logicScheme'
import { useProjectStore } from '../store/projectStore'
import { Tip } from './Tip'

export function LogicSchemePanel() {
  const project = useProjectStore((s) => s.project)
  const scheme = useMemo(() => generateLogicScheme(project), [project])

  return (
    <section className="logic-panel">
      <header className="panel-header">
        <h2>Logical scheme</h2>
        <Tip content="Copy the generated P/M ⇒ R expression to the clipboard">
          <button type="button" onClick={() => navigator.clipboard.writeText(scheme)}>
            Copy
          </button>
        </Tip>
      </header>
      <pre className="logic-scheme">{scheme}</pre>
      <p className="muted legend">
        ✓ tick (y) assert · ⊘ slash (n) !param · ◆~ diamond (x) omitted · nested leaves use P3[1][0] addressing
      </p>
    </section>
  )
}
