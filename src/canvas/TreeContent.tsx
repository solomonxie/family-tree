import { memo } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import Svg, { Line } from 'react-native-svg';

import type { ThemeColors } from '@/constants/theme';
import { initials, lifespan } from '@/domain/format';
import type { Person } from '@/domain/types';
import { GEN_Y, MARGIN, NODE_H, NODE_W, type EdgeLine, type TreeLayout } from '@/layout/layout';
import type { Rect, ZoomLevel } from './TreeViewport';

const EDGE_W = 1.5;

interface Props {
  layout: TreeLayout;
  persons: Map<string, Person>;
  visible: Rect;
  level: ZoomLevel;
  theme: ThemeColors;
  selectedId?: string;
  fillOf?: (p: Person) => string;
  dimmed?: (p: Person) => boolean;
  showYears: boolean;
}

const intersects = (r: Rect, x: number, y: number, w: number, h: number) =>
  x + w >= r.x && x <= r.x + r.w && y + h >= r.y && y <= r.y + r.h;

export const TreeContent = memo(function TreeContent(p: Props) {
  const { layout, visible, theme } = p;
  const nodes = [...layout.nodes.values()].filter(n => intersects(visible, n.x, n.y, NODE_W, NODE_H));
  const edges = layout.edges.filter(e => {
    const [x1, y1, x2, y2] = e.points;
    return intersects(visible, Math.min(x1, x2), Math.min(y1, y2), Math.abs(x2 - x1), Math.abs(y2 - y1));
  });
  // `visible` spans three screens; the real viewport is its middle third.
  const viewLeft = visible.x + visible.w / 3;
  return (
    <>
      {edges.map(e => (
        <Edge key={e.key} edge={e} color={theme.edge} />
      ))}
      {nodes.map(n => {
        const person = p.persons.get(n.id);
        if (!person) return null;
        return (
          <PersonNode
            key={n.id}
            person={person}
            x={n.x}
            y={n.y}
            level={p.level}
            theme={theme}
            selected={p.selectedId === n.id}
            fill={p.fillOf?.(person)}
            dim={p.dimmed?.(person) ?? false}
            showYears={p.showYears}
          />
        );
      })}
      {p.level === 'dots'
        ? Array.from({ length: layout.generations }, (_, g) => g)
            .filter(g => {
              const y = MARGIN + g * GEN_Y;
              return y >= visible.y && y <= visible.y + visible.h;
            })
            .map(g => (
              <Text
                key={g}
                style={[styles.genLabel, { top: MARGIN + g * GEN_Y - 8, left: viewLeft + 12, color: theme.textSecondary }]}>
                Gen {g + 1}
              </Text>
            ))
        : null}
    </>
  );
});

function Edge({ edge, color }: { edge: EdgeLine; color: string }) {
  const [x1, y1, x2, y2] = edge.points;
  if (edge.kind === 'spouse') {
    const left = Math.min(x1, x2);
    const top = Math.min(y1, y2) - 2;
    const w = Math.max(Math.abs(x2 - x1), 1);
    const h = Math.abs(y2 - y1) + 4;
    return (
      <Svg style={{ position: 'absolute', left, top }} width={w} height={h}>
        <Line
          x1={x1 - left}
          y1={y1 - top}
          x2={x2 - left}
          y2={y2 - top}
          stroke={color}
          strokeWidth={EDGE_W}
          strokeDasharray="4,3"
        />
      </Svg>
    );
  }
  const vertical = x1 === x2;
  return (
    <View
      style={{
        position: 'absolute',
        backgroundColor: color,
        left: vertical ? x1 - EDGE_W / 2 : Math.min(x1, x2),
        top: vertical ? Math.min(y1, y2) : y1 - EDGE_W / 2,
        width: vertical ? EDGE_W : Math.abs(x2 - x1) + EDGE_W / 2,
        height: vertical ? Math.abs(y2 - y1) : EDGE_W,
      }}
    />
  );
}

const PersonNode = memo(function PersonNode(p: {
  person: Person;
  x: number;
  y: number;
  level: ZoomLevel;
  theme: ThemeColors;
  selected: boolean;
  fill?: string;
  dim: boolean;
  showYears: boolean;
}) {
  const { person, theme } = p;
  const years = p.showYears ? lifespan(person) : '';
  return (
    <View
      accessible
      accessibilityRole="button"
      accessibilityLabel={[person.name, lifespan(person), person.originRegion].filter(Boolean).join(', ')}
      style={[
        styles.node,
        {
          left: p.x,
          top: p.y,
          backgroundColor: p.fill ?? theme.node,
          borderColor: p.selected ? theme.accent : theme.border,
          borderWidth: p.selected ? 3 : 1,
          opacity: p.dim ? 0.3 : 1,
        },
      ]}>
      {p.level === 'full' ? (
        <>
          <Text numberOfLines={1} style={[styles.name, { color: theme.text }]}>
            {person.name}
          </Text>
          {years ? (
            <Text numberOfLines={1} style={[styles.years, { color: theme.textSecondary }]}>
              {years}
            </Text>
          ) : null}
        </>
      ) : p.level === 'initials' ? (
        <Text style={[styles.initials, { color: theme.text }]}>{initials(person.name)}</Text>
      ) : null}
    </View>
  );
});

const styles = StyleSheet.create({
  node: {
    position: 'absolute',
    width: NODE_W,
    height: NODE_H,
    borderRadius: 10,
    paddingHorizontal: 8,
    justifyContent: 'center',
    alignItems: 'center',
  },
  name: { fontSize: 14, fontWeight: '600' },
  years: { fontSize: 12, marginTop: 1, fontVariant: ['tabular-nums'] },
  initials: { fontSize: 26, fontWeight: '700' },
  genLabel: { position: 'absolute', fontSize: 64, fontWeight: '700' },
});
