import { useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { OriginLegend, PersonCard, ZoomControls, type Relation } from '@/canvas/CanvasChrome';
import { originColors } from '@/canvas/origins';
import { TreeContent } from '@/canvas/TreeContent';
import { TreeViewport, type Viewport, type ViewportHandle } from '@/canvas/TreeViewport';
import { Button } from '@/components/button';
import { showMenu } from '@/components/menu';
import { PromptModal, type PromptSpec } from '@/components/prompt';
import { ThemedText } from '@/components/themed-text';
import { Spacing } from '@/constants/theme';
import { canAddParentTo } from '@/domain/rules';
import { useScheme, useTheme } from '@/hooks/use-theme';
import { layoutTree, MARGIN, NODE_H, NODE_W, type TreeLayout } from '@/layout/layout';
import type { ScreenProps } from '@/navigation/types';
import { setSetting, useSetting, useTree } from '@/state/store';
import * as repo from '@/storage/repo';
import { confirmDelete, duplicate, exportTree, renamePrompt } from './treeActions';

const HIT_TARGET = 44;

function initialViewport(treeId: string, layout: TreeLayout, screen: { w: number; h: number }): Viewport {
  const saved = repo.getViewport(treeId);
  if (saved) return saved;
  const top = [...layout.nodes.values()].filter(n => n.gen === 0);
  const scale = Math.min(1, Math.max(0.5, screen.w / Math.max(layout.width, 1)));
  if (!top.length) return { x: 0, y: 0, scale };
  const minX = Math.min(...top.map(n => n.x));
  const maxX = Math.max(...top.map(n => n.x + NODE_W));
  const x = screen.w / 2 - ((minX + maxX) / 2) * scale;
  return { x: layout.width * scale <= screen.w ? (screen.w - layout.width * scale) / 2 : x, y: 32 - MARGIN * scale, scale };
}

export function CanvasScreen({ route, navigation }: ScreenProps<'Canvas'>) {
  const { treeId, focusId, focusNonce } = route.params;
  const theme = useTheme();
  const scheme = useScheme();
  const insets = useSafeAreaInsets();
  const { tree, persons, relationships } = useTree(treeId);
  const layout = useMemo(() => layoutTree(persons, relationships), [persons, relationships]);
  const personMap = useMemo(() => new Map(persons.map(p => [p.id, p])), [persons]);
  const viewport = useRef<ViewportHandle>(null);
  const [selectedId, setSelectedId] = useState<string>();
  const [originFilter, setOriginFilter] = useState<string>();
  const [prompt, setPrompt] = useState<PromptSpec>();
  const colorByOrigin = useSetting('canvas.colorByOrigin', '0') === '1';
  const showYears = useSetting('canvas.showYears', '1') === '1';
  const hintSeen = useSetting('hint.canvas', '0') === '1';
  const readOnly = tree?.kind === 'bundled';
  const selected = selectedId ? personMap.get(selectedId) : undefined;

  const origins = useMemo(() => originColors(persons, scheme), [persons, scheme]);

  const focusPerson = useCallback(
    (id: string) => {
      const n = layout.nodes.get(id);
      if (!n) return;
      setSelectedId(id);
      viewport.current?.focus(n.x + NODE_W / 2, n.y + NODE_H / 2, { anchorY: 0.38 });
    },
    [layout],
  );

  useEffect(() => {
    if (focusId) requestAnimationFrame(() => focusPerson(focusId));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [focusId, focusNonce]);

  useEffect(() => {
    if (selectedId && !personMap.has(selectedId)) setSelectedId(undefined);
  }, [personMap, selectedId]);

  useEffect(() => {
    if (hintSeen || !persons.length) return;
    const t = setTimeout(() => setSetting('hint.canvas', '1'), 4500);
    return () => clearTimeout(t);
  }, [hintSeen, persons.length]);

  const openMenu = useCallback(() => {
    if (!tree) return;
    showMenu(tree.title, [
      {
        label: colorByOrigin ? 'Turn off colour by origin' : 'Colour by origin',
        onPress: () => {
          setOriginFilter(undefined);
          setSetting('canvas.colorByOrigin', colorByOrigin ? '0' : '1');
        },
      },
      { label: 'Fit whole tree', onPress: () => viewport.current?.fit() },
      ...(readOnly
        ? [{ label: 'Duplicate to edit', onPress: () => navigation.replace('Canvas', { treeId: duplicate(tree).id }) }]
        : [{ label: 'Rename…', onPress: () => setPrompt(renamePrompt(tree)) }]),
      { label: 'Export…', onPress: () => exportTree(tree) },
      ...(readOnly
        ? []
        : [
            {
              label: 'Delete tree',
              destructive: true,
              onPress: () => confirmDelete(tree, persons.length, () => navigation.goBack()),
            },
          ]),
    ]);
  }, [tree, colorByOrigin, readOnly, navigation, persons.length]);

  useLayoutEffect(() => {
    navigation.setOptions({
      title: tree?.title ?? '',
      headerRight: () => (
        <View style={styles.headerButtons}>
          <Pressable
            hitSlop={10}
            accessibilityLabel="Find a person"
            onPress={() => navigation.navigate('Find', { treeId })}>
            <ThemedText type="headline" style={{ color: theme.accent }}>
              🔍
            </ThemedText>
          </Pressable>
          <Pressable hitSlop={10} accessibilityLabel="Tree menu" onPress={openMenu}>
            <ThemedText type="title" style={{ color: theme.accent, lineHeight: 24 }}>
              ⋯
            </ThemedText>
          </Pressable>
        </View>
      ),
    });
  }, [navigation, tree?.title, theme.accent, openMenu, treeId]);

  const onTap = useCallback(
    (x: number, y: number, scale: number) => {
      const slop = Math.max(0, (HIT_TARGET / scale - NODE_H) / 2);
      let best: string | undefined;
      let bestD = Infinity;
      for (const n of layout.nodes.values()) {
        if (x < n.x - slop || x > n.x + NODE_W + slop || y < n.y - slop || y > n.y + NODE_H + slop) continue;
        const d = Math.hypot(x - (n.x + NODE_W / 2), y - (n.y + NODE_H / 2));
        if (d < bestD) {
          bestD = d;
          best = n.id;
        }
      }
      setSelectedId(best);
    },
    [layout],
  );

  const onSettle = useCallback((v: Viewport) => repo.saveViewport(treeId, v), [treeId]);

  const addRelative = (relation: Relation) =>
    selected && navigation.navigate('PersonForm', { treeId, relation, ofId: selected.id });

  if (!tree) {
    return (
      <View style={[styles.fill, styles.center]}>
        <ThemedText themeColor="textSecondary">This tree was removed.</ThemedText>
      </View>
    );
  }

  const parentBlock = selected ? canAddParentTo(selected, relationships) : undefined;
  const fillOf = colorByOrigin ? origins.colorOf : undefined;
  const dimmed = colorByOrigin && originFilter ? (p: (typeof persons)[number]) => origins.groupOf(p) !== originFilter : undefined;

  return (
    <View style={[styles.fill, { backgroundColor: theme.canvas }]}>
      {persons.length ? (
        <TreeViewport
          key={treeId}
          ref={viewport}
          contentWidth={layout.width}
          contentHeight={layout.height}
          initial={screen => initialViewport(treeId, layout, screen)}
          onSettle={onSettle}
          onTap={onTap}>
          {(visible, level) => (
            <TreeContent
              layout={layout}
              persons={personMap}
              visible={visible}
              level={level}
              theme={theme}
              selectedId={selectedId}
              fillOf={fillOf}
              dimmed={dimmed}
              showYears={showYears}
            />
          )}
        </TreeViewport>
      ) : (
        <View style={[styles.fill, styles.center]}>
          <ThemedText type="headline">Nobody here yet</ThemedText>
          <ThemedText themeColor="textSecondary" style={styles.emptyText}>
            Add yourself, then parents, partners and children.
          </ThemedText>
          <Button kind="primary" title="Add first person" onPress={() => navigation.navigate('PersonForm', { treeId })} />
        </View>
      )}

      {!hintSeen && persons.length ? (
        <View pointerEvents="none" style={[styles.hint, { backgroundColor: theme.text }]}>
          <ThemedText type="subhead" style={{ color: theme.background }}>
            Pinch to zoom · tap someone {readOnly ? 'to see details' : 'to add relatives'}
          </ThemedText>
        </View>
      ) : null}

      {!selected && persons.length ? (
        <View pointerEvents="box-none" style={[styles.bottom, { paddingBottom: insets.bottom + Spacing.three }]}>
          <View pointerEvents="box-none" style={styles.controlsRow}>
            <View />
            <View style={styles.rightStack}>
              <ZoomControls
                onIn={() => viewport.current?.zoomBy(1.6)}
                onOut={() => viewport.current?.zoomBy(1 / 1.6)}
                onFit={() => viewport.current?.fit()}
              />
              {readOnly ? null : (
                <Button kind="primary" title="+ Add" onPress={() => navigation.navigate('PersonForm', { treeId })} />
              )}
            </View>
          </View>
          {colorByOrigin ? (
            <OriginLegend items={origins.legend} selected={originFilter} onSelect={setOriginFilter} />
          ) : null}
        </View>
      ) : null}

      {selected ? (
        <PersonCard
          person={selected}
          readOnly={readOnly}
          parentBlockedReason={parentBlock && !parentBlock.ok ? parentBlock.reason : undefined}
          bottomInset={insets.bottom}
          onOpen={() => navigation.navigate('PersonDetail', { personId: selected.id })}
          onAdd={addRelative}
          onDuplicate={() => navigation.replace('Canvas', { treeId: duplicate(tree).id })}
        />
      ) : null}
      <PromptModal spec={prompt} onClose={() => setPrompt(undefined)} />
    </View>
  );
}

const styles = StyleSheet.create({
  fill: { flex: 1 },
  center: { alignItems: 'center', justifyContent: 'center', gap: Spacing.two, padding: Spacing.four },
  emptyText: { textAlign: 'center', marginBottom: Spacing.two },
  headerButtons: { flexDirection: 'row', alignItems: 'center', gap: 20 },
  hint: {
    position: 'absolute',
    top: Spacing.three,
    alignSelf: 'center',
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 16,
    opacity: 0.9,
  },
  bottom: { position: 'absolute', left: 0, right: 0, bottom: 0, gap: Spacing.three },
  controlsRow: { flexDirection: 'row', justifyContent: 'space-between', paddingHorizontal: Spacing.three },
  rightStack: { alignItems: 'flex-end', gap: Spacing.three },
});
