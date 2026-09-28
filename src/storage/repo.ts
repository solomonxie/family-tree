import { newId } from '@/domain/ids';
import { checkNewRelationship } from '@/domain/rules';
import type { Person, PersonDraft, Relationship, RelationshipType, Tree } from '@/domain/types';
import type { Scalar } from '@op-engineering/op-sqlite';
import { inTransaction, query, run } from './db';

type Row = Record<string, Scalar>;

const str = (v: Scalar | undefined) => (v === null || v === undefined ? undefined : String(v));
const num = (v: Scalar | undefined) => (v === null || v === undefined ? undefined : Number(v));

const toTree = (r: Row): Tree => ({
  id: String(r.id),
  title: String(r.title),
  kind: r.kind === 'bundled' ? 'bundled' : 'user',
  source: str(r.source),
  createdAt: Number(r.created_at),
  updatedAt: Number(r.updated_at),
});

const toPerson = (r: Row): Person => ({
  id: String(r.id),
  treeId: String(r.tree_id),
  name: String(r.name),
  sex: r.sex === 'm' || r.sex === 'f' ? r.sex : undefined,
  birthYear: num(r.birth_year),
  deathYear: num(r.death_year),
  datesApprox: r.dates_approx ? true : undefined,
  originRegion: str(r.origin_region),
  notes: str(r.notes),
  photoPath: str(r.photo_path),
});

const toRel = (r: Row): Relationship => ({
  id: String(r.id),
  treeId: String(r.tree_id),
  type: r.type === 'spouse' ? 'spouse' : 'parent',
  fromPersonId: String(r.from_id),
  toPersonId: String(r.to_id),
});

function log(tbl: string, rowId: string, op: string, before?: unknown, after?: unknown) {
  run('INSERT INTO change_log (tbl, row_id, op, before, after, at) VALUES (?, ?, ?, ?, ?, ?)', [
    tbl,
    rowId,
    op,
    before === undefined ? null : JSON.stringify(before),
    after === undefined ? null : JSON.stringify(after),
    Date.now(),
  ]);
}

export interface ChangeEntry {
  id: number;
  tbl: string;
  rowId: string;
  op: string;
  before: unknown;
  after: unknown;
  at: number;
}

// Append-only: rows are only ever inserted, never updated or pruned.
export function changeLog(): ChangeEntry[] {
  return query('SELECT * FROM change_log ORDER BY id').map(r => ({
    id: Number(r.id),
    tbl: String(r.tbl),
    rowId: String(r.row_id),
    op: String(r.op),
    before: r.before ? JSON.parse(String(r.before)) : null,
    after: r.after ? JSON.parse(String(r.after)) : null,
    at: Number(r.at),
  }));
}

export function lastChangeId(): number {
  return Number(query('SELECT MAX(id) AS m FROM change_log')[0]?.m ?? 0);
}

// Trees

export function listTrees(): (Tree & { personCount: number })[] {
  return query(
    `SELECT t.*, (SELECT COUNT(*) FROM persons p WHERE p.tree_id = t.id) AS person_count
     FROM trees t ORDER BY t.kind DESC, t.updated_at DESC`,
  ).map(r => ({ ...toTree(r), personCount: Number(r.person_count) }));
}

export function getTree(id: string): Tree | undefined {
  const r = query('SELECT * FROM trees WHERE id = ?', [id])[0];
  return r ? toTree(r) : undefined;
}

export function insertTree(tree: Tree) {
  run('INSERT INTO trees (id, title, kind, source, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?)', [
    tree.id,
    tree.title,
    tree.kind,
    tree.source ?? null,
    tree.createdAt,
    tree.updatedAt,
  ]);
  log('trees', tree.id, 'insert', undefined, tree);
}

export function createTree(title: string): Tree {
  const now = Date.now();
  const tree: Tree = { id: newId(), title: title.trim(), kind: 'user', createdAt: now, updatedAt: now };
  insertTree(tree);
  return tree;
}

export function renameTree(id: string, title: string) {
  const before = getTree(id);
  run('UPDATE trees SET title = ?, updated_at = ? WHERE id = ?', [title.trim(), Date.now(), id]);
  log('trees', id, 'update', before, getTree(id));
}

function touchTree(id: string) {
  run('UPDATE trees SET updated_at = ? WHERE id = ?', [Date.now(), id]);
}

export function deleteTree(id: string): Person[] {
  return inTransaction(() => {
    const persons = getPersons(id);
    const relationships = getRelationships(id);
    const before = getTree(id);
    run('DELETE FROM relationships WHERE tree_id = ?', [id]);
    run('DELETE FROM persons WHERE tree_id = ?', [id]);
    run('DELETE FROM trees WHERE id = ?', [id]);
    log('trees', id, 'delete', { tree: before, persons, relationships });
    return persons;
  });
}

export function duplicateTree(id: string, title: string): Tree {
  return inTransaction(() => {
    const src = getTree(id)!;
    const now = Date.now();
    const tree: Tree = { id: newId(), title, kind: 'user', source: src.source, createdAt: now, updatedAt: now };
    insertTree(tree);
    const idMap = new Map<string, string>();
    for (const p of getPersons(id)) {
      const pid = newId();
      idMap.set(p.id, pid);
      insertPerson({ ...p, id: pid, treeId: tree.id });
    }
    for (const r of getRelationships(id)) {
      insertRelationship({
        ...r,
        id: newId(),
        treeId: tree.id,
        fromPersonId: idMap.get(r.fromPersonId)!,
        toPersonId: idMap.get(r.toPersonId)!,
      });
    }
    return tree;
  });
}

