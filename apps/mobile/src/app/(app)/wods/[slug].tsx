import type { WodDetail, WodPerformanceResponse } from '@garfit/types';
import { useFocusEffect, useLocalSearchParams, useRouter } from 'expo-router';
import { useCallback, useState } from 'react';
import { ActivityIndicator, ScrollView, StyleSheet, Text, View } from 'react-native';
import { Button, Card, Chip, Label, SectionHeader, Stat, Title, uiStyles } from '@/components/ui';
import { colors, space, type } from '@/constants/theme';
import { api, useSession } from '@/lib/auth';
import { wodExerciseLabel, wodPrescription } from '@/lib/wods';

export default function WodDetailScreen() {
  const { slug } = useLocalSearchParams<{ slug: string }>();
  const { request } = useSession();
  const router = useRouter();
  const [wod, setWod] = useState<WodDetail | null>(null);
  const [performance, setPerformance] = useState<WodPerformanceResponse | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [creating, setCreating] = useState(false);
  const [aiAvailable, setAiAvailable] = useState(false);

  const load = useCallback(async () => {
    if (!slug) return;
    try {
      setError(null);
      setWod(await request(() => api.wods.get(slug)));
      try {
        setPerformance(await request(() => api.wods.performance(slug)));
      } catch {
        setPerformance(null);
      }
    } catch {
      setError('No se pudo cargar el WOD. Inténtalo de nuevo.');
    }
  }, [request, slug]);

  useFocusEffect(useCallback(() => void load(), [load]));

  useFocusEffect(
    useCallback(() => {
      void request(() => api.ai.status())
        .then((status) => setAiAvailable(status.enabled && status.configured))
        .catch(() => setAiAvailable(false));
    }, [request]),
  );

  async function createWorkoutFromWod() {
    if (!wod) return;
    setCreating(true);
    try {
      const workout = await request(() => api.workouts.create({ wodSlug: wod.slug }));
      router.replace(`/(app)/workouts/${workout.id}`);
    } catch {
      setError('No se pudo crear el entrenamiento. Inténtalo de nuevo.');
    } finally {
      setCreating(false);
    }
  }

  if (!wod && !error)
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator color={colors.accent} size="large" />
      </View>
    );

  if (error) return <ErrorState message={error} onRetry={() => void load()} />;
  if (!wod) return null;

  return (
    <ScrollView style={styles.scroll} contentContainerStyle={uiStyles.scroll}>
      <Card hero style={styles.heroCard}>
        <Title>{wod.name}</Title>
        <View style={styles.chipsRow}>
          <Chip label={wod.workoutType} tone="accent" />
          {wod.isBenchmark ? <Chip label="Benchmark" tone="metric" /> : null}
        </View>
        <Text style={styles.prescriptionText}>{wodPrescription(wod)}</Text>
        {wod.description ? <Text style={uiStyles.muted}>{wod.description}</Text> : null}
      </Card>

      {/* Ejercicios del WOD */}
      <View style={styles.section}>
        <SectionHeader title="Ejercicios prescritos" />
        {wod.exercises.map((exercise) => (
          <Card key={exercise.position} style={styles.exerciseCard}>
            <Text style={styles.exerciseName}>{wodExerciseLabel(exercise)}</Text>
            {exercise.notes ? <Text style={uiStyles.muted}>{exercise.notes}</Text> : null}
          </Card>
        ))}
      </View>

      {/* Rendimiento previo */}
      {performance ? <WodPerformance performance={performance} /> : null}

      <View style={styles.actions}>
        <Button
          label={creating ? 'Iniciando entrenamiento…' : 'Usar este WOD'}
          disabled={creating}
          onPress={() => void createWorkoutFromWod()}
        />
        {aiAvailable ? (
          <Button
            label="Explicar WOD con IA"
            variant="secondary"
            icon={{ ios: 'sparkles', android: 'auto_awesome' }}
            onPress={() =>
              router.push({ pathname: '/(app)/ai', params: { action: 'wod', slug: wod.slug } })
            }
          />
        ) : null}
      </View>
    </ScrollView>
  );
}

