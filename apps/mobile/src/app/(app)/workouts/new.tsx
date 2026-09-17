import type { WorkoutType } from '@garfit/types';
import { WORKOUT_TYPE_LABELS, createWorkoutSchema } from '@garfit/validation';
import { useRouter } from 'expo-router';
import { useCallback, useEffect, useState } from 'react';
import { Alert, Pressable, ScrollView, Text, View } from 'react-native';
import { Button, Card, Field, Screen, Title, uiStyles } from '@/components/ui';
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
    <ScrollView>
      <Screen>
        <Title>Nuevo entrenamiento</Title>
        <Field
          accessibilityLabel="Nombre"
          value={name}
          onChangeText={setName}
          placeholder="Nombre"
        />
        <Text>Tipo</Text>
        <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
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
                accessibilityLabel="Duración o límite"
                value={duration}
                onChangeText={setDuration}
                placeholder={
                  workoutType === 'FOR_TIME' ? 'Límite mm:ss (opcional)' : 'Duración mm:ss'
                }
                keyboardType="numbers-and-punctuation"
              />
            ) : null}
            {workoutType === 'EMOM' ? (
              <Field
                accessibilityLabel="Intervalo"
                value={interval}
                onChangeText={setInterval}
                placeholder="Intervalo mm:ss"
                keyboardType="numbers-and-punctuation"
              />
            ) : null}
            {workoutType === 'FOR_TIME' || workoutType === 'AMRAP' ? (
              <Field
                accessibilityLabel="Rondas"
                value={rounds}
                onChangeText={setRounds}
                placeholder="Rondas (opcional)"
                keyboardType="numeric"
              />
            ) : null}
            {workoutType === 'FOR_TIME' ? (
              <Field
                accessibilityLabel="Esquema de repeticiones"
                value={repScheme}
                onChangeText={setRepScheme}
                placeholder="Esquema, p. ej. 21-15-9"
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
      style={[uiStyles.button, active ? undefined : uiStyles.secondaryButton]}
    >
      <Text style={active ? uiStyles.buttonText : uiStyles.secondaryButtonText}>{label}</Text>
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
    <Card>
      <Text>{exercise.name}</Text>
      <Field
        accessibilityLabel={`Series de ${exercise.name}`}
        value={exercise.sets}
        onChangeText={(sets) => onChange({ sets })}
        placeholder="Series"
        keyboardType="numeric"
      />
      {records.has('REPS') || records.has('WEIGHT') ? (
        <Field
          accessibilityLabel={`Repeticiones de ${exercise.name}`}
          value={exercise.reps}
          onChangeText={(reps) => onChange({ reps })}
          placeholder="Repeticiones"
          keyboardType="numeric"
        />
      ) : null}
      {records.has('WEIGHT') ? (
        <Field
          accessibilityLabel={`Carga de ${exercise.name}`}
          value={exercise.loadValue}
          onChangeText={(loadValue) => onChange({ loadValue })}
          placeholder="Carga (kg)"
          keyboardType="decimal-pad"
        />
      ) : null}
      {records.has('DISTANCE') || records.has('TIME') ? (
        <Field
          accessibilityLabel={`Distancia de ${exercise.name}`}
          value={exercise.distanceValue}
          onChangeText={(distanceValue) => onChange({ distanceValue })}
          placeholder="Distancia (m)"
          keyboardType="decimal-pad"
        />
      ) : null}
      {records.has('DURATION') || records.has('TIME') ? (
        <Field
          accessibilityLabel={`Duración de ${exercise.name}`}
          value={exercise.duration}
          onChangeText={(duration) => onChange({ duration })}
          placeholder="Duración mm:ss"
          keyboardType="numbers-and-punctuation"
        />
      ) : null}
      <View style={{ flexDirection: 'row', gap: 8 }}>
        <Button label="↑" onPress={() => onMove(-1)} secondary />
        <Button label="↓" onPress={() => onMove(1)} secondary />
        <Button label="Quitar" onPress={onRemove} secondary />
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
