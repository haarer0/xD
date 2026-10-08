import { useEffect, useMemo, useState } from 'react'
import { downloadText, exportProjectJson } from '../persist/local'
import { useProjectStore } from '../store/projectStore'
import { Modal } from './Modal'

type Props = {
  open: boolean
  onClose: () => void
}

export function ExportJsonModal({ open, onClose }: Props) {
  const project = useProjectStore((s) => s.project)
  const json = useMemo(
    () => (open ? exportProjectJson(project) : ''),
    [open, project],
  )
  const [copied, setCopied] = useState(false)

  useEffect(() => {
    if (!open) setCopied(false)
  }, [open])

  const filename = `${project.name || 'xd'}.json`

  const copy = async () => {
    try {
      await navigator.clipboard.writeText(json)
      setCopied(true)
      window.setTimeout(() => setCopied(false), 1600)
    } catch {
      window.alert('Could not copy to clipboard')
    }
  }

  return (
    <Modal title="Export JSON" open={open} onClose={onClose} wide>
      <p className="muted export-json-hint">
        Full project snapshot (sections, schema, rows). Copy or download to share / back up.
      </p>
      <textarea
        className="export-json-textarea"
        readOnly
        value={json}
        spellCheck={false}
        aria-label="Project JSON"
        onFocus={(e) => e.currentTarget.select()}
      />
      <div className="export-json-actions">
        <button type="button" className="primary" onClick={() => void copy()}>
          {copied ? 'Copied' : 'Copy to clipboard'}
        </button>
        <button
          type="button"
          onClick={() => downloadText(filename, json, 'application/json')}
        >
          Download {filename}
        </button>
        <button type="button" onClick={onClose}>
          Close
        </button>
      </div>
    </Modal>
  )
}
