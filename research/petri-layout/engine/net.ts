export type NodeId = string

export type Place = { id: NodeId; label?: string; tokens: number }
export type Transition = { id: NodeId; label?: string }
export type Arc = { from: NodeId; to: NodeId; weight: number; inhibitor: boolean }

export type Net = {
  name: string
  places: Place[]
  transitions: Transition[]
  arcs: Arc[]
}

type RawNet = {
  name?: string
  places?: { id: string; label?: string; tokens?: number }[]
  transitions?: { id: string; label?: string }[]
  arcs?: { from: string; to: string; weight?: number; inhibitor?: boolean }[]
}

export function parseNet(json: unknown): Net {
  const raw = json as RawNet
  if (!raw || !Array.isArray(raw.places) || !Array.isArray(raw.transitions) || !Array.isArray(raw.arcs))
    throw new Error('a net needs places, transitions and arcs arrays')
  const places = raw.places.map((p) => ({ id: p.id, label: p.label || undefined, tokens: p.tokens ?? 0 }))
  const transitions = raw.transitions.map((t) => ({ id: t.id, label: t.label || undefined }))
  const P = new Set(places.map((p) => p.id))
  const T = new Set(transitions.map((t) => t.id))
  if (P.size !== places.length || T.size !== transitions.length || places.some((p) => T.has(p.id)))
    throw new Error('node ids must be unique')
  const arcs = raw.arcs.map((a) => {
    const ok = (P.has(a.from) && T.has(a.to)) || (T.has(a.from) && P.has(a.to))
    if (!ok) throw new Error(`arc ${a.from} -> ${a.to} must join a place and a transition`)
    if (a.inhibitor && !P.has(a.from)) throw new Error(`inhibitor arc ${a.from} -> ${a.to} must run place to transition`)
    return { from: a.from, to: a.to, weight: a.weight ?? 1, inhibitor: !!a.inhibitor }
  })
  return { name: raw.name ?? 'net', places, transitions, arcs }
}
