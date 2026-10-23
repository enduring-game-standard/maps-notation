// MAPS sheets, prototype v2. Throwaway. Data, layout, and rendering in one file so the page and the
// falsification harness run the same code.
//
// A verb is [name, from, to, speaker, when, fx]. `when` is the circumstance that allows it, in words, never a
// button: buttons belong to the control scheme above the rules. `fx` is structured where another sheet reads it:
//   needs:   [{ meter, is: 'full' | 'empty' }] or [{ state: 'sheet:state' }] or [{ verb: 'sheet:verb name' }]
//   changes: [{ meter: 'sheet:meter', by }]

const SHEETS = [
  {
    key: 'goomba', title: 'Goomba', source: 'Super Mario Bros. (1985)', kind: 'capability schema',
    root: 'dormant', homes: ['walking'],
    states: [['dormant', 'dormant'], ['walking', 'walking'], ['falling', 'falling'],
             ['squashed', 'squashed'], ['flipped', 'flipped'], ['gone', 'gone']],
    verbs: [
      ['wake', 'dormant', 'walking', 'content', 'the screen reaches it'],
      ['turn', 'walking', 'walking', 'content', 'a wall or another enemy'],
      ['walk off a ledge', 'walking', 'falling', 'world', 'no floor ahead'],
      ['land', 'falling', 'walking', 'world', 'floor below'],
      ['fall in a pit', 'falling', 'gone', 'world', 'below the screen'],
      ['despawn', 'walking', 'gone', 'content', 'scrolled off the left edge'],
      ['stomped', 'walking', 'squashed', 'content', 'Mario falling onto it'],
      ['fades', 'squashed', 'gone', 'world', 'a moment later'],
      ['knocked over', 'walking', 'flipped', 'content', 'a fireball, a shell, a star, or a block bumped from below'],
      ['falls away', 'flipped', 'gone', 'world', ''],
      ['hurts Mario', 'walking', 'walking', 'content', 'Mario touches it from the side'],
    ],
  },
  {
    key: 'sword', title: "Link's sword", source: 'Ocarina of Time (1998)', kind: 'capability schema',
    note: 'Link always comes back to idle, and which idle depends on targeting, the sheet beside this one (P:5588). So targeting is its own part, and verbs here name it as a circumstance. From research/link-moveset.md.',
    root: 'idle', homes: ['idle'],
    states: [['idle', 'idle'], ['swing', 'swinging'], ['charge', 'charging a spin'], ['spin', 'spin'],
             ['great', 'great spin'], ['roll', 'rolling'], ['bonk', 'bonked'], ['shield', 'shield up'],
             ['strafe', 'shield on the move'], ['air', 'in the air'], ['flip', 'backflip'],
             ['jump', 'jump attack'], ['finish', 'landing strike']],
    verbs: [
      ['swing', 'idle', 'swing', 'controller', 'a sword in hand, drawn on the same press if sheathed'],
      ['quick spin', 'idle', 'spin', 'controller', 'a sword in hand'],
      ['roll', 'idle', 'roll', 'controller', 'not locked on; while Z-targeting only with no weapon out'],
      ['raise the shield', 'idle', 'shield', 'controller', 'a shield, not targeting'],
      ['guard on the move', 'idle', 'strafe', 'controller', 'a shield, targeting'],
      ['jump attack', 'idle', 'jump', 'controller', 'targeting, a weapon out, not indoors'],
      ['sidehop', 'idle', 'air', 'controller', 'targeting, not indoors'],
      ['backflip', 'idle', 'flip', 'controller', 'targeting, not indoors'],
      ['run off an edge', 'idle', 'air', 'content', 'an edge, running'],
      ['swing again', 'swing', 'swing', 'controller', 'the third same swing is the finisher: new animation, same damage'],
      ['hold to charge', 'swing', 'charge', 'controller', 'not a Deku Stick'],
      ['swing ends', 'swing', 'idle', 'world', ''],
      ['let go early', 'charge', 'idle', 'controller', 'under 10% charged'],
      ['release', 'charge', 'spin', 'controller', '10% to 85% charged; 2 magic for the magic spin'],
      ['release', 'charge', 'great', 'controller', '85% or more, or the stick spun'],
      ['spin ends', 'spin', 'idle', 'world', 'safe from hits as it starts'],
      ['great spin ends', 'great', 'idle', 'world', ''],
      ['slash out of it', 'roll', 'swing', 'controller', 'late in the roll'],
      ['roll ends', 'roll', 'idle', 'world', 'safe from hits mid-roll'],
      ['bonk', 'roll', 'bonk', 'content', 'a wall at speed'],
      ['recover', 'bonk', 'idle', 'world', ''],
      ['crouch stab', 'shield', 'shield', 'controller', 'a weapon out'],
      ['block', 'shield', 'shield', 'content', 'an attack from the front'],
      ['lower', 'shield', 'idle', 'controller', ''],
      ['block', 'strafe', 'strafe', 'content', 'an attack from the front'],
      ['lower', 'strafe', 'idle', 'controller', ''],
      ['jump attack', 'air', 'jump', 'controller', 'a weapon out'],
      ['land', 'air', 'idle', 'world', ''],
      ['land', 'flip', 'idle', 'world', 'no attack from a backflip'],
      ['land it', 'jump', 'finish', 'world', ''],
      ['recover', 'finish', 'idle', 'world', ''],
    ],
  },
  {
    key: 'target', title: 'Targeting', source: 'Ocarina of Time (1998)', kind: 'capability schema',
    note: 'One of the three idles is always in force. Locked on, Link also loses doors, climbing, pushing, and the roll.',
    root: 'free', homes: ['free'],
    states: [['free', 'not targeting'], ['z', 'Z-targeting'], ['battle', 'locked on']],
    verbs: [
      ['target', 'free', 'z', 'controller', 'no enemy in range'],
      ['lock on', 'free', 'battle', 'controller', 'an enemy in range'],
      ['let go', 'z', 'free', 'controller', ''],
      ['let go', 'battle', 'free', 'controller', ''],
      ['lose the lock', 'battle', 'free', 'world', 'the enemy is gone'],
    ],
  },
  {
    key: 'deku', title: 'Inside the Deku Tree', source: 'Ocarina of Time (1998)', kind: 'content instance',
    root: 'L0', homes: ['L0', 'SL1', 'B1P', 'B1PB', 'B2P'],
    note: "Link's progress through the dungeon. A state is a room plus what can't be undone: S = has the Slingshot, W1 = 1F web broken, W2 = B1 floor web burnt. The homes are where each part begins: the designer names them. Where each vine lands and how the webs persist are unverified, and the rooms off the B1 pool after the block is in are left out.",
    flagNames: { '': 'before the Slingshot', 'S': 'has the Slingshot', 'S W1': '1F web broken', 'S W1 B': 'block pushed in', 'S W1 W2': 'B1 floor web burnt' },
    states: [
      ['L0', 'Lobby 1F', ''], ['F2_0', '2F', ''], ['SL0', 'Slingshot room', ''],
      ['SL1', 'Slingshot room', 'S'], ['F2_1', '2F', 'S'], ['L1', 'Lobby 1F', 'S'], ['F3_1', '3F', 'S'], ['CP1', 'Compass room', 'S'],
      ['B1P', 'B1 pool', 'S W1'], ['L1W', 'Lobby 1F', 'S W1'], ['B1H', 'Scrub hint room', 'S W1'], ['B1R', 'roller water room', 'S W1'],
      ['B1T', 'torch room', 'S W1'], ['LV', 'Larva room', 'S W1'], ['B1L', 'B1 high ledge', 'S W1'],
      ['B1PB', 'B1 pool', 'S W1 B'], ['B1LB', 'B1 high ledge', 'S W1 B'],
      ['B2P', 'B2 pool', 'S W1 W2'], ['B1P2', 'B1 pool', 'S W1 W2'], ['B2S', 'Scrub trio', 'S W1 W2'],
      ['LAIR', "Gohma's lair", 'S W1 W2'], ['WIN', 'Gohma defeated', 'S W1 W2'],
    ],
    verbs: [
      ['climb', 'L0', 'F2_0', 'controller', ''],
      ['drop', 'F2_0', 'L0', 'controller', ''],
      ['map chest', 'L0', 'L0', 'controller', 'top of the 1F ramp, optional'],
      ['deflect nuts', 'F2_0', 'SL0', 'controller', 'a shield against the Deku Scrub'],
      ['open the chest', 'SL0', 'SL1', 'content', 'the chest holds the Slingshot'],
      ['shoot the ladder', 'SL1', 'F2_1', 'controller', 'the Slingshot; the only way out'],
      ['re-enter', 'F2_1', 'SL1', 'controller', ''],
      ['drop', 'F2_1', 'L1', 'controller', ''],
      ['climb', 'L1', 'F2_1', 'controller', ''],
      ['shoot Skulltulas', 'F2_1', 'F3_1', 'controller', 'the Slingshot: 3 off the vines'],
      ['drop', 'F3_1', 'F2_1', 'controller', ''],
      ['enter', 'F3_1', 'CP1', 'controller', 'floor switch, timed platforms; optional'],
      ['torch exit', 'CP1', 'F3_1', 'controller', 'a lit Deku Stick'],
      ['jump onto the web', 'F3_1', 'B1P', 'controller', 'a long fall breaks the 1F web'],
      ['climb the vine', 'B1P', 'L1W', 'controller', ''],
      ['drop in the hole', 'L1W', 'B1P', 'controller', 'the 1F web stays broken'],
      ['burn the door web', 'B1P', 'B1H', 'controller', 'a lit Deku Stick'],
      ['back', 'B1H', 'B1P', 'controller', ''],
      ['shoot the eye', 'B1H', 'B1R', 'controller', 'the Slingshot'],
      ['back', 'B1R', 'B1H', 'controller', ''],
      ['push the block', 'B1R', 'B1T', 'controller', 'block under the high door'],
      ['back', 'B1T', 'B1R', 'controller', ''],
      ['light the torches', 'B1T', 'LV', 'controller', '2 unlit torches'],
      ['back', 'LV', 'B1T', 'controller', ''],
      ['burn the web, crawl', 'LV', 'B1L', 'controller', 'a lit Deku Stick'],
      ['push the block in', 'B1L', 'B1PB', 'controller', 'the block makes a bridge'],
      ['cross the bridge', 'B1PB', 'B1LB', 'controller', ''],
      ['cross back', 'B1LB', 'B1PB', 'controller', ''],
      ['burn the floor web', 'B1L', 'B2P', 'content', 'a lit Deku Stick; the drop'],
      ['burn the floor web', 'B1LB', 'B2P', 'content', 'a lit Deku Stick; the drop'],
      ['climb the vine', 'B2P', 'B1P2', 'controller', ''],
      ['drop in the hole', 'B1P2', 'B2P', 'controller', 'the B1 floor web stays burnt'],
      ['walk on', 'B2P', 'B2S', 'controller', ''],
      ['back', 'B2S', 'B2P', 'controller', ''],
      ['wrong order', 'B2S', 'B2S', 'world', 'the scrubs reset'],
      ['stun them 2-3-1', 'B2S', 'LAIR', 'controller', 'middle, right, left'],
      ['eye, then sword', 'LAIR', 'WIN', 'controller', 'Slingshot or Deku Nut on the red eye'],
    ],
  },
  {
    key: 'z1link', title: 'Link', source: 'The Legend of Zelda (1986)', kind: 'capability schema',
    root: 'ready', homes: ['ready'],
    meters: { hearts: { max: 6, unit: 'half hearts' } },
    states: [['ready', 'ready'], ['gone', 'game over']],
    verbs: [
      ['stab', 'ready', 'ready', 'controller', '', { needs: [{ state: 'reach:near' }] }],
      ['sword beam', 'ready', 'ready', 'controller', '', { needs: [{ meter: 'hearts', is: 'full' }] }],
      ['falls', 'ready', 'gone', 'world', '', { needs: [{ meter: 'hearts', is: 'empty' }] }],
    ],
  },
  {
    key: 'octorok', title: 'Red Octorok', source: 'The Legend of Zelda (1986)', kind: 'capability schema',
    note: 'Its rocks are left out: the shield stops them while Link stands facing them. Half-heart damage is from memory.',
    root: 'roam', homes: ['roam'],
    states: [['roam', 'roaming'], ['dead', 'defeated']],
    verbs: [
      ['touches Link', 'roam', 'roam', 'content', '', { needs: [{ state: 'reach:near' }], changes: [{ meter: 'z1link:hearts', by: -1 }] }],
      ['struck by a stab', 'roam', 'dead', 'content', '', { needs: [{ verb: 'z1link:stab' }] }],
      ['struck by a beam', 'roam', 'dead', 'content', '', { needs: [{ verb: 'z1link:sword beam' }] }],
    ],
  },
  {
    key: 'reach', title: 'Link and the Octorok', source: 'The Legend of Zelda (1986)', kind: 'content instance',
    note: 'How far apart the two are. Content, not either one\'s capability.',
    root: 'far', homes: ['far'],
    states: [['far', 'apart'], ['near', 'close']],
    verbs: [
      ['close in', 'far', 'near', 'controller', ''],
      ['back off', 'near', 'far', 'controller', ''],
      ['it wanders close', 'far', 'near', 'content', ''],
    ],
  },
];

