import { useEffect, useRef, useState, type ReactNode } from 'react'
import { WORLD, type Net, type SeatId } from '../core/model'
import { Legend } from './Canvas'
import type { Selection } from './edit'
import { current, type Game } from './play'
import { TurnStatus } from './PlayPanel'

export const PHONE_QUERY = '(max-width: 720px), (max-height: 500px) and (pointer: coarse)'
/** Keep in step with the landscape block in styles.css, where the sheet docks as a column. */
const DOCKED_QUERY = '(orientation: landscape) and (max-height: 500px)'

export function useMediaQuery(query: string) {
  const [match, setMatch] = useState(() => window.matchMedia(query).matches)
  useEffect(() => {
    const m = window.matchMedia(query)
    const on = () => setMatch(m.matches)
    m.addEventListener('change', on)
    return () => m.removeEventListener('change', on)
  }, [query])
  return match
}

export type Snap = 'peek' | 'half' | 'full'
type Tab = 'inspect' | 'text' | 'analysis'

interface Props {
  net: Net
  mode: 'edit' | 'play'
  onMode: (m: 'edit' | 'play') => void
  canUndo: boolean
  canRedo: boolean
  onUndo: () => void
  onRedo: () => void
  fileMenu: ReactNode
  canvas: ReactNode
  inspector: ReactNode
  playPanel: ReactNode
  text: ReactNode
  analysis: ReactNode
  selection: Selection
  game: Game | null
  viewer: SeatId | undefined
  legal: Set<string>
  onSpeak: (verb: string) => void
  onRestart: () => void
  /** bumped by the app when something elsewhere wants a tab shown, e.g. analysis selecting a node */
  reveal: { tab: Tab; key: number } | null
  toast: ReactNode
}

const ORDER: Snap[] = ['peek', 'half', 'full']

