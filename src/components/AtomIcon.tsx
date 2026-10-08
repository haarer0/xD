import { useId } from 'react'
import type { Atom } from '../domain/types'

type Props = {
  atom: Atom
  size?: number
  className?: string
  title?: string
}

/**
 * Shape-first icons (not colour-only) for colour-blind accessibility:
 * y — filled circle + tick
 * n — ring + diagonal slash
 * x — diamond + tilde
 */
export function AtomIcon({ atom, size = 18, className, title }: Props) {
  const uid = useId().replace(/:/g, '')
  const label =
    title ??
    (atom === 'y' ? 'yes (y)' : atom === 'n' ? 'no (n)' : 'don’t care (x)')
  const gid = `atom-${atom}-${uid}`

  if (atom === 'y') {
    return (
      <svg
        className={className}
        width={size}
        height={size}
        viewBox="0 0 20 20"
        aria-label={label}
        role="img"
      >
        <title>{label}</title>
        <defs>
          <linearGradient id={`${gid}-fill`} x1="0" y1="0" x2="1" y2="1">
            <stop offset="0%" stopColor="#5eead4" />
            <stop offset="100%" stopColor="#22c55e" />
          </linearGradient>
        </defs>
        <circle cx="10" cy="10" r="9" fill="#042f2e" />
        <circle cx="10" cy="10" r="8" fill={`url(#${gid}-fill)`} />
        <circle
          cx="10"
          cy="10"
          r="7.2"
          fill="none"
          stroke="rgba(255,255,255,0.28)"
          strokeWidth="0.9"
        />
        <path
          d="M5.2 10.2 L8.6 13.6 L14.8 6.4"
          fill="none"
          stroke="#042f2e"
          strokeWidth="3.1"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
        <path
          d="M5.5 10.2 L8.6 13.2 L14.5 6.6"
          fill="none"
          stroke="#ecfdf5"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      </svg>
    )
  }

  if (atom === 'n') {
    return (
      <svg
        className={className}
        width={size}
        height={size}
        viewBox="0 0 20 20"
        aria-label={label}
        role="img"
      >
        <title>{label}</title>
        <defs>
          <linearGradient id={`${gid}-ring`} x1="0" y1="1" x2="1" y2="0">
            <stop offset="0%" stopColor="#fb7185" />
            <stop offset="100%" stopColor="#f43f5e" />
          </linearGradient>
        </defs>
        <circle cx="10" cy="10" r="9" fill="#1c1014" />
        <circle
          cx="10"
          cy="10"
          r="6.7"
          fill="rgba(251,113,133,0.12)"
          stroke={`url(#${gid}-ring)`}
          strokeWidth="2.15"
        />
        <path
          d="M5.2 14.8 L14.8 5.2"
          stroke="#1c1014"
          strokeWidth="3.1"
          strokeLinecap="round"
        />
        <path
          d="M5.6 14.4 L14.4 5.6"
          stroke="#ffe4e6"
          strokeWidth="2"
          strokeLinecap="round"
        />
      </svg>
    )
  }

  // x — tilde in diamond (unique silhouette vs circles)
  return (
    <svg
      className={className}
      width={size}
      height={size}
      viewBox="0 0 20 20"
      aria-label={label}
      role="img"
    >
      <title>{label}</title>
      <defs>
        <linearGradient id={`${gid}-fill`} x1="0" y1="0" x2="1" y2="1">
          <stop offset="0%" stopColor="#94a3b8" />
          <stop offset="100%" stopColor="#64748b" />
        </linearGradient>
      </defs>
      <path d="M10 1.4 L18.6 10 L10 18.6 L1.4 10 Z" fill="#0b1220" />
      <path
        d="M10 2.55 L17.45 10 L10 17.45 L2.55 10 Z"
        fill={`url(#${gid}-fill)`}
      />
      <path
        d="M10 3.7 L16.3 10 L10 16.3 L3.7 10 Z"
        fill="none"
        stroke="rgba(255,255,255,0.35)"
        strokeWidth="0.9"
        strokeLinejoin="round"
      />
      <path
        d="M6 10.55 C7.35 8.15 8.65 8.15 10 10.55 C11.35 12.95 12.65 12.95 14 10.55"
        fill="none"
        stroke="#0b1220"
        strokeWidth="2.7"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <path
        d="M6 10.55 C7.35 8.15 8.65 8.15 10 10.55 C11.35 12.95 12.65 12.95 14 10.55"
        fill="none"
        stroke="#f8fafc"
        strokeWidth="1.65"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  )
}
