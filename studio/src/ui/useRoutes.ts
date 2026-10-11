import { useEffect, useMemo, useRef, useState } from 'react'
import type { Net } from '../core/model'
import { chanceTies, shapesOf, type Pt, type Shape } from './geometry'
import { priorFor, routeArcs, type ArcKey } from './route'

interface Settled {
  net: Net
  shapes: Map<string, Shape>
  routes: Map<ArcKey, Pt[]>
}

const SETTLE_MS = 120

/**
 * Routes for the net on screen. A full route (two passes over every cable) runs in a worker once the net has been
 * still for a moment; until it lands, the canvas routes only what changed since the last full route, on the main
 * thread, keeping every other cable where it was. That is what keeps a node drag smooth.
 */
export function useRoutes(net: Net, shapes: Map<string, Shape>): Map<ArcKey, Pt[]> {
  const [settled, setSettled] = useState<Settled | null>(null)
  const worker = useRef<Worker | null>(null)
  const asked = useRef<{ id: number; net: Net } | null>(null)

  useEffect(() => {
    const w = new Worker(new URL('./route.worker.ts', import.meta.url), { type: 'module' })
    w.onmessage = (e: MessageEvent<{ id: number; routes: [ArcKey, Pt[]][] }>) => {
      const req = asked.current
      if (!req || req.id !== e.data.id) return
      setSettled({ net: req.net, shapes: shapesOf(req.net, chanceTies(req.net)), routes: new Map(e.data.routes) })
    }
    worker.current = w
    return () => w.terminate()
  }, [])

  useEffect(() => {
    if (settled?.net === net) return
    const t = setTimeout(() => {
      asked.current = { id: (asked.current?.id ?? 0) + 1, net }
      worker.current?.postMessage(asked.current)
    }, SETTLE_MS)
    return () => clearTimeout(t)
  }, [net, settled])

  return useMemo(
    () => (settled?.net === net ? settled.routes : routeArcs(net, shapes, settled ? priorFor(settled, net, shapes) : { routes: new Map(), moved: new Set() })),
    [net, shapes, settled],
  )
}
