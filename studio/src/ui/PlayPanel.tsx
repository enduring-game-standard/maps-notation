import { useEffect, useMemo, useRef } from 'react'
import { compile, heardBy } from '../core/engine'
import { WORLD, type Net, type SeatId } from '../core/model'
import { current, type Game, type Step } from './play'

interface Props {
  net: Net
  game: Game
  viewer: SeatId | undefined
  onViewer: (v: SeatId | undefined) => void
  onRewind: (at: number) => void
  onRestart: () => void
  autoplay: boolean
  onAutoplay: (on: boolean) => void
  touch?: boolean
}

const pct = (p: number) => `${Math.round(p * 1000) / 10}%`

export function PlayPanel({ net, game, viewer, onViewer, onRewind, onRestart, autoplay, onAutoplay, touch }: Props) {
  const now = current(game)
  const seat = (id: string) => net.seats.find((s) => s.id === id)
  const label = (verb: string) => net.verbs.find((v) => v.id === verb)?.label ?? verb
  const compiled = useMemo(() => compile(net), [net])
  const end = useRef<HTMLDivElement>(null)
  useEffect(() => {
    end.current?.scrollIntoView({ block: 'nearest' })
  }, [game.at, game.steps.length])

  return (
    <section className="panel-section play-panel">
      <header className="inspector-head">
        <div>
          <span className="eyebrow">Play</span>
          <h2>The conversation</h2>
        </div>
      </header>
      <div className="row">
        <span className="row-label">Viewing as</span>
        <span className="row-control">
          <select value={viewer ?? ''} onChange={(e) => onViewer(e.target.value || undefined)} aria-label="Viewing as">
            <option value="">Designer (sees all)</option>
            {net.seats.map((s) => (
              <option key={s.id} value={s.id}>
                {s.name}
              </option>
            ))}
          </select>
        </span>
      </div>
      <TurnStatus step={now} net={net} viewer={viewer} touch={touch} />
      <div className="controls">
        <button className="ghost-btn" onClick={onRestart}>
          Restart
        </button>
        <button className="ghost-btn" disabled={game.at === 0} onClick={() => onRewind(game.at - 1)}>
          Step back
        </button>
        <button className={`ghost-btn ${autoplay ? 'is-on' : ''}`} onClick={() => onAutoplay(!autoplay)} disabled={!autoplay && now.turn.kind !== 'seats'}>
          {autoplay ? 'Stop' : 'Autoplay'}
        </button>
      </div>
      <ol className="transcript" aria-label="Transcript">
        {game.steps.map((step, i) => (
          <li key={i} className={`turn ${i > game.at ? 'is-future' : ''} ${i === game.at ? 'is-now' : ''}`}>
            {step.said.length === 0 && i === 0 ? (
              <button className="line" onClick={() => onRewind(0)}>
                <span className="chip chip-start">Start</span>
                <span className="said">The conversation opens</span>
              </button>
            ) : null}
            {step.said.map((u, j) => {
              const s = u.speaker === WORLD ? undefined : seat(u.speaker)
              return (
                <button key={j} className={`line ${s ? 'is-seat' : 'is-world'}`} onClick={() => onRewind(i)} title="Rewind to here">
                  <span className="chip" style={s ? { background: s.color } : undefined}>
                    {s ? s.name : 'World'}
                  </span>
                  {heardBy(compiled, u, viewer) === undefined ? (
                    <span className="said is-hidden">acted</span>
                  ) : (
                    <span className="said">{label(u.verb)}</span>
                  )}
                  {u.p !== undefined ? <span className="chance">chance {pct(u.p)}</span> : null}
                </button>
              )
            })}
          </li>
        ))}
        {now.turn.kind === 'over' ? (
          <li className="turn is-now">
            <div className="line is-outcome">
              <span className="chip chip-outcome">Outcome</span>
              <span className="said">{now.turn.outcome}</span>
            </div>
          </li>
        ) : null}
      </ol>
      <div ref={end} />
    </section>
  )
}

export function TurnStatus({ step, net, viewer, touch }: { step: Step; net: Net; viewer: SeatId | undefined; touch?: boolean }) {
  const t = step.turn
  if (t.kind === 'over') return <div className="status is-over">Game over: {t.outcome}</div>
  if (t.kind === 'stalled') return <div className="status is-stalled">Nobody can speak. The design stalls here.</div>
  if (t.kind === 'broken') return <div className="status is-stalled">The world never falls silent: {t.message}</div>
  if (t.kind !== 'seats') return null
  const seats = [...t.choices.keys()].map((id) => net.seats.find((s) => s.id === id))
  return (
    <div className="status">
      {seats.map((s, i) =>
        s ? (
          <span key={s.id} className="chip" style={{ background: s.color }}>
            {s.name}
          </span>
        ) : (
          <span key={i} className="chip">
            ?
          </span>
        ),
      )}{' '}
      may speak
      {viewer && !t.choices.has(viewer) ? <span className="muted"> · you are waiting</span> : <span className="muted"> · {touch ? 'tap a move' : 'click a glowing verb'}</span>}
    </div>
  )
}
