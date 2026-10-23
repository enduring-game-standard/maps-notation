import type { Net } from './net.ts'
import { PLACE_R, type Layout, type Pt } from './layout.ts'

// Peterson's drawing style: thin circles, short thick bars, filled arrowheads, italic labels, dots for tokens.
export function renderSvg(net: Net, layout: Layout, opts: { title?: string } = {}): string {
  const pts: Pt[] = []
  for (const n of Object.values(layout.nodes)) {
    pts.push({ x: n.x - 40, y: n.y - 30 }, { x: n.x + 40, y: n.y + 30 })
    if (n.label) pts.push({ x: n.label.x + (n.label.anchor === 'start' ? 110 : n.label.anchor === 'end' ? -110 : 0), y: n.label.y })
  }
  for (const a of layout.arcs) pts.push(...a.path)
  const minX = Math.min(...pts.map((p) => p.x)) - 10, maxX = Math.max(...pts.map((p) => p.x)) + 10
  const minY = Math.min(...pts.map((p) => p.y)) - 10, maxY = Math.max(...pts.map((p) => p.y)) + 10
  const titleH = opts.title ? 28 : 0
  const out: string[] = []
  out.push(`<svg xmlns="http://www.w3.org/2000/svg" viewBox="${f(minX)} ${f(minY - titleH)} ${f(maxX - minX)} ${f(maxY - minY + titleH)}" width="${f(maxX - minX)}" height="${f(maxY - minY + titleH)}" font-family="Times New Roman, serif">`)
  out.push(`<rect x="${f(minX)}" y="${f(minY - titleH)}" width="${f(maxX - minX)}" height="${f(maxY - minY + titleH)}" fill="white"/>`)
  if (opts.title) out.push(`<text x="${f(minX + 6)}" y="${f(minY - 8)}" font-size="15" font-weight="bold">${esc(opts.title)}</text>`)
  out.push('<defs><marker id="ah" viewBox="0 0 10 10" refX="10" refY="5" markerWidth="9" markerHeight="9" markerUnits="userSpaceOnUse" orient="auto"><path d="M0,1 L10,5 L0,9 z" fill="black"/></marker></defs>')

  for (const a of layout.arcs) {
    const offsets = a.weight > 1 && a.weight <= 3 ? spread(a.weight, 4) : [0]
    for (const o of offsets) {
      const d = pathD(o ? offsetPath(a.path, o) : a.path)
      out.push(`<path d="${d}" fill="none" stroke="black" stroke-width="${a.weight > 3 ? 3.5 : 1.6}"${a.inhibitor ? '' : ' marker-end="url(#ah)"'}/>`)
    }
    if (a.inhibitor) { const e = a.path[a.path.length - 1]; out.push(`<circle cx="${f(e.x)}" cy="${f(e.y)}" r="4" fill="white" stroke="black" stroke-width="1.5"/>`) }
    if (a.weight > 3) { const m = bezierMid(a.path); out.push(`<text x="${f(m.x + 6)}" y="${f(m.y - 6)}" font-size="13">${a.weight}</text>`) }
  }
  for (const p of net.places) {
    const n = layout.nodes[p.id]
    out.push(`<circle cx="${f(n.x)}" cy="${f(n.y)}" r="${PLACE_R}" fill="white" stroke="black" stroke-width="1.6"/>`)
    out.push(tokens(n.x, n.y, p.tokens))
  }
  for (const t of net.transitions) {
    const n = layout.nodes[t.id]
    if (n.kind !== 'transition') continue
    const dx = Math.cos(n.angle) * n.length / 2, dy = Math.sin(n.angle) * n.length / 2
    out.push(`<line x1="${f(n.x - dx)}" y1="${f(n.y - dy)}" x2="${f(n.x + dx)}" y2="${f(n.y + dy)}" stroke="black" stroke-width="3"/>`)
  }
  for (const node of [...net.places, ...net.transitions]) {
    const n = layout.nodes[node.id]
    const text = node.label ?? node.id
    if (!n.label || !text) continue
    const lines = wrap(text, 16)
    lines.forEach((ln, i) => out.push(`<text x="${f(n.label!.x)}" y="${f(n.label!.y + (i - (lines.length - 1) / 2) * 14 + 4)}" font-size="13" font-style="italic" text-anchor="${n.label!.anchor}">${esc(ln)}</text>`))
  }
  out.push('</svg>')
  return out.join('\n')
}

function tokens(x: number, y: number, k: number): string {
  if (k <= 0) return ''
  const dot = (dx: number, dy: number) => `<circle cx="${f(x + dx)}" cy="${f(y + dy)}" r="3.2" fill="black"/>`
  if (k === 1) return dot(0, 0)
  if (k <= 5) return Array.from({ length: k }, (_, i) => { const a = -Math.PI / 2 + (2 * Math.PI * i) / k; return dot(Math.cos(a) * 7, Math.sin(a) * 7) }).join('')
  return `<text x="${f(x)}" y="${f(y + 5)}" font-size="14" text-anchor="middle">${k}</text>`
}

export function pathD(p: Pt[]): string {
  let d = `M${f(p[0].x)},${f(p[0].y)}`
  for (let i = 1; i + 2 < p.length; i += 3) d += ` C${f(p[i].x)},${f(p[i].y)} ${f(p[i + 1].x)},${f(p[i + 1].y)} ${f(p[i + 2].x)},${f(p[i + 2].y)}`
  return d
}

function offsetPath(p: Pt[], o: number): Pt[] {
  return p.map((q, i) => {
    const a = p[Math.max(0, i - 1)], b = p[Math.min(p.length - 1, i + 1)]
    const dx = b.x - a.x, dy = b.y - a.y, L = Math.hypot(dx, dy) || 1
    return { x: q.x - (dy / L) * o, y: q.y + (dx / L) * o }
  })
}

function bezierMid(p: Pt[]): Pt {
  const seg = Math.floor((p.length - 1) / 3 / 2) * 3
  const [a, b, c, d] = [p[seg], p[seg + 1], p[seg + 2], p[seg + 3]]
  return { x: (a.x + 3 * b.x + 3 * c.x + d.x) / 8, y: (a.y + 3 * b.y + 3 * c.y + d.y) / 8 }
}

const spread = (n: number, gap: number) => Array.from({ length: n }, (_, i) => (i - (n - 1) / 2) * gap)
const f = (v: number) => (Math.round(v * 10) / 10).toString()
const esc = (s: string) => s.replace(/&/g, '&amp;').replace(/</g, '&lt;')
function wrap(s: string, w: number): string[] {
  const words = s.split(' '), lines: string[] = []
  let cur = ''
  for (const word of words) { if (cur && (cur + ' ' + word).length > w) { lines.push(cur); cur = word } else cur = cur ? cur + ' ' + word : word }
  if (cur) lines.push(cur)
  return lines
}
