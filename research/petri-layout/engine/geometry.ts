import { PLACE_R, type BarBox, type PlaceBox, type Pt } from './layout.ts'

export function attach(n: PlaceBox | BarBox, toward: Pt): Pt {
  const dx = toward.x - n.x, dy = toward.y - n.y, L = Math.hypot(dx, dy) || 1
  if (n.kind === 'place') return { x: n.x + (dx / L) * PLACE_R, y: n.y + (dy / L) * PLACE_R }
  const ux = Math.cos(n.angle), uy = Math.sin(n.angle)
  const along = Math.max(-n.length / 2, Math.min(n.length / 2, dx * ux + dy * uy))
  const side = Math.sign(-dx * uy + dy * ux) || 1
  return { x: n.x + ux * along - uy * side * 2, y: n.y + uy * along + ux * side * 2 }
}

export function straight(a: Pt, b: Pt): Pt[] {
  return [a, lerp(a, b, 1 / 3), lerp(a, b, 2 / 3), b]
}

export const lerp = (a: Pt, b: Pt, t: number): Pt => ({ x: a.x + (b.x - a.x) * t, y: a.y + (b.y - a.y) * t })

export function sampleBezier(p: Pt[], perSeg = 16): Pt[] {
  const out: Pt[] = []
  for (let i = 0; i + 3 < p.length; i += 3) for (let k = 0; k <= perSeg; k++) {
    const t = k / perSeg, u = 1 - t
    out.push({ x: u * u * u * p[i].x + 3 * u * u * t * p[i + 1].x + 3 * u * t * t * p[i + 2].x + t * t * t * p[i + 3].x,
      y: u * u * u * p[i].y + 3 * u * u * t * p[i + 1].y + 3 * u * t * t * p[i + 2].y + t * t * t * p[i + 3].y })
  }
  return out
}