const SPEAKER_RANK = { controller: 0, content: 1, world: 2 };

function analyze(S) {
  const ids = S.states.map(s => s[0]).sort();
  const label = Object.fromEntries(S.states.map(s => [s[0], s[1]]));
  const flags = Object.fromEntries(S.states.map(s => [s[0], s[2] ?? '']));
  const verbs = S.verbs.map(([name, from, to, speaker, when, fx]) => ({ name, from, to, speaker, when, fx: fx || {} }));
  // Every choice below reads verbs in this order, so listing order can never change the drawing.
  const byKey = (a, b) => (a.to < b.to ? -1 : a.to > b.to ? 1 : 0) || SPEAKER_RANK[a.speaker] - SPEAKER_RANK[b.speaker] || (a.name < b.name ? -1 : a.name > b.name ? 1 : 0);
  const out = Object.fromEntries(ids.map(i => [i, verbs.filter(v => v.from === i).sort(byKey)]));

  let index = 0; const idx = {}, low = {}, stack = [], on = {}, comp = {}; const comps = [];
  const strong = v => {
    idx[v] = low[v] = index++; stack.push(v); on[v] = true;
    for (const e of out[v]) {
      if (idx[e.to] === undefined) { strong(e.to); low[v] = Math.min(low[v], low[e.to]); }
      else if (on[e.to]) low[v] = Math.min(low[v], idx[e.to]);
    }
    if (low[v] === idx[v]) {
      const c = []; let w;
      do { w = stack.pop(); on[w] = false; comp[w] = comps.length; c.push(w); } while (w !== v);
      comps.push(c);
    }
  };
  ids.forEach(i => idx[i] === undefined && strong(i));

  const dwells = c => c.length > 1 || out[c[0]].some(v => v.to === c[0]);
  const terminal = id => out[id].length === 0;
  const homeOf = c => comps[c].find(s => S.homes.includes(s)) ?? comps[c].slice().sort()[0];

  const order = [];
  const seen = new Set();
  for (const queue = [S.root]; queue.length;) {
    const s = queue.shift(); if (seen.has(s)) continue; seen.add(s);
    const c = comp[s]; if (dwells(comps[c]) && !order.includes(c)) order.push(c);
    out[s].forEach(v => queue.push(v.to));
  }
  const sectionOf = id => dwells(comps[comp[id]]) ? order.indexOf(comp[id]) : -1;

  const sections = order.map((c, n) => {
    const home = homeOf(c);
    const parent = { [home]: null }, via = {};
    for (const bfs = [home]; bfs.length;) {
      const s = bfs.shift();
      for (const v of out[s]) {
        const t = v.to;
        if (t in parent || terminal(t)) continue;
        const sec = sectionOf(t);
        if (sec === n || sec === -1) { parent[t] = s; via[t] = v; bfs.push(t); }
      }
    }
    const node = id => {
      const n2 = { id, label: label[id], tags: [], kids: [] };
      const tree = [];
      for (const v of out[id]) {
        const t = v.to;
        if (via[t] === v) { tree.push({ kind: 'state', v, node: node(t) }); continue; }
        if (t === home && id !== home) { n2.tags.push({ k: '↩', v }); continue; }
        if (t === id) { n2.tags.push({ k: '↻', v }); continue; }
        if (t === parent[id]) { n2.tags.push({ k: '↰', v }); continue; }
        if (terminal(t)) { n2.kids.push({ kind: 'end', v, label: label[t] }); continue; }
        const sec = sectionOf(t);
        if (sec !== n && sec !== -1) { n2.kids.push({ kind: 'exit', v, label: label[t], sec }); continue; }
        n2.kids.push({ kind: 'ref', v, label: label[t] });
      }
      // The longest branch runs straight on; shorter ones fork below it. Ties go to shape, then speaker, then name.
      tree.sort((a, b) => b.node.size - a.node.size || (a.node.shape < b.node.shape ? -1 : a.node.shape > b.node.shape ? 1 : 0) || byKey(a.v, b.v));
      const kindRank = { end: 0, exit: 1, ref: 2 };
      n2.kids.sort((a, b) => kindRank[a.kind] - kindRank[b.kind] || byKey(a.v, b.v));
      const tagRank = { '↻': 0, '↰': 1, '↩': 2 };
      n2.tags.sort((a, b) => tagRank[a.k] - tagRank[b.k] || byKey(a.v, b.v));
      n2.kids = [...tree, ...n2.kids];
      n2.size = 1 + tree.reduce((t, k) => t + k.node.size, 0) + n2.kids.length - tree.length;
      n2.shape = `(${n2.tags.map(t => t.k + t.v.speaker[0]).join('')}${n2.kids.map(k => k.kind === 'state' ? k.v.speaker[0] + k.node.shape : k.kind[0] + k.v.speaker[0]).join('')})`;
      return n2;
    };
    return { home, tree: node(home), flags: flags[home] };
  });

  let start = null;
  if (sectionOf(S.root) === -1) {
    const path = []; let s = S.root;
    while (sectionOf(s) === -1 && out[s].length) { const v = out[s][0]; path.push({ s, v }); s = v.to; }
    start = { path, into: s };
  }

  const drawn = new Set();
  const collect = n => { n.tags.forEach(t => drawn.add(t.v)); n.kids.forEach(k => { drawn.add(k.v); if (k.kind === 'state') collect(k.node); }); };
  sections.forEach(s => collect(s.tree));
  start?.path.forEach(p => drawn.add(p.v));
  const hidden = verbs.filter(v => !drawn.has(v));
  return { sections, start, label, verbs, hidden };
}

