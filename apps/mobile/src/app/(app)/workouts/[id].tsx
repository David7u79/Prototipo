import { formatDuration, formatRecordValue, formatScore, parseDuration } from '@garfit/domain';
import type { WorkoutDetail, WorkoutType } from '@garfit/types';
import { useFocusEffect, useLocalSearchParams, useRouter } from 'expo-router';
import { useCallback, useState } from 'react';
import { ActivityIndicator, Alert, Pressable, ScrollView, Text, View } from 'react-native';
import { Button, Card, Field, Screen, Title, uiStyles } from '@/components/ui';
import { api, messageFor, useSession } from '@/lib/auth';
import { emptyScore, prefillSets, resultsPayload, type EditableSet } from '@/lib/workouts';

export default function WorkoutScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { request } = useSession();
  const router = useRouter();
  const [workout, setWorkout] = useState<WorkoutDetail | null>(null);
  const [sets, setSets] = useState<Record<string, EditableSet[]>>({});
  const [score, setScore] = useState(emptyScore);
  const [error, setError] = useState<string | null>(null);
  const load = useCallback(async () => {
    if (!id) return;
    try {
      const value = await request(() => api.workouts.get(id));
      setSets(prefillSets(value));
      setScore(value.score ?? emptyScore());
      setWorkout(value);
      setError(null);
    } catch (cause) {
      setError(messageFor(cause));
    }
  }, [id, request]);
  useFocusEffect(
    useCallback(() => {
      void load();
    }, [load]),
  );
  async function save(complete = false) {
    if (!workout) return;
    const results = resultsPayload(sets, score);
    try {
      const value = complete
        ? await request(() => api.workouts.complete(workout.id, { results }))
        : await request(() => api.workouts.saveResults(workout.id, results));
      setWorkout(value);
    } catch (cause) {
      Alert.alert(complete ? 'No se pudo completar' : 'No se pudo guardar', messageFor(cause));
    }
  }
  async function start() {
    if (workout) setWorkout(await request(() => api.workouts.start(workout.id)));
  }
  function remove() {
    if (!workout) return;
    Alert.alert(
      '¿Borrar entrenamiento?',
      'Al borrarlo se retirarán también sus marcas derivadas.',
      [
        { text: 'Cancelar', style: 'cancel' },
        {
          text: 'Borrar',
          style: 'destructive',
          onPress: () =>
            void request(() => api.workouts.remove(workout.id))
              .then(() => router.back())
              .catch((cause: unknown) => Alert.alert('No se pudo borrar', messageFor(cause))),
        },
      ],
    );
  }
  if (error)
    return (
      <Screen>
        <Text>{error}</Text>
        <Button label="Reintentar" onPress={() => void load()} />
      </Screen>
    );
  if (!workout)
    return (
      <Screen>
        <ActivityIndicator />
      </Screen>
    );
  if (workout.status === 'COMPLETED') return <Completed workout={workout} onRemove={remove} />;
  return (
    <ScrollView>
      <Screen>
        <Title>{workout.name}</Title>
        <Text style={uiStyles.muted}>{workout.status === 'DRAFT' ? 'Borrador' : 'En curso'}</Text>
        {workout.status === 'DRAFT' ? (
          <>
            <Summary workout={workout} />
            <Button label="Empezar" onPress={() => void start()} />
          </>
        ) : null}
        {workout.exercises.map((exercise) => (
          <ResultExercise
            key={exercise.id}
            name={exercise.movement.name}
            values={sets[exercise.id] ?? []}
            onChange={(values) => setSets((current) => ({ ...current, [exercise.id]: values }))}
          />
        ))}
        <Score type={workout.workoutType} score={score} onChange={setScore} />
        <Button label="Guardar" onPress={() => void save()} secondary />
        <Button label="Completar" onPress={() => void save(true)} />
        <Button label="Borrar" onPress={remove} secondary />
      </Screen>
    </ScrollView>
  );
}