export function getViewport(treeId: string): { x: number; y: number; scale: number } | undefined {
  const v = query('SELECT viewport FROM trees WHERE id = ?', [treeId])[0]?.viewport;
  return v ? JSON.parse(String(v)) : undefined;
}

export function saveViewport(treeId: string, v: { x: number; y: number; scale: number }) {
  run('UPDATE trees SET viewport = ? WHERE id = ?', [JSON.stringify(v), treeId]);
}

// Persons & relationships

export function getPersons(treeId: string): Person[] {
  return query('SELECT * FROM persons WHERE tree_id = ?', [treeId]).map(toPerson);
}

export function getPerson(id: string): Person | undefined {
  const r = query('SELECT * FROM persons WHERE id = ?', [id])[0];
  return r ? toPerson(r) : undefined;
}

export function getRelationships(treeId: string): Relationship[] {
  return query('SELECT * FROM relationships WHERE tree_id = ?', [treeId]).map(toRel);
}

export function originsInUse(): string[] {
  return query(
    `SELECT origin_region AS o, COUNT(*) AS n FROM persons p JOIN trees t ON t.id = p.tree_id
     WHERE t.kind = 'user' AND origin_region IS NOT NULL AND origin_region != ''
     GROUP BY origin_region ORDER BY n DESC LIMIT 50`,
  ).map(r => String(r.o));
}

export function insertPerson(p: Person) {
  run(
    `INSERT INTO persons (id, tree_id, name, sex, birth_year, death_year, dates_approx, origin_region, notes, photo_path)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    [
      p.id,
      p.treeId,
      p.name,
      p.sex ?? null,
      p.birthYear ?? null,
      p.deathYear ?? null,
      p.datesApprox ? 1 : 0,
      p.originRegion ?? null,
      p.notes ?? null,
      p.photoPath ?? null,
    ],
  );
  log('persons', p.id, 'insert', undefined, p);
}

export function insertRelationship(r: Relationship) {
  run('INSERT INTO relationships (id, tree_id, type, from_id, to_id) VALUES (?, ?, ?, ?, ?)', [
    r.id,
    r.treeId,
    r.type,
    r.fromPersonId,
    r.toPersonId,
  ]);
  log('relationships', r.id, 'insert', undefined, r);
}

export interface NewLink {
  type: RelationshipType;
  // 'from' = the new person is the parent (or partner); 'to' = the new person is the child.
  newPersonIs: 'from' | 'to';
  otherId: string;
}

export class RuleError extends Error {}

export function addPerson(treeId: string, draft: PersonDraft, links: NewLink[]): Person {
  return inTransaction(() => {
    const person: Person = { ...draft, id: newId(), treeId };
    insertPerson(person);
    for (const link of links) addRelationship(treeId, link.type, person, link);
    touchTree(treeId);
    return person;
  });
}

function addRelationship(treeId: string, type: RelationshipType, person: Person, link: NewLink) {
  const other = getPerson(link.otherId);
  if (!other) throw new RuleError('That person no longer exists.');
  const [from, to] = link.newPersonIs === 'from' ? [person, other] : [other, person];
  const check = checkNewRelationship(type, from, to, getRelationships(treeId));
  if (!check.ok) throw new RuleError(check.reason);
  insertRelationship({ id: newId(), treeId, type, fromPersonId: from.id, toPersonId: to.id });
}

export function updatePerson(id: string, draft: PersonDraft) {
  const before = getPerson(id)!;
  const after: Person = { ...draft, id, treeId: before.treeId };
  run(
    `UPDATE persons SET name = ?, sex = ?, birth_year = ?, death_year = ?, dates_approx = ?,
     origin_region = ?, notes = ?, photo_path = ? WHERE id = ?`,
    [
      after.name,
      after.sex ?? null,
      after.birthYear ?? null,
      after.deathYear ?? null,
      after.datesApprox ? 1 : 0,
      after.originRegion ?? null,
      after.notes ?? null,
      after.photoPath ?? null,
      id,
    ],
  );
  log('persons', id, 'update', before, after);
  touchTree(before.treeId);
}

export interface DeletedPerson {
  person: Person;
  relationships: Relationship[];
}

export function deletePerson(id: string): DeletedPerson {
  return inTransaction(() => {
    const person = getPerson(id)!;
    const relationships = query('SELECT * FROM relationships WHERE from_id = ? OR to_id = ?', [id, id]).map(toRel);
    run('DELETE FROM relationships WHERE from_id = ? OR to_id = ?', [id, id]);
    run('DELETE FROM persons WHERE id = ?', [id]);
    log('persons', id, 'delete', { person, relationships });
    touchTree(person.treeId);
    return { person, relationships };
  });
}

export function restorePerson(d: DeletedPerson) {
  inTransaction(() => {
    insertPerson(d.person);
    for (const r of d.relationships) insertRelationship(r);
    touchTree(d.person.treeId);
  });
}

// Settings

export function getSetting(key: string): string | undefined {
  return str(query('SELECT value FROM settings WHERE key = ?', [key])[0]?.value);
}

export function setSetting(key: string, value: string) {
  run('INSERT INTO settings (key, value) VALUES (?, ?) ON CONFLICT(key) DO UPDATE SET value = excluded.value', [
    key,
    value,
  ]);
}

export function referencedPhotos(): Set<string> {
  return new Set(query('SELECT DISTINCT photo_path AS p FROM persons WHERE photo_path IS NOT NULL').map(r => String(r.p)));
}
