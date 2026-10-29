import type { WodSummary } from '@garfit/types';
import { WORKOUT_TYPE_LABELS } from '@garfit/validation';
import { useFocusEffect, useRouter } from 'expo-router';
import { useCallback, useState } from 'react';
import { ActivityIndicator, FlatList, StyleSheet, Text, View } from 'react-native';
import { Button, Chip, EmptyState, ListRow, Title, uiStyles } from '@/components/ui';
import { colors, space, type } from '@/constants/theme';
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

  if (!items && !error) return <Loading />;
  if (error) return <Failure message={error} onRetry={() => void load()} />;

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

function Loading() {
  return (
    <View style={styles.loadingContainer}>
      <ActivityIndicator color={colors.accent} size="large" />
    </View>
  );
}

function Failure({ message, onRetry }: { message: string; onRetry: () => void }) {
  return (
    <View style={styles.failureContainer}>
      <Text style={styles.errorText}>{message}</Text>
      <Button label="Reintentar" onPress={onRetry} />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  loadingContainer: {
    flex: 1,
    backgroundColor: colors.background,
    alignItems: 'center',
    justifyContent: 'center',
  },
  failureContainer: {
    gap: space.md,
    padding: space.xl,
    flex: 1,
    backgroundColor: colors.background,
    justifyContent: 'center',
  },
  errorText: {
    color: colors.danger,
    ...type.body,
    textAlign: 'center',
  },
});
