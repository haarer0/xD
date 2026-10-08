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
 * High-contrast outlines keep them readable on dark UI.
 */
export function AtomIcon({ atom, size = 18, className, title }: Props) {
  const label =
    title ??
    (atom === 'y' ? 'yes (y)' : atom === 'n' ? 'no (n)' : 'don’t care (x)')

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
        <circle cx="10" cy="10" r="9" fill="#052e16" />
        <circle cx="10" cy="10" r="8" fill="#22c55e" />
        <path
          d="M5.2 10.2 L8.6 13.6 L14.8 6.4"
          fill="none"
          stroke="#052e16"
          strokeWidth="3.2"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
        <path
          d="M5.5 10.2 L8.6 13.2 L14.5 6.6"
          fill="none"
          stroke="#f0fdf4"
          strokeWidth="2.1"
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
        <circle cx="10" cy="10" r="9" fill="#1c1917" />
        <circle
          cx="10"
          cy="10"
          r="6.6"
          fill="none"
          stroke="#b91c1c"
          strokeWidth="2.2"
        />
        {/* Slash — unique shape cue independent of hue */}
        <path
          d="M5.2 14.8 L14.8 5.2"
          stroke="#1c1917"
          strokeWidth="3.2"
          strokeLinecap="round"
        />
        <path
          d="M5.6 14.4 L14.4 5.6"
          stroke="#fecaca"
          strokeWidth="2.1"
          strokeLinecap="round"
        />
      </svg>
    )
  }

  // x — single tilde in a lozenge (unique silhouette vs circles)
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
      {/* Soft outer silhouette */}
      <path
        d="M10 1.4 L18.6 10 L10 18.6 L1.4 10 Z"
        fill="#0f172a"
      />
      {/* Face — slate to match --x, same visual weight as y/n */}
      <path
        d="M10 2.55 L17.45 10 L10 17.45 L2.55 10 Z"
        fill="#64748b"
      />
      {/* Inner edge for depth at small sizes */}
      <path
        d="M10 3.7 L16.3 10 L10 16.3 L3.7 10 Z"
        fill="none"
        stroke="#94a3b8"
        strokeWidth="0.85"
        strokeLinejoin="round"
      />
      {/* One clear ~ wave, kept inside the diamond */}
      <path
        d="M6 10.55 C7.35 8.15 8.65 8.15 10 10.55 C11.35 12.95 12.65 12.95 14 10.55"
        fill="none"
        stroke="#0f172a"
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
