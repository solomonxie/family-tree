import { open, type DB, type Scalar } from '@op-engineering/op-sqlite';

import { dbName } from './profile';
import { MIGRATIONS } from './schema';

let db: DB | undefined;

export function getDb(): DB {
  if (!db) {
    db = open({ name: dbName() });
    db.executeSync('PRAGMA journal_mode = WAL');
    migrate(db);
  }
  return db;
}

function migrate(d: DB) {
  const current = Number(d.executeSync('PRAGMA user_version').rows[0]?.user_version ?? 0);
  for (let v = current; v < MIGRATIONS.length; v++) {
    d.executeSync('BEGIN');
    try {
      for (const sql of MIGRATIONS[v]) d.executeSync(sql);
      d.executeSync(`PRAGMA user_version = ${v + 1}`);
      d.executeSync('COMMIT');
    } catch (e) {
      d.executeSync('ROLLBACK');
      throw e;
    }
  }
}

// Next getDb() opens whichever profile is current.
export function closeDb() {
  db?.close();
  db = undefined;
}

export function query<T = Record<string, Scalar>>(sql: string, params: Scalar[] = []): T[] {
  return getDb().executeSync(sql, params).rows as T[];
}

export function run(sql: string, params: Scalar[] = []) {
  getDb().executeSync(sql, params);
}

export function inTransaction<T>(fn: () => T): T {
  const d = getDb();
  d.executeSync('BEGIN');
  try {
    const out = fn();
    d.executeSync('COMMIT');
    return out;
  } catch (e) {
    d.executeSync('ROLLBACK');
    throw e;
  }
}

export function dbPath(): string {
  return getDb().getDbPath();
}

export function checkpoint() {
  getDb().executeSync('PRAGMA wal_checkpoint(FULL)');
}
