import { WORLD, ARC_KINDS, isIdent, type ArcKind, type Net, type Place, type Verb } from '../core/model'
import {
  addGroup,
  addSeat,
  arcRef,
  deleteGroup,
  deleteSeat,
  deleteSelection,
  renameNode,
  sameArc,
  updateArc,
  updateGroup,
  updatePlace,
  updateSeat,
  updateVerb,
  validateNewId,
  type ArcRef,
  type Selection,
} from './edit'
import { NumberField, Row, TextField } from './fields'

interface Props {
  net: Net
  selection: Selection
  onCommit: (net: Net, sel?: Selection) => void
  onSelect: (s: Selection) => void
}

export function Inspector({ net, selection, onCommit, onSelect }: Props) {
  const place = selection?.kind === 'place' ? net.places.find((p) => p.id === selection.id) : undefined
  const verb = selection?.kind === 'verb' ? net.verbs.find((v) => v.id === selection.id) : undefined
  const arc = selection?.kind === 'arc' ? net.arcs.find((a) => sameArc(a, selection)) : undefined
  const group = selection?.kind === 'group' ? net.groups.find((g) => g.id === selection.id) : undefined
  const remove = () => onCommit(deleteSelection(net, selection), null)

  if (place) return <PlaceInspector net={net} place={place} onCommit={onCommit} onSelect={onSelect} onDelete={remove} />
  if (verb) return <VerbInspector net={net} verb={verb} onCommit={onCommit} onSelect={onSelect} onDelete={remove} />
  if (arc && selection?.kind === 'arc')
    return (
      <section className="panel-section">
        <Header kind="Arc" title={`${arc.kind} ${arc.place} → ${arc.verb}`} onDelete={remove} />
        <ArcEditor net={net} arcSel={selection} onCommit={onCommit} />
        <p className="hint">
          <button className="link" onClick={() => onSelect({ kind: 'place', id: arc.place })}>
            {arc.place}
          </button>{' '}
          ·{' '}
          <button className="link" onClick={() => onSelect({ kind: 'verb', id: arc.verb })}>
            {arc.verb}
          </button>
        </p>
      </section>
    )
  if (group)
    return (
      <section className="panel-section">
        <Header kind="Group" title={group.label} onDelete={remove} />
        <TextField label="Label" value={group.label} onCommit={(label) => onCommit(updateGroup(net, group.id, { label }))} />
        <p className="hint">Drag the group's outline to move every member. Deleting a group keeps its members.</p>
      </section>
    )
  return <NetPanel net={net} onCommit={onCommit} />
}

function Header({ kind, title, onDelete }: { kind: string; title: string; onDelete: () => void }) {
  return (
    <header className="inspector-head">
      <div>
        <span className="eyebrow">{kind}</span>
        <h2>{title}</h2>
      </div>
      <button className="ghost-btn danger" onClick={onDelete} title="Delete (Del)">
        Delete
      </button>
    </header>
  )
}

function IdField({ net, kind, id, onCommit }: { net: Net; kind: 'place' | 'verb'; id: string; onCommit: Props['onCommit'] }) {
  return (
    <TextField
      label="Id"
      mono
      value={id}
      validate={(v) => validateNewId(net, id, v)}
      onCommit={(v) => onCommit(renameNode(net, { kind, id }, v), { kind, id: v })}
    />
  )
}

function GroupSelect({ net, value, onChange }: { net: Net; value?: string; onChange: (g: string | undefined) => void }) {
  return (
    <Row label="Group">
      <select value={value ?? ''} onChange={(e) => onChange(e.target.value || undefined)} aria-label="Group">
        <option value="">None</option>
        {net.groups.map((g) => (
          <option key={g.id} value={g.id}>
            {g.label}
          </option>
        ))}
      </select>
    </Row>
  )
}

