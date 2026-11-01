import family from '../../demo/family.json';
import { toTreeData, type ImportedTree } from '@/import/imported';
import { layoutTree } from '@/layout/layout';

const trees = (family as { trees: ImportedTree[] }).trees;

describe.each(trees.map(t => [t.title, t] as const))('%s', (_, t) => {
  const data = toTreeData(t, undefined, 0);

  test('every family member exists and every person is linked', () => {
    const keys = new Set(t.persons.map(p => p.key));
    expect(keys.size).toBe(t.persons.length);
    for (const f of t.families) for (const k of [...f.partners, ...f.children]) expect(keys.has(k)).toBe(true);
    const linked = new Set(data.relationships.flatMap(r => [r.fromPersonId, r.toPersonId]));
    expect(data.persons.filter(p => !linked.has(p.id)).map(p => p.name)).toEqual([]);
  });

  test('nothing dropped by the import rules', () => {
    const expected = t.families.reduce((n, f) => n + f.children.length * f.partners.length, 0);
    expect(data.relationships.filter(r => r.type === 'parent')).toHaveLength(expected);
  });

  test('plausible dates: parents older than children, nobody dies before birth', () => {
    const byKey = new Map(t.persons.map(p => [p.key, p]));
    for (const p of t.persons) {
      if (p.death?.year !== undefined) expect(p.death.year).toBeGreaterThanOrEqual(p.birth!.year!);
    }
    for (const f of t.families) {
      for (const c of f.children) {
        for (const parent of f.partners) {
          const gap = byKey.get(c)!.birth!.year! - byKey.get(parent)!.birth!.year!;
          expect(gap).toBeGreaterThanOrEqual(16);
          expect(gap).toBeLessThanOrEqual(50);
        }
      }
    }
  });
});

test('main demo tree spans five generations', () => {
  const data = toTreeData(trees[0]);
  expect(layoutTree(data.persons, data.relationships).generations).toBe(5);
  expect(data.persons.length).toBeGreaterThanOrEqual(30);
});