export function PhoneLayout(props: Props) {
  const { net, mode, game, viewer } = props
  const [snap, setSnap] = useState<Snap>('peek')
  const [tab, setTab] = useState<Tab>('inspect')
  const [dragH, setDragH] = useState<number | null>(null)
  const docked = useMediaQuery(DOCKED_QUERY)
  const open = docked || snap !== 'peek'
  const sheet = useRef<HTMLElement>(null)
  const drag = useRef<{ y: number; h: number; moved: boolean } | null>(null)

  useEffect(() => {
    if (!props.reveal) return
    setTab(props.reveal.tab)
    setSnap((s) => (s === 'peek' ? 'half' : s))
  }, [props.reveal?.key])

  const openTab = (t: Tab) => {
    if (t === tab && open) return docked ? undefined : setSnap('peek')
    setTab(t)
    if (snap === 'peek') setSnap('half')
  }

  const onGripDown = (e: React.PointerEvent) => {
    drag.current = { y: e.clientY, h: sheet.current!.getBoundingClientRect().height, moved: false }
    ;(e.target as Element).setPointerCapture(e.pointerId)
  }
  const onGripMove = (e: React.PointerEvent) => {
    const d = drag.current
    if (!d) return
    const dy = e.clientY - d.y
    if (Math.abs(dy) > 6) d.moved = true
    if (d.moved) setDragH(Math.max(56, d.h - dy))
  }
  const onGripUp = (e: React.PointerEvent) => {
    const d = drag.current
    drag.current = null
    setDragH(null)
    if (!d) return
    const i = ORDER.indexOf(snap)
    if (!d.moved) return setSnap(snap === 'peek' ? 'half' : 'peek')
    const dy = e.clientY - d.y
    const steps = Math.round(Math.abs(dy) / (window.innerHeight * 0.25)) || 1
    setSnap(ORDER[Math.max(0, Math.min(2, i + (dy < 0 ? steps : -steps)))])
  }

  const selected = describe(net, props.selection)
  const now = game && current(game)
  const tabs: { id: Tab; label: string }[] = [
    { id: 'inspect', label: mode === 'play' ? 'Conversation' : 'Inspect' },
    { id: 'text', label: 'Text' },
    { id: 'analysis', label: 'Analysis' },
  ]

  return (
    <div className="phone-app">
      <header className="phone-top">
        <svg className="phone-logo" width="22" height="22" viewBox="0 0 22 22" aria-hidden>
          <circle cx="6" cy="11" r="4.5" />
          <rect x="12" y="6.5" width="8" height="9" rx="2.5" />
        </svg>
        <span className="phone-title" title={net.title}>
          {net.title}
        </span>
        <div className="segmented" role="tablist" aria-label="Mode">
          <button role="tab" aria-selected={mode === 'edit'} className={mode === 'edit' ? 'is-on' : ''} onClick={() => props.onMode('edit')}>
            Edit
          </button>
          <button role="tab" aria-selected={mode === 'play'} className={mode === 'play' ? 'is-on' : ''} onClick={() => props.onMode('play')}>
            Play
          </button>
        </div>
        {mode === 'edit' ? (
          <>
            <button className="phone-icon" onClick={props.onUndo} disabled={!props.canUndo} aria-label="Undo">
              <svg width="18" height="18" viewBox="0 0 16 16" aria-hidden>
                <path d="M5 3 L2 6 L5 9 M2 6 H10 A4 4 0 0 1 10 14 H7" />
              </svg>
            </button>
            <button className="phone-icon" onClick={props.onRedo} disabled={!props.canRedo} aria-label="Redo">
              <svg width="18" height="18" viewBox="0 0 16 16" aria-hidden>
                <path d="M11 3 L14 6 L11 9 M14 6 H6 A4 4 0 0 0 6 14 H9" />
              </svg>
            </button>
          </>
        ) : null}
        {props.fileMenu}
      </header>
      <main className="phone-stage">{props.canvas}</main>
      <section ref={sheet} className={`sheet snap-${snap} ${dragH !== null ? 'is-dragging' : ''}`} style={dragH !== null ? { height: dragH } : undefined} aria-label="Panels">
        <div
          className="sheet-grip"
          role="button"
          aria-label={snap === 'peek' ? 'Expand panel' : 'Collapse panel'}
          onPointerDown={onGripDown}
          onPointerMove={onGripMove}
          onPointerUp={onGripUp}
          onPointerCancel={() => ((drag.current = null), setDragH(null))}
        >
          <span />
        </div>
        {mode === 'play' && now ? (
          <div className="sheet-play">
            <TurnStatus step={now} net={net} viewer={viewer} touch />
            <div className="moves" role="group" aria-label="Moves">
              {[...props.legal].map((id) => {
                const v = net.verbs.find((x) => x.id === id)
                const seat = v && v.by !== WORLD ? net.seats.find((s) => s.id === v.by) : undefined
                return v ? (
                  <button key={id} className="move" style={seat ? { background: seat.color } : undefined} onClick={() => props.onSpeak(id)}>
                    {v.label}
                  </button>
                ) : null
              })}
              {now.turn.kind !== 'seats' || props.legal.size === 0 ? (
                <button className="move is-quiet" onClick={props.onRestart}>
                  Play again
                </button>
              ) : null}
            </div>
          </div>
        ) : (
          <button className="sheet-summary" onClick={() => openTab('inspect')}>
            <span className="eyebrow">{selected.kind}</span>
            <span className="sheet-summary-title">{selected.title}</span>
            <span className="chev" aria-hidden>
              ›
            </span>
          </button>
        )}
        <nav className="sheet-tabs" role="tablist">
          {tabs.map((t) => (
            <button key={t.id} role="tab" aria-selected={tab === t.id && open} className={tab === t.id && open ? 'is-on' : ''} onClick={() => openTab(t.id)}>
              {t.label}
            </button>
          ))}
        </nav>
        <div className="sheet-body">
          <div hidden={tab !== 'inspect'}>
            {mode === 'play' ? props.playPanel : props.inspector}
            {mode === 'edit' && !props.selection ? (
              <div className="sheet-legend">
                <Legend />
              </div>
            ) : null}
          </div>
          <div hidden={tab !== 'text'} className="sheet-text">
            {props.text}
          </div>
          <div hidden={tab !== 'analysis'}>{props.analysis}</div>
        </div>
      </section>
      {props.toast}
    </div>
  )
}

const describe = (net: Net, s: Selection): { kind: string; title: string } => {
  if (!s) return { kind: 'Design', title: net.title }
  if (s.kind === 'state') return { kind: 'State', title: net.states.find((x) => x.id === s.id)?.label ?? s.id }
  if (s.kind === 'verb') return { kind: 'Verb', title: net.verbs.find((x) => x.id === s.id)?.label ?? s.id }
  if (s.kind === 'group') return { kind: 'Group', title: net.groups.find((x) => x.id === s.id)?.label ?? s.id }
  if (s.kind === 'arc') return { kind: 'Arc', title: `${s.arcKind} ${s.state} → ${s.verb}` }
  return { kind: 'Design', title: net.title }
}
