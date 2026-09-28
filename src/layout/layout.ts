import type { Person, Relationship } from '@/domain/types';

export const NODE_W = 120;
export const NODE_H = 48;
export const GAP_X = 24;
export const SPOUSE_X = 16;
export const GEN_Y = 110;
export const MARGIN = 40;

export interface NodeBox {
  id: string;
  x: number;
  y: number;
  gen: number;
}

export interface EdgeLine {
  key: string;
  kind: 'spouse' | 'parent';
  points: number[];
}

export interface TreeLayout {
  nodes: Map<string, NodeBox>;
  edges: EdgeLine[];
  width: number;
  height: number;
  generations: number;
}

interface Unit {
  members: string[];
  gen: number;
  children: Unit[];
  width: number;
  x: number;
}

export function layoutTree(persons: Person[], rels: Relationship[]): TreeLayout {
  const byId = new Map(persons.map(p => [p.id, p]));
  const parents = new Map<string, string[]>();
  const children = new Map<string, string[]>();
  const partners = new Map<string, Set<string>>();
  const push = <V>(m: Map<string, V[]>, k: string, v: V) => {
    const list = m.get(k);
    if (list) list.push(v);
    else m.set(k, [v]);
  };
  const link = (a: string, b: string) => {
    if (a === b) return;
    if (!partners.has(a)) partners.set(a, new Set());
    if (!partners.has(b)) partners.set(b, new Set());
    partners.get(a)!.add(b);
    partners.get(b)!.add(a);
  };
  const spouseKeys = new Set<string>();
  for (const r of rels) {
    if (!byId.has(r.fromPersonId) || !byId.has(r.toPersonId)) continue;
    if (r.type === 'parent') {
      push(parents, r.toPersonId, r.fromPersonId);
      push(children, r.fromPersonId, r.toPersonId);
    } else {
      link(r.fromPersonId, r.toPersonId);
      spouseKeys.add(pairKey(r.fromPersonId, r.toPersonId));
    }
  }
  // Co-parents without a spouse link still sit together.
  for (const ps of parents.values()) if (ps.length === 2) link(ps[0], ps[1]);

  const connected = persons.filter(
    p => parents.has(p.id) || children.has(p.id) || partners.has(p.id),
  );
  const unlinked = persons.filter(p => !connected.includes(p));
  const gen = assignGenerations(connected, parents, children, partners);

  // Units: partners in the same generation, connected components.
  const unitOf = new Map<string, Unit>();
  const units: Unit[] = [];
  for (const p of sortPersons(connected)) {
    if (unitOf.has(p.id)) continue;
    const g = gen.get(p.id)!;
    const comp: string[] = [];
    const stack = [p.id];
    while (stack.length) {
      const id = stack.pop()!;
      if (comp.includes(id)) continue;
      comp.push(id);
      for (const q of partners.get(id) ?? []) if (gen.get(q) === g && !unitOf.has(q)) stack.push(q);
    }
    const unit: Unit = { members: orderMembers(comp, partners, parents, byId), gen: g, children: [], width: 0, x: 0 };
    unit.width = unit.members.length * NODE_W + (unit.members.length - 1) * SPOUSE_X;
    for (const id of comp) unitOf.set(id, unit);
    units.push(unit);
  }

  // Each unit hangs under the unit holding the parents of its first member that has any.
  const roots: Unit[] = [];
  for (const u of units) {
    const blood = u.members.find(id => parents.has(id));
    const owner = blood ? unitOf.get(parents.get(blood)![0]) : undefined;
    if (owner && owner !== u) owner.children.push(u);
    else roots.push(u);
  }
  const unitBirth = (u: Unit) =>
    Math.min(...u.members.map(id => byId.get(id)?.birthYear ?? Number.MAX_SAFE_INTEGER));
  for (const u of units) u.children.sort((a, b) => unitBirth(a) - unitBirth(b));
  roots.sort((a, b) => a.gen - b.gen || unitBirth(a) - unitBirth(b));

  // Tidy tree: children packed left→right, parent unit centred over them.
  const measure = (u: Unit): number => {
    const kids = u.children.reduce((sum, c, i) => sum + measure(c) + (i ? GAP_X : 0), 0);
    u.width = Math.max(unitWidth(u), kids);
    return u.width;
  };
  const place = (u: Unit, left: number) => {
    let cursor = left + (u.width - childrenWidth(u)) / 2;
    for (const c of u.children) {
      place(c, cursor);
      cursor += c.width + GAP_X;
    }
    u.x = left + (u.width - unitWidth(u)) / 2;
  };
  let cursor = MARGIN;
  for (const r of roots) {
    measure(r);
    place(r, cursor);
    cursor += r.width + GAP_X * 2;
  }

  const nodes = new Map<string, NodeBox>();
  let maxGen = 0;
  for (const u of units) {
    u.members.forEach((id, i) => {
      nodes.set(id, { id, x: u.x + i * (NODE_W + SPOUSE_X), y: MARGIN + u.gen * GEN_Y, gen: u.gen });
    });
    maxGen = Math.max(maxGen, u.gen);
  }
  const looseGen = connected.length ? maxGen + 1 : 0;
  sortPersons(unlinked).forEach((p, i) => {
    nodes.set(p.id, { id: p.id, x: MARGIN + i * (NODE_W + GAP_X), y: MARGIN + looseGen * GEN_Y, gen: looseGen });
  });

  const edges = buildEdges(nodes, parents, spouseKeys);
  let width = 0;
  let height = 0;
  for (const n of nodes.values()) {
    width = Math.max(width, n.x + NODE_W + MARGIN);
    height = Math.max(height, n.y + NODE_H + MARGIN);
  }
  const generations = persons.length ? (unlinked.length ? looseGen : maxGen) + 1 : 0;
  return { nodes, edges, width, height, generations };
}

