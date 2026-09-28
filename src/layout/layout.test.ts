import type { Person, Relationship } from '@/domain/types';
import { fromSample } from '@/samples/sample';
import adam from '@/samples/adam-to-jesus.json';
import windsor from '@/samples/house-of-windsor.json';
import { layoutTree, NODE_H, NODE_W } from './layout';

const person = (id: string, birthYear?: number): Person => ({ id, treeId: 't', name: id, birthYear });
let relSeq = 0;
const parent = (from: string, to: string): Relationship => ({
  id: `r${relSeq++}`,
  treeId: 't',
  type: 'parent',
  fromPersonId: from,
  toPersonId: to,
});
const spouse = (a: string, b: string): Relationship => ({ ...parent(a, b), type: 'spouse' });

function expectNoOverlap(persons: Person[], rels: Relationship[]) {
  const { nodes } = layoutTree(persons, rels);
  expect(nodes.size).toBe(persons.length);
  const byRow = new Map<number, number[]>();
  for (const n of nodes.values()) byRow.set(n.y, [...(byRow.get(n.y) ?? []), n.x]);
  for (const xs of byRow.values()) {
    xs.sort((a, b) => a - b);
    for (let i = 1; i < xs.length; i++) expect(xs[i] - xs[i - 1]).toBeGreaterThanOrEqual(NODE_W);
  }
}

test('small family: generations and couple adjacency', () => {
  const ps = ['g1', 'g2', 'p1', 'p2', 'c1', 'c2'].map(id => person(id));
  const rels = [
    spouse('g1', 'g2'),
    parent('g1', 'p1'),
    parent('g2', 'p1'),
    spouse('p1', 'p2'),
    parent('p1', 'c1'),
    parent('p2', 'c1'),
    parent('p1', 'c2'),
    parent('p2', 'c2'),
  ];
  const l = layoutTree(ps, rels);
  expect(l.generations).toBe(3);
  expect(l.nodes.get('g1')!.gen).toBe(0);
  expect(l.nodes.get('p2')!.gen).toBe(1);
  expect(l.nodes.get('c2')!.gen).toBe(2);
  expect(Math.abs(l.nodes.get('p1')!.x - l.nodes.get('p2')!.x)).toBeLessThan(NODE_W * 2);
  expectNoOverlap(ps, rels);
});

test('long chain stays one column wide', () => {
  const ps = Array.from({ length: 77 }, (_, i) => person(`n${i}`));
  const rels = ps.slice(1).map((p, i) => parent(`n${i}`, p.id));
  const l = layoutTree(ps, rels);
  expect(l.generations).toBe(77);
  expect(new Set([...l.nodes.values()].map(n => n.x)).size).toBe(1);
  expect(l.height).toBeGreaterThan(76 * 100);
});

test('unlinked people get their own row', () => {
  const l = layoutTree([person('a'), person('b'), person('c')], [parent('a', 'b')]);
  expect(l.nodes.get('c')!.gen).toBe(2);
});

test('empty tree', () => {
  const l = layoutTree([], []);
  expect(l.nodes.size).toBe(0);
  expect(l.generations).toBe(0);
});

test('married-in spouse aligns with partner, not generation 0', () => {
  const ps = ['a', 'b', 'c', 'x'].map(id => person(id));
  const rels = [parent('a', 'b'), parent('b', 'c'), spouse('c', 'x')];
  const l = layoutTree(ps, rels);
  expect(l.nodes.get('x')!.gen).toBe(l.nodes.get('c')!.gen);
});

test.each([
  ['adam-to-jesus', adam],
  ['house-of-windsor', windsor],
])('sample %s lays out without overlap', (_name, json) => {
  const { persons, relationships } = fromSample(json as never, 't');
  expectNoOverlap(persons, relationships);
  const l = layoutTree(persons, relationships);
  for (const e of l.edges) expect(e.points.every(Number.isFinite)).toBe(true);
  expect(l.height).toBeGreaterThan(NODE_H);
});

test('2,000 people in under 500ms', () => {
  const ps: Person[] = [];
  const rels: Relationship[] = [];
  let seed = 7;
  const rand = () => (seed = (seed * 16807) % 2147483647) / 2147483647;
  for (let i = 0; i < 2000; i++) {
    ps.push(person(`p${i}`, 1500 + Math.floor(i / 10)));
    if (i > 1) {
      const a = Math.floor(rand() * Math.max(1, i - 10));
      rels.push(parent(`p${a}`, `p${i}`));
      if (rand() < 0.3) rels.push(spouse(`p${a}`, `p${Math.floor(rand() * i)}`));
    }
  }
  const t0 = Date.now();
  layoutTree(ps, rels);
  expect(Date.now() - t0).toBeLessThan(500);
});