// A loop is read off the structured effects, never typed in: a verb lowers a meter, the drop takes away a verb
// another entity needs, the other ways to that same outcome need a state, and that state is what lets the first
// verb happen again.
function findLoops(sheets) {
  const all = sheets.flatMap(S => S.verbs.map(([name, from, to, speaker, when, fx]) => ({ sheet: S, name, from, to, speaker, fx: fx || {} })));
  const ref = v => `${v.sheet.key}:${v.name}`;
  const loops = [];
  for (const a of all) for (const ch of a.fx.changes ?? []) {
    const [mSheet, meter] = ch.meter.split(':');
    const breaks = ch.by < 0 ? 'full' : 'empty';
    for (const lost of all.filter(w => w.sheet.key === mSheet && (w.fx.needs ?? []).some(n => n.meter === meter && n.is === breaks))) {
      for (const user of all.filter(u => (u.fx.needs ?? []).some(n => n.verb === ref(lost)))) {
        const others = all.filter(o => o !== user && o.sheet === user.sheet && o.from === user.from && o.to === user.to);
        for (const o of others) for (const n of o.fx.needs ?? []) {
          if (!n.verb) continue;
          const via = all.find(x => ref(x) === n.verb);
          for (const st of (via?.fx.needs ?? []).filter(m => m.state)) {
            if ((a.fx.needs ?? []).some(m => m.state === st.state)) {
              const [sk, sid] = st.state.split(':');
              const S = sheets.find(s => s.key === sk);
              loops.push({ a, meter, lost, user, alt: o, via, state: S.states.find(s => s[0] === sid)[1], stateSheet: S.title,
                kind: ch.by < 0 ? 'reinforcing' : 'balancing' });
            }
          }
        }
      }
    }
  }
  return loops;
}

