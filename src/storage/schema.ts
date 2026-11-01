// One list per user_version step; db.ts applies the ones not yet run.
export const MIGRATIONS: string[][] = [
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
  [
    'ALTER TABLE persons ADD COLUMN birth_date TEXT',
    'ALTER TABLE persons ADD COLUMN death_date TEXT',
    'ALTER TABLE persons ADD COLUMN birth_place TEXT',
    'ALTER TABLE persons ADD COLUMN death_place TEXT',
    'ALTER TABLE persons ADD COLUMN deceased INTEGER',
  ],
  [
    // Older builds kept deleted trees and people in the history; drop it, and mark a change if any went.
    `DELETE FROM change_log WHERE
      (tbl = 'trees' AND row_id NOT IN (SELECT id FROM trees)) OR
      (tbl = 'persons' AND row_id NOT IN (SELECT id FROM persons)) OR
      (tbl = 'relationships' AND row_id NOT IN (SELECT id FROM relationships))`,
    `INSERT INTO change_log (tbl, row_id, op, at)
      SELECT 'change_log', 'purge', 'delete', CAST(strftime('%s', 'now') AS INTEGER) * 1000 WHERE changes() > 0`,
  ],
];
