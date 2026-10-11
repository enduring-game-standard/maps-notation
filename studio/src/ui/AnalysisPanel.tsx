import { useMemo, useState } from 'react'
import { LIVELOCK, STALLED, analyze, type Analysis } from '../core/analyze'
import { check } from '../core/check'
import type { Marking, Net } from '../core/model'
import type { Selection } from './edit'

const UNBOUNDED = 50
const fmt = (n: number) => n.toLocaleString('en-US')

interface Props {
  net: Net
  onSelect: (s: Selection) => void
  onPlayFrom: (m: Marking) => void
}

type Run = { status: 'idle' } | { status: 'running' } | { status: 'done'; net: Net; result: Analysis; ms: number } | { status: 'failed'; net: Net; message: string }

export function AnalysisPanel({ net, onSelect, onPlayFrom }: Props) {
  const problems = useMemo(() => check(net), [net])
  const [run, setRun] = useState<Run>({ status: 'idle' })
  const selectId = (id: string) => {
    if (net.places.some((p) => p.id === id)) onSelect({ kind: 'place', id })
    else if (net.verbs.some((v) => v.id === id)) onSelect({ kind: 'verb', id })
  }

  const start = () => {
    setRun({ status: 'running' })
    const target = net
    // Two frames so the spinner paints before the walk blocks the main thread.
    requestAnimationFrame(() =>
      requestAnimationFrame(() => {
        const t = performance.now()
        try {
          setRun({ status: 'done', net: target, result: analyze(target), ms: performance.now() - t })
        } catch (e) {
          setRun({ status: 'failed', net: target, message: (e as Error).message })
        }
      }),
    )
  }

  const stale = (run.status === 'done' || run.status === 'failed') && run.net !== net

  return (
    <div className="analysis">
      <div className="analysis-run">
        <button className="primary-btn" onClick={start} disabled={run.status === 'running'}>
          {run.status === 'running' ? <span className="spinner" aria-hidden /> : null}
          {run.status === 'running' ? 'Playing every game…' : 'Analyze'}
        </button>
        <span className="hint">Plays out every conversation the design allows.</span>
      </div>
      {stale ? <p className="stale">The design changed since this analysis. Run it again to refresh.</p> : null}
      {run.status === 'failed' ? <p className="stale">Analysis stopped: {run.message}</p> : null}
      {run.status === 'done' ? <Results r={run.result} ms={run.ms} net={run.net} selectId={selectId} onPlayFrom={onPlayFrom} /> : null}
      <h3 className="section-title">
        Structure <span className="count-pill">{problems.length || 'ok'}</span>
      </h3>
      {problems.length === 0 ? <p className="hint">No structural problems.</p> : null}
      <ul className="problems">
        {problems.map((p, i) => (
          <li key={i}>
            <button className={`problem is-${p.severity}`} onClick={() => p.at && selectId(p.at)} disabled={!p.at}>
              <span className="sev">{p.severity}</span>
              {p.message}
            </button>
          </li>
        ))}
      </ul>
    </div>
  )
}

