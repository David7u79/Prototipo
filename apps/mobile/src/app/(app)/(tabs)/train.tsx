import type { WorkoutListItem } from '@garfit/types';
import { useFocusEffect, useRouter } from 'expo-router';
import { useCallback, useState } from 'react';
import { ActivityIndicator, Pressable, ScrollView, Text } from 'react-native';
import { Card, Title, uiStyles } from '@/components/ui';
import { api, messageFor, useSession } from '@/lib/auth';

export default function TrainScreen() {
  const { request } = useSession();
  const router = useRouter();
  const [items, setItems] = useState<WorkoutListItem[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const load = useCallback(async () => {
    setLoading(true);
    try {
      const [drafts, active] = await Promise.all([
        request(() => api.workouts.list({ status: 'DRAFT', limit: 8 })),
        request(() => api.workouts.list({ status: 'IN_PROGRESS', limit: 8 })),
      ]);
      setItems([...active.items, ...drafts.items]);
      setError(null);
    } catch (cause) {
      setError(messageFor(cause));
    } finally {
      setLoading(false);
    }
  }, [request]);
  useFocusEffect(
    useCallback(() => {
      void load();
    }, [load]),
  );
  return (
    <ScrollView contentContainerStyle={{ gap: 14, padding: 20 }}>
      <Title>Entrenar</Title>
      <Action label="Nuevo entrenamiento" onPress={() => router.push('/(app)/workouts/new')} />
      <Action label="Desde un WOD" onPress={() => router.push('/(app)/wods')} secondary />
      <Text style={uiStyles.muted}>Continúa donde lo dejaste</Text>
      {loading ? <ActivityIndicator /> : null}
      {error ? <Text>{error}</Text> : null}
      {!loading && !error && !items.length ? (
        <Text style={uiStyles.muted}>No tienes entrenamientos pendientes.</Text>
      ) : null}
      {items.map((item) => (
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={`Abrir ${item.name}`}
          key={item.id}
          onPress={() => router.push(`/(app)/workouts/${item.id}`)}
        >
          <Card>
            <Text>{item.name}</Text>
            <Text style={uiStyles.muted}>{item.status === 'DRAFT' ? 'Borrador' : 'En curso'}</Text>
          </Card>
        </Pressable>
      ))}
    </ScrollView>
  );
}

function Action({
  label,
  onPress,
  secondary = false,
}: {
  label: string;
  onPress: () => void;
  secondary?: boolean;
}) {
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={label}
      onPress={onPress}
      style={({ pressed }) => [
        uiStyles.button,
        secondary && uiStyles.secondaryButton,
        pressed && uiStyles.dimmed,
      ]}
    >
      <Text style={secondary ? uiStyles.secondaryButtonText : uiStyles.buttonText}>{label}</Text>
    </Pressable>
  );
}
