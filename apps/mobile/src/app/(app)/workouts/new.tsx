import type { MovementSummary, WorkoutType } from '@garfit/types';
import { WORKOUT_TYPE_LABELS, createWorkoutSchema } from '@garfit/validation';
import { useRouter } from 'expo-router';
import { useCallback, useEffect, useState } from 'react';
import { Alert, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import {
  Button,
  Card,
  Chip,
  Field,
  Icon,
  Label,
  ListRow,
  SectionHeader,
  Title,
  uiStyles,
} from '@/components/ui';
import { colors, space, type } from '@/constants/theme';
import { api, messageFor, useSession } from '@/lib/auth';
import { listenForMovementSelection } from '@/lib/movement-picker';
import { createWorkoutPayload, type EditableExercise } from '@/lib/workouts';

const TYPES: readonly WorkoutType[] = ['STRENGTH', 'FOR_TIME', 'AMRAP', 'EMOM', 'CARDIO', 'CUSTOM'];
const blankExercise = (
  movementSlug: string,
  name: string,
  recordTypes: readonly string[],
): EditableExercise => ({
  movementSlug,
  name,
  recordTypes,
  sets: '3',
  reps: '',
  loadValue: '',
  loadUnit: 'KILOGRAM',
  distanceValue: '',
  distanceUnit: 'METER',
  duration: '',
});

export default function NewWorkoutScreen() {
  const { request } = useSession();
  const router = useRouter();
  const [name, setName] = useState('');
  const [workoutType, setWorkoutType] = useState<WorkoutType>('STRENGTH');
  const [duration, setDuration] = useState('');
  const [rounds, setRounds] = useState('');
  const [interval, setInterval] = useState('');
  const [repScheme, setRepScheme] = useState('');
  const [exercises, setExercises] = useState<EditableExercise[]>([]);
  const [saving, setSaving] = useState(false);

  // Buscador inline de movimientos
  const [search, setSearch] = useState('');
  const [searchResults, setSearchResults] = useState<MovementSummary[]>([]);
  const [searching, setSearching] = useState(false);

  const addMovement = useCallback(
    async (slug: string) => {
      try {
        const movement = await request(() => api.movements.get(slug));
        setExercises((items) => [
          ...items,
          blankExercise(slug, movement.name, movement.recordTypes),
        ]);
        setSearch('');
        setSearchResults([]);
      } catch (error) {
        Alert.alert('No se pudo agregar', messageFor(error));
      }
    },
    [request],
  );

  useEffect(() => listenForMovementSelection((slug) => void addMovement(slug)), [addMovement]);

  // Búsqueda en vivo de movimientos
  useEffect(() => {
    const term = search.trim();
    const timer = setTimeout(async () => {
      if (!term) {
        setSearchResults([]);
        return;
      }
      setSearching(true);
      try {
        const res = await request(() => api.movements.list({ search: term, limit: 5 }));
        setSearchResults(res.items);
      } catch {
        setSearchResults([]);
      } finally {
        setSearching(false);
      }
    }, 250);
    return () => clearTimeout(timer);
  }, [request, search]);

  function updateExercise(index: number, patch: Partial<EditableExercise>) {
    setExercises((items) => items.map((item, i) => (i === index ? { ...item, ...patch } : item)));
  }

  async function create() {
    const payload = createWorkoutPayload({
      name,
      workoutType,
      duration,
      rounds,
      interval,
      repScheme,
      exercises,
    });
    const parsed = createWorkoutSchema.safeParse(payload);
    if (!parsed.success) {
      Alert.alert('Revisa el entrenamiento', parsed.error.issues[0]?.message ?? 'Datos inválidos');
      return;
    }
    setSaving(true);
    try {
      const workout = await request(() => api.workouts.create(parsed.data));
      router.replace(`/(app)/workouts/${workout.id}`);
    } catch (error) {
      Alert.alert('No se pudo crear', messageFor(error));
    } finally {
      setSaving(false);
    }
  }

  const global = workoutType === 'FOR_TIME' || workoutType === 'AMRAP' || workoutType === 'EMOM';

  return (
    <ScrollView style={styles.scroll} contentContainerStyle={uiStyles.scroll}>
      <Title>Nuevo entrenamiento</Title>

      <Field
        label="Nombre del entrenamiento"
        accessibilityLabel="Nombre"
        value={name}
        onChangeText={setName}
        placeholder="p. ej. Pierna y empuje"
      />

      <View style={styles.fieldBlock}>
        <Label>Tipo de entrenamiento</Label>
        <View style={styles.chipsRow}>
          {TYPES.map((type) => (
            <Chip
              key={type}
              label={WORKOUT_TYPE_LABELS[type]}
              selected={type === workoutType}
              onPress={() => setWorkoutType(type)}
            />
          ))}
        </View>
      </View>

      {global ? (
        <Card style={styles.globalCard}>
          <Label>Configuración global</Label>
          {workoutType === 'AMRAP' || workoutType === 'EMOM' || workoutType === 'FOR_TIME' ? (
            <Field
              label="Duración o límite"
              accessibilityLabel="Duración o límite"
              value={duration}
              onChangeText={setDuration}
              placeholder={workoutType === 'FOR_TIME' ? 'Límite mm:ss (opcional)' : 'mm:ss'}
              keyboardType="numbers-and-punctuation"
            />
          ) : null}
          {workoutType === 'EMOM' ? (
            <Field
              label="Intervalo de trabajo"
              accessibilityLabel="Intervalo"
              value={interval}
              onChangeText={setInterval}
              placeholder="mm:ss"
              keyboardType="numbers-and-punctuation"
            />
          ) : null}
          {workoutType === 'FOR_TIME' || workoutType === 'AMRAP' ? (
            <Field
              label="Rondas objetivo"
              accessibilityLabel="Rondas"
              value={rounds}
              onChangeText={setRounds}
              placeholder="p. ej. 5 (opcional)"
              keyboardType="numeric"
            />
          ) : null}
          {workoutType === 'FOR_TIME' ? (
            <Field
              label="Esquema de repeticiones"
              accessibilityLabel="Esquema de repeticiones"
              value={repScheme}
              onChangeText={setRepScheme}
              placeholder="p. ej. 21-15-9"
            />
          ) : null}
        </Card>
      ) : null}

      {/* Buscador de ejercicios */}
      <View style={styles.fieldBlock}>
        <SectionHeader title="Ejercicios" />
        <Field
          label="Buscar y añadir ejercicio"
          value={search}
          onChangeText={setSearch}
          placeholder="Busca por nombre (ej. Sentadilla)…"
        />

        {searching ? <Text style={uiStyles.muted}>Buscando…</Text> : null}

        {searchResults.length > 0 ? (
          <View style={styles.searchResults}>
            {searchResults.map((m) => (
              <ListRow
                key={m.id}
                icon={{ ios: 'plus.circle.fill', android: 'add' }}
                tone="accent"
                title={m.name}
                subtitle={`${m.category} · ${m.equipment}`}
                onPress={() => void addMovement(m.slug)}
              />
            ))}
          </View>
        ) : null}

        <Button
          label="Explorar todos los movimientos"
          variant="secondary"
          icon={{ ios: 'magnifyingglass', android: 'search' }}
          onPress={() => router.push('/(app)/movements?select=1')}
        />
      </View>

      {/* Lista de ejercicios añadidos */}
      {exercises.map((exercise, index) => (
        <ExerciseBuilder
          key={`${exercise.movementSlug}-${index}`}
          exercise={exercise}
          index={index}
          onChange={(patch) => updateExercise(index, patch)}
          onMove={(offset) => setExercises((items) => move(items, index, offset))}
          onRemove={() => setExercises((items) => items.filter((_, i) => i !== index))}
        />
      ))}

      <Button
        label={saving ? 'Creando sesión…' : 'Crear entrenamiento'}
        onPress={() => void create()}
        disabled={saving}
      />
    </ScrollView>
  );
}

function ExerciseBuilder({
  exercise,
  index,
  onChange,
  onMove,
  onRemove,
}: {
  exercise: EditableExercise;
  index: number;
  onChange: (patch: Partial<EditableExercise>) => void;
  onMove: (offset: number) => void;
  onRemove: () => void;
}) {
  const records = new Set(exercise.recordTypes);

  return (
    <Card style={styles.exerciseCard}>
      <View style={styles.exerciseHeader}>
        <View style={styles.exerciseHeaderLeft}>
          <Chip label={`#${index + 1}`} tone="accent" />
          <Text style={styles.exerciseName} numberOfLines={1}>
            {exercise.name}
          </Text>
        </View>
        <View style={styles.exerciseActions}>
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Mover arriba"
            hitSlop={8}
            onPress={() => onMove(-1)}
            style={({ pressed }) => [styles.iconBtn, pressed && uiStyles.pressed]}
          >
            <Icon name={{ ios: 'arrow.up', android: 'arrow_upward' }} size={18} color={colors.muted} />
          </Pressable>
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Mover abajo"
            hitSlop={8}
            onPress={() => onMove(1)}
            style={({ pressed }) => [styles.iconBtn, pressed && uiStyles.pressed]}
          >
            <Icon name={{ ios: 'arrow.down', android: 'arrow_downward' }} size={18} color={colors.muted} />
          </Pressable>
          <Pressable
            accessibilityRole="button"
            accessibilityLabel={`Quitar ${exercise.name}`}
            hitSlop={8}
            onPress={onRemove}
            style={({ pressed }) => [styles.iconBtn, pressed && uiStyles.pressed]}
          >
            <Icon name={{ ios: 'trash', android: 'delete' }} size={18} color={colors.danger} />
          </Pressable>
        </View>
      </View>

      <View style={styles.inputsGrid}>
        <View style={styles.inputCol}>
          <Field
            label="Series"
            value={exercise.sets}
            onChangeText={(sets) => onChange({ sets })}
            placeholder="3"
            keyboardType="numeric"
          />
        </View>
        {records.has('REPS') || records.has('WEIGHT') ? (
          <View style={styles.inputCol}>
            <Field
              label="Reps"
              value={exercise.reps}
              onChangeText={(reps) => onChange({ reps })}
              placeholder="10"
              keyboardType="numeric"
            />
          </View>
        ) : null}
        {records.has('WEIGHT') ? (
          <View style={styles.inputCol}>
            <Field
              label="Carga (kg)"
              value={exercise.loadValue}
              onChangeText={(loadValue) => onChange({ loadValue })}
              placeholder="60"
              keyboardType="decimal-pad"
            />
          </View>
        ) : null}
        {records.has('DISTANCE') || records.has('TIME') ? (
          <View style={styles.inputCol}>
            <Field
              label="Distancia (m)"
              value={exercise.distanceValue}
              onChangeText={(distanceValue) => onChange({ distanceValue })}
              placeholder="500"
              keyboardType="decimal-pad"
            />
          </View>
        ) : null}
        {records.has('DURATION') || records.has('TIME') ? (
          <View style={styles.inputCol}>
            <Field
              label="Duración"
              value={exercise.duration}
              onChangeText={(duration) => onChange({ duration })}
              placeholder="mm:ss"
              keyboardType="numbers-and-punctuation"
            />
          </View>
        ) : null}
      </View>
    </Card>
  );
}

function move<T>(items: T[], index: number, offset: number): T[] {
  const target = index + offset;
  if (target < 0 || target >= items.length) return items;
  const next = [...items];
  [next[index], next[target]] = [next[target], next[index]];
  return next;
}

const styles = StyleSheet.create({
  scroll: {
    backgroundColor: colors.background,
    flex: 1,
  },
  fieldBlock: {
    gap: space.sm,
  },
  chipsRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: space.sm,
  },
  globalCard: {
    gap: space.md,
  },
  searchResults: {
    gap: space.xs,
  },
  exerciseCard: {
    gap: space.md,
  },
  exerciseHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: space.sm,
  },
  exerciseHeaderLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: space.sm,
    flex: 1,
  },
  exerciseName: {
    color: colors.text,
    ...type.headline,
    flex: 1,
  },
  exerciseActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  iconBtn: {
    padding: 8,
    borderRadius: 8,
  },
  inputsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: space.sm,
  },
  inputCol: {
    flex: 1,
    minWidth: '45%',
  },
});