function WodPerformance({ performance }: { performance: WodPerformanceResponse }) {
  const { change, comparisonAvailable, history, latest, best, unavailableReason, unit } =
    performance.performance;

  if (!comparisonAvailable) {
    return (
      <Card>
        <SectionHeader title="Mi rendimiento" />
        <Text style={uiStyles.muted}>{unavailableMessage(unavailableReason)}</Text>
      </Card>
    );
  }

  return (
    <Card style={styles.perfCard}>
      <SectionHeader title="Mi rendimiento previo" />
      <View style={styles.statRow}>
        {best ? <Stat label="Mejor resultado" value={best.display} tone="metric" /> : null}
        {latest ? <Stat label="Último resultado" value={latest.display} tone="accent" /> : null}
      </View>
      {change ? (
        <View style={styles.changeBadge}>
          <Label>Cambio frente al anterior</Label>
          <Text style={styles.changeValue}>{changeLabel(change, unit)}</Text>
        </View>
      ) : null}
      {history.length ? (
        <View style={styles.historyList}>
          <Label>Historial de intentos</Label>
          {history.map((attempt) => (
            <View key={attempt.workoutId} style={styles.attemptRow}>
              <Text style={styles.attemptDate}>{dateLabel(attempt.performedOn)}</Text>
              <Text style={styles.attemptDisplay}>{attempt.display}</Text>
            </View>
          ))}
        </View>
      ) : (
        <Text style={uiStyles.muted}>Aún no hay resultados comparables.</Text>
      )}
    </Card>
  );
}

function changeLabel(
  change: NonNullable<WodPerformanceResponse['performance']['change']>,
  unit: WodPerformanceResponse['performance']['unit'],
) {
  const sign = change.absolute > 0 ? '+' : '';
  const percentage =
    change.percent === null ? '' : ` (${change.percent > 0 ? '+' : ''}${change.percent}%)`;
  return `${sign}${change.absolute}${unit ? ` ${unit}` : ''}${percentage}`;
}

function unavailableMessage(reason: WodPerformanceResponse['performance']['unavailableReason']) {
  switch (reason) {
    case 'SCORE_NO_COMPARABLE':
      return 'Este tipo de WOD no tiene un resultado numérico comparable.';
    case 'ESQUEMA_DESCONOCIDO':
      return 'No se puede comparar porque falta el esquema de repeticiones.';
    default:
      return 'Este WOD no admite una comparación de rendimiento.';
  }
}

function dateLabel(value: string) {
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? value : date.toLocaleDateString('es-ES');
}

function ErrorState({ message, onRetry }: { message: string; onRetry: () => void }) {
  return (
    <View style={styles.errorContainer}>
      <Text style={styles.errorText}>{message}</Text>
      <Button label="Reintentar" onPress={onRetry} />
    </View>
  );
}

const styles = StyleSheet.create({
  scroll: {
    backgroundColor: colors.background,
    flex: 1,
  },
  loadingContainer: {
    flex: 1,
    backgroundColor: colors.background,
    alignItems: 'center',
    justifyContent: 'center',
  },
  heroCard: {
    gap: space.md,
  },
  chipsRow: {
    flexDirection: 'row',
    gap: space.sm,
  },
  prescriptionText: {
    color: colors.metric,
    ...type.headline,
  },
  section: {
    gap: space.sm,
  },
  exerciseCard: {
    gap: 4,
  },
  exerciseName: {
    color: colors.text,
    ...type.headline,
  },
  perfCard: {
    gap: space.md,
  },
  statRow: {
    flexDirection: 'row',
    gap: space.md,
  },
  changeBadge: {
    gap: 2,
    backgroundColor: colors.surfaceRaised,
    padding: space.md,
    borderRadius: 12,
  },
  changeValue: {
    color: colors.metric,
    ...type.headline,
    fontVariant: ['tabular-nums'],
  },
  historyList: {
    gap: space.xs,
  },
  attemptRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: 4,
  },
  attemptDate: {
    color: colors.muted,
    fontSize: 14,
  },
  attemptDisplay: {
    color: colors.text,
    fontSize: 15,
    fontWeight: '700',
    fontVariant: ['tabular-nums'],
  },
  actions: {
    gap: space.md,
    marginTop: space.sm,
  },
  errorContainer: {
    flex: 1,
    backgroundColor: colors.background,
    justifyContent: 'center',
    padding: space.xl,
    gap: space.md,
  },
  errorText: {
    color: colors.danger,
    ...type.body,
    textAlign: 'center',
  },
});
