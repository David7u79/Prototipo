import type { RecordsOverviewResponse } from '@garfit/types';
import { useFocusEffect, useRouter } from 'expo-router';
import { useCallback, useState } from 'react';
import { FlatList, Pressable, Text } from 'react-native';
import { Card, Screen, Title, uiStyles } from '@/components/ui';
import { api, messageFor, useSession } from '@/lib/auth';
import { formatChange, formatValue } from '@/lib/presentation';

export default function ProgressScreen() {
  const { profile, request } = useSession();
  const router = useRouter();
  const [data, setData] = useState<RecordsOverviewResponse | null>(null);
  const [error, setError] = useState<string | null>(null);
  const load = useCallback(async () => {
    try {
      setData(await request(() => api.records.overview()));
    } catch (cause) {
      setError(messageFor(cause));
    }
  }, [request]);
  useFocusEffect(
    useCallback(() => {
      void load();
    }, [load]),
  );
  const system = profile?.preferredUnits ?? 'METRIC';
  return (
    <Screen>
      <Title>Marcas</Title>
      <Pressable
        accessibilityRole="button"
        accessibilityLabel="Registrar marca"
        onPress={() => router.push('/(app)/movements')}
      >
        <Card>
          <Text>Registrar marca</Text>
        </Card>
      </Pressable>
      <Pressable accessibilityRole="button" onPress={() => router.push('/(app)/ai')}>
        <Card>
          <Text>Análisis inteligente</Text>
          <Text style={uiStyles.muted}>Revisa tu progreso con una explicación personalizada.</Text>
        </Card>
      </Pressable>
      {error ? <Text>{error}</Text> : null}
      <FlatList
        data={data?.items ?? []}
        refreshing={!data && !error}
        onRefresh={() => void load()}
        ListEmptyComponent={<Text style={uiStyles.muted}>Aún no tienes marcas.</Text>}
        renderItem={({ item }) => (
          <Pressable
            accessibilityRole="button"
            onPress={() => router.push(`/(app)/records/${item.movement.slug}`)}
          >
            <Card>
              <Text>{item.movement.name}</Text>
              <Text>
                {formatValue(item.series.recordType, item.series.best.normalizedValue, system)}
              </Text>
              {item.series.bestImprovement ? (
                <Text>
                  {formatChange(
                    item.series.recordType,
                    item.series.bestImprovement.absolute,
                    system,
                  )}
                </Text>
              ) : null}
            </Card>
          </Pressable>
        )}
      />
    </Screen>
  );
}