function Results({ r, ms, net, selectId, onPlayFrom }: { r: Analysis; ms: number; net: Net; selectId: (id: string) => void; onPlayFrom: (m: Marking) => void }) {
  const total = [...r.outcomes.values()].reduce((a, b) => a + b, 0)
  const growing = [...r.maxMarks].filter(([, n]) => n > UNBOUNDED)
  const label = (id: string) => net.places.find((p) => p.id === id)?.label ?? net.verbs.find((v) => v.id === id)?.label ?? id
  return (
    <div className="results">
      <div className="stats">
        <Stat value={fmt(r.nodes.size)} label={r.complete ? 'positions' : 'positions (stopped early)'} />
        <Stat
          value={typeof r.plays === 'number' ? fmt(r.plays) : r.plays === 'endless' ? '∞' : '?'}
          label={typeof r.plays === 'number' ? 'distinct plays' : r.plays === 'endless' ? 'plays: seats can loop forever' : 'plays: unknown'}
        />
        <Stat value={fmt(total)} label="ending positions" />
      </div>
      <p className="hint">{Math.round(ms)} ms{r.complete ? '' : ' · the walk hit its limit, so some answers are partial'}</p>
      <h3 className="section-title">Outcomes</h3>
      {r.outcomes.size === 0 ? <p className="hint">No outcome is ever reached.</p> : null}
      <table className="outcomes">
        <thead>
          <tr>
            <th>Outcome</th>
            <th>Positions</th>
            <th>Plays</th>
          </tr>
        </thead>
        <tbody>
          {[...r.outcomes].map(([o, n]) => (
            <tr key={o}>
              <td>{o}</td>
              <td>{fmt(n)}</td>
              <td>{r.playsBy.has(o) ? fmt(r.playsBy.get(o)!) : '—'}</td>
            </tr>
          ))}
          {r.playsBy.has(STALLED) ? (
            <tr className="is-stalled">
              <td>Stalled</td>
              <td>{fmt(r.stalls.length)}</td>
              <td>{fmt(r.playsBy.get(STALLED)!)}</td>
            </tr>
          ) : null}
          {r.playsBy.has(LIVELOCK) ? (
            <tr className="is-stalled">
              <td>World never falls silent</td>
              <td>{fmt(r.livelocks.length)}</td>
              <td>{fmt(r.playsBy.get(LIVELOCK)!)}</td>
            </tr>
          ) : null}
        </tbody>
      </table>
      <h3 className="section-title">
        Stalls <span className={`count-pill ${r.stalls.length ? 'is-bad' : ''}`}>{fmt(r.stalls.length)}</span>
      </h3>
      {r.stalls.length ? (
        <button className="ghost-btn" onClick={() => onPlayFrom(r.nodes.get(r.stalls[0])!.marking)}>
          Play from the first stall
        </button>
      ) : (
        <p className="hint">No conversation stalls before an outcome.</p>
      )}
      <h3 className="section-title">
        Livelocks <span className={`count-pill ${r.livelocks.length ? 'is-bad' : ''}`}>{fmt(r.livelocks.length)}</span>
      </h3>
      {r.livelocks.length ? (
        <button className="ghost-btn" onClick={() => onPlayFrom(r.nodes.get(r.livelocks[0])!.marking)}>
          Play from the first livelock
        </button>
      ) : (
        <p className="hint">The world always falls silent.</p>
      )}
      <h3 className="section-title">
        Dead verbs <span className={`count-pill ${r.deadVerbs.length ? 'is-bad' : ''}`}>{r.complete ? r.deadVerbs.length : '?'}</span>
      </h3>
      {r.deadVerbs.length ? (
        <div className="tags">
          {r.deadVerbs.map((v) => (
            <button key={v} className="tag" onClick={() => selectId(v)}>
              {label(v)}
            </button>
          ))}
        </div>
      ) : (
        <p className="hint">{r.complete ? 'Every verb is said in some play.' : 'Unknown until the walk completes.'}</p>
      )}
      <h3 className="section-title">
        Unbounded? <span className={`count-pill ${growing.length ? 'is-bad' : ''}`}>{growing.length}</span>
      </h3>
      {growing.length ? (
        <div className="tags">
          {growing.map(([id, n]) => (
            <button key={id} className="tag" onClick={() => selectId(id)}>
              {label(id)} · {fmt(n)}
            </button>
          ))}
        </div>
      ) : (
        <p className="hint">No place holds more than {UNBOUNDED} marks.</p>
      )}
      <details className="max-marks">
        <summary>Most marks each place ever holds</summary>
        <ul>
          {[...r.maxMarks].map(([id, n]) => (
            <li key={id}>
              <button className="link" onClick={() => selectId(id)}>
                {label(id)}
              </button>
              <span>{fmt(n)}</span>
            </li>
          ))}
        </ul>
      </details>
    </div>
  )
}

function Stat({ value, label }: { value: string; label: string }) {
  return (
    <div className="stat">
      <strong>{value}</strong>
      <span>{label}</span>
    </div>
  )
}
