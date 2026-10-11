import type { Net } from '../core/model'

export interface Doc {
  net: Net
  past: Net[]
  future: Net[]
}

export type DocAction =
  | { type: 'commit'; net: Net }
  | { type: 'checkpoint' }
  | { type: 'live'; net: Net }
  | { type: 'undo' }
  | { type: 'redo' }

const LIMIT = 200

/** A drag is one undo step: `checkpoint` saves the pre-drag net, then `live` updates replace the present without growing history. */
export const docReducer = (d: Doc, a: DocAction): Doc => {
  switch (a.type) {
    case 'commit':
      return a.net === d.net ? d : { net: a.net, past: [...d.past, d.net].slice(-LIMIT), future: [] }
    case 'checkpoint':
      return { ...d, past: [...d.past, d.net].slice(-LIMIT), future: [] }
    case 'live':
      return { ...d, net: a.net }
    case 'undo':
      return d.past.length ? { net: d.past[d.past.length - 1], past: d.past.slice(0, -1), future: [d.net, ...d.future] } : d
    case 'redo':
      return d.future.length ? { net: d.future[0], past: [...d.past, d.net], future: d.future.slice(1) } : d
  }
}
