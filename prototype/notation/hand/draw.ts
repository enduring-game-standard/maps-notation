// Hand-placed drawing of a MAPS net: every position and bend is chosen by a designer, the code only draws.
import { readFileSync, writeFileSync } from 'node:fs'
import { parse } from '/home/wscottsh/repos/egs/maps-notation/studio/src/core/text'
import { WORLD, type Net, type Arc } from '/home/wscottsh/repos/egs/maps-notation/studio/src/core/model'

export type P = [number, number]
export interface Spec {
  at: Record<string, P>
  /** perpendicular bend of an arc, in px, keyed state>verb or verb>state */
  bend?: Record<string, number>
  /** label side: n s e w ne nw se sw */
  label?: Record<string, string>
  /** verb bar angle in degrees (0 = horizontal bar, so flow is vertical) */
  bar?: Record<string, number>
  width: number
  height: number
}

const R = 17, BAR = 30
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
  for (const a of net.arcs) {
    const from = a.kind === 'give' ? a.verb : a.state, to = a.kind === 'give' ? a.state : a.verb
    const [x1, y1] = pos(from), [x2, y2] = pos(to)
    const b = s.bend?.[key(a)] ?? 0
    const mx = (x1 + x2) / 2, my = (y1 + y2) / 2, l = Math.hypot(x2 - x1, y2 - y1) || 1
    const cx = mx + (b * -(y2 - y1)) / l, cy = my + (b * (x2 - x1)) / l
    // trim ends: circle radius at states, a little at bars
    const trim = (px: number, py: number, qx: number, qy: number, r: number): P => { const d = Math.hypot(qx - px, qy - py) || 1; return [px + ((qx - px) * r) / d, py + ((qy - py) * r) / d] }
    const [ax, ay] = trim(x1, y1, cx, cy, isState.has(from) ? R + 1 : 3)
    const [bx, by] = trim(x2, y2, cx, cy, isState.has(to) ? R + 1 : 3)
    const read = a.kind === 'need' || a.kind === 'unless'
    const stroke = read ? '#8a8a8a' : '#222', w = read ? 1.2 : 1.6
    out.push(`<path d="M${ax.toFixed(1)},${ay.toFixed(1)} Q${cx.toFixed(1)},${cy.toFixed(1)} ${bx.toFixed(1)},${by.toFixed(1)}" fill="none" stroke="${stroke}" stroke-width="${w}"${read ? ' stroke-dasharray="4 3"' : ''}/>`)
    const ang = Math.atan2(by - cy, bx - cx)
    if (!read) {
      const h = 9, k = 0.42
      out.push(`<path d="M${bx},${by} L${bx - h * Math.cos(ang - k)},${by - h * Math.sin(ang - k)} L${bx - h * Math.cos(ang + k)},${by - h * Math.sin(ang + k)} Z" fill="${stroke}"/>`)
    } else if (a.kind === 'need') out.push(`<circle cx="${bx}" cy="${by}" r="3.2" fill="${stroke}"/>`)
    else out.push(`<circle cx="${bx - 3.5 * Math.cos(ang)}" cy="${by - 3.5 * Math.sin(ang)}" r="3.5" fill="#fff" stroke="${stroke}" stroke-width="1.3"/>`)
    if (a.count > 1) out.push(`<text x="${cx}" y="${cy - 4}" font-size="12" font-weight="600" text-anchor="middle">${a.count}</text>`)
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
    lab(v.id, v.label, x, y, 12, 12, c)
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
