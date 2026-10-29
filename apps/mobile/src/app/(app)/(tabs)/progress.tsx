import type { RecordsOverviewResponse } from '@garfit/types';
import { useFocusEffect, useRouter } from 'expo-router';
import { useCallback, useState } from 'react';
import { ActivityIndicator, FlatList, StyleSheet, Text, View } from 'react-native';
import { Button, EmptyState, ListRow, Title, uiStyles } from '@/components/ui';
import { colors, space, type } from '@/constants/theme';
import { api, messageFor, useSession } from '@/lib/auth';
import { formatChange, formatValue } from '@/lib/presentation';

export default function ProgressScreen() {
  const { profile, request } = useSession();
  const router = useRouter();
  const [data, setData] = useState<RecordsOverviewResponse | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      setData(await request(() => api.records.overview()));
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

  const system = profile?.preferredUnits ?? 'METRIC';

  return (
    <View style={styles.container}>
      <FlatList
        data={data?.items ?? []}
        keyExtractor={(item) => item.movement.slug}
        contentContainerStyle={uiStyles.scroll}
        refreshing={loading}
        onRefresh={() => void load()}
        ListHeaderComponent={
          <View style={styles.header}>
            <Title>Progreso</Title>
            <Button
              label="Registrar marca"
              onPress={() => router.push('/(app)/records/new')}
            />
            {error ? <Text style={styles.errorText}>{error}</Text> : null}
          </View>
        }
        ListEmptyComponent={
          loading ? (
            <ActivityIndicator color={colors.accent} style={styles.loading} />
          ) : (
            <EmptyState
              icon={{ ios: 'trophy.fill', android: 'emoji_events' }}
              title="Aún no tienes marcas"
              message="Registra tus marcas personales para medir tu evolución con el tiempo."
              action={
                <Button
                  label="Registrar primera marca"
                  onPress={() => router.push('/(app)/records/new')}
                  variant="secondary"
                />
              }
            />
          )
        }
        renderItem={({ item }) => {
          const formatted = formatValue(
            item.series.recordType,
            item.series.best.normalizedValue,
            system,
          );
          const improvement = item.series.bestImprovement
            ? formatChange(
                item.series.recordType,
                item.series.bestImprovement.absolute,
                system,
              )
            : undefined;

          const subtitle = improvement
            ? `Mejora: ${improvement}`
            : 'Marca registrada';

          return (
            <ListRow
              icon={{ ios: 'trophy.fill', android: 'emoji_events' }}
              tone="metric"
              title={item.movement.name}
              subtitle={subtitle}
              trailing={formatted}
              onPress={() => router.push(`/(app)/records/${item.movement.slug}`)}
            />
          );
        }}
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
    gap: space.md,
  },
  loading: {
    marginVertical: space.xl,
  },
  errorText: {
    color: colors.danger,
    ...type.body,
  },
});
