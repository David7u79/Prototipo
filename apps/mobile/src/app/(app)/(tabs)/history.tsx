import type { WorkoutListItem } from '@garfit/types';
import { useCallback, useMemo, useRef, useState } from 'react';
import { ActivityIndicator, FlatList, StyleSheet, Text, View } from 'react-native';
import { useFocusEffect, useRouter } from 'expo-router';
import { Button, EmptyState, ListRow, SectionHeader, Title, uiStyles } from '@/components/ui';
import { colors, space, type } from '@/constants/theme';
import { api, messageFor, useSession } from '@/lib/auth';

function formatMonthYear(dateString: string | null): string {
  if (!dateString) return 'Sin fecha';
  const d = new Date(`${dateString}T12:00:00`);
  if (Number.isNaN(d.getTime())) return 'Sin fecha';
  return d.toLocaleDateString('es-ES', { month: 'long', year: 'numeric' });
}

function formatDayAndDate(dateString: string | null): string {
  if (!dateString) return 'Sin fecha';
  const d = new Date(`${dateString}T12:00:00`);
  if (Number.isNaN(d.getTime())) return dateString;
  return d.toLocaleDateString('es-ES', { weekday: 'short', day: 'numeric', month: 'short' });
}

export default function HistoryScreen() {
  const { request } = useSession();
  const router = useRouter();
  const [items, setItems] = useState<WorkoutListItem[]>([]);
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const busy = useRef(false);
  const pagesRef = useRef(1);

  const load = useCallback(
    async (next = 1, refresh = false) => {
      if (busy.current || (!refresh && next > pagesRef.current)) return;
      busy.current = true;
      setLoading(true);
      try {
        const result = await request(() =>
          api.workouts.list({ status: 'COMPLETED', page: next, limit: 20 }),
        );
        setItems((old) => (refresh ? result.items : [...old, ...result.items]));
        setPage(next);
        pagesRef.current = result.totalPages;
        setError(null);
      } catch (cause) {
        setError(messageFor(cause));
      } finally {
        busy.current = false;
        setLoading(false);
      }
    },
    [request],
  );

  useFocusEffect(
    useCallback(() => {
      void load(1, true);
    }, [load]),
  );

  // Agrupar por mes
  const groups = useMemo(() => {
    return items.reduce<{ month: string; items: WorkoutListItem[] }[]>((acc, workout) => {
      const month = formatMonthYear(workout.performedOn);
      const current = acc.at(-1);
      if (current?.month === month) {
        current.items.push(workout);
      } else {
        acc.push({ month, items: [workout] });
      }
      return acc;
    }, []);
  }, [items]);

  return (
    <View style={styles.container}>
      <FlatList
        data={groups}
        keyExtractor={(item) => item.month}
        contentContainerStyle={uiStyles.scroll}
        refreshing={loading && page === 1}
        onRefresh={() => void load(1, true)}
        onEndReached={() => void load(page + 1)}
        onEndReachedThreshold={0.4}
        ListHeaderComponent={
          <View style={styles.header}>
            <Title>Historial</Title>
            {error ? <Text style={styles.errorText}>{error}</Text> : null}
          </View>
        }
        ListEmptyComponent={
          loading ? (
            <ActivityIndicator color={colors.accent} style={styles.loading} />
          ) : (
            <EmptyState
              icon={{ ios: 'clock.arrow.circlepath', android: 'history' }}
              title="Aún no hay entrenamientos"
              message="Completa tu primera sesión para comenzar a crear tu historial."
              action={
                <Button
                  label="Empezar entrenamiento"
                  onPress={() => router.push('/(app)/workouts/new')}
                />
              }
            />
          )
        }
        renderItem={({ item: group }) => (
          <View style={styles.monthGroup}>
            <SectionHeader title={group.month} />
            <View style={styles.groupList}>
              {group.items.map((workout) => {
                const dateStr = formatDayAndDate(workout.performedOn);
                const subtitle = workout.headline
                  ? `${dateStr} · ${workout.headline}`
                  : `${dateStr} · Completado`;
                const trailing =
                  workout.personalRecordCount > 0
                    ? `${workout.personalRecordCount} PR`
                    : undefined;

                return (
                  <ListRow
                    key={workout.id}
                    icon={{ ios: 'figure.cross.training', android: 'fitness_center' }}
                    tone="accent"
                    title={workout.name}
                    subtitle={subtitle}
                    trailing={trailing}
                    onPress={() => router.push(`/(app)/workouts/${workout.id}`)}
                  />
                );
              })}
            </View>
          </View>
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
  header: {
    gap: space.sm,
  },
  monthGroup: {
    gap: space.sm,
  },
  groupList: {
    gap: space.sm,
  },
  loading: {
    marginVertical: space.xl,
  },
  errorText: {
    color: colors.danger,
    ...type.body,
  },
});
