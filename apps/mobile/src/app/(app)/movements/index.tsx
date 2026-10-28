import {
  EQUIPMENT,
  EQUIPMENT_LABELS,
  MOVEMENT_CATEGORIES,
  MOVEMENT_CATEGORY_LABELS,
} from '@garfit/movements';
import type { Equipment, MovementCategory, MovementSummary } from '@garfit/types';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useCallback, useEffect, useRef, useState } from 'react';
import { ActivityIndicator, FlatList, Pressable, Text, View } from 'react-native';
import { Card, Field, Screen, uiStyles } from '@/components/ui';
import { colors } from '@/constants/theme';
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
  // Guards live in refs: if `load` depended on `loading`/`totalPages`, each request would
  // recreate it and re-fire the search effect in a loop (429 in production).
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
    <Screen>
      <Field
        accessibilityLabel="Buscar movimientos"
        value={search}
        onChangeText={setSearch}
        placeholder="Buscar movimiento"
      />
      <Filter
        label="Categoría"
        values={MOVEMENT_CATEGORIES}
        selected={category}
        labels={MOVEMENT_CATEGORY_LABELS}
        onSelect={setCategory}
      />
      <Filter
        label="Equipamiento"
        values={EQUIPMENT}
        selected={equipment}
        labels={EQUIPMENT_LABELS}
        onSelect={setEquipment}
      />
      {error ? (
        <Pressable accessibilityRole="button" onPress={() => void load(1, true)}>
          <Text>{`${error} Toca para reintentar.`}</Text>
        </Pressable>
      ) : null}
      <FlatList
        data={items}
        refreshing={loading && page === 1}
        onRefresh={() => void load(1, true)}
        onEndReached={() => void load(page + 1)}
        onEndReachedThreshold={0.4}
        ListEmptyComponent={
          loading ? (
            <ActivityIndicator />
          ) : (
            <Text style={uiStyles.muted}>No encontramos movimientos.</Text>
          )
        }
        renderItem={({ item }) => (
          <Pressable
            accessibilityRole="button"
            accessibilityLabel={select === '1' ? `Agregar ${item.name}` : `Ver ${item.name}`}
            onPress={() => {
              if (select === '1') {
                selectMovement(item.slug);
                router.back();
                return;
              }
              router.push(`/(app)/movements/${item.slug}`);
            }}
          >
            <Card>
              <Text>{item.name}</Text>
              <Text style={uiStyles.muted}>
                {`${MOVEMENT_CATEGORY_LABELS[item.category]} · ${EQUIPMENT_LABELS[item.equipment]}`}
              </Text>
            </Card>
          </Pressable>
        )}
      />
    </Screen>
  );
}

type FilterProps<Value extends string> = {
  label: string;
  values: readonly Value[];
  selected: Value | undefined;
  labels: Record<Value, string>;
  onSelect: (value: Value | undefined) => void;
};

function Filter<Value extends string>({
  label,
  values,
  selected,
  labels,
  onSelect,
}: FilterProps<Value>) {
  return (
    <View style={{ gap: 8 }}>
      <Text>{label}</Text>
      <FlatList
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={{ gap: 8 }}
        data={values}
        keyExtractor={(value) => value}
        renderItem={({ item }) => (
          <Pressable
            accessibilityRole="button"
            accessibilityState={{ selected: item === selected }}
            onPress={() => onSelect(item === selected ? undefined : item)}
            style={{
              paddingHorizontal: 12,
              paddingVertical: 6,
              borderWidth: 1,
              borderRadius: 999,
              borderColor: item === selected ? colors.accent : colors.border,
              backgroundColor: item === selected ? colors.accentSoft : colors.surface,
            }}
          >
            <Text style={{ color: item === selected ? colors.accent : colors.text }}>{labels[item]}</Text>
          </Pressable>
        )}
      />
    </View>
  );
}