function PlaceInspector({ net, place: p, onCommit, onSelect, onDelete }: { net: Net; place: Place; onCommit: Props['onCommit']; onSelect: Props['onSelect']; onDelete: () => void }) {
  const set = (patch: Partial<Place>) => onCommit(updatePlace(net, p.id, patch))
  const everyone = p.seenBy === 'all'
  const toggleSeat = (seat: string, on: boolean) => {
    const cur = p.seenBy === 'all' ? net.seats.map((s) => s.id) : p.seenBy
    const next = on ? [...cur, seat] : cur.filter((s) => s !== seat)
    set({ seenBy: net.seats.every((s) => next.includes(s.id)) && net.seats.length > 0 ? 'all' : net.seats.map((s) => s.id).filter((s) => next.includes(s)) })
  }
  return (
    <section className="panel-section">
      <Header kind="Place" title={p.label} onDelete={onDelete} />
      <IdField net={net} kind="place" id={p.id} onCommit={onCommit} />
      <TextField label="Label" value={p.label} onCommit={(label) => set({ label })} />
      <NumberField label="Marks" value={p.marks} min={0} onCommit={(marks) => set({ marks })} />
      <Row label="Seen by">
        <div className="checks">
          <label className="check">
            <input type="checkbox" checked={everyone} onChange={(e) => set({ seenBy: e.target.checked ? 'all' : [] })} />
            Everyone
          </label>
          {net.seats.map((s) => (
            <label className="check" key={s.id}>
              <input type="checkbox" checked={everyone || (p.seenBy !== 'all' && p.seenBy.includes(s.id))} onChange={(e) => toggleSeat(s.id, e.target.checked)} />
              <span className="swatch" style={{ background: s.color }} />
              {s.name}
            </label>
          ))}
        </div>
      </Row>
      <Row label="Outcome">
        <div className="outcome-field">
          <label className="check">
            <input type="checkbox" checked={p.ends !== undefined} onChange={(e) => set({ ends: e.target.checked ? p.label : undefined })} />
            Ends the game
          </label>
        </div>
      </Row>
      {p.ends !== undefined ? <TextField label="Outcome text" value={p.ends} onCommit={(ends) => set({ ends })} /> : null}
      <GroupSelect net={net} value={p.group} onChange={(group) => set({ group })} />
      <ArcList net={net} filter={(a) => a.place === p.id} other={(a) => a.verb} onCommit={onCommit} onSelect={onSelect} />
    </section>
  )
}

function VerbInspector({ net, verb: v, onCommit, onSelect, onDelete }: { net: Net; verb: Verb; onCommit: Props['onCommit']; onSelect: Props['onSelect']; onDelete: () => void }) {
  const set = (patch: Partial<Verb>) => onCommit(updateVerb(net, v.id, patch))
  return (
    <section className="panel-section">
      <Header kind="Verb" title={v.label} onDelete={onDelete} />
      <IdField net={net} kind="verb" id={v.id} onCommit={onCommit} />
      <TextField label="Label" value={v.label} onCommit={(label) => set({ label })} />
      <Row label="Speaker">
        <select value={v.by} onChange={(e) => set({ by: e.target.value })} aria-label="Speaker">
          <option value={WORLD}>World (the rules)</option>
          {net.seats.map((s) => (
            <option key={s.id} value={s.id}>
              {s.name}
            </option>
          ))}
        </select>
      </Row>
      {v.by === WORLD ? (
        <>
          <NumberField label="Priority" value={v.priority} onCommit={(priority) => set({ priority })} />
          <NumberField label="Weight" value={v.weight} min={0} onCommit={(weight) => set({ weight })} />
          <p className="hint">The world speaks highest priority first. Ties are settled by chance in proportion to weight.</p>
        </>
      ) : (
        <p className="hint">A seat simply chooses; priority and weight only order the world's replies.</p>
      )}
      <GroupSelect net={net} value={v.group} onChange={(group) => set({ group })} />
      <ArcList net={net} filter={(a) => a.verb === v.id} other={(a) => a.place} onCommit={onCommit} onSelect={onSelect} />
    </section>
  )
}

