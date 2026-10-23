# PROTOTYPE. Can a net be drawn with every arc a line and no crossings? Needs networkx.
# A net that is not planar has crossings in every drawing that draws all its arcs as lines.
import json, sys
import networkx as nx

def planar(edges):
    g = nx.Graph()
    g.add_edges_from(edges)
    return nx.check_planarity(g)[0]

print('| net | all arcs planar | take/give only planar |')
print('|---|---|---|')
for line in sys.stdin:
    d = json.loads(line)
    es = [('s:' + s, 'v:' + v, k) for s, v, k in d['edges']]
    allp = planar([(a, b) for a, b, _ in es])
    flow = planar([(a, b) for a, b, k in es if k in ('take', 'give')])
    print(f"| {d['f']} | {'yes' if allp else 'no'} | {'yes' if flow else 'no'} |")
