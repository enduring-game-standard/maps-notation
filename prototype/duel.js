// Prototype, throwaway. A designer's sketch, not a transcription of any shipped game: Link against one armed
// enemy, in two drafts. The sketch is a 1-safe Petri net in MAPS 2 terms. Each verb names its speaker, and
// world verbs answer in array order (priority). Every Link verb takes one beat; the beat is two tokens, one the
// enemy spends to advance, one Link's own motion spends to finish.

const P = (...xs) => xs;

function duel(draft) {
  const first = draft === 'first', mixup = draft === 'mixup';
  const link = [
    { id: 'wait', by: 'link', label: 'hold', take: P(), give: P('beatE', 'beatL'), unless: P('beatE', 'roll', 'strike') },
    { id: 'strike', by: 'link', label: 'strike', take: P('neutral'), give: P('strike', 'beatE', 'beatL') },
    ...(first ? [{ id: 'gstrike', by: 'link', label: 'strike from guard', take: P('guard'), give: P('strike', 'beatE', 'beatL') }] : []),
    { id: 'guard', by: 'link', label: 'raise the shield', take: P('neutral'), give: P('guard', 'beatE', 'beatL') },
    { id: 'lower', by: 'link', label: 'lower the shield', take: P('guard'), give: P('neutral', 'beatE', 'beatL') },
    { id: 'roll', by: 'link', label: 'roll', take: P('neutral'), give: P('roll', 'beatE', 'beatL') },
  ];
  const world = [
    // contact: the enemy's state against Link's
    { id: 'punish', label: 'the strike lands in the opening', take: P('strike', 'recover'), give: P('neutral', 'idle'), outcome: +1 },
    first
      ? { id: 'interrupt', label: 'the strike breaks the wind-up', take: P('strike', 'windup'), give: P('neutral', 'idle'), outcome: +1 }
      : { id: 'armor', label: 'the enemy shrugs off the strike', take: P('strike'), need: P('windup'), give: P('neutral') },
    ...(mixup ? [{ id: 'catch', label: 'the strike catches the held swing', take: P('strike', 'delay'), give: P('neutral', 'idle'), outcome: +1 }] : []),
    { id: 'bounce', label: 'the strike bounces off its guard', take: P('strike'), need: P('idle'), give: P('neutral') },
    { id: 'hit', label: 'the blow hits Link', take: P('attack', 'neutral'), give: P('idle', 'neutral'), outcome: -1 },
    { id: 'trade', label: 'the blow hits Link mid-swing', take: P('attack', 'strike'), give: P('idle', 'neutral'), outcome: -1 },
    first
      ? { id: 'block', label: 'the shield stops it and the enemy reels', take: P('attack'), need: P('guard'), give: P('recover') }
      : { id: 'block', label: 'the shield stops it and pushes Link back', take: P('attack'), need: P('guard'), give: P('idle') },
    { id: 'evade', label: 'the blow whiffs over the roll', take: P('attack'), need: P('roll'), give: P('recover') },
    // the enemy's own clock
    { id: 'tell', label: 'the enemy winds up', take: P('idle', 'beatE'), give: P('windup') },
    { id: 'swing', label: 'the enemy swings', take: P('windup', 'beatE'), give: P('attack'), ...(mixup ? { group: 'read', weight: 3 } : {}) },
    ...(mixup ? [
      { id: 'feint', label: 'the enemy holds the swing back', take: P('windup', 'beatE'), give: P('delay'), group: 'read', weight: 2 },
      { id: 'late', label: 'the late swing comes', take: P('delay', 'beatE'), give: P('attack') },
    ] : []),
    { id: 'recover', label: 'the enemy recovers', take: P('recover', 'beatE'), give: P('idle') },
    // Link's motion finishing
    { id: 'rollend', label: 'Link comes out of the roll', take: P('roll', 'beatL'), give: P('neutral') },
    { id: 'whiff', label: 'the strike whiffs', take: P('strike', 'beatL'), give: P('neutral') },
    { id: 'endE', label: '', take: P('beatE'), give: P(), quiet: true },
    { id: 'endL', label: '', take: P('beatL'), give: P(), quiet: true },
  ].map(v => ({ by: 'world', need: P(), unless: P(), ...v }));
  return {
    draft,
    places: ['neutral', 'guard', 'roll', 'strike', 'idle', 'windup', ...(mixup ? ['delay'] : []), 'attack', 'recover', 'beatE', 'beatL'],
    verbs: [...link.map(v => ({ need: P(), unless: P(), ...v })), ...world],
    start: ['neutral', 'idle'],
  };
}