function ArcList({
  net,
  filter,
  other,
  onCommit,
  onSelect,
}: {
  net: Net
  filter: (a: Net['arcs'][number]) => boolean
  other: (a: Net['arcs'][number]) => string
  onCommit: Props['onCommit']
  onSelect: Props['onSelect']
}) {
  const arcs = net.arcs.filter(filter)
  return (
    <div className="arc-list">
      <h3>Arcs</h3>
      {arcs.length === 0 ? <p className="hint">None yet. Drag from the node's dot to another node.</p> : null}
      {arcs.map((a) => (
        <div className="arc-item" key={`${a.kind}|${a.place}|${a.verb}`}>
          <KindSelect net={net} arcSel={arcRef(a)} onCommit={onCommit} keepSelection />
          {a.count !== 1 ? <span className="count">×{a.count}</span> : null}
          <button className="link mono" onClick={() => onSelect(arcRef(a))}>
            {other(a)}
          </button>
        </div>
      ))}
    </div>
  )
}

const KIND_HINT: Record<ArcKind, string> = {
  take: 'consumes marks when the verb is said',
  give: 'produces marks when the verb is said',
  need: 'requires marks, consumes none',
  unless: 'blocks the verb while the place holds at least this many',
}

function KindSelect({ net, arcSel, onCommit, keepSelection }: { net: Net; arcSel: ArcRef; onCommit: Props['onCommit']; keepSelection?: boolean }) {
  return (
    <select
      className="kind-select"
      aria-label="Arc kind"
      value={arcSel.arcKind}
      onChange={(e) => {
        const r = updateArc(net, arcSel, { kind: e.target.value as ArcKind })
        if (r) onCommit(r[0], keepSelection ? undefined : r[1])
      }}
    >
      {ARC_KINDS.map((k) => (
        <option key={k} value={k} disabled={!kindAllowed(net, arcSel, k)}>
          {k}
        </option>
      ))}
    </select>
  )
}

const kindAllowed = (net: Net, r: ArcRef, k: ArcKind) =>
  k === r.arcKind || !net.arcs.some((a) => a.place === r.place && a.verb === r.verb && a.kind === k)

function ArcEditor({ net, arcSel, onCommit }: { net: Net; arcSel: ArcRef; onCommit: Props['onCommit'] }) {
  const arc = net.arcs.find((a) => sameArc(a, arcSel))!
  return (
    <>
      <Row label="Kind">
        <KindSelect net={net} arcSel={arcSel} onCommit={onCommit} />
      </Row>
      <p className="hint">{KIND_HINT[arc.kind]}</p>
      <NumberField
        label="Count"
        value={arc.count}
        min={1}
        onCommit={(count) => {
          const r = updateArc(net, arcSel, { count })
          if (r) onCommit(r[0], r[1])
        }}
      />
    </>
  )
}

function NetPanel({ net, onCommit }: { net: Net; onCommit: Props['onCommit'] }) {
  return (
    <section className="panel-section">
      <header className="inspector-head">
        <div>
          <span className="eyebrow">Design</span>
          <h2>{net.title}</h2>
        </div>
      </header>
      <TextField label="Title" value={net.title} onCommit={(title) => onCommit({ ...net, title })} />
      <div className="list-head">
        <h3>Seats</h3>
        <button className="ghost-btn" onClick={() => onCommit(addSeat(net))}>
          + Seat
        </button>
      </div>
      {net.seats.length === 0 ? <p className="hint">No seats: only the world speaks.</p> : null}
      {net.seats.map((s) => (
        <div className="seat-row" key={s.id}>
          <input
            type="color"
            value={s.color}
            aria-label={`${s.name} color`}
            onChange={(e) => onCommit(updateSeat(net, s.id, { color: e.target.value }))}
          />
          <InlineText value={s.name} label="Seat name" onCommit={(name) => onCommit(updateSeat(net, s.id, { name }))} />
          <InlineText
            value={s.id}
            label="Seat id"
            mono
            validate={(v) => validateNewId(net, s.id, v)}
            onCommit={(id) => onCommit(updateSeat(net, s.id, { id }))}
          />
          <button className="icon-btn" aria-label={`Remove ${s.name}`} title="Remove seat (its verbs pass to the world)" onClick={() => onCommit(deleteSeat(net, s.id))}>
            ×
          </button>
        </div>
      ))}
      <div className="list-head">
        <h3>Groups</h3>
        <button className="ghost-btn" onClick={() => onCommit(addGroup(net))}>
          + Group
        </button>
      </div>
      {net.groups.map((g) => (
        <div className="seat-row" key={g.id}>
          <InlineText value={g.label} label="Group label" onCommit={(label) => onCommit(updateGroup(net, g.id, { label }))} />
          <InlineText
            value={g.id}
            label="Group id"
            mono
            validate={(v) => (v === g.id ? undefined : !isIdent(v) ? 'lowercase id' : net.groups.some((x) => x.id === v) ? 'taken' : undefined)}
            onCommit={(id) => onCommit(updateGroup(net, g.id, { id }))}
          />
          <button className="icon-btn" aria-label={`Remove ${g.label}`} title="Remove group (members stay)" onClick={() => onCommit(deleteGroup(net, g.id))}>
            ×
          </button>
        </div>
      ))}
      <p className="hint">
        Select a node to edit it. <kbd>P</kbd> adds a place and <kbd>V</kbd> a verb at the cursor; drag a node's dot onto another node to connect them.
      </p>
    </section>
  )
}

function InlineText({ value, label, onCommit, validate, mono }: { value: string; label: string; onCommit: (v: string) => void; validate?: (v: string) => string | undefined; mono?: boolean }) {
  return (
    <input
      key={value}
      className={`inline ${mono ? 'mono' : ''}`}
      defaultValue={value}
      aria-label={label}
      title={label}
      onBlur={(e) => {
        const v = e.target.value.trim()
        if (!v || validate?.(v)) e.target.value = value
        else if (v !== value) onCommit(v)
      }}
      onKeyDown={(e) => e.key === 'Enter' && (e.target as HTMLInputElement).blur()}
    />
  )
}
