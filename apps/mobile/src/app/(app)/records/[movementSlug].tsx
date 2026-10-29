import type { MovementRecordsResponse, RecordHistoryEntry } from '@garfit/types';
import { Alert, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useFocusEffect, useLocalSearchParams, useRouter } from 'expo-router';
import { useCallback, useState } from 'react';
import { Button, Card, Chip, Icon, Label, ListRow, SectionHeader, Stat, Title, uiStyles } from '@/components/ui';
import { colors, radius, space, type } from '@/constants/theme';
import { api, messageFor, useSession } from '@/lib/auth';
import { evolutionWidth, formatChange, formatValue } from '@/lib/presentation';

function seriesLabel(
  recordType: string,
  repetitions: number | null,
  distanceMeters: number | null,
): string {
  if (recordType === 'TIME' && distanceMeters) return `Tiempo · ${formatDistance(distanceMeters)}`;
  return repetitions ? `${recordType} · ${repetitions} reps` : recordType;
}

function formatDistance(meters: number): string {
  return meters >= 1000 && meters % 1000 === 0 ? `${meters / 1000} km` : `${meters} m`;
}

function originLabel(origin: NonNullable<RecordHistoryEntry['origin']>): string {
  return `De: ${origin.workoutName} · Serie ${origin.setNumber}`;
}

export default function RecordHistoryScreen() {
  const { movementSlug } = useLocalSearchParams<{ movementSlug: string }>();
  const { profile, request } = useSession();
  const router = useRouter();
  const [data, setData] = useState<MovementRecordsResponse | null>(null);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(() => {
    if (movementSlug)
      return request(() => api.records.forMovement(movementSlug))
        .then(setData)
        .catch((cause: unknown) => setError(messageFor(cause)));
    return Promise.resolve();
  }, [movementSlug, request]);

  useFocusEffect(
    useCallback(() => {
      void load();
    }, [load]),
  );

  const system = profile?.preferredUnits ?? 'METRIC';

  function remove(record: RecordHistoryEntry) {
    Alert.alert('Retirar marca', 'Esta marca dejará de aparecer en tu historial.', [
      { text: 'Cancelar', style: 'cancel' },
      {
        text: 'Retirar',
        style: 'destructive',
        onPress: () =>
          void request(() => api.records.remove(record.id))
            .then(load)
            .catch((cause: unknown) => setError(messageFor(cause))),
      },
    ]);
  }

  if (error)
    return (
      <ScrollView style={styles.scroll} contentContainerStyle={uiStyles.scroll}>
        <Text style={styles.errorText}>{error}</Text>
      </ScrollView>
    );

  if (!data)
    return (
      <ScrollView style={styles.scroll} contentContainerStyle={uiStyles.scroll}>
        <Text style={uiStyles.muted}>Cargando historial…</Text>
      </ScrollView>
    );

  const primarySeries = data.series[0];
  const bestFormatted = primarySeries
    ? formatValue(primarySeries.recordType, primarySeries.best.normalizedValue, system)
    : '—';
  const currentFormatted = primarySeries
    ? formatValue(primarySeries.recordType, primarySeries.current.normalizedValue, system)
    : '—';

  return (
    <ScrollView style={styles.scroll} contentContainerStyle={uiStyles.scroll}>
      {/* Card hero: nombre del movimiento y Stat de la mejor marca */}
      <Card hero style={styles.heroCard}>
        <Title>{data.movement.name}</Title>
        <View style={styles.heroStats}>
          <Stat label="Mejor marca" value={bestFormatted} tone="metric" />
          <Stat label="Último registro" value={currentFormatted} tone="accent" />
        </View>
        <Button
          label="Registrar nueva marca"
          onPress={() =>
            router.push({ pathname: '/(app)/records/new', params: { movement: data.movement.slug } })
          }
        />
      </Card>

      {data.series.length === 0 ? (
        <Card>
          <Text style={uiStyles.muted}>Aún no hay marcas para este movimiento.</Text>
        </Card>
      ) : (
        data.series.map((series) => {
          const values = series.history.map((entry) => entry.normalizedValue);
          const title = seriesLabel(series.recordType, series.repetitions, series.distanceMeters);

          return (
            <View key={series.key} style={styles.seriesGroup}>
              <SectionHeader title={title} />

              {/* Barra de evolución gráfica */}
              <Card style={styles.evolutionCard}>
                <Label>Evolución de registros</Label>
                <View style={styles.barsContainer}>
                  {series.history.map((entry) => (
                    <View
                      key={entry.id}
                      style={[
                        styles.evolutionBar,
                        {
                          width: evolutionWidth(entry.normalizedValue, values),
                          backgroundColor: entry.isPersonalBest ? colors.metric : colors.accent,
                        },
                      ]}
                    />
                  ))}
                </View>
                {series.totalProgress ? (
                  <Text style={styles.progressText}>
                    Progreso total: {formatChange(series.recordType, series.totalProgress.absolute, system)}
                  </Text>
                ) : null}
              </Card>

              {/* Lista de registros */}
              <View style={styles.entriesList}>
                {series.history.map((entry) => {
                  const formatted = formatValue(series.recordType, entry.normalizedValue, system);
                  const isWorkout = entry.source === 'WORKOUT' && entry.origin;

                  return (
                    <ListRow
                      key={entry.id}
                      icon={{ ios: 'trophy.fill', android: 'emoji_events' }}
                      tone={entry.isPersonalBest ? 'metric' : 'accent'}
                      title={formatted}
                      subtitle={
                        isWorkout && entry.origin
                          ? `${entry.performedAt} · ${originLabel(entry.origin)}`
                          : `${entry.performedAt}${entry.isPersonalBest ? ' · Récord personal' : ''}`
                      }
                      trailing={
                        isWorkout ? (
                          <Chip label="Entreno" tone="accent" />
                        ) : (
                          <Pressable
                            accessibilityRole="button"
                            accessibilityLabel="Retirar marca"
                            hitSlop={8}
                            onPress={() => remove(entry)}
                            style={styles.deleteIconBtn}
                          >
                            <Icon name={{ ios: 'trash', android: 'delete' }} size={16} color={colors.danger} />
                          </Pressable>
                        )
                      }
                      onPress={
                        isWorkout && entry.origin
                          ? () => router.push(`/(app)/workouts/${entry.origin?.workoutId}`)
                          : undefined
                      }
                    />
                  );
                })}
              </View>
            </View>
          );
        })
      )}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  scroll: {
    backgroundColor: colors.background,
    flex: 1,
  },
  heroCard: {
    gap: space.md,
  },
  heroStats: {
    flexDirection: 'row',
    gap: space.md,
  },
  seriesGroup: {
    gap: space.sm,
  },
  evolutionCard: {
    gap: space.sm,
  },
  barsContainer: {
    gap: 6,
    paddingVertical: space.xs,
  },
  evolutionBar: {
    height: 10,
    borderRadius: radius.pill,
  },
  progressText: {
    color: colors.success,
    fontSize: 13,
    fontWeight: '600',
  },
  entriesList: {
    gap: space.xs,
  },
  deleteIconBtn: {
    padding: 6,
  },
  errorText: {
    color: colors.danger,
    ...type.body,
  },
});
