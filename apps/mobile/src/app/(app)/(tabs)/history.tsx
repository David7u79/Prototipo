import type { WorkoutListItem } from '@garfit/types';
import { useCallback, useState } from 'react';
import { ActivityIndicator, FlatList, Pressable, RefreshControl, Text, View } from 'react-native';
import { useFocusEffect, useRouter } from 'expo-router';
import { Card, Screen, Title, uiStyles } from '@/components/ui';
import { api, messageFor, useSession } from '@/lib/auth';
import { groupWorkouts } from '@/lib/workouts';

export default function HistoryScreen() {
  const { request } = useSession();
  const router = useRouter();
  const [items, setItems] = useState<WorkoutListItem[]>([]);
  const [page, setPage] = useState(1);
  const [pages, setPages] = useState(1);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const load = useCallback(
    async (next = 1, refresh = false) => {
      if (loading || (!refresh && next > pages)) return;
      setLoading(true);
      try {
        const result = await request(() =>
          api.workouts.list({ status: 'COMPLETED', page: next, limit: 20 }),
        );
        setItems((old) => (refresh ? result.items : [...old, ...result.items]));
        setPage(next);
        setPages(result.totalPages);
        setError(null);
      } catch (cause) {
        setError(messageFor(cause));
      } finally {
        setLoading(false);
      }
    },
    [loading, pages, request],
  );
  useFocusEffect(
    useCallback(() => {
      void load(1, true);
    }, [load]),
  );
  const groups = groupWorkouts(items);
  return (
    <Screen>
      <Title>Historial</Title>
      {error ? <Text>{error}</Text> : null}
      <FlatList
        data={groups}
        keyExtractor={(item) => item.date}
        refreshControl={
          <RefreshControl refreshing={loading && page === 1} onRefresh={() => void load(1, true)} />
        }
        onEndReached={() => void load(page + 1)}
        onEndReachedThreshold={0.4}
        ListEmptyComponent={
          loading ? (
            <ActivityIndicator />
          ) : (
            <Text style={uiStyles.muted}>Aún no hay entrenamientos completados.</Text>
          )
        }
        renderItem={({ item: group }) => (
          <View style={{ gap: 8 }}>
            <Text style={uiStyles.muted}>{group.date}</Text>
            {group.items.map((workout) => (
              <Pressable
                accessibilityRole="button"
                accessibilityLabel={`Abrir ${workout.name}`}
                key={workout.id}
                onPress={() => router.push(`/(app)/workouts/${workout.id}`)}
              >
                <Card>
                  <Text>{workout.name}</Text>
                  <Text style={uiStyles.muted}>
                    {workout.headline ?? 'Sin resultado'}
                    {` · ${workout.personalRecordCount} marcas`}
                  </Text>
                </Card>
              </Pressable>
            ))}
          </View>
        )}
      />
    </Screen>
  );
}
