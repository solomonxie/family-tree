import * as FS from '@dr.pogodin/react-native-fs';
import { errorCodes, isErrorWithCode, keepLocalCopy, pick, types } from '@react-native-documents/picker';
import { useCallback, useEffect, useState } from 'react';
import { Alert, AppState, Pressable, StyleSheet, Switch, View } from 'react-native';

import {
  exportBackup,
  icloudFile,
  icloudStatus,
  importTrees,
  listRestorePoints,
  maybeSaveToICloud,
  readRestorePoint,
  type ICloudStatus,
  type PendingImport,
  type RestorePoint,
} from '@/backup/backup';
import { appVersion } from '@/constants/app-info';
import { removeAllData } from '@/backup/erase';
import { resetDemo, setDemoMode, useDemo } from '@/demo/demo';
import { readImportFile } from '@/import/importFile';
import { Row, Section } from '@/components/list';
import { confirm, showMenu } from '@/components/menu';
import { ThemedText } from '@/components/themed-text';
import { showToast } from '@/components/toast';
import { useTheme, type Appearance } from '@/hooks/use-theme';
import { SAMPLES } from '@/samples/sample';
import { setSetting, useDataVersion, useSetting, useTrees } from '@/state/store';
import { dbPath } from '@/storage/db';
import { PHOTO_DIR } from '@/storage/photos';
import { dataRoot } from '@/storage/profile';
import { shareFile } from './treeActions';

const APPEARANCES: [Appearance, string][] = [
  ['auto', 'Auto'],
  ['light', 'Light'],
  ['dark', 'Dark'],
];

const ICLOUD_STATE: Record<Exclude<ICloudStatus, 'available' | 'unsupported'>, { line: string; fix?: string }> = {
  notEntitled: { line: 'This build of the app isn’t signed for iCloud' },
  driveOff: { line: 'iCloud Drive is off on this phone', fix: 'Settings → your name → iCloud → iCloud Drive → turn on' },
  notReady: { line: 'iCloud Drive isn’t ready yet — try again shortly' },
};

async function storageBytes(): Promise<number> {
  let total = 0;
  const db = dbPath();
  for (const f of [db, `${db}-wal`]) if (await FS.exists(f)) total += Number((await FS.stat(f)).size);
  const photos = `${dataRoot()}/${PHOTO_DIR}`;
  if (await FS.exists(photos)) for (const f of await FS.readDir(photos)) total += Number(f.size);
  return total;
}

export const formatBytes = (n: number) =>
  n < 1024 * 1024 ? `${Math.max(1, Math.round(n / 1024))} KB` : `${(n / 1024 / 1024).toFixed(1)} MB`;

const time = (d: Date) => d.toLocaleTimeString(undefined, { hour: 'numeric', minute: '2-digit' });
function when(d: Date) {
  const days = Math.round((new Date().setHours(0, 0, 0, 0) - new Date(d).setHours(0, 0, 0, 0)) / 86400000);
  const day = days === 0 ? 'Today' : days === 1 ? 'Yesterday' : d.toLocaleDateString(undefined, { month: 'short', day: 'numeric' });
  return `${day} ${time(d)}`;
}

