import { open, type DB, type Scalar } from '@op-engineering/op-sqlite';

const MIGRATIONS: string[][] = [
  [
    `CREATE TABLE trees (
      id TEXT PRIMARY KEY, title TEXT NOT NULL, kind TEXT NOT NULL, source TEXT,
      created_at INTEGER NOT NULL, updated_at INTEGER NOT NULL, viewport TEXT)`,
    `CREATE TABLE persons (
      id TEXT PRIMARY KEY, tree_id TEXT NOT NULL, name TEXT NOT NULL, sex TEXT,
      birth_year INTEGER, death_year INTEGER, dates_approx INTEGER, origin_region TEXT,
      notes TEXT, photo_path TEXT)`,
    'CREATE INDEX persons_tree ON persons(tree_id)',
    `CREATE TABLE relationships (
      id TEXT PRIMARY KEY, tree_id TEXT NOT NULL, type TEXT NOT NULL,
      from_id TEXT NOT NULL, to_id TEXT NOT NULL)`,
    'CREATE INDEX relationships_tree ON relationships(tree_id)',
    `CREATE TABLE change_log (
      id INTEGER PRIMARY KEY AUTOINCREMENT, tbl TEXT NOT NULL, row_id TEXT NOT NULL,
      op TEXT NOT NULL, before TEXT, after TEXT, at INTEGER NOT NULL)`,
    'CREATE TABLE settings (key TEXT PRIMARY KEY, value TEXT)',
  ],
];

let db: DB | undefined;

export function getDb(): DB {
  if (!db) {
    db = open({ name: 'family-tree.sqlite' });
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
