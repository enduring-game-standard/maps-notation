// Prototype, throwaway. A hand layout of the duel net, placed for reading. Link's own net sits on the left around
// "neutral"; every verb Link chooses hands its beat to one bus on the far left. The enemy's contacts are a column in the
// middle, each level with the enemy phase it takes and reading Link's stance with a dashed arc; their returns to "idle"
// merge into one trunk. The enemy's clock runs in lanes on the right. The turn-taking tokens run round the outside:
// "beat" across the top (Link has spoken), "after" along the bottom (the world has moved).
// Writes duel-layout.js and prints how many arcs cross. Run: node hand-layout.js
const fs = require('fs');
const { graph } = require('./layout.js');

let N = {
  // Link: places in one column, each level with the contacts that read it; the verbs Link chooses sit left, toward the beat bus
  'p:strike': [330, 170], 'p:guard': [330, 330], 'p:neutral': [330, 490], 'p:roll': [330, 650],
  'v:wait': [130, 110], 'v:strike': [110, 330], 'v:gstrike': [210, 250], 'v:guard': [210, 380], 'v:lower': [210, 440], 'v:roll': [210, 570],
  'v:whiff': [450, 250], 'v:rollend': [450, 700],
  // contact, level with what it takes; returns to idle merge into one trunk
  'v:interrupt': [720, 120], 'v:catch': [720, 210], 'v:punish': [720, 300],
  'v:block': [720, 440], 'v:hit': [720, 530], 'v:evade': [720, 640],
  'p:idle': [610, 60], 'v:tell': [820, 60],
  'p:windup': [950, 120], 'p:delay': [950, 210], 'p:recover': [950, 335], 'p:attack': [950, 530],
  'v:feint': [1110, 165], 'v:steady': [1110, 270], 'v:swing': [1110, 380], 'v:late': [1110, 470],
  // turn-taking: Link's beat, the tick that splits it, the enemy's half and Link's afterbeat
  'p:beat': [40, 40], 'v:tick': [180, 40], 'p:ebeat': [1230, 60], 'p:after': [110, 765], 'v:end': [110, 700],
};
let EVADE_LANE = 880, BUS = 40, TOP = 12, LEFT = 10, CLOCK_LANE = 1230, STEADY_LANE = 1000, BOTTOM = 765, TRUNK = 610;
const CHOICE = ['v:wait', 'v:strike', 'v:roll', 'v:guard', 'v:lower', 'v:gstrike'];
function waypoints(e) {
  const a = N[e.a], b = N[e.b], id = e.a + '>' + e.b;
  if (e.b === 'p:beat' && e.a !== 'v:wait') return [a, [BUS, a[1]], b];
  if (id === 'v:tick>p:ebeat') return [a, [a[0], TOP], [b[0], TOP], b];
  if (id === 'v:tick>p:after') return [a, [a[0] - 20, TOP], [LEFT, TOP], [LEFT, b[1]], b];
  if (e.a === 'p:ebeat') return [a, [CLOCK_LANE, b[1]], b];
  if (id === 'p:after>v:rollend') return [a, [b[0], a[1]], b];
  if (id === 'p:neutral>v:strike') return [a, [b[0], a[1]], b];
  if (id === 'v:strike>p:strike') return [a, [a[0], b[1]], b];
  if (id === 'p:strike>v:whiff') return [a, [b[0], a[1]], b];
  if (id === 'v:whiff>p:neutral') return [a, [a[0], b[1] - 40], [b[0] + 30, b[1] - 40], [b[0] + 18, b[1] - 12]];
  if (id === 'p:roll>v:rollend') return [a, [a[0], b[1]], b];
  if (id === 'v:rollend>p:neutral') return [a, [a[0], b[1] + 40], [b[0] + 30, b[1] + 40], [b[0] + 18, b[1] + 12]];
  if (id === 'v:steady>p:idle') return [a, [STEADY_LANE, a[1]], [STEADY_LANE, 90], [b[0] + 12, 90], [b[0] + 12, b[1] + 14]];
  if (e.b === 'p:idle' && e.a !== 'v:tell') return [a, [TRUNK, a[1]], b];
  if (e.b === 'p:recover' && (e.a === 'v:evade' || e.a === 'v:block')) return [a, [EVADE_LANE, a[1]], [EVADE_LANE, b[1]], b];
  if (id === 'v:tell>p:windup') return [a, [b[0], a[1]], b];
  return [a, b];
}

