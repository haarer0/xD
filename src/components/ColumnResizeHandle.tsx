import { useEffect, useRef, useState } from 'react'

type Props = {
  columnKey: string
  onResize: (key: string, width: number) => void
  onReset: (key: string) => void
}

/**
 * Excel-like drag handle on the right edge of a column header.
 * Double-click resets to auto width.
 */
export function ColumnResizeHandle({ columnKey, onResize, onReset }: Props) {
  const [dragging, setDragging] = useState(false)
  const startX = useRef(0)
  const startWidth = useRef(0)
  const thRef = useRef<HTMLElement | null>(null)

  useEffect(() => {
    if (!dragging) return

    const onMove = (e: MouseEvent) => {
      const delta = e.clientX - startX.current
      onResize(columnKey, startWidth.current + delta)
    }
    const onUp = () => setDragging(false)

    document.body.classList.add('col-resizing')
    window.addEventListener('mousemove', onMove)
    window.addEventListener('mouseup', onUp)
    return () => {
      document.body.classList.remove('col-resizing')
      window.removeEventListener('mousemove', onMove)
      window.removeEventListener('mouseup', onUp)
    }
  }, [dragging, columnKey, onResize])

  return (
    <span
      className={`col-resize-handle ${dragging ? 'active' : ''}`}
      role="separator"
      aria-orientation="vertical"
      aria-label="Resize column"
      title="Drag to resize · Double-click to reset"
      onMouseDown={(e) => {
        e.preventDefault()
        e.stopPropagation()
        const th = (e.currentTarget.parentElement as HTMLElement | null) ?? null
        thRef.current = th
        startX.current = e.clientX
        startWidth.current = th?.getBoundingClientRect().width ?? 80
        setDragging(true)
      }}
      onDoubleClick={(e) => {
        e.preventDefault()
        e.stopPropagation()
        onReset(columnKey)
      }}
    />
  )
}
