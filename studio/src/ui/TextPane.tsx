import { useEffect, useMemo, useRef, useState } from 'react'
import type { Net } from '../core/model'
import { MapsSyntaxError, parse, print } from '../core/text'

/** While the designer types, their draft is the truth; the canvas follows each draft that parses, and the draft is only reprinted when the net changes from elsewhere. */
export function TextPane({ net, onCommit }: { net: Net; onCommit: (net: Net) => void }) {
  const printed = useMemo(() => print(net), [net])
  const [draft, setDraft] = useState(printed)
  const [error, setError] = useState<MapsSyntaxError | null>(null)
  const ours = useRef<Net | null>(null)
  const area = useRef<HTMLTextAreaElement>(null)
  const gutter = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (net === ours.current) return
    setDraft(printed)
    setError(null)
  }, [net, printed])

  useEffect(() => {
    if (draft === printed) return
    const t = setTimeout(() => {
      try {
        const next = parse(draft)
        if (print(next) === printed) return setError(null)
        ours.current = next
        setError(null)
        onCommit(next)
      } catch (e) {
        if (e instanceof MapsSyntaxError) setError(e)
        else throw e
      }
    }, 350)
    return () => clearTimeout(t)
  }, [draft])

  const lines = draft.split('\n').length
  return (
    <div className="text-pane">
      <div className="editor">
        <div className="gutter" ref={gutter} aria-hidden>
          {gutterRuns(lines, error?.line).map((r) =>
            r.error ? (
              <div key={r.from} className="is-error">
                {r.from}
              </div>
            ) : (
              <div key={r.from} className="run">
                {Array.from({ length: r.to - r.from + 1 }, (_, i) => r.from + i).join('\n')}
              </div>
            ),
          )}
        </div>
        <textarea
          ref={area}
          spellCheck={false}
          value={draft}
          aria-label="MAPS text"
          onChange={(e) => setDraft(e.target.value)}
          onScroll={(e) => gutter.current && (gutter.current.scrollTop = e.currentTarget.scrollTop)}
        />
      </div>
      {error ? (
        <button
          className="text-error"
          onClick={() => {
            const el = area.current!
            const at = draft.split('\n').slice(0, error.line - 1).join('\n').length + (error.line > 1 ? 1 : 0)
            el.focus()
            el.setSelectionRange(at, at + (draft.split('\n')[error.line - 1]?.length ?? 0))
          }}
        >
          <strong>Line {error.line}</strong> {error.message.replace(/^line \d+: /, '')}
        </button>
      ) : (
        <div className="text-ok">Parses cleanly · edits apply as you type</div>
      )}
    </div>
  )
}

/** Line numbers as at most three blocks of text around the error line, so a long file costs three nodes, not one per line. */
const gutterRuns = (lines: number, errorLine?: number) => {
  const e = errorLine && errorLine <= lines ? errorLine : undefined
  const runs: { from: number; to: number; error?: boolean }[] = []
  if (!e) return [{ from: 1, to: lines }]
  if (e > 1) runs.push({ from: 1, to: e - 1 })
  runs.push({ from: e, to: e, error: true })
  if (e < lines) runs.push({ from: e + 1, to: lines })
  return runs
}
