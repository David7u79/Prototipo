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
import { Button, Card, Stat, Title, uiStyles } from '@/components/ui';
import { colors } from '@/constants/theme';
import { api, messageFor, useSession } from '@/lib/auth';
import { formatChange, formatValue } from '@/lib/presentation';

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
  const latestRecord = data?.latestRecord;
  const recentImprovement = data?.recentImprovement;
  const recentRecords = (data?.recentRecords ?? []).slice(0, 5);
  const hasNoData = Boolean(data && data.totalRecords === 0);

  return (
    <ScrollView
      contentContainerStyle={styles.content}
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
      <Title>Hola{user?.name ? `, ${user.name}` : ''}.</Title>

      <Button label="Registrar entrenamiento" onPress={() => router.push('/(app)/workouts/new')} />

      {error ? (
        <View accessible={true} accessibilityLabel={`Error: ${error}`}>
          <Card style={styles.errorCard}>
            <Text style={styles.errorText}>{error}</Text>
            <Button label="Reintentar" onPress={() => void load()} />
          </Card>
        </View>
      ) : null}

      {loading && !data && !error ? (
        <View
          accessible={true}
          accessibilityLabel="Cargando resumen de marcas"
          style={styles.loadingContainer}
        >
          <ActivityIndicator color={colors.accent} size="large" />
        </View>
      ) : null}

      {data ? (
        <>
          <View
            accessible={true}
            accessibilityLabel={`Movimientos con marca: ${data.movementsWithRecords}. Marcas registradas: ${data.totalRecords}`}
          >
            <Card style={styles.statsRow}>
              <Stat label="Movimientos con marca" value={data.movementsWithRecords} />
              <Stat label="Marcas registradas" value={data.totalRecords} />
            </Card>
          </View>

          {latestRecord ? (
            <Pressable
              accessibilityLabel={`Última marca: ${latestRecord.movement.name}, ${formatValue(
                latestRecord.recordType,
                latestRecord.normalizedValue,
                system,
              )}, ${latestRecord.performedAt}`}
              accessibilityRole="button"
              onPress={() => router.push(`/(app)/records/${latestRecord.movement.slug}`)}
            >
              <Card>
                <Text style={styles.cardTitle}>Última marca</Text>
                <Text style={uiStyles.muted}>
                  {`${latestRecord.movement.name} · ${formatValue(
                    latestRecord.recordType,
                    latestRecord.normalizedValue,
                    system,
                  )} · ${latestRecord.performedAt}`}
                </Text>
              </Card>
            </Pressable>
          ) : null}

          {recentImprovement ? (
            <Pressable
              accessibilityLabel={`Mejora reciente: ${
                recentImprovement.record.movement.name
              }, ${formatChange(
                recentImprovement.record.recordType,
                Math.abs(recentImprovement.improvement.absolute),
                system,
              )}`}
              accessibilityRole="button"
              onPress={() =>
                router.push(`/(app)/records/${recentImprovement.record.movement.slug}`)
              }
            >
              <Card>
                <Text style={styles.cardTitle}>Mejora reciente</Text>
                <Text style={uiStyles.muted}>
                  {`${recentImprovement.record.movement.name} · ${formatChange(
                    recentImprovement.record.recordType,
                    Math.abs(recentImprovement.improvement.absolute),
                    system,
                  )}`}
                </Text>
              </Card>
            </Pressable>
          ) : null}

          {workoutStats ? (
            <WorkoutSummary
              stats={workoutStats}
              onOpen={(id) => router.push(`/(app)/workouts/${id}`)}
            />
          ) : null}

          {hasNoData ? (
            <View
              accessible={true}
              accessibilityLabel="Marcas personales: No hay marcas personales registradas."
            >
              <Card>
                <Text style={styles.cardTitle}>Marcas personales</Text>
                <Text style={uiStyles.muted}>No hay marcas personales registradas.</Text>
                <Button
                  label="Explorar movimientos"
                  onPress={() => router.push('/(app)/movements')}
                  secondary
                />
              </Card>
            </View>
          ) : (
            <>
              <Text style={styles.sectionTitle}>Últimos registros</Text>
              {recentRecords.map((record) => {
                const formatted = formatValue(record.recordType, record.normalizedValue, system);
                const subtitle = `${formatted} · ${record.performedAt}`;
                return (
                  <Pressable
                    accessibilityLabel={`${record.movement.name}, ${subtitle}`}
                    accessibilityRole="button"
                    key={record.id}
                    onPress={() => router.push(`/(app)/records/${record.movement.slug}`)}
                  >
                    <Card>
                      <Text style={styles.cardTitle}>{record.movement.name}</Text>
                      <Text style={uiStyles.muted}>{subtitle}</Text>
                    </Card>
                  </Pressable>
                );
              })}
              <Button
                label="Explorar movimientos"
                onPress={() => router.push('/(app)/movements')}
                secondary
              />
            </>
          )}
        </>
      ) : null}

      {!profile ? (
        <Pressable
          accessibilityLabel="Completa tu perfil deportivo. Personaliza tu experiencia como atleta."
          accessibilityRole="button"
          onPress={() => router.navigate('/(app)/(tabs)/profile')}
        >
          <Card style={styles.compactCard}>
            <Text style={styles.cardTitle}>Completa tu perfil deportivo.</Text>
            <Text style={uiStyles.muted}>Personaliza tu experiencia como atleta.</Text>
          </Card>
        </Pressable>
      ) : null}

      <Pressable
        accessibilityLabel="Abrir análisis inteligente"
        accessibilityRole="button"
        onPress={() => router.push('/(app)/ai')}
      >
        <Card style={styles.compactCard}>
          <Text style={styles.cardTitle}>Análisis inteligente</Text>
          <Text style={uiStyles.muted}>Recibe una explicación de tu progreso deportivo.</Text>
        </Card>
      </Pressable>
    </ScrollView>
  );
}

