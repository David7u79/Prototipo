import {
  EQUIPMENT_LABELS,
  MOVEMENT_CATEGORY_LABELS,
  MOVEMENT_DIFFICULTY_LABELS,
  MUSCLE_GROUP_LABELS,
} from '@garfit/movements';
import type { MovementDetail } from '@garfit/types';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useEffect, useState } from 'react';
import { ActivityIndicator, ScrollView, StyleSheet, Text, View } from 'react-native';
import { Button, Card, Chip, Label, SectionHeader, Title, uiStyles } from '@/components/ui';
import { colors, space, type } from '@/constants/theme';
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

  if (error)
    return (
      <ScrollView contentContainerStyle={uiStyles.scroll} style={styles.scroll}>
        <Text style={styles.errorText}>{error}</Text>
      </ScrollView>
    );

  if (!movement)
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator color={colors.accent} size="large" />
      </View>
    );

  return (
    <ScrollView contentContainerStyle={uiStyles.scroll} style={styles.scroll}>
      <Card hero style={styles.heroCard}>
        <Title>{movement.name}</Title>
        <View style={styles.chipsRow}>
          <Chip label={MOVEMENT_CATEGORY_LABELS[movement.category]} tone="accent" />
          <Chip label={EQUIPMENT_LABELS[movement.equipment]} tone="neutral" />
          {movement.difficulty ? (
            <Chip label={MOVEMENT_DIFFICULTY_LABELS[movement.difficulty]} tone="metric" />
          ) : null}
        </View>
      </Card>

      {/* Músculos implicados */}
      <Card style={styles.card}>
        <Label>Músculos principales</Label>
        <Text style={styles.bodyText}>
          {movement.primaryMuscles.map((m) => MUSCLE_GROUP_LABELS[m]).join(', ') || 'No especificados'}
        </Text>

        <Label>Músculos secundarios</Label>
        <Text style={styles.bodyText}>
          {movement.secondaryMuscles.map((m) => MUSCLE_GROUP_LABELS[m]).join(', ') || 'No especificados'}
        </Text>
      </Card>

      {movement.description ? (
        <Card style={styles.card}>
          <Label>Descripción</Label>
          <Text style={uiStyles.muted}>{movement.description}</Text>
        </Card>
      ) : null}

      {/* Instrucciones */}
      <View style={styles.section}>
        <SectionHeader title="Cómo se realiza" />
        <Card style={styles.card}>
          {movement.instructions.map((step, index) => (
            <View key={`${index}-${step}`} style={styles.instructionRow}>
              <Text style={styles.stepNumber}>{index + 1}.</Text>
              <Text style={styles.stepText}>{step}</Text>
            </View>
          ))}
        </Card>
      </View>

      <View style={styles.actions}>
        <Button
          label="Registrar marca"
          onPress={() =>
            router.push({ pathname: '/(app)/records/new', params: { movement: movement.slug } })
          }
        />
        {aiAvailable ? (
          <Button
            label="Explicar con IA"
            variant="secondary"
            icon={{ ios: 'sparkles', android: 'auto_awesome' }}
            onPress={() =>
              router.push({ pathname: '/(app)/ai', params: { action: 'movement', slug: movement.slug } })
            }
          />
        ) : null}
      </View>
    </ScrollView>
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
    flexWrap: 'wrap',
    gap: space.sm,
  },
  card: {
    gap: space.sm,
  },
  bodyText: {
    color: colors.text,
    ...type.body,
  },
  section: {
    gap: space.sm,
  },
  instructionRow: {
    flexDirection: 'row',
    gap: space.sm,
    paddingVertical: 2,
  },
  stepNumber: {
    color: colors.accent,
    fontWeight: '700',
    width: 20,
  },
  stepText: {
    color: colors.text,
    ...type.body,
    flex: 1,
  },
  actions: {
    gap: space.md,
    marginTop: space.sm,
  },
  errorText: {
    color: colors.danger,
    ...type.body,
  },
});
