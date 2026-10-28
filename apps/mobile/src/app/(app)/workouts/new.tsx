import type { WorkoutType } from '@garfit/types';
import { WORKOUT_TYPE_LABELS, createWorkoutSchema } from '@garfit/validation';
import { useRouter } from 'expo-router';
import { useCallback, useEffect, useState } from 'react';
import { Alert, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { Button, Card, Field, Label, Screen, Title } from '@/components/ui';
import { colors } from '@/constants/theme';
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

  const addMovement = useCallback(
    async (slug: string) => {
      try {
        const movement = await request(() => api.movements.get(slug));
        setExercises((items) => [
          ...items,
          blankExercise(slug, movement.name, movement.recordTypes),
        ]);
      } catch (error) {
        Alert.alert('No se pudo agregar', messageFor(error));
      }
    },
    [request],
  );

  useEffect(() => listenForMovementSelection((slug) => void addMovement(slug)), [addMovement]);

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
    <ScrollView style={styles.scroll}>
      <Screen>
        <Title>Nuevo entrenamiento</Title>
        <Field
          label="Nombre"
          accessibilityLabel="Nombre"
          value={name}
          onChangeText={setName}
          placeholder="Nombre del entrenamiento"
        />
        <Label>Tipo</Label>
        <View style={styles.chips}>
          {TYPES.map((type) => (
            <Choice
              key={type}
              label={WORKOUT_TYPE_LABELS[type]}
              active={type === workoutType}
              onPress={() => setWorkoutType(type)}
            />
          ))}
        </View>
        {global ? (
          <Card>
            {workoutType === 'AMRAP' || workoutType === 'EMOM' || workoutType === 'FOR_TIME' ? (
              <Field
                label="Duración"
                accessibilityLabel="Duración o límite"
                value={duration}
                onChangeText={setDuration}
                placeholder={
                  workoutType === 'FOR_TIME' ? 'Límite mm:ss (opcional)' : 'mm:ss'
                }
                keyboardType="numbers-and-punctuation"
              />
            ) : null}
            {workoutType === 'EMOM' ? (
              <Field
                label="Intervalo"
                accessibilityLabel="Intervalo"
                value={interval}
                onChangeText={setInterval}
                placeholder="mm:ss"
                keyboardType="numbers-and-punctuation"
              />
            ) : null}
            {workoutType === 'FOR_TIME' || workoutType === 'AMRAP' ? (
              <Field
                label="Rondas"
                accessibilityLabel="Rondas"
                value={rounds}
                onChangeText={setRounds}
                placeholder="Rondas (opcional)"
                keyboardType="numeric"
              />
            ) : null}
            {workoutType === 'FOR_TIME' ? (
              <Field
                label="Esquema"
                accessibilityLabel="Esquema de repeticiones"
                value={repScheme}
                onChangeText={setRepScheme}
                placeholder="p. ej. 21-15-9"
                keyboardType="numeric"
              />
            ) : null}
          </Card>
        ) : null}
        {exercises.map((exercise, index) => (
          <ExerciseBuilder
            key={`${exercise.movementSlug}-${index}`}
            exercise={exercise}
            onChange={(patch) => updateExercise(index, patch)}
            onMove={(offset) => setExercises((items) => move(items, index, offset))}
            onRemove={() => setExercises((items) => items.filter((_, i) => i !== index))}
          />
        ))}
        <Button
          label="Agregar movimiento"
          onPress={() => router.push('/(app)/movements?select=1')}
          secondary
        />
        <Button
          label={saving ? 'Creando…' : 'Crear entrenamiento'}
          onPress={() => void create()}
          disabled={saving}
        />
      </Screen>
    </ScrollView>
  );
}

function Choice({
  label,
  active,
  onPress,
}: {
  label: string;
  active: boolean;
  onPress: () => void;
}) {
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityState={{ selected: active }}
      onPress={onPress}
      style={[styles.chip, active && styles.selectedChip]}
    >
      <Text style={[styles.chipText, active && styles.selectedChipText]}>{label}</Text>
    </Pressable>
  );
}

