import type { WorkoutListItem } from '@garfit/types';
import { useFocusEffect, useRouter } from 'expo-router';
import { useCallback, useState } from 'react';
import { ActivityIndicator, ScrollView, StyleSheet, Text, View } from 'react-native';
import {
  Button,
  Card,
  Chip,
  EmptyState,
  Icon,
  ListRow,
  SectionHeader,
  Title,
  uiStyles,
} from '@/components/ui';
import { colors, space, type } from '@/constants/theme';
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
    <ScrollView contentContainerStyle={uiStyles.scroll} style={styles.container}>
      <Title>Entrenar</Title>

      {/* Dos tiles grandes en columna */}
      <Card hero style={styles.tileCard}>
        <View style={styles.tileContent}>
          <View style={styles.tileText}>
            <Text style={styles.tileTitle}>Entrenamiento libre</Text>
            <Text style={uiStyles.muted}>Construye tu sesión serie a serie</Text>
          </View>
          <View style={[styles.tileIcon, { backgroundColor: colors.accentSoft }]}>
            <Icon name={{ ios: 'plus', android: 'add' }} size={24} color={colors.onAccent} />
          </View>
        </View>
        <Button
          label="Empezar ahora"
          onPress={() => router.push('/(app)/workouts/new')}
        />
      </Card>

      <Card style={styles.tileCard}>
        <View style={styles.tileContent}>
          <View style={styles.tileText}>
            <Text style={styles.tileTitle}>Desde un WOD</Text>
            <Text style={uiStyles.muted}>Elige un benchmark o entrenamiento predefinido</Text>
          </View>
          <View style={[styles.tileIcon, { backgroundColor: colors.metricSoft }]}>
            <Icon name={{ ios: 'timer', android: 'timer' }} size={24} color={colors.metric} />
          </View>
        </View>
        <Button
          label="Ver WODs"
          variant="secondary"
          onPress={() => router.push('/(app)/wods')}
        />
      </Card>

      {/* Link explorar movimientos */}
      <ListRow
        icon={{ ios: 'figure.cross.training', android: 'fitness_center' }}
        tone="accent"
        title="Explorar movimientos"
        subtitle="Biblioteca completa de ejercicios y técnica"
        onPress={() => router.push('/(app)/movements')}
      />

      {/* Continúa donde lo dejaste */}
      <View style={styles.section}>
        <SectionHeader title="Continúa donde lo dejaste" />

        {loading ? (
          <ActivityIndicator color={colors.accent} style={styles.loading} />
        ) : null}

        {error ? (
          <Text style={styles.errorText}>{error}</Text>
        ) : null}

        {!loading && !error && !items.length ? (
          <EmptyState
            icon={{ ios: 'clock.arrow.circlepath', android: 'history' }}
            title="Sin sesiones pendientes"
            message="No tienes entrenamientos en borrador o en curso."
            action={
              <Button
                label="Empezar entrenamiento"
                onPress={() => router.push('/(app)/workouts/new')}
                variant="secondary"
              />
            }
          />
        ) : null}

        {items.map((item) => {
          const isProgress = item.status === 'IN_PROGRESS';
          return (
            <ListRow
              key={item.id}
              icon={{ ios: 'flame.fill', android: 'local_fire_department' }}
              tone={isProgress ? 'success' : 'neutral'}
              title={item.name}
              subtitle={item.performedOn ?? 'Hoy'}
              trailing={
                <Chip
                  label={isProgress ? 'En curso' : 'Borrador'}
                  tone={isProgress ? 'success' : 'neutral'}
                />
              }
              onPress={() => router.push(`/(app)/workouts/${item.id}`)}
            />
          );
        })}
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  tileCard: {
    gap: space.md,
  },
  tileContent: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: space.md,
  },
  tileText: {
    flex: 1,
    gap: 4,
  },
  tileTitle: {
    color: colors.text,
    ...type.headline,
  },
  tileIcon: {
    width: 44,
    height: 44,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  section: {
    gap: space.sm,
    marginTop: space.sm,
  },
  loading: {
    marginVertical: space.lg,
  },
  errorText: {
    color: colors.danger,
    ...type.body,
  },
});