function WorkoutSummary({
  stats,
  onOpen,
}: {
  stats: WorkoutStatsResponse;
  onOpen: (id: string) => void;
}) {
  if (stats.totalCompleted === 0) {
    return (
      <Card>
        <Text style={styles.cardTitle}>Entrenamientos</Text>
        <Text style={uiStyles.muted}>Aún no has registrado entrenamientos.</Text>
      </Card>
    );
  }
  return (
    <>
      <View
        accessible={true}
        accessibilityLabel={`Entrenamientos: ${stats.last7Days} esta semana, ${stats.last30Days} este mes, ${stats.personalRecordsFromWorkoutsLast30Days} marcas desde entrenamientos en 30 días`}
      >
        <Card style={styles.statsRow}>
          <Stat label="Semana" value={stats.last7Days} />
          <Stat label="Mes" value={stats.last30Days} />
          <Stat label="Marcas 30 d" value={stats.personalRecordsFromWorkoutsLast30Days} />
        </Card>
      </View>
      {stats.lastWorkout ? (
        <Pressable
          accessibilityLabel={`Abrir último entrenamiento ${stats.lastWorkout.name}`}
          accessibilityRole="button"
          onPress={() => onOpen(stats.lastWorkout?.id ?? '')}
        >
          <Card>
            <Text style={styles.cardTitle}>Último entrenamiento</Text>
            <Text style={uiStyles.muted}>
              {`${stats.lastWorkout.name} · ${stats.lastWorkout.headline ?? 'Sin resultado'} · ${
                stats.lastWorkout.performedOn ?? 'Sin fecha'
              }`}
            </Text>
          </Card>
        </Pressable>
      ) : null}
    </>
  );
}

const styles = StyleSheet.create({
  cardTitle: { color: colors.text, fontSize: 17, fontWeight: '700' },
  compactCard: { padding: 12 },
  container: { backgroundColor: colors.background, flex: 1 },
  content: { gap: 16, padding: 20 },
  errorCard: { borderColor: colors.danger, gap: 12 },
  errorText: { color: colors.danger, fontSize: 15 },
  loadingContainer: { alignItems: 'center', paddingVertical: 32 },
  sectionTitle: { color: colors.text, fontSize: 20, fontWeight: '700', marginTop: 8 },
  statsRow: { flexDirection: 'row', gap: 16 },
});