function Summary({ workout }: { workout: WorkoutDetail }) {
  return (
    <Card>
      <Text>{workout.exercises.map((item) => item.movement.name).join(' · ')}</Text>
    </Card>
  );
}
function ResultExercise({
  name,
  values,
  onChange,
}: {
  name: string;
  values: EditableSet[];
  onChange: (values: EditableSet[]) => void;
}) {
  const edit = (index: number, patch: Partial<EditableSet>) =>
    onChange(values.map((value, i) => (i === index ? { ...value, ...patch } : value)));
  return (
    <Card>
      <Text>{name}</Text>
      {values.map((value, index) => (
        <View key={index} style={{ gap: 6 }}>
          <Text>Serie {index + 1}</Text>
          <Field
            accessibilityLabel={`Reps ${name} ${index + 1}`}
            value={value.reps}
            onChangeText={(reps) => edit(index, { reps })}
            placeholder="Reps"
            keyboardType="numeric"
          />
          <Field
            accessibilityLabel={`Carga ${name} ${index + 1}`}
            value={value.loadValue}
            onChangeText={(loadValue) => edit(index, { loadValue })}
            placeholder="Carga"
            keyboardType="decimal-pad"
          />
          <Field
            accessibilityLabel={`Distancia ${name} ${index + 1}`}
            value={value.distanceValue}
            onChangeText={(distanceValue) => edit(index, { distanceValue })}
            placeholder="Distancia"
            keyboardType="decimal-pad"
          />
          <Field
            accessibilityLabel={`Duración ${name} ${index + 1}`}
            value={value.duration}
            onChangeText={(duration) => edit(index, { duration })}
            placeholder="Duración mm:ss"
            keyboardType="numbers-and-punctuation"
          />
          <Button
            label="Quitar serie"
            onPress={() => onChange(values.filter((_, i) => i !== index))}
            secondary
          />
        </View>
      ))}
      <Button
        label="Agregar serie"
        onPress={() =>
          onChange([
            ...values,
            {
              reps: '',
              loadValue: '',
              loadUnit: 'KILOGRAM',
              distanceValue: '',
              distanceUnit: 'METER',
              duration: '',
            },
          ])
        }
        secondary
      />
    </Card>
  );
}
function Score({
  type,
  score,
  onChange,
}: {
  type: WorkoutType;
  score: ReturnType<typeof emptyScore>;
  onChange: (score: ReturnType<typeof emptyScore>) => void;
}) {
  if (type === 'FOR_TIME')
    return (
      <Card>
        <Text>Score</Text>
        <Field
          accessibilityLabel="Tiempo"
          value={score.timeSeconds === null ? '' : formatDuration(score.timeSeconds)}
          onChangeText={(text) => onChange({ ...emptyScore(), timeSeconds: parseDuration(text) })}
          placeholder="Tiempo mm:ss"
          keyboardType="numbers-and-punctuation"
        />
        <Field
          accessibilityLabel="Reps al límite"
          value={score.repsAtTimeCap === null ? '' : String(score.repsAtTimeCap)}
          onChangeText={(text) =>
            onChange({ ...emptyScore(), repsAtTimeCap: Number(text) || null })
          }
          placeholder="Reps si alcanzaste el límite"
          keyboardType="numeric"
        />
      </Card>
    );
  if (type === 'AMRAP')
    return (
      <Card>
        <Text>Score</Text>
        <View style={{ flexDirection: 'row', gap: 8 }}>
          <Button
            label="−"
            onPress={() =>
              onChange({ ...emptyScore(), rounds: Math.max(0, (score.rounds ?? 0) - 1) })
            }
            secondary
          />
          <Text>{`${score.rounds ?? 0} rondas`}</Text>
          <Button
            label="+"
            onPress={() => onChange({ ...emptyScore(), rounds: (score.rounds ?? 0) + 1 })}
            secondary
          />
        </View>
        <Field
          accessibilityLabel="Reps extra"
          value={score.extraReps === null ? '' : String(score.extraReps)}
          onChangeText={(text) => onChange({ ...score, extraReps: Number(text) || null })}
          placeholder="Reps extra"
          keyboardType="numeric"
        />
      </Card>
    );
  if (type === 'EMOM')
    return (
      <Card>
        <Text>Score</Text>
        <Pressable
          accessibilityRole="switch"
          accessibilityState={{ checked: score.completed === true }}
          onPress={() => onChange({ ...emptyScore(), completed: !score.completed })}
          style={uiStyles.button}
        >
          <Text style={uiStyles.buttonText}>
            {score.completed ? 'Completado' : 'Marcar completado'}
          </Text>
        </Pressable>
      </Card>
    );
  return null;
}
function Completed({ workout, onRemove }: { workout: WorkoutDetail; onRemove: () => void }) {
  return (
    <ScrollView>
      <Screen>
        <Title>Entrenamiento completado</Title>
        <Text>{workout.headline ?? workout.name}</Text>
        <Text>Volumen: {formatRecordValue('WEIGHT', workout.volumeKg)}</Text>
        {workout.exercises.map((exercise) => (
          <Card key={exercise.id}>
            <Text>{exercise.movement.name}</Text>
            {exercise.results.map((set) => (
              <Text key={set.id}>
                {[
                  set.reps && `${set.reps} reps`,
                  set.loadValue && `${set.loadValue} ${set.loadUnit === 'POUND' ? 'lb' : 'kg'}`,
                  set.distanceValue && `${set.distanceValue} ${set.distanceUnit}`,
                  set.durationSeconds && `${set.durationSeconds}s`,
                ]
                  .filter(Boolean)
                  .join(' · ')}
              </Text>
            ))}
          </Card>
        ))}
        {formatScore(workout.workoutType, workout.score ?? emptyScore()) ? (
          <Text>{formatScore(workout.workoutType, workout.score ?? emptyScore())}</Text>
        ) : null}
        <Text>
          {workout.personalRecords.length ? 'Marcas personales' : 'Sin marcas nuevas esta vez'}
        </Text>
        {workout.personalRecords.map((item) => (
          <Text key={item.record.id}>
            {item.previousBest === null
              ? 'Primera marca'
              : formatMark(
                  item.record.recordType,
                  item.previousBest,
                  item.record.normalizedValue,
                  item.change?.absolute ?? null,
                )}
          </Text>
        ))}
        <Button label="Borrar" onPress={onRemove} secondary />
      </Screen>
    </ScrollView>
  );
}

function formatMark(
  type: Parameters<typeof formatRecordValue>[0],
  before: number,
  after: number,
  change: number | null,
) {
  const suffix = change === null ? '' : ` · ${change > 0 ? '+' : ''}${change}`;
  return `${formatRecordValue(type, before)} → ${formatRecordValue(type, after)}${suffix}`;
}
