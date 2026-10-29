import {
  EQUIPMENT,
  EQUIPMENT_LABELS,
  MOVEMENT_CATEGORIES,
  MOVEMENT_CATEGORY_LABELS,
} from '@garfit/movements';
import type { Equipment, MovementCategory, MovementSummary } from '@garfit/types';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useCallback, useEffect, useRef, useState } from 'react';
import { ActivityIndicator, FlatList, StyleSheet, Text, View } from 'react-native';
import { Chip, EmptyState, Field, ListRow, SectionHeader, Title, uiStyles } from '@/components/ui';
import { colors, space, type } from '@/constants/theme';
import { api, messageFor, useSession } from '@/lib/auth';
import { selectMovement } from '@/lib/movement-picker';

const PAGE_SIZE = 20;

export default function MovementsScreen() {
  const { request } = useSession();
  const router = useRouter();
  const { select } = useLocalSearchParams<{ select?: string }>();
  const [items, setItems] = useState<MovementSummary[]>([]);
  const [search, setSearch] = useState('');
  const [category, setCategory] = useState<MovementCategory | undefined>();
  const [equipment, setEquipment] = useState<Equipment | undefined>();
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const busy = useRef(false);
  const totalPagesRef = useRef(1);

  const load = useCallback(
    async (nextPage: number, replace = false) => {
      if (busy.current || (!replace && nextPage > totalPagesRef.current)) return;
      busy.current = true;
      setLoading(true);
      setError(null);
      try {
        const result = await request(() =>
          api.movements.list({ search, category, equipment, page: nextPage, limit: PAGE_SIZE }),
        );
        setItems((current) => (replace ? result.items : [...current, ...result.items]));
        setPage(nextPage);
        totalPagesRef.current = result.totalPages;
      } catch (cause) {
        setError(messageFor(cause));
      } finally {
        busy.current = false;
        setLoading(false);
      }
    },
    [category, equipment, request, search],
  );

  useEffect(() => {
    const timer = setTimeout(() => void load(1, true), 300);
    return () => clearTimeout(timer);
  }, [category, equipment, load, search]);

  return (
    <View style={styles.container}>
      <FlatList
        data={items}
        keyExtractor={(item) => item.id}
        contentContainerStyle={uiStyles.scroll}
        refreshing={loading && page === 1}
        onRefresh={() => void load(1, true)}
        onEndReached={() => void load(page + 1)}
        onEndReachedThreshold={0.4}
        ListHeaderComponent={
          <View style={styles.header}>
            <Title>Movimientos</Title>
            <Field
              accessibilityLabel="Buscar movimientos"
              value={search}
              onChangeText={setSearch}
              placeholder="Buscar por nombre o técnica…"
            />

            <View style={styles.filtersBlock}>
              <SectionHeader title="Categoría" />
              <FlatList
                horizontal
                showsHorizontalScrollIndicator={false}
                contentContainerStyle={styles.chipsScroll}
                data={MOVEMENT_CATEGORIES}
                keyExtractor={(val) => val}
                renderItem={({ item: val }) => (
                  <Chip
                    label={MOVEMENT_CATEGORY_LABELS[val]}
                    selected={category === val}
                    onPress={() => setCategory(category === val ? undefined : val)}
                  />
                )}
              />
            </View>

            <View style={styles.filtersBlock}>
              <SectionHeader title="Equipamiento" />
              <FlatList
                horizontal
                showsHorizontalScrollIndicator={false}
                contentContainerStyle={styles.chipsScroll}
                data={EQUIPMENT}
                keyExtractor={(val) => val}
                renderItem={({ item: val }) => (
                  <Chip
                    label={EQUIPMENT_LABELS[val]}
                    selected={equipment === val}
                    onPress={() => setEquipment(equipment === val ? undefined : val)}
                  />
                )}
              />
            </View>

            {error ? <Text style={styles.errorText}>{`${error} Desliza para reintentar.`}</Text> : null}
          </View>
        }
        ListEmptyComponent={
          loading ? (
            <ActivityIndicator color={colors.accent} style={styles.loading} />
          ) : (
            <EmptyState
              icon={{ ios: 'figure.cross.training', android: 'fitness_center' }}
              title="Sin resultados"
              message="No encontramos movimientos con los filtros seleccionados."
            />
          )
        }
        renderItem={({ item }) => (
          <ListRow
            icon={{ ios: 'figure.cross.training', android: 'fitness_center' }}
            tone="accent"
            title={item.name}
            subtitle={`${MOVEMENT_CATEGORY_LABELS[item.category]} · ${EQUIPMENT_LABELS[item.equipment]}`}
            onPress={() => {
              if (select === '1') {
                selectMovement(item.slug);
                router.back();
                return;
              }
              router.push(`/(app)/movements/${item.slug}`);
            }}
          />
        )}
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
  filtersBlock: {
    gap: space.xs,
  },
  chipsScroll: {
    gap: space.sm,
    paddingVertical: 2,
  },
  loading: {
    marginVertical: space.xl,
  },
  errorText: {
    color: colors.danger,
    ...type.body,
  },
});