const enabled = (v, m) => v.take.every(p => m.has(p)) && v.need.every(p => m.has(p)) && !v.unless.some(p => m.has(p))
  && v.give.every(p => !m.has(p) || v.take.includes(p));
const fire = (v, m) => { const n = new Set(m); v.take.forEach(p => n.delete(p)); v.give.forEach(p => n.add(p)); return n; };
const key = m => [...m].sort().join('+');

// The world answers in priority order until it falls silent. Where the first verb to answer belongs to a weighted
// group, the world picks among the group's enabled verbs, and the answer branches.
function settle(net, m, trace = [], p = 1, depth = 0) {
  if (depth > 50) throw new Error('the world never falls silent');
  const v = net.verbs.find(v => v.by === 'world' && enabled(v, m));
  if (!v) return [{ m, trace, p }];
  const alts = v.group ? net.verbs.filter(w => w.group === v.group && enabled(w, m)) : [v];
  const total = alts.reduce((s, w) => s + (w.weight || 1), 0);
  return alts.flatMap(w => settle(net, fire(w, m), [...trace, w], p * (w.weight || 1) / total, depth + 1));
}

function exchange(net, m, v) {
  const branches = settle(net, fire(v, m)).map(b => ({ answer: b.trace, next: b.m, p: b.p, outcome: b.trace.reduce((s, w) => s + (w.outcome || 0), 0) }));
  return { said: v, branches, outcome: branches.reduce((s, b) => s + b.p * b.outcome, 0) };
}

function explore(net) {
  const start = settle(net, new Set(net.start))[0].m;
  const rests = new Map([[key(start), { m: start, options: [] }]]);
  const queue = [start];
  while (queue.length) {
    const m = queue.shift(), r = rests.get(key(m));
    r.options = net.verbs.filter(v => v.by === 'link' && enabled(v, m)).map(v => exchange(net, m, v));
    for (const b of r.options.flatMap(o => o.branches)) if (!rests.has(key(b.next))) { rests.set(key(b.next), { m: b.next, options: [] }); queue.push(b.next); }
  }
  // what each answer is worth to a player who plays well from then on (discounted, a few exchanges ahead)
  const worth = (o, d) => o.branches.reduce((s, b) => s + b.p * (b.outcome + 0.8 * value(key(b.next), d - 1)), 0);
  const value = (k, d) => d === 0 ? 0 : Math.max(...rests.get(k).options.map(o => worth(o, d)));
  for (const r of rests.values()) for (const o of r.options) o.worth = +worth(o, 5).toFixed(2);
  for (const r of rests.values()) r.flags = flags(r);
  return { start: key(start), rests, settled: bestLoop(rests, key(start)) };
}

// What a designer would want to know about a moment: are the choices real, and is one of them the only answer?
function flags(r) {
  const out = [], seen = new Map();
  for (const o of r.options) {
    const k = o.branches.map(b => key(b.next) + '|' + b.outcome + '|' + b.p.toFixed(2)).sort().join(',');
    if (seen.has(k)) out.push({ kind: 'same', text: `"${seen.get(k).said.label}" and "${o.said.label}" get the same answer`, verbs: [seen.get(k).said.id, o.said.id] });
    else seen.set(k, o);
  }
  const ws = r.options.map(o => o.worth).sort((a, b) => b - a);
  if (ws.length > 1 && ws[0] - ws[1] >= 0.5) {
    const best = r.options.find(o => o.worth === ws[0]);
    out.push({ kind: 'only', text: `"${best.said.label}" is the only good answer here`, verbs: [best.said.id] });
  }
  if (ws.length > 1 && ws[0] === ws[ws.length - 1]) out.push({ kind: 'flat', text: 'every answer here is worth the same', verbs: [] });
  return out;
}

// The conversation a player who always picks the best answer settles into, following the likeliest answer.
function bestLoop(rests, start) {
  const path = [], at = new Map();
  let k = start;
  while (!at.has(k)) {
    at.set(k, path.length);
    const r = rests.get(k), best = r.options.reduce((a, b) => b.worth > a.worth ? b : a);
    path.push({ rest: k, ...best });
    k = key(best.branches.reduce((a, b) => b.p > a.p ? b : a).next);
  }
  return path.slice(at.get(k));
}

if (typeof module !== 'undefined') module.exports = { duel, explore, enabled, fire, settle, exchange, key };
