import type { MovementRecordsResponse, RecordHistoryEntry } from '@garfit/types';
import { Alert, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useFocusEffect, useLocalSearchParams, useRouter } from 'expo-router';
import { useCallback, useState } from 'react';
import { Card, Title, uiStyles } from '@/components/ui';
import { colors } from '@/constants/theme';
import { api, messageFor, useSession } from '@/lib/auth';
import { evolutionWidth, formatChange, formatValue } from '@/lib/presentation';

function seriesLabel(
  type: string,
  repetitions: number | null,
  distanceMeters: number | null,
): string {
  if (type === 'TIME' && distanceMeters) return `Tiempo · ${formatDistance(distanceMeters)}`;
  return repetitions ? `${type} · ${repetitions} reps` : type;
}

function formatDistance(meters: number): string {
  return meters >= 1000 && meters % 1000 === 0 ? `${meters / 1000} km` : `${meters} m`;
}

function originLabel(origin: NonNullable<RecordHistoryEntry['origin']>): string {
  return `Origen: ${origin.workoutName} · ${origin.performedOn} · Serie ${origin.setNumber}`;
}

function changeLabel(
  label: string,
  type: Parameters<typeof formatChange>[0],
  value: number,
  improved: boolean,
  system: Parameters<typeof formatChange>[2],
): string {
  return `${label}: ${formatChange(type, value, system)} (${improved ? 'mejora' : 'empeoró'})`;
}

function evolutionSummary(first: string, current: string, count: number): string {
  return `Evolución de ${first} a ${current} en ${count} registros`;
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
  if (error) return <ScrollView style={styles.scroll} contentContainerStyle={styles.content}><Text style={styles.error}>{error}</Text></ScrollView>;
  if (!data) return <ScrollView style={styles.scroll} contentContainerStyle={styles.content}><Text style={uiStyles.muted}>Cargando historial…</Text></ScrollView>;
  return (
    <ScrollView style={styles.scroll} contentContainerStyle={styles.content}>
      <Title>{data.movement.name}</Title>
      {data.series.length === 0 ? (
        <Text style={uiStyles.muted}>Aún no hay marcas para este movimiento.</Text>
      ) : (
        data.series.map((series) => {
          const values = series.history.map((entry) => entry.normalizedValue);
          const firstValue = formatValue(series.recordType, series.first.normalizedValue, system);
          const currentValue = formatValue(
            series.recordType,
            series.current.normalizedValue,
            system,
          );
          const bestValue = formatValue(series.recordType, series.best.normalizedValue, system);
          const summary = evolutionSummary(firstValue, currentValue, series.count);
          return (
            <Card key={series.key}>
              <Text style={styles.seriesTitle}>
                {seriesLabel(series.recordType, series.repetitions, series.distanceMeters)}
              </Text>
              <Text style={styles.recordValue}>{`Mejor: ${bestValue}`}</Text>
              <Text style={styles.normalText}>{`Actual: ${currentValue}`}</Text>
              {series.changeFromPrevious ? (
                <Text style={uiStyles.muted}>
                  {changeLabel(
                    'Cambio',
                    series.recordType,
                    series.changeFromPrevious.absolute,
                    series.changeFromPrevious.improved,
                    system,
                  )}
                </Text>
              ) : null}
              {series.totalProgress ? (
                <Text style={uiStyles.muted}>
                  {changeLabel(
                    'Progreso total',
                    series.recordType,
                    series.totalProgress.absolute,
                    series.totalProgress.improved,
                    system,
                  )}
                </Text>
              ) : null}
              <View accessibilityLabel={summary}>
                {series.history.map((entry) => (
                  <View
                    key={entry.id}
                    style={{
                      backgroundColor: colors.accent,
                      borderRadius: 3,
                      height: 12,
                      marginTop: 5,
                      width: evolutionWidth(entry.normalizedValue, values),
                    }}
                  />
                ))}
              </View>
              {series.history.map((entry) =>
                entry.source === 'WORKOUT' && entry.origin ? (
                  <Pressable
                    accessibilityRole="button"
                    accessibilityLabel={`Abrir entrenamiento ${entry.origin.workoutName}`}
                    key={`record-${entry.id}`}
                    onPress={() => router.push(`/(app)/workouts/${entry.origin?.workoutId}`)}
                  >
                    <Text style={uiStyles.muted}>{originLabel(entry.origin)}</Text>
                  </Pressable>
                ) : (
                  <Pressable
                    accessibilityRole="button"
                    accessibilityLabel={`Retirar marca del ${entry.performedAt}`}
                    key={`record-${entry.id}`}
                    onPress={() => remove(entry)}
                  >
                    <Text style={styles.removeEntry}>{`${entry.performedAt} · ${formatValue(
                      series.recordType,
                      entry.normalizedValue,
                      system,
                    )}${entry.isPersonalBest ? ' · Mejor marca' : ''} · Retirar`}</Text>
                  </Pressable>
                ),
              )}
            </Card>
          );
        })
      )}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  scroll: { backgroundColor: colors.background, flex: 1 },
  content: { gap: 14, padding: 20 },
  error: { color: colors.danger, fontSize: 15 },
  seriesTitle: { color: colors.text, fontSize: 17, fontWeight: '700' },
  recordValue: { color: colors.accent, fontSize: 16, fontWeight: '700' },
  normalText: { color: colors.text, fontSize: 15 },
  removeEntry: { color: colors.muted, fontSize: 14, marginTop: 4 },
});
