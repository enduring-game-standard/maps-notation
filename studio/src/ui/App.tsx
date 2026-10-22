import { useEffect, useMemo, useReducer, useRef, useState } from 'react'
import { compile, heardBy } from '../core/engine'
import { initialMarking, type Marking, type Net, type SeatId } from '../core/model'
import { parse } from '../core/text'
import { AnalysisPanel } from './AnalysisPanel'
import { Canvas, type Flight } from './Canvas'
import type { Selection } from './edit'
import { EXAMPLES, autosave, download, loadInitial, newNet } from './files'
import { docReducer } from './history'
import { Inspector } from './Inspector'
import { current, legalVerbs, randomMove, rewind, speak, startGame, transitions, type Game } from './play'
import { PHONE_QUERY, PhoneLayout, useMediaQuery } from './Phone'
import { PlayPanel } from './PlayPanel'
import { TextPane } from './TextPane'

type Mode = 'edit' | 'play'
type Drawer = 'text' | 'analysis' | null

const isTyping = (t: EventTarget | null) => t instanceof HTMLElement && (t.isContentEditable || /^(INPUT|TEXTAREA|SELECT)$/.test(t.tagName))

export function App() {
  const [doc, dispatch] = useReducer(docReducer, undefined, () => ({ net: loadInitial(), past: [], future: [] }))
  const { net } = doc
  const [selection, setSelection] = useState<Selection>(null)
  const [mode, setMode] = useState<Mode>('edit')
  const [drawer, setDrawer] = useState<Drawer>(null)
  const [viewer, setViewer] = useState<SeatId | undefined>(undefined)
  const [game, setGame] = useState<Game | null>(null)
  const [flight, setFlight] = useState<Flight | undefined>(undefined)
  const [autoplay, setAutoplay] = useState(false)
  const [fitKey, setFitKey] = useState(0)
  const [toast, setToast] = useState<string | null>(null)
  const fileInput = useRef<HTMLInputElement>(null)
  const phone = useMediaQuery(PHONE_QUERY)
  const [reveal, setReveal] = useState<{ tab: 'inspect' | 'text' | 'analysis'; key: number } | null>(null)
  const showTab = (tab: 'inspect' | 'text' | 'analysis') => setReveal((r) => ({ tab, key: (r?.key ?? 0) + 1 }))
  const flights = useRef(0)

  const compiled = useMemo(() => compile(net), [net])

  const commit = (next: Net, sel?: Selection) => {
    dispatch({ type: 'commit', net: next })
    if (sel !== undefined) setSelection(sel)
  }

  const open = (next: Net) => {
    commit(next, null)
    setMode('edit')
    setGame(null)
    setFitKey((k) => k + 1)
  }

  const animate = (g: Game) => {
    flights.current += 1
    const step = current(g)
    // Marks flying to a hidden state would reveal what the viewer must not see.
    const frames = transitions(compiled, step).filter((_, i) => heardBy(compiled, step.said[i], viewer) !== undefined)
    setFlight({ key: flights.current, frames })
  }

  const play = (from: Marking = initialMarking(net)) => {
    const g = startGame(compiled, from)
    setGame(g)
    setMode('play')
    setAutoplay(false)
    animate(g)
  }

  const onSpeak = (verb: string) => {
    if (!game) return
    const g = speak(compiled, game, verb)
    setGame(g)
    animate(g)
  }

  useEffect(() => {
    if (mode === 'play') play()
  }, [compiled])

  useEffect(() => {
    const t = setTimeout(() => autosave(net), 400)
    return () => clearTimeout(t)
  }, [net])

  useEffect(() => {
    if (!autoplay || !game) return
    const turn = current(game).turn
    if (turn.kind !== 'seats') return setAutoplay(false)
    const t = setTimeout(() => {
      const v = randomMove(turn)
      if (v) onSpeak(v)
    }, 650)
    return () => clearTimeout(t)
  }, [autoplay, game])

  useEffect(() => {
    const key = (e: KeyboardEvent) => {
      if (isTyping(e.target) || !(e.ctrlKey || e.metaKey)) return
      const k = e.key.toLowerCase()
      if (k === 'z' || k === 'y') {
        e.preventDefault()
        dispatch({ type: k === 'y' || e.shiftKey ? 'redo' : 'undo' })
      }
    }
    window.addEventListener('keydown', key)
    return () => window.removeEventListener('keydown', key)
  }, [])

  useEffect(() => {
    if (!toast) return
    const t = setTimeout(() => setToast(null), 4000)
    return () => clearTimeout(t)
  }, [toast])

  const importFile = async (file: File) => {
    try {
      open(parse(await file.text()))
    } catch (e) {
      setToast(`${file.name}: ${(e as Error).message}`)
    }
  }

  const now = game && current(game)
  const playView =
    mode === 'play' && now
      ? { marking: now.marking, viewer, legal: legalVerbs(now.turn, viewer), waiting: legalVerbs(now.turn, undefined), onSpeak, flight }
      : undefined

  if (phone) {
    const fileInputEl = (
      <input
        ref={fileInput}
        type="file"
        accept=".maps,text/plain"
        hidden
        onChange={(e) => {
          const f = e.target.files?.[0]
          if (f) importFile(f)
          e.target.value = ''
        }}
      />
    )
    return (
      <PhoneLayout
        net={net}
        mode={mode}
        onMode={(m) => (m === 'edit' ? (setMode('edit'), setAutoplay(false)) : mode !== 'play' && play())}
        canUndo={doc.past.length > 0}
        canRedo={doc.future.length > 0}
        onUndo={() => dispatch({ type: 'undo' })}
        onRedo={() => dispatch({ type: 'redo' })}
        fileMenu={
          <>
            <FileMenu label="⋯" onNew={() => open(newNet())} onExample={(text) => open(parse(text))} onImport={() => fileInput.current?.click()} onDownload={() => download(net)} />
            {fileInputEl}
          </>
        }
        canvas={
          <Canvas
            key={fitKey}
            net={net}
            mode={mode}
            selection={selection}
            onSelect={setSelection}
            onCommit={commit}
            onCheckpoint={() => dispatch({ type: 'checkpoint' })}
            onLive={(n) => dispatch({ type: 'live', net: n })}
            play={playView}
            fitKey={fitKey}
            touch
          />
        }
        inspector={<Inspector net={net} selection={selection} onCommit={commit} onSelect={setSelection} touch />}
        playPanel={
          game ? (
            <PlayPanel
              net={net}
              game={game}
              viewer={viewer}
              onViewer={setViewer}
              onRewind={(at) => setGame(rewind(game, at))}
              onRestart={() => play()}
              autoplay={autoplay}
              onAutoplay={setAutoplay}
              touch
            />
          ) : null
        }
        text={<TextPane net={net} onCommit={(n) => commit(n)} />}
        analysis={
          <AnalysisPanel
            net={net}
            onSelect={(s) => {
              setMode('edit')
              setSelection(s)
              showTab('inspect')
            }}
            onPlayFrom={(m) => (play(m), showTab('inspect'))}
          />
        }
        selection={selection}
        game={game}
        viewer={viewer}
        legal={playView?.legal ?? new Set()}
        onSpeak={onSpeak}
        onRestart={() => play()}
        reveal={reveal}
        toast={
          toast ? (
            <div className="toast" role="alert" onClick={() => setToast(null)}>
              {toast}
            </div>
          ) : null
        }
      />
    )
  }

  return (
    <div className={`app ${drawer ? 'has-drawer' : ''}`}>
      <header className="topbar">
        <div className="brand">
          <svg width="22" height="22" viewBox="0 0 22 22" aria-hidden>
            <circle cx="6" cy="11" r="4.5" />
            <rect x="12" y="6.5" width="8" height="9" rx="2.5" />
          </svg>
          <span>MAPS Studio</span>
        </div>
        <FileMenu
          onNew={() => open(newNet())}
          onExample={(text) => open(parse(text))}
          onImport={() => fileInput.current?.click()}
          onDownload={() => download(net)}
        />
        <input
          ref={fileInput}
          type="file"
          accept=".maps,text/plain"
          hidden
          onChange={(e) => {
            const f = e.target.files?.[0]
            if (f) importFile(f)
            e.target.value = ''
          }}
        />
        <span className="doc-title" title={net.title}>
          {net.title}
        </span>
        <div className="segmented" role="tablist" aria-label="Mode">
          <button role="tab" aria-selected={mode === 'edit'} className={mode === 'edit' ? 'is-on' : ''} onClick={() => (setMode('edit'), setAutoplay(false))}>
            Edit
          </button>
          <button role="tab" aria-selected={mode === 'play'} className={mode === 'play' ? 'is-on' : ''} onClick={() => mode !== 'play' && play()}>
            Play
          </button>
        </div>
        <div className="topbar-right">
          <button className="icon-btn" onClick={() => dispatch({ type: 'undo' })} disabled={!doc.past.length} title="Undo (Ctrl+Z)" aria-label="Undo">
            <svg width="16" height="16" viewBox="0 0 16 16" aria-hidden>
              <path d="M5 3 L2 6 L5 9 M2 6 H10 A4 4 0 0 1 10 14 H7" />
            </svg>
          </button>
          <button className="icon-btn" onClick={() => dispatch({ type: 'redo' })} disabled={!doc.future.length} title="Redo (Ctrl+Shift+Z)" aria-label="Redo">
            <svg width="16" height="16" viewBox="0 0 16 16" aria-hidden>
              <path d="M11 3 L14 6 L11 9 M14 6 H6 A4 4 0 0 0 6 14 H9" />
            </svg>
          </button>
          <span className="divider" />
          <button className={`tab-btn ${drawer === 'text' ? 'is-on' : ''}`} onClick={() => setDrawer(drawer === 'text' ? null : 'text')}>
            Text
          </button>
          <button className={`tab-btn ${drawer === 'analysis' ? 'is-on' : ''}`} onClick={() => setDrawer(drawer === 'analysis' ? null : 'analysis')}>
            Analysis
          </button>
        </div>
      </header>
      <aside className="drawer" hidden={!drawer}>
        <div className="drawer-head">
          <h2>{drawer === 'analysis' ? 'Analysis' : 'Text'}</h2>
          <span className="hint">{drawer === 'analysis' ? 'Does the game mean what you think?' : '.maps serialization'}</span>
          <button className="icon-btn" onClick={() => setDrawer(null)} aria-label="Close panel">
            ×
          </button>
        </div>
        <div className="drawer-body" hidden={drawer !== 'text'}>
          <TextPane net={net} onCommit={(n) => commit(n)} />
        </div>
        <div className="drawer-body" hidden={drawer !== 'analysis'}>
          <AnalysisPanel
            net={net}
            onSelect={(s) => {
              setMode('edit')
              setSelection(s)
            }}
            onPlayFrom={(m) => play(m)}
          />
        </div>
      </aside>
      <main className="stage">
        <Canvas
          key={fitKey}
          net={net}
          mode={mode}
          selection={selection}
          onSelect={setSelection}
          onCommit={commit}
          onCheckpoint={() => dispatch({ type: 'checkpoint' })}
          onLive={(n) => dispatch({ type: 'live', net: n })}
          play={playView}
          fitKey={fitKey}
        />
      </main>
      <aside className="sidebar">
        {mode === 'play' && game ? (
          <PlayPanel
            net={net}
            game={game}
            viewer={viewer}
            onViewer={setViewer}
            onRewind={(at) => setGame(rewind(game, at))}
            onRestart={() => play()}
            autoplay={autoplay}
            onAutoplay={setAutoplay}
          />
        ) : (
          <Inspector net={net} selection={selection} onCommit={commit} onSelect={setSelection} />
        )}
      </aside>
      {toast ? (
        <div className="toast" role="alert" onClick={() => setToast(null)}>
          {toast}
        </div>
      ) : null}
    </div>
  )
}