function ExerciseBuilder({
  exercise,
  onChange,
  onMove,
  onRemove,
}: {
  exercise: EditableExercise;
  onChange: (patch: Partial<EditableExercise>) => void;
  onMove: (offset: number) => void;
  onRemove: () => void;
}) {
  const records = new Set(exercise.recordTypes);
  return (
    <Card style={styles.exerciseCard}>
      <View style={styles.exerciseHeader}>
        <Text style={styles.exerciseName}>{exercise.name}</Text>
        <View style={styles.exerciseActions}>
          <Pressable accessibilityLabel="Mover arriba" hitSlop={8} onPress={() => onMove(-1)}>
            <Text style={styles.moveText}>↑</Text>
          </Pressable>
          <Pressable accessibilityLabel="Mover abajo" hitSlop={8} onPress={() => onMove(1)}>
            <Text style={styles.moveText}>↓</Text>
          </Pressable>
          <Pressable
            accessibilityRole="button"
            accessibilityLabel={`Quitar ${exercise.name}`}
            hitSlop={12}
            onPress={onRemove}
          >
            <Text style={styles.removeText}>Quitar</Text>
          </Pressable>
        </View>
      </View>
      <View style={styles.grid}>
        <View style={styles.gridItem}>
          <Field
            label="Series"
            accessibilityLabel={`Series de ${exercise.name}`}
            value={exercise.sets}
            onChangeText={(sets) => onChange({ sets })}
            placeholder="Series"
            keyboardType="numeric"
          />
        </View>
        {records.has('REPS') || records.has('WEIGHT') ? (
          <View style={styles.gridItem}>
            <Field
              label="Reps"
              accessibilityLabel={`Repeticiones de ${exercise.name}`}
              value={exercise.reps}
              onChangeText={(reps) => onChange({ reps })}
              placeholder="Reps"
              keyboardType="numeric"
            />
          </View>
        ) : null}
        {records.has('WEIGHT') ? (
          <View style={styles.gridItem}>
            <Field
              label="Carga"
              accessibilityLabel={`Carga de ${exercise.name}`}
              value={exercise.loadValue}
              onChangeText={(loadValue) => onChange({ loadValue })}
              placeholder="kg"
              keyboardType="decimal-pad"
            />
          </View>
        ) : null}
        {records.has('DISTANCE') || records.has('TIME') ? (
          <View style={styles.gridItem}>
            <Field
              label="Distancia"
              accessibilityLabel={`Distancia de ${exercise.name}`}
              value={exercise.distanceValue}
              onChangeText={(distanceValue) => onChange({ distanceValue })}
              placeholder="m"
              keyboardType="decimal-pad"
            />
          </View>
        ) : null}
        {records.has('DURATION') || records.has('TIME') ? (
          <View style={styles.gridItem}>
            <Field
              label="Duración"
              accessibilityLabel={`Duración de ${exercise.name}`}
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
  scroll: { backgroundColor: colors.background, flex: 1 },
  chips: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  chip: {
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surface,
  },
  selectedChip: {
    borderColor: colors.accent,
    backgroundColor: colors.accentSoft,
  },
  chipText: {
    color: colors.text,
    fontSize: 14,
    fontWeight: '600',
  },
  selectedChipText: {
    color: colors.accent,
  },
  exerciseCard: {
    gap: 12,
  },
  exerciseHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  exerciseName: {
    color: colors.text,
    fontSize: 17,
    fontWeight: '700',
    flex: 1,
  },
  exerciseActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
  },
  moveText: {
    color: colors.muted,
    fontSize: 18,
    fontWeight: '700',
  },
  removeText: {
    color: colors.danger,
    fontSize: 14,
    fontWeight: '700',
  },
  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
    rowGap: 10,
  },
  gridItem: {
    width: '48%',
  },
});
