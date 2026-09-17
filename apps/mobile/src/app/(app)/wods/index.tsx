import type { WodSummary } from '@garfit/types';
import { WORKOUT_TYPE_LABELS } from '@garfit/validation';
import { useFocusEffect, useRouter } from 'expo-router';
import { useCallback, useState } from 'react';
import { ActivityIndicator, FlatList, Pressable, RefreshControl, Text, View } from 'react-native';
import { Card, Title, uiStyles } from '@/components/ui';
import { api, messageFor, useSession } from '@/lib/auth';
import { wodPrescription } from '@/lib/wods';

export default function WodListScreen() {
  const { request } = useSession();
  const router = useRouter();
  const [items, setItems] = useState<WodSummary[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [refreshing, setRefreshing] = useState(false);
  const load = useCallback(
    async (refresh = false) => {
      setRefreshing(refresh);
      setError(null);
      try {
        const response = await request(() => api.wods.list({ limit: 50 }));
        setItems(
          response.items.sort(
            (left, right) => Number(right.isBenchmark) - Number(left.isBenchmark),
          ),
        );
      } catch (cause) {
        setError(messageFor(cause));
      } finally {
        setRefreshing(false);
      }
    },
    [request],
  );
  useFocusEffect(useCallback(() => void load(), [load]));
  if (!items && !error) return <Loading />;
  if (error) return <Failure message={error} onRetry={() => void load()} />;
  return (
    <FlatList
      contentContainerStyle={{ gap: 12, padding: 20 }}
      data={items ?? []}
      keyExtractor={(item) => item.id}
      ListEmptyComponent={<Text style={uiStyles.muted}>Aún no hay WODs disponibles.</Text>}
      ListHeaderComponent={<Title>WODs</Title>}
      refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => void load(true)} />}
      renderItem={({ item }) => (
        <WodRow item={item} onPress={() => router.push(`/(app)/wods/${item.slug}`)} />
      )}
    />
  );
}

function WodRow({ item, onPress }: { item: WodSummary; onPress: () => void }) {
  return (
    <Pressable
      accessibilityLabel={`Abrir WOD ${item.name}`}
      accessibilityRole="button"
      onPress={onPress}
    >
      <Card>
        <Text>{item.name}</Text>
        <Text style={uiStyles.muted}>{WORKOUT_TYPE_LABELS[item.workoutType]}</Text>
        <Text style={uiStyles.muted}>{wodPrescription(item)}</Text>
      </Card>
    </Pressable>
  );
}

function Loading() {
  return <ActivityIndicator accessibilityLabel="Cargando WODs" style={{ flex: 1 }} />;
}

function Failure({ message, onRetry }: { message: string; onRetry: () => void }) {
  return (
    <View style={{ gap: 12, padding: 20 }}>
      <Text>{message}</Text>
      <Pressable accessibilityRole="button" onPress={onRetry} style={uiStyles.button}>
        <Text style={uiStyles.buttonText}>Reintentar</Text>
      </Pressable>
    </View>
  );
}
