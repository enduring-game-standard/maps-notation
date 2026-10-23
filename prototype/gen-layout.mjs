// Prototype, throwaway. Lays out the duel net with dagre (a layered, crossing-minimizing layout) and writes
// node positions and routed arc points to duel-layout.json. Run: node gen-layout.mjs
import fs from 'fs';
import { createRequire } from 'module';
const M = '/home/wscottsh/llama.cpp/build-vulkan-b9842/tools/ui/ui-src/node_modules';
const dagre = await import(M + '/dagre-d3-es/src/dagre/index.js');
const { Graph } = await import(M + '/dagre-d3-es/src/graphlib/index.js');
const { graph, score } = createRequire(import.meta.url)('./layout.js');

const g = graph(), G = new Graph({ multigraph: true }).setGraph({ rankdir: process.argv[2] || 'LR', nodesep: 26, ranksep: 70, edgesep: 14, ranker: process.argv[3] || 'network-simplex' }).setDefaultEdgeLabel(() => ({}));
for (const n of g.nodes) G.setNode(n.id, n.kind === 'place' ? { width: 36, height: 36 } : { width: 104, height: 24 });
for (const e of g.edges) G.setEdge(e.a, e.b, { weight: e.kind === 'take' || e.kind === 'give' ? 2 : 1, minlen: 1 }, e.a + '>' + e.b + ':' + e.kind);
dagre.layout(G);
const nodes = Object.fromEntries(g.nodes.map(n => [n.id, [Math.round(G.node(n.id).x), Math.round(G.node(n.id).y)]]));
const edges = Object.fromEntries(G.edges().map(e => [e.name, G.edge(e).points.map(p => [Math.round(p.x), Math.round(p.y)])]));
fs.writeFileSync(new URL('./duel-layout.js', import.meta.url), 'const LAYOUT = ' + JSON.stringify({ nodes, edges, width: G.graph().width, height: G.graph().height }) + ';\n');
console.log(G.graph().width, G.graph().height, 'straight-line score at these positions', score(g, nodes, true));