function unitWidth(u: Unit) {
  return u.members.length * NODE_W + (u.members.length - 1) * SPOUSE_X;
}

function childrenWidth(u: Unit) {
  return u.children.reduce((sum, c, i) => sum + c.width + (i ? GAP_X : 0), 0);
}

function pairKey(a: string, b: string) {
  return a < b ? `${a}|${b}` : `${b}|${a}`;
}

function sortPersons(ps: Person[]): Person[] {
  return [...ps].sort(
    (a, b) =>
      (a.birthYear ?? Number.MAX_SAFE_INTEGER) - (b.birthYear ?? Number.MAX_SAFE_INTEGER) ||
      a.name.localeCompare(b.name),
  );
}

// Bloodline member in the middle, partners alternating either side.
function orderMembers(
  ids: string[],
  partners: Map<string, Set<string>>,
  parents: Map<string, string[]>,
  byId: Map<string, Person>,
): string[] {
  if (ids.length === 1) return ids;
  const degree = (id: string) => [...(partners.get(id) ?? [])].filter(p => ids.includes(p)).length;
  const score = (id: string) => degree(id) * 10 + (parents.has(id) ? 5 : 0) + (byId.get(id)?.sex === 'm' ? 1 : 0);
  const sorted = [...ids].sort((a, b) => score(b) - score(a));
  if (ids.length === 2) return sorted;
  const out = [sorted[0]];
  sorted.slice(1).forEach((id, i) => (i % 2 ? out.unshift(id) : out.push(id)));
  return out;
}

function assignGenerations(
  persons: Person[],
  parents: Map<string, string[]>,
  children: Map<string, string[]>,
  partners: Map<string, Set<string>>,
): Map<string, number> {
  const base = new Map<string, number>();
  let gen = new Map<string, number>();
  for (let pass = 0; pass < 6; pass++) {
    const memo = new Map<string, number>();
    const visiting = new Set<string>();
    const depth = (id: string): number => {
      const known = memo.get(id);
      if (known !== undefined) return known;
      if (visiting.has(id)) return 0;
      visiting.add(id);
      const ps = parents.get(id);
      const d = ps?.length ? Math.max(...ps.map(p => depth(p) + 1)) : base.get(id) ?? 0;
      visiting.delete(id);
      memo.set(id, d);
      return d;
    };
    for (const p of persons) depth(p.id);
    // Roots move next to their partner, or just above their earliest child.
    let changed = false;
    for (const p of persons) {
      if (parents.get(p.id)?.length) continue;
      const ps = [...(partners.get(p.id) ?? [])].filter(q => parents.get(q)?.length);
      const kids = children.get(p.id) ?? [];
      let want = memo.get(p.id)!;
      if (ps.length) want = Math.max(...ps.map(q => memo.get(q)!));
      else if (kids.length) want = Math.min(...kids.map(k => memo.get(k)!)) - 1;
      if (want !== (base.get(p.id) ?? 0)) {
        base.set(p.id, want);
        changed = true;
      }
    }
    gen = memo;
    if (!changed) break;
  }
  const min = Math.min(0, ...gen.values());
  for (const [id, g] of gen) gen.set(id, g - min);
  return gen;
}

function buildEdges(
  nodes: Map<string, NodeBox>,
  parents: Map<string, string[]>,
  spouseKeys: Set<string>,
): EdgeLine[] {
  const edges: EdgeLine[] = [];
  const midY = (n: NodeBox) => n.y + NODE_H / 2;
  for (const key of spouseKeys) {
    const [a, b] = key.split('|').map(id => nodes.get(id)!);
    const [l, r] = a.x <= b.x ? [a, b] : [b, a];
    edges.push({ key: `s:${key}`, kind: 'spouse', points: [l.x + NODE_W, midY(l), r.x, midY(r)] });
  }

  const families = new Map<string, { parentIds: string[]; kids: string[] }>();
  for (const [child, ps] of parents) {
    const k = [...ps].sort().join('|');
    const fam = families.get(k) ?? { parentIds: ps, kids: [] };
    fam.kids.push(child);
    families.set(k, fam);
  }
  for (const [k, fam] of families) {
    const ps = fam.parentIds.map(id => nodes.get(id)!).sort((a, b) => a.x - b.x);
    const kids = fam.kids.map(id => nodes.get(id)!);
    const topKidY = Math.min(...kids.map(c => c.y));
    const busY = topKidY - (GEN_Y - NODE_H) / 2;
    const adjacent =
      ps.length === 2 && ps[0].y === ps[1].y && ps[1].x - ps[0].x <= NODE_W + SPOUSE_X + 0.5;
    const sources = adjacent
      ? [{ x: (ps[0].x + NODE_W + ps[1].x) / 2, y: midY(ps[0]) }]
      : ps.map(p => ({ x: p.x + NODE_W / 2, y: p.y + NODE_H }));
    const xs = [...kids.map(c => c.x + NODE_W / 2), ...sources.map(s => s.x)];
    sources.forEach((s, i) => edges.push({ key: `t:${k}:${i}`, kind: 'parent', points: [s.x, s.y, s.x, busY] }));
    edges.push({ key: `b:${k}`, kind: 'parent', points: [Math.min(...xs), busY, Math.max(...xs), busY] });
    for (const c of kids) {
      const cx = c.x + NODE_W / 2;
      edges.push({ key: `d:${k}:${c.id}`, kind: 'parent', points: [cx, busY, cx, c.y] });
    }
  }
  return edges;
}
