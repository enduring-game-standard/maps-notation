// Hand-placed drawing of a MAPS net: every position and bend is chosen by a designer, the code only draws.
import { readFileSync, writeFileSync } from 'node:fs'
import { parse } from '/home/wscottsh/repos/egs/maps-notation/studio/src/core/text'
import { WORLD, type Net, type Arc } from '/home/wscottsh/repos/egs/maps-notation/studio/src/core/model'

export type P = [number, number]
export interface Spec {
  at: Record<string, P>
  /** perpendicular bend of an arc, in px, keyed state>verb or verb>state */
  bend?: Record<string, number>
  /** points a curved arc passes through, keyed like bend; drawn as one smooth curve */
  via?: Record<string, P[]>
  /** keys whose via points are corners of a polyline with rounded corners, for return loops */
  round?: string[]
  /** label side: n s e w ne nw se sw */
  label?: Record<string, string>
  /** verb bar angle in degrees (0 = horizontal bar, so flow is vertical) */
  bar?: Record<string, number>
  width: number
  height: number
}

const R = 17, BAR = 40
const esc = (s: string) => s.replace(/&/g, '&amp;').replace(/</g, '&lt;')

export function draw(net: Net, s: Spec): string {
  const out: string[] = [], labels: string[] = []
  const pos = (id: string) => { const p = s.at[id]; if (!p) throw new Error('no position for ' + id); return p }
  const isState = new Set(net.states.map((x) => x.id))
  const color = (by: string) => (by === WORLD ? '#555' : net.seats.find((x) => x.id === by)?.color ?? '#000')
  // bar angle: perpendicular to the mean direction of flow through the verb
  const barAngle = (v: string) => {
    if (s.bar?.[v] !== undefined) return (s.bar[v] * Math.PI) / 180
    const [vx, vy] = pos(v); let dx = 0, dy = 0
    for (const a of net.arcs.filter((a) => a.verb === v && (a.kind === 'take' || a.kind === 'give'))) {
      const [sx, sy] = pos(a.state); const l = Math.hypot(sx - vx, sy - vy) || 1
      const sg = a.kind === 'take' ? -1 : 1; dx += (sg * (sx - vx)) / l; dy += (sg * (sy - vy)) / l
    }
    return Math.atan2(dy, dx) + Math.PI / 2
  }
  const key = (a: Arc) => (a.kind === 'give' ? `${a.verb}>${a.state}` : `${a.state}>${a.verb}`)
  // R19: each arc meets a bar at its own point, ordered as its other end lies along the bar
  const attach = (v: string, other: P): P => {
    const [x, y] = pos(v), t = barAngle(v), ux = Math.cos(t), uy = Math.sin(t)
    const along = (other[0] - x) * ux + (other[1] - y) * uy
    const k = Math.max(-BAR / 2 + 4, Math.min(BAR / 2 - 4, along * 0.12))
    return [x + ux * k, y + uy * k]
  }
  for (const a of net.arcs) {
    const from = a.kind === 'give' ? a.verb : a.state, to = a.kind === 'give' ? a.state : a.verb
    const k0 = key(a)
    const via = s.via?.[k0] ?? []
    const far = (id: string, near: P): P => (isState.has(id) ? pos(id) : attach(id, near))
    const p1raw = pos(from), p2raw = pos(to)
    const n1 = via[0] ?? p2raw, n2 = via[via.length - 1] ?? p1raw
    let [x1, y1] = far(from, n1), [x2, y2] = far(to, n2)
    const b = s.bend?.[k0] ?? 0
    const mx = (x1 + x2) / 2, my = (y1 + y2) / 2, l = Math.hypot(x2 - x1, y2 - y1) || 1
    const ctrl: P = [mx + (b * -(y2 - y1)) / l, my + (b * (x2 - x1)) / l]
    const trim = (px: number, py: number, qx: number, qy: number, r: number): P => { const d = Math.hypot(qx - px, qy - py) || 1; return [px + ((qx - px) * r) / d, py + ((qy - py) * r) / d] }
    const first = via[0] ?? ctrl, last = via[via.length - 1] ?? ctrl
    const [ax, ay] = trim(x1, y1, first[0], first[1], isState.has(from) ? R + 1 : 2)
    const [bx, by] = trim(x2, y2, last[0], last[1], isState.has(to) ? R + 1 : 2)
    const read = a.kind === 'need' || a.kind === 'unless'
    const stroke = read ? '#8a8a8a' : '#222', w = read ? 1.2 : 1.6
    let d: string, cx: number, cy: number
    if (via.length && s.round?.includes(k0)) {
      const pts: P[] = [[ax, ay], ...via, [bx, by]], rr = 26
      d = `M${ax.toFixed(1)},${ay.toFixed(1)}`
      for (let i = 1; i < pts.length - 1; i++) {
        const [px, py] = pts[i - 1], [qx, qy] = pts[i], [nx, ny] = pts[i + 1]
        const l1 = Math.hypot(qx - px, qy - py), l2 = Math.hypot(nx - qx, ny - qy), r = Math.min(rr, l1 / 2, l2 / 2)
        const s1: P = [qx - ((qx - px) * r) / l1, qy - ((qy - py) * r) / l1], s2: P = [qx + ((nx - qx) * r) / l2, qy + ((ny - qy) * r) / l2]
        d += ` L${s1[0].toFixed(1)},${s1[1].toFixed(1)} Q${qx},${qy} ${s2[0].toFixed(1)},${s2[1].toFixed(1)}`
      }
      d += ` L${bx.toFixed(1)},${by.toFixed(1)}`
      const pv = pts[pts.length - 2]; cx = pv[0]; cy = pv[1]
    } else if (via.length) {
      const pts: P[] = [[ax, ay], ...via, [bx, by]]
      d = `M${ax.toFixed(1)},${ay.toFixed(1)}`
      for (let i = 0; i < pts.length - 1; i++) {
        const p0 = pts[i - 1] ?? pts[i], q1 = pts[i], q2 = pts[i + 1], p3 = pts[i + 2] ?? q2
        const c1: P = [q1[0] + (q2[0] - p0[0]) / 6, q1[1] + (q2[1] - p0[1]) / 6]
        const c2: P = [q2[0] - (p3[0] - q1[0]) / 6, q2[1] - (p3[1] - q1[1]) / 6]
        d += ` C${c1[0].toFixed(1)},${c1[1].toFixed(1)} ${c2[0].toFixed(1)},${c2[1].toFixed(1)} ${q2[0].toFixed(1)},${q2[1].toFixed(1)}`
        if (i === pts.length - 2) { cx = c2[0]; cy = c2[1] }
      }
    } else { d = `M${ax.toFixed(1)},${ay.toFixed(1)} Q${ctrl[0].toFixed(1)},${ctrl[1].toFixed(1)} ${bx.toFixed(1)},${by.toFixed(1)}`; cx = ctrl[0]; cy = ctrl[1] }
    out.push(`<path d="${d}" fill="none" stroke="${stroke}" stroke-width="${w}"${read ? ' stroke-dasharray="4 3"' : ''}/>`)
    const ang = Math.atan2(by - cy, bx - cx)
    if (!read) {
      const h = 9, k = 0.42
      out.push(`<path d="M${bx},${by} L${bx - h * Math.cos(ang - k)},${by - h * Math.sin(ang - k)} L${bx - h * Math.cos(ang + k)},${by - h * Math.sin(ang + k)} Z" fill="${stroke}"/>`)
    } else if (a.kind === 'need') out.push(`<circle cx="${bx}" cy="${by}" r="3.2" fill="${stroke}"/>`)
    else out.push(`<circle cx="${bx - 3.5 * Math.cos(ang)}" cy="${by - 3.5 * Math.sin(ang)}" r="3.5" fill="#fff" stroke="${stroke}" stroke-width="1.3"/>`)
    if (a.count > 1) out.push(`<text x="${(ax + bx) / 2}" y="${(ay + by) / 2 - 4}" font-size="12" font-weight="600" text-anchor="middle">${a.count}</text>`)
  }
  const lab = (id: string, text: string, x: number, y: number, r: number, fs: number, fill: string, bold = false) => {
    const side = s.label?.[id] ?? 's'
    const dx = side.includes('e') ? r + 6 : side.includes('w') ? -(r + 6) : 0
    const dy = side.includes('s') ? r + fs + 2 : side.includes('n') ? -(r + 6) : fs / 3
    const anchor = side.includes('e') ? 'start' : side.includes('w') ? 'end' : 'middle'
    const words = text.split(' '); const lines: string[] = []; let cur = ''
    for (const w of words) { if ((cur + ' ' + w).trim().length > 20 && cur) { lines.push(cur); cur = w } else cur = (cur + ' ' + w).trim() }
    lines.push(cur)
    const y0 = side.includes('n') ? y + dy - (lines.length - 1) * (fs + 2) : side === 'e' || side === 'w' ? y - ((lines.length - 1) * (fs + 2)) / 2 + fs / 3 : y + dy
    lines.forEach((t, i) => labels.push(`<text x="${x + dx}" y="${y0 + i * (fs + 2)}" font-size="${fs}" fill="${fill}" text-anchor="${anchor}" stroke="#fff" stroke-width="4" paint-order="stroke"${bold ? ' font-weight="700"' : ''}>${esc(t)}</text>`))
  }
  for (const v of net.verbs) {
    const [x, y] = pos(v.id), t = barAngle(v.id), c = color(v.by)
    const dx = (Math.cos(t) * BAR) / 2, dy = (Math.sin(t) * BAR) / 2
    out.push(`<line x1="${x - dx}" y1="${y - dy}" x2="${x + dx}" y2="${y + dy}" stroke="${c}" stroke-width="5" stroke-linecap="butt"/>`)
    lab(v.id, v.label, x, y, Math.abs(Math.cos(t)) > 0.5 ? BAR / 2 : 6, 12, c)
  }
  for (const st of net.states) {
    const [x, y] = pos(st.id)
    const hidden = st.seenBy !== 'all'
    out.push(`<circle cx="${x}" cy="${y}" r="${R}" fill="#fff" stroke="#222" stroke-width="1.6"${hidden ? ' stroke-dasharray="4 3"' : ''}/>`)
    if (st.ends) out.push(`<circle cx="${x}" cy="${y}" r="${R - 4}" fill="none" stroke="#222" stroke-width="1.6"/>`)
    if (st.marks === 1) out.push(`<circle cx="${x}" cy="${y}" r="5" fill="#222"/>`)
    else if (st.marks > 1) out.push(`<text x="${x}" y="${y + 5}" font-size="14" text-anchor="middle" font-weight="600">${st.marks}</text>`)
    lab(st.id, st.ends ?? st.label, x, y, R, 12.5, '#111', !!st.ends)
  }
  return `<svg xmlns="http://www.w3.org/2000/svg" width="${s.width}" height="${s.height}" viewBox="0 0 ${s.width} ${s.height}" font-family="Helvetica, Arial, sans-serif"><rect width="100%" height="100%" fill="#fff"/>${out.join('')}${labels.join('')}</svg>`
}

export function render(file: string, s: Spec, outSvg: string) {
  const net = parse(readFileSync(file, 'utf8'))
  const missing = [...net.states, ...net.verbs].filter((n) => !s.at[n.id]).map((n) => n.id)
  if (missing.length) throw new Error('unplaced: ' + missing.join(', '))
  writeFileSync(outSvg, draw(net, s))
}
