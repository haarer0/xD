import { SimplifyPanel } from './SimplifyPanel'
import { LogicSchemePanel } from './LogicSchemePanel'
import { Modal } from './Modal'

type Props = {
  open: boolean
  onClose: () => void
}

export function ResolverModal({ open, onClose }: Props) {
  return (
    <Modal title="Resolver" open={open} onClose={onClose} wide>
      <div className="resolver-modal">
        <SimplifyPanel />
        <LogicSchemePanel />
      </div>
    </Modal>
  )
}
