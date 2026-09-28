import { buildSnapshot, parseSnapshot, remapForImport } from './snapshot';

const data = {
  tree: { id: 't1', title: 'My Family', kind: 'user' as const, createdAt: 1, updatedAt: 2 },
  persons: [
    { id: 'a', treeId: 't1', name: 'A' },
    { id: 'b', treeId: 't1', name: 'B', photoPath: 'photos/x.jpg' },
  ],
  relationships: [{ id: 'r', treeId: 't1', type: 'parent' as const, fromPersonId: 'a', toPersonId: 'b' }],
};

test('round trip remaps every id and keeps links consistent', () => {
  const snap = parseSnapshot(JSON.stringify(buildSnapshot([data])));
  const [out] = remapForImport(snap, ['My Family']);
  expect(out.tree.id).not.toBe('t1');
  expect(out.tree.title).toBe('My Family (imported)');
  const ids = out.persons.map(p => p.id);
  expect(ids).not.toContain('a');
  expect(ids).toContain(out.relationships[0].fromPersonId);
  expect(ids).toContain(out.relationships[0].toPersonId);
  expect(out.persons.every(p => p.treeId === out.tree.id)).toBe(true);
  expect(out.persons[1].photoPath).toBe('photos/x.jpg');
});

test('rejects foreign and newer files', () => {
  expect(() => parseSnapshot('{"hello":1}')).toThrow('Not a Family Tree backup.');
  expect(() => parseSnapshot('not json')).toThrow('Not a Family Tree backup.');
  const newer = { ...buildSnapshot([]), version: 99 };
  expect(() => parseSnapshot(JSON.stringify(newer))).toThrow('newer app version');
});
