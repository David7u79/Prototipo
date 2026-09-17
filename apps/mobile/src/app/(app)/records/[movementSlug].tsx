import type { MovementRecordsResponse, RecordHistoryEntry } from '@garfit/types';
import { Alert, Pressable, ScrollView, Text, View } from 'react-native';
import { useFocusEffect, useLocalSearchParams } from 'expo-router';
import { useCallback, useState } from 'react';
import { Card, Title } from '@/components/ui';
import { api, messageFor, useSession } from '@/lib/auth';
import { evolutionWidth, formatChange, formatValue } from '@/lib/presentation';

function seriesLabel(type: string, repetitions: number | null): string {
  return repetitions ? `${type} · ${repetitions} reps` : type;
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
  if (error) return <Text>{error}</Text>;
  if (!data) return <Text>Cargando historial…</Text>;
  return (
    <ScrollView contentContainerStyle={{ gap: 14, padding: 20 }}>
      <Title>{data.movement.name}</Title>
      {data.series.length === 0 ? (
        <Text>Aún no hay marcas para este movimiento.</Text>
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
              <Text>{seriesLabel(series.recordType, series.repetitions)}</Text>
              <Text>{`Mejor: ${bestValue}`}</Text>
              <Text>{`Actual: ${currentValue}`}</Text>
              {series.changeFromPrevious ? (
                <Text>
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
                <Text>
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
                      backgroundColor: '#176B4D',
                      height: 12,
                      marginTop: 5,
                      width: evolutionWidth(entry.normalizedValue, values),
                    }}
                  />
                ))}
              </View>
              {series.history.map((entry) => (
                <Pressable
                  accessibilityRole="button"
                  accessibilityLabel={`Retirar marca del ${entry.performedAt}`}
                  key={`record-${entry.id}`}
                  onPress={() => remove(entry)}
                >
                  <Text>{`${entry.performedAt} · ${formatValue(
                    series.recordType,
                    entry.normalizedValue,
                    system,
                  )}${entry.isPersonalBest ? ' · Mejor marca' : ''} · Retirar`}</Text>
                </Pressable>
              ))}
            </Card>
          );
        })
      )}
    </ScrollView>
  );
}
