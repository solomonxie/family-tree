import { inTransaction, query, run } from '@/storage/db';
import * as repo from '@/storage/repo';
import { fromSample, SAMPLES } from './sample';

const SAMPLES_VERSION = '1';

// Bundled trees are (re)written whenever the shipped data version changes.
export function ensureSamplesLoaded() {
  if (repo.getSetting('samples.version') === SAMPLES_VERSION) return;
  inTransaction(() => {
    for (const s of SAMPLES) {
      const existing = query('SELECT created_at FROM trees WHERE id = ?', [s.id])[0];
      run('DELETE FROM relationships WHERE tree_id = ?', [s.id]);
      run('DELETE FROM persons WHERE tree_id = ?', [s.id]);
      run('DELETE FROM trees WHERE id = ?', [s.id]);
      const now = Date.now();
      repo.insertTree({
        id: s.id,
        title: s.title,
        kind: 'bundled',
        source: s.source,
        createdAt: existing ? Number(existing.created_at) : now,
        updatedAt: now,
      });
      const { persons, relationships } = fromSample(s, s.id);
      persons.forEach(repo.insertPerson);
      relationships.forEach(repo.insertRelationship);
    }
    repo.setSetting('samples.version', SAMPLES_VERSION);
  });
}
