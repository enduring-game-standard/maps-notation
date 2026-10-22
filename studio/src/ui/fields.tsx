import { useEffect, useState, type ReactNode } from 'react'

/** A text field that commits on Enter or blur, so one edit is one undo step; `validate` blocks bad values with an inline message. */
export function TextField({
  label,
  value,
  onCommit,
  validate,
  mono,
  placeholder,
}: {
  label: string
  value: string
  onCommit: (v: string) => void
  validate?: (v: string) => string | undefined
  mono?: boolean
  placeholder?: string
}) {
  const [draft, setDraft] = useState(value)
  useEffect(() => setDraft(value), [value])
  const error = validate?.(draft)
  const commit = () => {
    if (error) return setDraft(value)
    if (draft !== value) onCommit(draft)
  }
  return (
    <Row label={label} error={error}>
      <input
        aria-label={label}
        className={mono ? 'mono' : undefined}
        value={draft}
        placeholder={placeholder}
        aria-invalid={!!error}
        onChange={(e) => setDraft(e.target.value)}
        onBlur={commit}
        onKeyDown={(e) => {
          if (e.key === 'Enter') (e.target as HTMLInputElement).blur()
          if (e.key === 'Escape') {
            setDraft(value)
            ;(e.target as HTMLInputElement).blur()
          }
        }}
      />
    </Row>
  )
}

export function NumberField({ label, value, onCommit, min }: { label: string; value: number; onCommit: (v: number) => void; min?: number }) {
  const [draft, setDraft] = useState(String(value))
  useEffect(() => setDraft(String(value)), [value])
  const commit = () => {
    const n = Number(draft)
    if (!/^-?\d+$/.test(draft.trim()) || (min !== undefined && n < min)) return setDraft(String(value))
    if (n !== value) onCommit(n)
  }
  return (
    <Row label={label}>
      <div className="stepper">
        <button type="button" onClick={() => (min === undefined || value - 1 >= min) && onCommit(value - 1)} aria-label={`Decrease ${label}`}>
          −
        </button>
        <input
          aria-label={label}
          inputMode="numeric"
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          onBlur={commit}
          onKeyDown={(e) => e.key === 'Enter' && (e.target as HTMLInputElement).blur()}
        />
        <button type="button" onClick={() => onCommit(value + 1)} aria-label={`Increase ${label}`}>
          +
        </button>
      </div>
    </Row>
  )
}

export function Row({ label, error, children }: { label: string; error?: string; children: ReactNode }) {
  return (
    <div className="row">
      <span className="row-label">{label}</span>
      <span className="row-control">{children}</span>
      {error ? <span className="row-error">{error}</span> : null}
    </div>
  )
}
