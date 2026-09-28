import adam from './adam-to-jesus.json';
import windsor from './house-of-windsor.json';

type Person = { id: string; name: string; sex?: string };
type Rel = { type: string; from: string; to: string };
type Sample = { id: string; title: string; source: string; persons: Person[]; relationships: Rel[] };

const samples = [adam, windsor] as Sample[];

describe.each(samples.map(s => [s.id, s] as const))('%s', (_, s) => {
  const ids = new Set(s.persons.map(p => p.id));
  const parentsOf = (id: string) => s.relationships.filter(r => r.type === 'parent' && r.to === id).map(r => r.from);

  test('ids unique', () => {
    expect(ids.size).toBe(s.persons.length);
  });

  test('relationships reference existing ids, no self-links, valid types', () => {
    for (const r of s.relationships) {
      expect(['parent', 'spouse']).toContain(r.type);
      expect(ids.has(r.from)).toBe(true);
      expect(ids.has(r.to)).toBe(true);
      expect(r.from).not.toBe(r.to);
    }
  });

  test('at most 2 parents', () => {
    for (const id of ids) expect(parentsOf(id).length).toBeLessThanOrEqual(2);
  });

  test('spouse pairs listed once', () => {
    const keys = s.relationships.filter(r => r.type === 'spouse').map(r => [r.from, r.to].sort().join('|'));
    expect(new Set(keys).size).toBe(keys.length);
  });

  test('no duplicate parent edges', () => {
    const keys = s.relationships.filter(r => r.type === 'parent').map(r => `${r.from}>${r.to}`);
    expect(new Set(keys).size).toBe(keys.length);
  });

  test('parent edges acyclic', () => {
    const state = new Map<string, 1 | 2>();
    const children = (id: string) => s.relationships.filter(r => r.type === 'parent' && r.from === id).map(r => r.to);
    const visit = (id: string): void => {
      if (state.get(id) === 2) return;
      if (state.get(id) === 1) throw new Error(`cycle at ${id}`);
      state.set(id, 1);
      children(id).forEach(visit);
      state.set(id, 2);
    };
    expect(() => ids.forEach(visit)).not.toThrow();
  });
});

test('Luke 3: father chain Jesus to Adam is 77 names', () => {
  const s = adam as Sample;
  const byId = new Map(s.persons.map(p => [p.id, p]));
  const chain: string[] = [];
  let cur: string | undefined = 'jesus';
  while (cur) {
    chain.push(byId.get(cur)!.name);
    const id: string = cur;
    cur = s.relationships.find(r => r.type === 'parent' && r.to === id && byId.get(r.from)?.sex === 'm')?.from;
  }
  expect(chain.length).toBe(77);
  expect(chain[0]).toBe('Jesus');
  expect(chain[76]).toBe('Adam');
});
