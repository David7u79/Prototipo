import type { RecordsSummaryResponse, WorkoutStatsResponse } from '@garfit/types';
import { useFocusEffect, useRouter } from 'expo-router';
import { useCallback, useState } from 'react';
import {
  ActivityIndicator,
  Pressable,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Button, Card, Icon, Label, ListRow, SectionHeader, Stat, uiStyles } from '@/components/ui';
import { colors, gradients, radius, space, type } from '@/constants/theme';
import { api, messageFor, useSession } from '@/lib/auth';
import { formatValue } from '@/lib/presentation';

export default function HomeScreen() {
  const { loadProfile, profile, request, user } = useSession();
  const router = useRouter();
  const [data, setData] = useState<RecordsSummaryResponse | null>(null);
  const [workoutStats, setWorkoutStats] = useState<WorkoutStatsResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(
    async (isRefresh = false) => {
      if (isRefresh) {
        setRefreshing(true);
      } else {
        setLoading(true);
      }
      setError(null);
      try {
        const [summary, stats] = await Promise.all([
          request(() => api.records.summary()),
          request(() => api.workouts.stats()),
          loadProfile().catch(() => null),
        ]);
        setData(summary);
        setWorkoutStats(stats);
      } catch (cause) {
        setError(messageFor(cause));
      } finally {
        setLoading(false);
        setRefreshing(false);
      }
    },
    [loadProfile, request],
  );

  useFocusEffect(
    useCallback(() => {
      void load();
    }, [load]),
  );

  const system = profile?.preferredUnits ?? 'METRIC';
  const recentRecords = (data?.recentRecords ?? []).slice(0, 5);
  const todayFormatted = new Intl.DateTimeFormat('es-ES', {
    weekday: 'long',
    day: 'numeric',
    month: 'short',
  }).format(new Date());

  const userInitial = (user?.name || user?.email || 'A').charAt(0).toUpperCase();
  const activeWorkout = workoutStats?.lastWorkout && workoutStats.lastWorkout.status !== 'COMPLETED'
    ? workoutStats.lastWorkout
    : null;

  return (
    <SafeAreaView edges={['top']} style={styles.safe}>
      <ScrollView
        contentContainerStyle={uiStyles.scroll}
        refreshControl={
          <RefreshControl
            colors={[colors.accent]}
            onRefresh={() => void load(true)}
            refreshing={refreshing}
            tintColor={colors.accent}
          />
        }
        style={styles.container}
      >
        {/* Cabecera propia */}
        <View style={styles.header}>
          <View style={styles.headerText}>
            <Text style={styles.greeting}>Hola, {user?.name ?? 'atleta'}</Text>
            <Label>{todayFormatted}</Label>
          </View>
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Ir al perfil"
            onPress={() => router.push('/(app)/(tabs)/profile')}
            style={({ pressed }) => [styles.avatar, pressed && uiStyles.pressed]}
          >
            <Text style={styles.avatarText}>{userInitial}</Text>
          </Pressable>
        </View>

        {error ? (
          <Card style={styles.errorCard}>
            <Text style={styles.errorText}>{error}</Text>
            <Button label="Reintentar" onPress={() => void load()} variant="secondary" />
          </Card>
        ) : null}

        {loading && !data && !error ? (
          <View style={styles.loadingContainer}>
            <ActivityIndicator color={colors.accent} size="large" />
          </View>
        ) : null}

        {/* Card Hero */}
        {activeWorkout ? (
          <Card hero style={styles.heroCard}>
            <Label>Entrenamiento activo</Label>
            <Text style={styles.heroTitle}>Continúa: {activeWorkout.name}</Text>
            <Text style={uiStyles.muted}>
              {activeWorkout.performedOn ?? 'Hoy'} · {activeWorkout.status === 'IN_PROGRESS' ? 'En curso' : 'Borrador'}
            </Text>
            <Button
              label="Continuar"
              onPress={() => router.push(`/(app)/workouts/${activeWorkout.id}`)}
            />
          </Card>
        ) : (
          <Card hero style={styles.heroCard}>
            <Label>Esta semana</Label>
            <View style={styles.statGrid}>
              <Stat
                label="Sesiones"
                value={workoutStats?.last7Days ?? 0}
                tone="metric"
              />
              <Stat
                label="Marcas 30 d"
                value={workoutStats?.personalRecordsFromWorkoutsLast30Days ?? data?.totalRecords ?? 0}
                tone="accent"
              />
            </View>
            <Button
              label="Empezar entrenamiento"
              onPress={() => router.push('/(app)/workouts/new')}
            />
          </Card>
        )}

        {/* Grid de 2 columnas con Stats */}
        {workoutStats ? (
          <View style={styles.grid2}>
            <Card style={styles.gridCard}>
              <Stat label="Semana" value={workoutStats.last7Days} tone="metric" />
            </Card>
            <Card style={styles.gridCard}>
              <Stat label="Mes" value={workoutStats.last30Days} tone="metric" />
            </Card>
          </View>
        ) : null}

        {/* Marcas recientes */}
        {recentRecords.length > 0 ? (
          <View style={styles.section}>
            <SectionHeader
              title="Marcas recientes"
              actionLabel="Ver todo"
              onAction={() => router.push('/(app)/(tabs)/progress')}
            />
            {recentRecords.map((record) => {
              const formatted = formatValue(record.recordType, record.normalizedValue, system);
              return (
                <ListRow
                  key={record.id}
                  icon={{ ios: 'trophy.fill', android: 'emoji_events' }}
                  tone="metric"
                  title={record.movement.name}
                  subtitle={record.performedAt}
                  trailing={formatted}
                  onPress={() => router.push(`/(app)/records/${record.movement.slug}`)}
                />
              );
            })}
          </View>
        ) : null}

        {/* Explorar */}
        <View style={styles.section}>
          <SectionHeader title="Explorar" />
          <View style={styles.exploreGrid}>
            <Pressable
              accessibilityRole="button"
              accessibilityLabel="Movimientos"
              onPress={() => router.push('/(app)/movements')}
              style={({ pressed }) => [styles.exploreTile, pressed && uiStyles.pressed]}
            >
              <View style={[styles.tileIcon, { backgroundColor: colors.accentSoft }]}>
                <Icon name={{ ios: 'figure.cross.training', android: 'fitness_center' }} color={colors.accent} size={24} />
              </View>
              <Text style={styles.tileTitle}>Movimientos</Text>
            </Pressable>

            <Pressable
              accessibilityRole="button"
              accessibilityLabel="WODs"
              onPress={() => router.push('/(app)/wods')}
              style={({ pressed }) => [styles.exploreTile, pressed && uiStyles.pressed]}
            >
              <View style={[styles.tileIcon, { backgroundColor: colors.metricSoft }]}>
                <Icon name={{ ios: 'timer', android: 'timer' }} color={colors.metric} size={24} />
              </View>
              <Text style={styles.tileTitle}>WODs</Text>
            </Pressable>

            <Pressable
              accessibilityRole="button"
              accessibilityLabel="Análisis IA"
              onPress={() => router.push('/(app)/ai')}
              style={({ pressed }) => [styles.exploreTile, pressed && uiStyles.pressed]}
            >
              <View style={[styles.tileIcon, { backgroundColor: colors.accentSoft }]}>
                <Icon name={{ ios: 'sparkles', android: 'auto_awesome' }} color={colors.accent} size={24} />
              </View>
              <Text style={styles.tileTitle}>Análisis IA</Text>
            </Pressable>
          </View>
        </View>

        {/* Perfil deportivo aviso si incompleto */}
        {!profile ? (
          <ListRow
            icon={{ ios: 'person.crop.circle', android: 'person' }}
            tone="accent"
            title="Completa tu perfil deportivo"
            subtitle="Personaliza tu experiencia como atleta"
            onPress={() => router.push('/(app)/(tabs)/profile')}
          />
        ) : null}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: {
    flex: 1,
    backgroundColor: colors.background,
  },
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingTop: space.xs,
  },
  headerText: {
    gap: 2,
    flex: 1,
  },
  greeting: {
    color: colors.text,
    ...type.title,
  },
  avatar: {
    width: 44,
    height: 44,
    borderRadius: radius.pill,
    alignItems: 'center',
    justifyContent: 'center',
    experimental_backgroundImage: gradients.primary,
  },
  avatarText: {
    color: colors.onAccent,
    fontSize: 18,
    fontWeight: '700',
  },
  heroCard: {
    gap: space.md,
  },
  heroTitle: {
    color: colors.text,
    ...type.headline,
  },
  statGrid: {
    flexDirection: 'row',
    gap: space.md,
  },
  grid2: {
    flexDirection: 'row',
    gap: space.md,
  },
  gridCard: {
    flex: 1,
  },
  section: {
    gap: space.sm,
  },
  exploreGrid: {
    flexDirection: 'row',
    gap: space.md,
  },
  exploreTile: {
    flex: 1,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.md,
    padding: space.md,
    alignItems: 'center',
    gap: space.sm,
  },
  tileIcon: {
    width: 48,
    height: 48,
    borderRadius: radius.sm,
    alignItems: 'center',
    justifyContent: 'center',
  },
  tileTitle: {
    color: colors.text,
    fontSize: 13,
    fontWeight: '600',
    textAlign: 'center',
  },
  errorCard: {
    borderColor: colors.danger,
    gap: space.md,
  },
  errorText: {
    color: colors.danger,
    ...type.body,
  },
  loadingContainer: {
    alignItems: 'center',
    paddingVertical: space.xl,
  },
});