export function SettingsSections() {
  const theme = useTheme();
  const appearance = useSetting('appearance', 'auto');
  const showYears = useSetting('canvas.showYears', '1') === '1';
  const icloudOn = useSetting('backup.icloud', '1') !== '0';
  const lastExport = useSetting('backup.lastExport', '');
  const userTrees = useTrees().filter(t => t.kind === 'user').length;
  const version = useDataVersion();
  const [bytes, setBytes] = useState<number>();
  const [points, setPoints] = useState<RestorePoint[]>([]);
  const [status, setStatus] = useState<ICloudStatus>();
  const [cloudFile, setCloudFile] = useState<{ modified: number; size: number } | null>(null);
  const [busy, setBusy] = useState<string>();

  const refresh = useCallback(() => {
    storageBytes().then(setBytes).catch(() => setBytes(undefined));
    listRestorePoints().then(setPoints).catch(() => setPoints([]));
    icloudStatus().then(setStatus);
    icloudFile()
      .then(setCloudFile)
      .catch(() => setCloudFile(null));
  }, []);
  useEffect(refresh, [refresh, version]);
  useEffect(() => {
    const sub = AppState.addEventListener('change', s => s === 'active' && refresh());
    return () => sub.remove();
  }, [refresh]);

  const run = async (label: string, fn: () => Promise<void>) => {
    setBusy(label);
    try {
      await fn();
    } catch (e) {
      if (!(isErrorWithCode(e) && e.code === errorCodes.OPERATION_CANCELED)) showToast(`⚠ ${(e as Error).message}`);
    } finally {
      setBusy(undefined);
      refresh();
    }
  };

  const confirmImport = (pending: PendingImport, title: string, verb: 'Restore' | 'Import' = 'Restore') => {
    const { trees } = pending;
    if (!trees.length) throw new Error('There are no trees in it.');
    const people = trees.reduce((n, t) => n + t.persons.length, 0);
    const what = trees.length === 1 ? `“${trees[0].tree.title}” (${people} ${people === 1 ? 'person' : 'people'}) is` : `${trees.length} trees are`;
    confirm(
      title,
      `${what} added next to your current trees. Nothing is replaced.`,
      verb,
      () =>
        run(verb === 'Import' ? 'Importing…' : 'Restoring…', async () => {
          const n = await importTrees(pending);
          showToast(`${verb === 'Import' ? 'Imported' : 'Restored'} ${n} ${n === 1 ? 'tree' : 'trees'}`);
        }),
      false,
    );
  };

  const exportAll = () =>
    run('Packing your trees…', async () => {
      const { path } = await exportBackup();
      setBusy(undefined);
      await shareFile(path);
    });

  const importFile = () =>
    run('Opening…', async () => {
      // .ged has no system file type, so any file is offered and recognised by content.
      const [file] = await pick({ type: [types.allFiles] });
      const name = file.name ?? 'import';
      const [copy] = await keepLocalCopy({ files: [{ uri: file.uri, fileName: name }], destination: 'cachesDirectory' });
      if (copy.status !== 'success') throw new Error(copy.copyError ?? 'Couldn’t read that file.');
      setBusy('Reading…');
      confirmImport(await readImportFile(copy.localUri, name), `Import ${name}?`, 'Import');
    });

  const chooseRestorePoint = () =>
    showMenu(
      'Daily copies · last 7 days · each holds that day’s latest state',
      points.map(p => ({
        label: when(p.date),
        onPress: () =>
          run('Reading…', async () => confirmImport(await readRestorePoint(p.path), `Restore trees as of ${when(p.date)}?`)),
      })),
    );

  const toggleICloud = (on: boolean) => {
    setSetting('backup.icloud', on ? '1' : '0');
    if (on) run('Saving to iCloud Drive…', async () => void (await maybeSaveToICloud(true)));
  };

  const removeAll = () => {
    const erase = (icloud: boolean) =>
      run('Removing…', async () => {
        await removeAllData({ icloud });
        showToast(icloud || !cloudFile ? 'All app data removed' : 'All app data removed · iCloud Drive copy kept, daily backup off');
      });
    const local =
      'Deletes every tree, person and photo, the change history, settings and the daily copies on this iPhone. This can’t be undone.';
    const elsewhere = 'Files you exported and shared elsewhere aren’t affected.';
    if (status === 'available' && cloudFile) {
      Alert.alert(
        'Remove all app data?',
        `${local}\n\nThe backup in your iCloud Drive (Files → iCloud Drive → Family Tree) can be deleted too, or kept for you to import or delete later. ${elsewhere}`,
        [
          { text: 'Also delete iCloud Drive backup', style: 'destructive', onPress: () => erase(true) },
          { text: 'Keep iCloud Drive backup', style: 'destructive', onPress: () => erase(false) },
          { text: 'Cancel', style: 'cancel' },
        ],
      );
      return;
    }
    confirm(
      'Remove all app data?',
      `${local}\n\nAny backup already in your iCloud Drive (Files → iCloud Drive → Family Tree) stays there for you to delete. ${elsewhere}`,
      'Remove',
      () => erase(false),
    );
  };

  const blocked = status && status !== 'available' && status !== 'unsupported' ? ICLOUD_STATE[status] : undefined;
  const cloudLine = blocked
    ? blocked.line
    : icloudOn
      ? `On · Files → iCloud Drive → Family Tree${cloudFile?.modified ? ` · ${when(new Date(cloudFile.modified))}` : ''}`
      : cloudFile
        ? 'Off · the last copy stays in iCloud Drive until you delete it'
        : 'Off · nothing is saved to iCloud Drive';

  return (
    <>
      <Section title="Settings" right={busy ? <ThemedText type="caption" themeColor="textSecondary">⟳ {busy}</ThemedText> : undefined}>
        <Row
          label="Theme"
          right={
            <View style={[styles.segment, { backgroundColor: theme.backgroundSelected }]}>
              {APPEARANCES.map(([value, label]) => {
                const on = appearance === value;
                return (
                  <Pressable
                    key={value}
                    onPress={() => setSetting('appearance', value)}
                    accessibilityRole="radio"
                    accessibilityState={{ selected: on }}
                    style={[styles.segmentItem, on && { backgroundColor: theme.backgroundElement }]}>
                    <ThemedText type={on ? 'headline' : 'subhead'}>{label}</ThemedText>
                  </Pressable>
                );
              })}
            </View>
          }
        />
        <Row
          label="Show years on nodes"
          right={
            <Switch
              value={showYears}
              onValueChange={v => setSetting('canvas.showYears', v ? '1' : '0')}
              trackColor={{ true: theme.accent }}
            />
          }
        />
        {status && status !== 'unsupported' ? (
          <Row
            label="Daily iCloud Drive backup"
            detail={cloudLine}
            detailLines={2}
            right={
              <Switch
                value={icloudOn && !blocked}
                disabled={!!blocked}
                onValueChange={toggleICloud}
                trackColor={{ true: theme.accent }}
              />
            }
          />
        ) : null}
        {blocked?.fix ? <Row label={blocked.fix} labelColor={theme.accent} numberOfLines={2} /> : null}
        <Row
          label="Restore a daily copy…"
          detail={points.length ? `${points.length} ${points.length === 1 ? 'day' : 'days'} on this phone · updated ${when(points[0].date)}` : 'Made after your next change'}
          labelColor={points.length ? theme.accent : undefined}
          onPress={points.length && !busy ? chooseRestorePoint : undefined}
        />
        <Row
          label="Export all trees…"
          detail={lastExport ? `Last export ${when(new Date(Number(lastExport)))}` : 'Never exported'}
          labelColor={theme.accent}
          onPress={busy ? undefined : exportAll}
        />
        <Row
          label="Import from file…"
          detail="Backup .zip · GEDCOM .ged"
          labelColor={theme.accent}
          onPress={busy ? undefined : importFile}
        />
        <Row
          label="Storage"
          value={`${userTrees} ${userTrees === 1 ? 'tree' : 'trees'}${bytes !== undefined ? ` · ${formatBytes(bytes)}` : ''}`}
        />
        {SAMPLES.map(s => (
          <Row key={s.id} label={`${s.title} source`} value={s.source} />
        ))}
        <Row label="Remove all app data…" destructive onPress={busy ? undefined : removeAll} />
        <Row label="Version" value={appVersion()} />
      </Section>
      <DemoSection />
    </>
  );
}

function DemoSection() {
  const theme = useTheme();
  const { on } = useDemo();
  const [switching, setSwitching] = useState(false);
  const toggle = (v: boolean) => {
    setSwitching(true);
    setDemoMode(v)
      .catch(e => showToast(`⚠ ${(e as Error).message}`))
      .finally(() => setSwitching(false));
  };
  const reset = () =>
    confirm('Reset demo data?', 'Back to the demo family as first installed. Your own trees are not touched.', 'Reset', resetDemo);
  return (
    <Section title="Demo">
      <Row
        label="Demo data"
        detail={on ? 'Showing a fictional family, not yours' : 'Show a fictional family instead of yours'}
        right={
          <Switch
            value={on}
            disabled={switching}
            onValueChange={toggle}
            trackColor={{ true: theme.accent }}
            accessibilityLabel="Demo data"
          />
        }
      />
      {on ? <Row label="Reset demo data" destructive onPress={reset} /> : null}
    </Section>
  );
}

const styles = StyleSheet.create({
  segment: { flexDirection: 'row', borderRadius: 9, padding: 2 },
  segmentItem: {
    minWidth: 56,
    minHeight: 32,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 7,
    paddingHorizontal: 8,
  },
});