function FileMenu({ onNew, onExample, onImport, onDownload, label = 'File' }: { onNew: () => void; onExample: (text: string) => void; onImport: () => void; onDownload: () => void; label?: string }) {
  const ref = useRef<HTMLDetailsElement>(null)
  const close = (f: () => void) => () => {
    ref.current?.removeAttribute('open')
    f()
  }
  useEffect(() => {
    const away = (e: PointerEvent) => ref.current && !ref.current.contains(e.target as Node) && ref.current.removeAttribute('open')
    window.addEventListener('pointerdown', away)
    return () => window.removeEventListener('pointerdown', away)
  }, [])
  return (
    <details className="menu" ref={ref}>
      <summary aria-label={label === 'File' ? undefined : 'File menu'}>{label}</summary>
      <div className="menu-pop" role="menu">
        <button role="menuitem" onClick={close(onNew)}>
          New design
        </button>
        <div className="menu-label">Examples</div>
        {EXAMPLES.map((ex) => (
          <button role="menuitem" key={ex.name} onClick={close(() => onExample(ex.text))}>
            {ex.name}
          </button>
        ))}
        <hr />
        <button role="menuitem" onClick={close(onImport)}>
          Import .maps…
        </button>
        <button role="menuitem" onClick={close(onDownload)}>
          Download .maps
        </button>
      </div>
    </details>
  )
}
