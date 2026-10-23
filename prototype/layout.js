// Prototype, throwaway. Lays out the duel net for reading: counts what makes a net hard to read (arcs crossing,
// arcs running through a node, nodes crowding) and anneals node positions inside lanes that carry meaning.
// Run: node layout.js  → writes duel-layout.json and prints the score.
const fs = require('fs');
const { duel } = require('./duel.js');

const PLACE_R = 18, VERB_W = 104, VERB_H = 24;

function graph() {
  const nodes = new Map(), edges = new Map();
  for (const d of ['first', 'revised', 'mixup']) {
    const net = duel(d);
    for (const p of net.places) nodes.set('p:' + p, { id: 'p:' + p, kind: 'place', name: p });
    for (const v of net.verbs) {
      const id = 'v:' + (v.id === 'armor' ? 'interrupt' : v.id);
      nodes.set(id, { id, kind: 'verb', by: v.by, name: v.id });
      const add = (a, b, kind) => edges.set(a + '>' + b + ':' + kind, { a, b, kind });
      v.take.forEach(p => add('p:' + p, id, 'take'));
      v.give.forEach(p => add(id, 'p:' + p, 'give'));
      v.need.forEach(p => add('p:' + p, id, 'need'));
      v.unless.forEach(p => add('p:' + p, id, 'unless'));
    }
  }
  return { nodes: [...nodes.values()], edges: [...edges.values()] };
}

// Lanes: x ranges a node may sit in. Link's own net on the left, contact in the seam, the enemy's clock on the right.
const CONTACT = ['punish', 'interrupt', 'catch', 'bounce', 'hit', 'trade', 'block', 'evade'];
const ENEMY = ['idle', 'windup', 'delay', 'attack', 'recover', 'tell', 'swing', 'feint', 'late'];
function lane(n) {
  if (n.name === 'beat' || n.name === 'after' || n.name === 'end') return [80, 1220];
  if (n.kind === 'verb' && CONTACT.includes(n.name)) return [520, 820];
  if (ENEMY.includes(n.name) || n.name === 'recover') return [860, 1220];
  return [80, 480];
}

const half = n => n.kind === 'place' ? [PLACE_R, PLACE_R] : [VERB_W / 2, VERB_H / 2];
function ccw(a, b, c) { return (c[1] - a[1]) * (b[0] - a[0]) - (b[1] - a[1]) * (c[0] - a[0]); }
function cross(p1, p2, p3, p4) { return ccw(p1, p2, p3) * ccw(p1, p2, p4) < 0 && ccw(p3, p4, p1) * ccw(p3, p4, p2) < 0; }
function segHitsBox(a, b, c, [hw, hh]) {
  // sample the segment; good enough for a score
  for (let t = 0.08; t < 0.92; t += 0.04) {
    const x = a[0] + (b[0] - a[0]) * t, y = a[1] + (b[1] - a[1]) * t;
    if (Math.abs(x - c[0]) < hw + 4 && Math.abs(y - c[1]) < hh + 4) return true;
  }
  return false;
}

function score(g, pos, detail) {
  let crossings = 0, through = 0, crowd = 0, length = 0;
  const E = g.edges.map(e => [pos[e.a], pos[e.b], e]);
  for (let i = 0; i < E.length; i++) {
    const [a, b, e] = E[i];
    length += Math.hypot(b[0] - a[0], b[1] - a[1]);
    for (let j = i + 1; j < E.length; j++) {
      const f = E[j][2];
      if (e.a === f.a || e.a === f.b || e.b === f.a || e.b === f.b) continue;
      if (cross(a, b, E[j][0], E[j][1])) crossings++;
    }
    for (const n of g.nodes) if (n.id !== e.a && n.id !== e.b && segHitsBox(a, b, pos[n.id], half(n))) through++;
  }
  for (let i = 0; i < g.nodes.length; i++) for (let j = i + 1; j < g.nodes.length; j++) {
    const n = g.nodes[i], m = g.nodes[j], [hw1, hh1] = half(n), [hw2, hh2] = half(m), p = pos[n.id], q = pos[m.id];
    if (Math.abs(p[0] - q[0]) < hw1 + hw2 + 24 && Math.abs(p[1] - q[1]) < hh1 + hh2 + 30) crowd++;
  }
  const total = 1000 * crossings + 600 * through + 3000 * crowd + length;
  return detail ? { crossings, through, crowd, length: Math.round(length), total: Math.round(total) } : total;
}

function anneal(g, pos, iters, seed) {
  let rnd = seed;
  const r = () => (rnd = (rnd * 1103515245 + 12345) % 2147483648) / 2147483648;
  let cur = score(g, pos), best = { ...pos }, bestS = cur;
  for (let i = 0; i < iters; i++) {
    const n = g.nodes[Math.floor(r() * g.nodes.length)], old = pos[n.id], [lo, hi] = lane(n);
    const T = 2000 * (1 - i / iters) + 1, step = i < iters / 2 ? 200 : 60;
    const nx = Math.min(hi, Math.max(lo, Math.round((old[0] + (r() - 0.5) * 2 * step) / 20) * 20));
    const ny = Math.min(720, Math.max(50, Math.round((old[1] + (r() - 0.5) * 2 * step) / 20) * 20));
    pos[n.id] = [nx, ny];
    const s = score(g, pos);
    if (s < cur || r() < Math.exp((cur - s) / T)) { cur = s; if (s < bestS) { bestS = s; best = { ...pos }; } }
    else pos[n.id] = old;
  }
  return best;
}

if (require.main === module) {
  const g = graph();
  let winner = null;
  for (let seed = 1; seed <= 6; seed++) {
    let r = seed * 7919;
    const pos = Object.fromEntries(g.nodes.map(n => { const [lo, hi] = lane(n); r = (r * 16807) % 2147483647; return [n.id, [lo + (r % (hi - lo)), 60 + (r % 640)]]; }));
    const out = anneal(g, pos, 60000, seed), s = score(g, out, true);
    console.log('seed', seed, s);
    if (!winner || s.total < winner.s.total) winner = { out, s };
  }
  fs.writeFileSync(__dirname + '/duel-layout.json', JSON.stringify(winner.out, null, 1));
  console.log('best', winner.s);
}
module.exports = { graph, score };