const esc = s => String(s).replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
const fxText = v => [
  ...(v.fx.needs ?? []).filter(n => n.meter).map(n => `${n.meter} ${n.is}`),
  ...(v.fx.changes ?? []).map(c => `${c.meter.split(':')[0] === 'z1link' ? 'Link ' : ''}${c.meter.split(':')[1]} ${c.by > 0 ? '+' : '−'}${Math.abs(c.by)}`),
].join('; ');

function render(S, loopVerbs = new Set()) {
  const A = analyze(S);
  const verbHtml = v => {
    const inLoop = loopVerbs.has(`${S.key}:${v.name}`);
    return `<span class="verb ${v.speaker}${inLoop ? ' inloop' : ''}">${esc(v.name)}</span>`
      + (fxText(v) ? ` <span class="fx">${esc(fxText(v))}</span>` : '')
      + (v.when ? `<span class="gate">${esc(v.when)}</span>` : '');
  };
  const tagHtml = n => n.tags.length ? `<div class="tags">${n.tags.map(t => `<span class="line">${t.k} ${verbHtml(t.v)}</span>`).join('')}</div>` : '';

  const parts = A.sections.map((sec, n) => {
    const cells = [];
    let row = 0;
    const cellHtml = ({ node, leaf, inVerb, branch, hub }) => {
      const lead = branch ? '<span class="branch">└</span>' : '';
      const top = inVerb ? `<div class="top">${verbHtml(inVerb)}</div>` : '';
      const arrow = inVerb ? '<span class="arrow">⟶</span>' : '';
      let target;
      if (node) target = `<span class="state${hub ? ' hub' : ''}">${hub ? '⌂ ' : ''}${esc(node.label)}</span>`;
      else {
        const text = leaf.kind === 'end' ? `✕ ${leaf.label}` : leaf.kind === 'exit' ? `⇓ ${leaf.label}` : leaf.label;
        target = `<span class="state ${leaf.kind}">${esc(text)}</span>`;
      }
      return `<div class="cell">${lead}<div class="step">${top}<div class="bot">${arrow}${target}</div>${node ? tagHtml(node) : ''}</div></div>`;
    };
    const walk = (node, col, r, inVerb, branch) => {
      cells.push({ r, col, html: cellHtml({ node, inVerb, branch, hub: col === 0 }) });
      let first = true;
      for (const k of node.kids) {
        const rr = first ? r : ++row;
        if (k.kind === 'state') walk(k.node, col + 1, rr, k.v, !first);
        else cells.push({ r: rr, col: col + 1, html: cellHtml({ leaf: k, inVerb: k.v, branch: !first }) });
        first = false;
      }
    };
    walk(sec.tree, 0, 0, null, false);
    const cols = Math.max(...cells.map(c => c.col)) + 1;
    const body = cells.map(c => `<div style="grid-row:${c.r + 1};grid-column:${c.col + 1}">${c.html}</div>`).join('');
    const title = S.flagNames ? `part ${n + 1} · ${S.flagNames[sec.flags] ?? sec.flags}` : A.sections.length > 1 ? `part ${n + 1}` : '';
    return { html: `<div class="section">${title ? `<div class="title">${esc(title)}</div>` : ''}<div class="outline" style="grid-template-columns:repeat(${cols}, var(--col))">${body}</div></div>`, cells, rows: row + 1, cols };
  });

  const silCols = Math.max(...parts.map(p => p.cols));
  let sil = '';
  parts.forEach((p, pi) => {
    const occ = new Set(p.cells.map(c => `${c.r},${c.col}`));
    for (let r = 0; r < p.rows; r++) for (let c = 0; c < silCols; c++)
      sil += `<i class="${occ.has(`${r},${c}`) ? (c === 0 && r === 0 ? 'hub' : 'on') : ''}"></i>`;
    if (pi < parts.length - 1) for (let c = 0; c < silCols; c++) sil += '<i style="background:transparent;height:3px"></i>';
  });
  const start = A.start ? `<p class="start">starts <span class="state">${esc(A.label[A.start.path[0].s])}</span> ${A.start.path.map(p => `${verbHtml(p.v)} ⟶`).join(' ')} ${esc(A.label[A.start.into])}</p>` : '';
  const meters = S.meters ? `<p class="meters">${Object.entries(S.meters).map(([k, m]) => `meter <b>${esc(k)}</b> 0 to ${m.max} ${esc(m.unit)}`).join(' · ')}</p>` : '';
  const check = A.hidden.length ? `<span class="bad">${A.hidden.length} verbs not drawn</span>` : `every verb drawn`;
  return {
    A, sil: `<div class="sil" style="grid-template-columns:repeat(${silCols}, 7px)">${sil}</div>`,
    html: `<div class="sheet" id="${S.key}">
    <h2>${esc(S.title)}</h2>
    <div class="meta">${esc(S.source)} · ${esc(S.kind)} · ${S.states.length} states · ${S.verbs.length} verbs · ${check}</div>
    ${S.note ? `<p class="note">${esc(S.note)}</p>` : ''}
    <div class="says"><div class="sil" style="grid-template-columns:repeat(${silCols}, 7px)">${sil}</div></div>
    ${meters}${start}${parts.map(p => p.html).join('')}
  </div>` };
}

