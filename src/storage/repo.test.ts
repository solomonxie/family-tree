import { DatabaseSync, type SQLInputValue } from 'node:sqlite';

import * as repo from './repo';
import { MIGRATIONS } from './schema';

let mockDb: DatabaseSync;

jest.mock('./db', () => ({
  query: (sql: string, params: SQLInputValue[] = []) => mockDb.prepare(sql).all(...params),
  run: (sql: string, params: SQLInputValue[] = []) => {
    mockDb.prepare(sql).run(...params);
  },
  inTransaction: <T>(fn: () => T): T => {
    mockDb.exec('BEGIN');
    try {
      const out = fn();
      mockDb.exec('COMMIT');
      return out;
    } catch (e) {
      mockDb.exec('ROLLBACK');
      throw e;
    }
  },
}));

const migrate = (steps: string[][]) => steps.flat().forEach(sql => mockDb.exec(sql));

beforeEach(() => {
  mockDb = new DatabaseSync(':memory:');
  migrate(MIGRATIONS);
});

function family() {
  const tree = repo.createTree('Mine');
  const alice = repo.addPerson(tree.id, { name: 'Alice Secret' }, []);
  const bob = repo.addPerson(tree.id, { name: 'Bob Secret' }, [{ type: 'parent', newPersonIs: 'to', otherId: alice.id }]);
  repo.updatePerson(bob.id, { name: 'Bob Secret', notes: 'private note' });
  return { tree, alice, bob };
}

const history = () => JSON.stringify(repo.changeLog());

test('deleting a tree erases its people from the history, leaving a bare marker', () => {
  const { tree } = family();
  const other = repo.createTree('Other');
  repo.addPerson(other.id, { name: 'Carol' }, []);
  const before = repo.lastChangeId();

  repo.deleteTree(tree.id);

  expect(history()).not.toMatch(/Secret|private note|Mine/);
  expect(history()).toContain('Carol');
  expect(repo.lastChangeId()).toBeGreaterThan(before);
  const marker = repo.changeLog().filter(e => e.rowId === tree.id);
  expect(marker).toEqual([expect.objectContaining({ tbl: 'trees', op: 'delete', before: null, after: null })]);
});

test('deleting a person erases their history; undo puts them back', () => {
  const { tree, bob } = family();
  const deleted = repo.deletePerson(bob.id);
  expect(history()).not.toMatch(/Bob Secret|private note/);
  expect(history()).toContain('Alice Secret');

  repo.restorePerson(deleted);
  expect(repo.getPersons(tree.id).map(p => p.name).sort()).toEqual(['Alice Secret', 'Bob Secret']);
  expect(repo.getRelationships(tree.id)).toHaveLength(1);
});

test('migration purges history left behind by older builds', () => {
  mockDb = new DatabaseSync(':memory:');
  migrate(MIGRATIONS.slice(0, 2));
  const { tree } = family();
  const gone = repo.createTree('Gone');
  repo.addPerson(gone.id, { name: 'Dave Secret' }, []);
  mockDb.exec(`DELETE FROM persons WHERE tree_id = '${gone.id}'; DELETE FROM trees WHERE id = '${gone.id}'`);
  const before = repo.lastChangeId();

  migrate(MIGRATIONS.slice(2));

  expect(history()).not.toContain('Dave Secret');
  expect(history()).toContain('Alice Secret');
  expect(repo.getTree(tree.id)).toBeDefined();
  expect(repo.lastChangeId()).toBeGreaterThan(before);
});

test('migration adds no marker when nothing was purged', () => {
  mockDb = new DatabaseSync(':memory:');
  migrate(MIGRATIONS.slice(0, 2));
  family();
  const before = repo.lastChangeId();
  migrate(MIGRATIONS.slice(2));
  expect(repo.lastChangeId()).toBe(before);
});
