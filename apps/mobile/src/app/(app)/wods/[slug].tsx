import type { WodDetail } from '@garfit/types';
import { useFocusEffect, useLocalSearchParams, useRouter } from 'expo-router';
import { useCallback, useState } from 'react';
import { ActivityIndicator, Pressable, ScrollView, Text, View } from 'react-native';
import { Card, Title, uiStyles } from '@/components/ui';
import { api, messageFor, useSession } from '@/lib/auth';
import { wodExerciseLabel, wodPrescription } from '@/lib/wods';

export default function WodDetailScreen() {
  const { slug } = useLocalSearchParams<{ slug: string }>();
  const { request } = useSession();
  const router = useRouter();
  const [wod, setWod] = useState<WodDetail | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [creating, setCreating] = useState(false);
  const [aiAvailable, setAiAvailable] = useState(false);
  const load = useCallback(async () => {
    if (!slug) return;
    try {
      setError(null);
      setWod(await request(() => api.wods.get(slug)));
    } catch (cause) {
      setError(messageFor(cause));
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
    } catch (cause) {
      setError(messageFor(cause));
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
          onPress={() => router.push({ pathname: '/(app)/ai', params: { action: 'wod', slug: wod.slug } })}
          style={uiStyles.button}
        >
          <Text style={uiStyles.buttonText}>Explicar WOD</Text>
        </Pressable>
      ) : null}
    </ScrollView>
  );
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