function loopHtml(loops) {
  return loops.map(l => `<div class="loops"><div class="lt">Loop, ${l.kind} <span class="dim">· found from the effects on these sheets</span></div>
    <ol><li><b>${esc(l.a.sheet.title)}: ${esc(l.a.name)}</b> lowers ${esc(l.meter)}.</li>
    <li>With ${esc(l.meter)} no longer full, <b>${esc(l.lost.sheet.title)}: ${esc(l.lost.name)}</b> is gone, and so is the <b>${esc(l.user.sheet.title)}: ${esc(l.user.name)}</b> that needs it.</li>
    <li>The only other way to that outcome is <b>${esc(l.alt.sheet.title)}: ${esc(l.alt.name)}</b>, and <b>${esc(l.via.sheet.title)}: ${esc(l.via.name)}</b> needs <b>${esc(l.state)}</b> (${esc(l.stateSheet)}).</li>
    <li><b>${esc(l.state)}</b> is exactly what <b>${esc(l.a.name)}</b> needs. Back to 1.</li></ol>
    <div class="dim">Each hit makes the next one likelier: a ${esc(l.kind)} loop. Verbs in it are underlined on the sheets.</div></div>`).join('');
}

if (typeof module !== 'undefined') module.exports = { SHEETS, analyze, findLoops, render };
