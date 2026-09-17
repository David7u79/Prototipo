import type { WodDetail, WodPerformanceResponse } from '@garfit/types';
import { useFocusEffect, useLocalSearchParams, useRouter } from 'expo-router';
import { useCallback, useState } from 'react';
import { ActivityIndicator, Pressable, ScrollView, Text, View } from 'react-native';
import { Card, Title, uiStyles } from '@/components/ui';
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
    return <ActivityIndicator accessibilityLabel="Cargando WOD" style={{ flex: 1 }} />;
  if (error) return <ErrorState message={error} onRetry={() => void load()} />;
  if (!wod) return null;
  return (
    <ScrollView contentContainerStyle={{ gap: 14, padding: 20 }}>
      <Title>{wod.name}</Title>
      <Text style={uiStyles.muted}>{wodPrescription(wod)}</Text>
      {wod.description ? <Text>{wod.description}</Text> : null}
      <Text>Ejercicios</Text>
      {wod.exercises.map((exercise) => (
        <Card key={exercise.position}>
          <Text>{wodExerciseLabel(exercise)}</Text>
          {exercise.notes ? <Text style={uiStyles.muted}>{exercise.notes}</Text> : null}
        </Card>
      ))}
      {performance ? <WodPerformance performance={performance} /> : null}
      <Pressable
        accessibilityLabel="Usar este WOD"
        accessibilityRole="button"
        disabled={creating}
        onPress={() => void createWorkoutFromWod()}
        style={uiStyles.button}
      >
        <Text style={uiStyles.buttonText}>{creating ? 'Creando…' : 'Usar este WOD'}</Text>
      </Pressable>
      {aiAvailable ? (
        <Pressable
          accessibilityLabel="Explicar WOD con IA"
          accessibilityRole="button"
          onPress={() =>
            router.push({ pathname: '/(app)/ai', params: { action: 'wod', slug: wod.slug } })
          }
          style={uiStyles.button}
        >
          <Text style={uiStyles.buttonText}>Explicar WOD</Text>
        </Pressable>
      ) : null}
    </ScrollView>
  );
}

function WodPerformance({ performance }: { performance: WodPerformanceResponse }) {
  const { change, comparisonAvailable, history, latest, best, unavailableReason, unit } =
    performance.performance;
  if (!comparisonAvailable) {
    return (
      <Card>
        <Text style={uiStyles.muted}>{unavailableMessage(unavailableReason)}</Text>
      </Card>
    );
  }
  return (
    <Card>
      <Text>Mi rendimiento</Text>
      {best ? <PerformanceLine label="Mejor resultado" value={best.display} /> : null}
      {latest ? <PerformanceLine label="Último resultado" value={latest.display} /> : null}
      {change ? <PerformanceLine label="Cambio" value={changeLabel(change, unit)} /> : null}
      {history.length ? (
        <View style={{ gap: 6 }}>
          <Text style={uiStyles.muted}>Historial</Text>
          {history.map((attempt) => (
            <Text key={attempt.workoutId} style={uiStyles.muted}>
              {dateLabel(attempt.performedOn)} · {attempt.display}
            </Text>
          ))}
        </View>
      ) : (
        <Text style={uiStyles.muted}>Aún no hay resultados comparables.</Text>
      )}
    </Card>
  );
}

function PerformanceLine({ label, value }: { label: string; value: string }) {
  return (
    <View style={{ gap: 2 }}>
      <Text>{label}</Text>
      <Text style={uiStyles.muted}>{value}</Text>
    </View>
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
  return Number.isNaN(date.getTime()) ? value : date.toLocaleDateString('es-MX');
}

function ErrorState({ message, onRetry }: { message: string; onRetry: () => void }) {
  return (
    <View style={{ gap: 12, padding: 20 }}>
      <Text>{message}</Text>
      <Pressable accessibilityRole="button" onPress={onRetry} style={uiStyles.button}>
        <Text style={uiStyles.buttonText}>Reintentar</Text>
      </Pressable>
    </View>
  );
}