function crossings(edges) {
  const segs = [];
  for (const [k, pts] of Object.entries(edges)) for (let i = 0; i < pts.length - 1; i++) segs.push([k, pts[i], pts[i + 1]]);
  const ccw = (a, b, c) => (c[1] - a[1]) * (b[0] - a[0]) - (b[1] - a[1]) * (c[0] - a[0]);
  const ends = k => k.slice(0, k.lastIndexOf(':')).split('>');
  const list = [];
  for (let i = 0; i < segs.length; i++) for (let j = i + 1; j < segs.length; j++) {
    const [k1, a, b] = segs[i], [k2, c, d] = segs[j];
    if (k1 === k2 || ends(k1).some(n => ends(k2).includes(n))) continue;
    if (ccw(a, b, c) * ccw(a, b, d) < 0 && ccw(c, d, a) * ccw(c, d, b) < 0) list.push(k1 + '  x  ' + k2);
  }
  return [...new Set(list)];
}

function through(edges) {
  // an arc segment passing through a node it doesn't belong to
  let n = 0;
  for (const [k, pts] of Object.entries(edges)) {
    const own = k.slice(0, k.lastIndexOf(':')).split('>');
    for (const [id, c] of Object.entries(N)) {
      if (own.includes(id)) continue;
      const [hw, hh] = id.startsWith('p:') ? [20, 20] : [54, 14];
      for (let i = 0; i < pts.length - 1; i++) {
        const [a, b] = [pts[i], pts[i + 1]];
        for (let t = 0.02; t < 0.99; t += 0.03) {
          const x = a[0] + (b[0] - a[0]) * t, y = a[1] + (b[1] - a[1]) * t;
          if (Math.abs(x - c[0]) < hw && Math.abs(y - c[1]) < hh) { n++; t = 2; i = pts.length; }
        }
      }
    }
  }
  return n;
}
function crowd() {
  let n = 0;
  const ids = Object.keys(N);
  for (let i = 0; i < ids.length; i++) for (let j = i + 1; j < ids.length; j++) {
    const [a, b] = [N[ids[i]], N[ids[j]]], w = (ids[i].startsWith('p:') ? 20 : 52) + (ids[j].startsWith('p:') ? 20 : 52) + 16;
    if (Math.abs(a[0] - b[0]) < w && Math.abs(a[1] - b[1]) < 46) n++;
  }
  return n;
}
function build(g) { const edges = {}; for (const e of g.edges) edges[e.a + '>' + e.b + ':' + e.kind] = waypoints(e); return edges; }
function cost(g) { const E = build(g); return 1000 * crossings(E).length + 800 * through(E) + 3000 * crowd(); }

function tune(g, iters) {
  let rnd = 12345; const r = () => (rnd = (rnd * 1103515245 + 12345) % 2147483648) / 2147483648;
  const free = Object.keys(N).filter(id => !['p:beat', 'p:after', 'v:end', 'v:tick', 'p:ebeat'].includes(id));
  let cur = cost(g), best = JSON.stringify(N), bestC = cur;
  for (let i = 0; i < iters; i++) {
    const id = free[Math.floor(r() * free.length)], old = N[id].slice();
    const dx = id.startsWith('v:') || r() < .3 ? Math.round((r() - .5) * 8) * 10 : 0;
    N[id] = [Math.max(60, Math.min(1180, old[0] + dx)), Math.max(40, Math.min(740, old[1] + Math.round((r() - .5) * 12) * 10))];
    const c = cost(g), T = 600 * (1 - i / iters) + 1;
    if (c <= cur || r() < Math.exp((cur - c) / T)) { cur = c; if (c < bestC) { bestC = c; best = JSON.stringify(N); } } else N[id] = old;
  }
  N = JSON.parse(best);
  return bestC;
}

if (require.main === module) {
  const g = graph();
  console.log('hand layout cost', cost(g), 'crossings', crossings(build(g)).length, 'through', through(build(g)), 'crowd', crowd());
  if (process.argv[2]) console.log('tuned cost', tune(g, +process.argv[2]));
  const edges = build(g);
  console.log('through', through(edges), 'crowd', crowd());
  const missing = g.nodes.filter(n => !N[n.id]).map(n => n.id);
  fs.writeFileSync(__dirname + '/duel-layout.js', 'const LAYOUT = ' + JSON.stringify({ nodes: N, edges, width: 1290, height: 790 }) + ';\n');
  const x = crossings(edges);
  console.log('missing', missing, 'crossings', x.length); x.forEach(c => console.log('  ' + c));
}
