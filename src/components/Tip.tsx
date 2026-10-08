import {
  cloneElement,
  isValidElement,
  useEffect,
  useId,
  useLayoutEffect,
  useRef,
  useState,
  type ReactElement,
  type ReactNode,
} from 'react'
import { createPortal } from 'react-dom'

type Props = {
  content?: ReactNode
  children: ReactElement
  /** Delay before show (ms) */
  delay?: number
  /** Prefer opening above the trigger */
  preferTop?: boolean
}

type TipPos = {
  x: number
  y: number
  placement: 'top' | 'bottom'
}

export function Tip({ content, children, delay = 280, preferTop = false }: Props) {
  const [pos, setPos] = useState<TipPos | null>(null)
  const timer = useRef<number | null>(null)
  const tipRef = useRef<HTMLDivElement>(null)
  const anchorRef = useRef<HTMLElement | null>(null)
  const tipId = useId()

  useEffect(() => {
    return () => {
      if (timer.current != null) window.clearTimeout(timer.current)
    }
  }, [])

  useLayoutEffect(() => {
    if (!pos || !tipRef.current || !anchorRef.current) return
    const tipRect = tipRef.current.getBoundingClientRect()
    const anchor = anchorRef.current.getBoundingClientRect()
    const pad = 8
    let x = pos.x
    let y = pos.y
    let placement = pos.placement

    // Keep within horizontal viewport
    const half = tipRect.width / 2
    x = Math.min(window.innerWidth - pad - half, Math.max(pad + half, x))

    const spaceBelow = window.innerHeight - anchor.bottom
    const spaceAbove = anchor.top
    const need = tipRect.height + 12

    if (placement === 'bottom' && spaceBelow < need && spaceAbove > spaceBelow) {
      placement = 'top'
      y = anchor.top - 6
    } else if (placement === 'top' && spaceAbove < need && spaceBelow > spaceAbove) {
      placement = 'bottom'
      y = anchor.bottom + 6
    }

    if (placement !== pos.placement || x !== pos.x || y !== pos.y) {
      setPos({ x, y, placement })
    }
  }, [pos])

  if (content == null || content === '') {
    return children
  }

  if (!isValidElement(children)) {
    return children
  }

  const show = (el: HTMLElement) => {
    anchorRef.current = el
    const rect = el.getBoundingClientRect()
    const spaceBelow = window.innerHeight - rect.bottom
    const spaceAbove = rect.top
    const preferAbove = preferTop || spaceBelow < 96 || spaceBelow < spaceAbove
    setPos({
      x: rect.left + rect.width / 2,
      y: preferAbove ? rect.top - 6 : rect.bottom + 6,
      placement: preferAbove ? 'top' : 'bottom',
    })
  }

  const hide = () => {
    if (timer.current != null) window.clearTimeout(timer.current)
    timer.current = null
    anchorRef.current = null
    setPos(null)
  }

  const child = cloneElement(children, {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    ...(children.props as any),
    'aria-describedby': pos ? tipId : undefined,
    onMouseEnter: (e: React.MouseEvent<HTMLElement>) => {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      ; (children.props as any).onMouseEnter?.(e)
      const target = e.currentTarget
      if (timer.current != null) window.clearTimeout(timer.current)
      timer.current = window.setTimeout(() => show(target), delay)
    },
    onMouseLeave: (e: React.MouseEvent<HTMLElement>) => {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      ; (children.props as any).onMouseLeave?.(e)
      hide()
    },
    onFocus: (e: React.FocusEvent<HTMLElement>) => {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      ; (children.props as any).onFocus?.(e)
      show(e.currentTarget)
    },
    onBlur: (e: React.FocusEvent<HTMLElement>) => {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      ; (children.props as any).onBlur?.(e)
      hide()
    },
  } as Partial<typeof children.props>)

  return (
    <>
      {child}
      {pos &&
        createPortal(
          <div
            ref={tipRef}
            id={tipId}
            role="tooltip"
            className={`tip-bubble tip-${pos.placement}`}
            style={{ left: pos.x, top: pos.y }}
          >
            {typeof content === 'string'
              ? content.split('\n').map((line, i) => (
                <div key={i} className={i === 0 ? 'tip-title' : 'tip-body'}>
                  {line}
                </div>
              ))
              : content}
          </div>,
          document.body,
        )}
    </>
  )
}
