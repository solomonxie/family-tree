import { router, useLocalSearchParams } from 'expo-router';
import { Fragment } from 'react';
import { Pressable, ScrollView, StyleSheet } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import Svg, { Circle, Line, Text as SvgText } from 'react-native-svg';

import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { Spacing } from '@/constants/theme';
import { mockNodePositions, mockPersons, mockRelationships } from '@/data/mockFamily';
import { useTheme } from '@/hooks/use-theme';

const NODE_RADIUS = 28;
const CANVAS_WIDTH = 320;
const CANVAS_HEIGHT = 320;

export default function TreeCanvasScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const theme = useTheme();

  const title = id === 'historical-adam-jesus' ? 'Historical: Adam to Jesus' : 'My Family';

  return (
    <SafeAreaView style={styles.safeArea}>
      <ThemedView style={styles.container}>
        <ThemedText type="subtitle">{title}</ThemedText>
        <ThemedText type="small" themeColor="textSecondary" style={styles.hint}>
          Placeholder layout. Pan and zoom gestures are a TODO — tap a person to view details.
        </ThemedText>

        <ScrollView contentContainerStyle={styles.canvasWrapper} horizontal>
          <Svg width={CANVAS_WIDTH} height={CANVAS_HEIGHT}>
            {mockRelationships.map((rel) => {
              const from = mockNodePositions[rel.fromPersonId];
              const to = mockNodePositions[rel.toPersonId];
              if (!from || !to) return null;
              return (
                <Line
                  key={rel.id}
                  x1={from.x}
                  y1={from.y}
                  x2={to.x}
                  y2={to.y}
                  stroke={theme.textSecondary}
                  strokeWidth={rel.type === 'spouse' ? 2 : 1.5}
                  strokeDasharray={rel.type === 'spouse' ? '4,3' : undefined}
                />
              );
            })}

            {mockPersons.map((person) => {
              const pos = mockNodePositions[person.id];
              if (!pos) return null;
              return (
                <Fragment key={person.id}>
                  <Circle
                    cx={pos.x}
                    cy={pos.y}
                    r={NODE_RADIUS}
                    fill={theme.backgroundElement}
                    stroke={theme.text}
                    strokeWidth={1}
                    onPress={() => router.push(`/person/${person.id}`)}
                  />
                  <SvgText
                    x={pos.x}
                    y={pos.y + 4}
                    fontSize={10}
                    fill={theme.text}
                    textAnchor="middle"
                    onPress={() => router.push(`/person/${person.id}`)}>
                    {person.name.split(' ')[0]}
                  </SvgText>
                </Fragment>
              );
            })}
          </Svg>
        </ScrollView>

        <Pressable
          onPress={() => router.push('/person/add')}
          style={({ pressed }) => pressed && styles.pressed}>
          <ThemedView type="backgroundElement" style={styles.addButton}>
            <ThemedText type="linkPrimary">+ Add person</ThemedText>
          </ThemedView>
        </Pressable>
      </ThemedView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
  },
  container: {
    flex: 1,
    paddingHorizontal: Spacing.four,
    paddingTop: Spacing.four,
    gap: Spacing.two,
  },
  hint: {
    marginBottom: Spacing.three,
  },
  canvasWrapper: {
    alignItems: 'center',
    justifyContent: 'center',
    flexGrow: 1,
  },
  addButton: {
    alignSelf: 'center',
    borderRadius: Spacing.three,
    paddingHorizontal: Spacing.four,
    paddingVertical: Spacing.two,
    marginBottom: Spacing.three,
  },
  pressed: {
    opacity: 0.7,
  },
});
