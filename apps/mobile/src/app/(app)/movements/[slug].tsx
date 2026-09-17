import {
  EQUIPMENT_LABELS,
  MOVEMENT_CATEGORY_LABELS,
  MOVEMENT_DIFFICULTY_LABELS,
  MUSCLE_GROUP_LABELS,
} from '@garfit/movements';
import type { MovementDetail } from '@garfit/types';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useEffect, useState } from 'react';
import { ScrollView, Text } from 'react-native';
import { Button, Card, Title, uiStyles } from '@/components/ui';
import { api, messageFor, useSession } from '@/lib/auth';

export default function MovementDetailScreen() {
  const { slug } = useLocalSearchParams<{ slug: string }>();
  const { request } = useSession();
  const router = useRouter();
  const [movement, setMovement] = useState<MovementDetail | null>(null);
  const [aiAvailable, setAiAvailable] = useState(false);
  const [error, setError] = useState<string | null>(null);
  useEffect(() => {
    if (slug)
      void request(() => api.movements.get(slug))
        .then(setMovement)
        .catch((cause: unknown) => setError(messageFor(cause)));
  }, [request, slug]);
  useEffect(() => {
    void request(() => api.ai.status())
      .then((status) => setAiAvailable(status.enabled && status.configured))
      .catch(() => setAiAvailable(false));
  }, [request]);
  if (error) return <Text>{error}</Text>;
  if (!movement) return <Text>Cargando movimiento…</Text>;
  return (
    <ScrollView contentContainerStyle={{ gap: 14, padding: 20 }}>
      <Title>{movement.name}</Title>
      <Card>
        <Text>{MOVEMENT_CATEGORY_LABELS[movement.category]}</Text>
        <Text>{EQUIPMENT_LABELS[movement.equipment]}</Text>
        <Text>{`Principales: ${
          movement.primaryMuscles.map((muscle) => MUSCLE_GROUP_LABELS[muscle]).join(', ') ||
          'No disponible'
        }`}</Text>
        <Text>{`Secundarios: ${
          movement.secondaryMuscles.map((muscle) => MUSCLE_GROUP_LABELS[muscle]).join(', ') ||
          'No disponible'
        }`}</Text>
        {movement.difficulty ? (
          <Text>{MOVEMENT_DIFFICULTY_LABELS[movement.difficulty]}</Text>
        ) : null}
      </Card>
      {movement.description ? <Text style={uiStyles.muted}>{movement.description}</Text> : null}
      <Text>Cómo se realiza</Text>
      <Card>
        {movement.instructions.map((step, index) => (
          <Text key={`${index}-${step}`}>{`${index + 1}. ${step}`}</Text>
        ))}
      </Card>
      <Button
        label="Registrar marca"
        onPress={() =>
          router.push({ pathname: '/(app)/records/new', params: { movement: movement.slug } })
        }
      />
      {aiAvailable ? (
        <Button
          label="Explicar con IA"
          secondary
          onPress={() => router.push({ pathname: '/(app)/ai', params: { action: 'movement', slug: movement.slug } })}
        />
      ) : null}
    </ScrollView>
  );
}
