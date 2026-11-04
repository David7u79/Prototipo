import type { WodSummary } from '@garfit/types';
import { WORKOUT_TYPE_LABELS } from '@garfit/validation';
import { useFocusEffect, useRouter } from 'expo-router';
import { useCallback, useState } from 'react';
import { FlatList, StyleSheet, View } from 'react-native';
import { Chip, EmptyState, ErrorState, ListRow, LoadingState, Title, uiStyles } from '@/components/ui';
import { colors } from '@/constants/theme';
import { api, messageFor, useSession } from '@/lib/auth';
import { wodPrescription } from '@/lib/wods';

export default function WodListScreen() {
  const { request } = useSession();
  const router = useRouter();
  const [items, setItems] = useState<WodSummary[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [refreshing, setRefreshing] = useState(false);

  const load = useCallback(
    async (refresh = false) => {
      setRefreshing(refresh);
      setError(null);
      try {
        const response = await request(() => api.wods.list({ limit: 50 }));
        setItems(
          response.items.sort(
            (left, right) => Number(right.isBenchmark) - Number(left.isBenchmark),
          ),
        );
      } catch (cause) {
        setError(messageFor(cause));
      } finally {
        setRefreshing(false);
      }
    },
    [request],
  );

  useFocusEffect(useCallback(() => void load(), [load]));

  if (!items && !error) return <LoadingState />;
  if (error) return <ErrorState message={error} onRetry={() => void load()} />;

  return (
    <View style={styles.container}>
      <FlatList
        contentContainerStyle={uiStyles.scroll}
        data={items ?? []}
        keyExtractor={(item) => item.id}
        refreshing={refreshing}
        onRefresh={() => void load(true)}
        ListHeaderComponent={<Title>WODs</Title>}
        ListEmptyComponent={
          <EmptyState
            icon={{ ios: 'timer', android: 'timer' }}
            title="Sin WODs disponibles"
            message="No encontramos entrenamientos WOD cargados en el sistema."
          />
        }
        renderItem={({ item }) => (
          <ListRow
            icon={{ ios: 'timer', android: 'timer' }}
            tone={item.isBenchmark ? 'metric' : 'accent'}
            title={item.name}
            subtitle={`${WORKOUT_TYPE_LABELS[item.workoutType]} · ${wodPrescription(item)}`}
            trailing={item.isBenchmark ? <Chip label="Benchmark" tone="metric" /> : undefined}
            onPress={() => router.push(`/(app)/wods/${item.slug}`)}
          />
        )}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
});
