import { formatDuration, formatRecordValue, formatScore, parseDuration } from '@garfit/domain';
import type { WorkoutDetail, WorkoutType } from '@garfit/types';
import type { WorkoutBiometricsInput } from '@garfit/validation';
import { useFocusEffect, useLocalSearchParams, useRouter } from 'expo-router';
import * as SecureStore from 'expo-secure-store';
import { useCallback, useEffect, useState } from 'react';
import { ActivityIndicator, Alert, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { Button, Card, Field, Label, Screen, Stat, Title, uiStyles } from '@/components/ui';
import { colors } from '@/constants/theme';
import { api, messageFor, useSession } from '@/lib/auth';
import {
  ensureReadPermissions,
  healthAvailability,
  readWorkoutBiometrics,
  type HealthAvailability,
} from '@/lib/health';
import { emptyScore, prefillSets, resultsPayload, type EditableSet } from '@/lib/workouts';

export default function WorkoutScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { request } = useSession();
  const router = useRouter();
  const [workout, setWorkout] = useState<WorkoutDetail | null>(null);
  const [sets, setSets] = useState<Record<string, EditableSet[]>>({});
  const [score, setScore] = useState(emptyScore);
  const [error, setError] = useState<string | null>(null);
  const [aiAvailable, setAiAvailable] = useState(false);
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
  useFocusEffect(
    useCallback(() => {
      void request(() => api.ai.status())
        .then((status) => setAiAvailable(status.enabled && status.configured))
        .catch(() => setAiAvailable(false));
    }, [request]),
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
        <Text style={styles.error}>{error}</Text>
        <Button label="Reintentar" onPress={() => void load()} />
      </Screen>
    );
  if (!workout)
    return (
      <Screen>
        <ActivityIndicator color={colors.accent} />
      </Screen>
    );
  if (workout.status === 'COMPLETED')
    return (
      <Completed
        workout={workout}
        aiAvailable={aiAvailable}
        onWorkoutUpdate={setWorkout}
        onAnalyze={() =>
          router.push({
            pathname: '/(app)/ai',
            params: { action: 'workout', id: workout.id },
          })
        }
        onRemove={remove}
      />
    );
  return (
    <ScrollView style={styles.scroll}>
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
        <Button label="Borrar" onPress={remove} danger />
      </Screen>
    </ScrollView>
  );
}

function Summary({ workout }: { workout: WorkoutDetail }) {
  return (
    <Card>
      <Text style={styles.cardText}>{workout.exercises.map((item) => item.movement.name).join(' · ')}</Text>
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
    <View style={styles.exerciseSection}>
      <Text style={styles.exerciseTitle}>{name}</Text>
      {values.map((value, index) => (
        <Card key={index} style={styles.setCard}>
          <View style={styles.setHeader}>
            <Label>{`Serie ${index + 1}`}</Label>
            <Pressable
              accessibilityRole="button"
              accessibilityLabel={`Quitar serie ${index + 1}`}
              hitSlop={12}
              onPress={() => onChange(values.filter((_, i) => i !== index))}
            >
              <Text style={styles.removeSetText}>Quitar</Text>
            </Pressable>
          </View>
          <View style={styles.grid}>
            <View style={styles.gridItem}>
              <Field
                label="Reps"
                accessibilityLabel={`Reps ${name} ${index + 1}`}
                value={value.reps}
                onChangeText={(reps) => edit(index, { reps })}
                placeholder="Reps"
                keyboardType="numeric"
              />
            </View>
            <View style={styles.gridItem}>
              <Field
                label="Carga"
                accessibilityLabel={`Carga ${name} ${index + 1}`}
                value={value.loadValue}
                onChangeText={(loadValue) => edit(index, { loadValue })}
                placeholder="Carga"
                keyboardType="decimal-pad"
              />
            </View>
            <View style={styles.gridItem}>
              <Field
                label="Distancia"
                accessibilityLabel={`Distancia ${name} ${index + 1}`}
                value={value.distanceValue}
                onChangeText={(distanceValue) => edit(index, { distanceValue })}
                placeholder="Distancia"
                keyboardType="decimal-pad"
              />
            </View>
            <View style={styles.gridItem}>
              <Field
                label="Duración"
                accessibilityLabel={`Duración ${name} ${index + 1}`}
                value={value.duration}
                onChangeText={(duration) => edit(index, { duration })}
                placeholder="mm:ss"
                keyboardType="numbers-and-punctuation"
              />
            </View>
          </View>
        </Card>
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
    </View>
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
        <Text style={styles.cardTitle}>Score</Text>
        <Field
          label="Tiempo"
          accessibilityLabel="Tiempo"
          value={score.timeSeconds === null ? '' : formatDuration(score.timeSeconds)}
          onChangeText={(text) => onChange({ ...emptyScore(), timeSeconds: parseDuration(text) })}
          placeholder="mm:ss"
          keyboardType="numbers-and-punctuation"
        />
        <Field
          label="Reps al límite"
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
        <Text style={styles.cardTitle}>Score</Text>
        <View style={styles.roundRow}>
          <Button
            label="−"
            onPress={() =>
              onChange({ ...emptyScore(), rounds: Math.max(0, (score.rounds ?? 0) - 1) })
            }
            secondary
          />
          <Text style={styles.roundsText}>{`${score.rounds ?? 0} rondas`}</Text>
          <Button
            label="+"
            onPress={() => onChange({ ...emptyScore(), rounds: (score.rounds ?? 0) + 1 })}
            secondary
          />
        </View>
        <Field
          label="Reps extra"
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
        <Text style={styles.cardTitle}>Score</Text>
        <Button
          label={score.completed ? 'Completado' : 'Marcar completado'}
          onPress={() => onChange({ ...emptyScore(), completed: !score.completed })}
          secondary={!score.completed}
        />
      </Card>
    );
  return null;
}

function Completed({
  workout,
  onWorkoutUpdate,
  onRemove,
  aiAvailable,
  onAnalyze,
}: {
  workout: WorkoutDetail;
  onWorkoutUpdate: (workout: WorkoutDetail) => void;
  onRemove: () => void;
  aiAvailable: boolean;
  onAnalyze: () => void;
}) {
  const { request } = useSession();
  const [availability, setAvailability] = useState<HealthAvailability>('unavailable');
  const [preview, setPreview] = useState<WorkoutBiometricsInput | null>(null);
  const [noDataFound, setNoDataFound] = useState(false);
  const [loading, setLoading] = useState(false);
  const [healthError, setHealthError] = useState<string | null>(null);

  useEffect(() => {
    let active = true;
    void healthAvailability()
      .then((status) => {
        if (active) setAvailability(status);
      })
      .catch(() => {
        if (active) setAvailability('unavailable');
      });
    return () => {
      active = false;
    };
  }, []);

  async function performRead() {
    setLoading(true);
    setHealthError(null);
    setNoDataFound(false);
    try {
      // Distingue permiso denegado de "sin datos": readWorkoutBiometrics devuelve null en ambos.
      if (!(await ensureReadPermissions())) {
        setHealthError('Concede a GarFit permiso de lectura en Health Connect para vincular los datos.');
        return;
      }
      const start = workout.startedAt ?? workout.createdAt;
      const end = workout.completedAt ?? workout.updatedAt;
      const data = await readWorkoutBiometrics(start, end);
      if (data) {
        setPreview(data);
      } else {
        setPreview(null);
        setNoDataFound(true);
      }
    } catch (cause) {
      setHealthError(messageFor(cause));
    } finally {
      setLoading(false);
    }
  }

  async function handleLink() {
    try {
      const consentGiven = await SecureStore.getItemAsync('health-consent-v1');
      if (!consentGiven) {
        Alert.alert(
          'Datos de salud',
          'GarFit leerá de Health Connect tu frecuencia cardíaca, calorías activas y sesiones de ejercicio durante este entrenamiento. Sólo se guarda el resumen (media, máxima y calorías). Puedes quitarlo cuando quieras.',
          [
            { text: 'Cancelar', style: 'cancel' },
            {
              text: 'Continuar',
              onPress: () => {
                void SecureStore.setItemAsync('health-consent-v1', 'true')
                  .then(() => performRead())
                  .catch((cause) => setHealthError(messageFor(cause)));
              },
            },
          ],
        );
        return;
      }
      await performRead();
    } catch (cause) {
      setHealthError(messageFor(cause));
    }
  }

  async function handleSavePreview() {
    if (!preview) return;
    setLoading(true);
    setHealthError(null);
    try {
      const updated = await request(() =>
        api.workouts.putWorkoutBiometrics(workout.id, preview),
      );
      onWorkoutUpdate(updated);
      setPreview(null);
    } catch (cause) {
      setHealthError(messageFor(cause));
    } finally {
      setLoading(false);
    }
  }

  function handleDiscardPreview() {
    setPreview(null);
    setNoDataFound(false);
  }

  async function handleRemoveBiometrics() {
    setLoading(true);
    setHealthError(null);
    try {
      await request(() => api.workouts.deleteWorkoutBiometrics(workout.id));
      onWorkoutUpdate({ ...workout, biometrics: null });
      setPreview(null);
    } catch (cause) {
      setHealthError(messageFor(cause));
    } finally {
      setLoading(false);
    }
  }

  return (
    <ScrollView style={styles.scroll}>
      <Screen>
        <Title>Entrenamiento completado</Title>
        <Text style={styles.cardTitle}>{workout.headline ?? workout.name}</Text>
        <Text style={uiStyles.muted}>Volumen: {formatRecordValue('WEIGHT', workout.volumeKg)}</Text>

        {availability === 'needs-update' ? (
          <Card>
            <Text style={styles.cardTitle}>Datos del reloj</Text>
            <Text style={styles.cardText}>
              Actualiza Health Connect para vincular datos del reloj.
            </Text>
          </Card>
        ) : availability === 'available' ? (
          <Card>
            <Text style={styles.cardTitle}>Datos del reloj</Text>
            {healthError ? <Text style={styles.error}>{healthError}</Text> : null}

            {workout.biometrics ? (
              <>
                <View style={styles.statRow}>
                  <Stat
                    value={workout.biometrics.avgHeartRateBpm ?? '—'}
                    label="FC media (lpm)"
                  />
                  <Stat
                    value={workout.biometrics.maxHeartRateBpm ?? '—'}
                    label="FC máx (lpm)"
                  />
                  <Stat
                    value={workout.biometrics.activeCaloriesKcal ?? '—'}
                    label="Calorías (kcal)"
                  />
                </View>
                <Button
                  label="Quitar datos del reloj"
                  onPress={() => void handleRemoveBiometrics()}
                  disabled={loading}
                  danger
                />
              </>
            ) : preview ? (
              <>
                <View style={styles.statRow}>
                  <Stat value={preview.avgHeartRateBpm ?? '—'} label="FC media (lpm)" />
                  <Stat value={preview.maxHeartRateBpm ?? '—'} label="FC máx (lpm)" />
                  <Stat value={preview.activeCaloriesKcal ?? '—'} label="Calorías (kcal)" />
                </View>
                <View style={styles.buttonRow}>
                  <View style={styles.flexHalf}>
                    <Button
                      label="Guardar"
                      onPress={() => void handleSavePreview()}
                      disabled={loading}
                    />
                  </View>
                  <View style={styles.flexHalf}>
                    <Button
                      label="Descartar"
                      onPress={handleDiscardPreview}
                      disabled={loading}
                      secondary
                    />
                  </View>
                </View>
              </>
            ) : (
              <>
                <Text style={styles.cardText}>
                  {noDataFound
                    ? 'No se encontraron datos del reloj para este entrenamiento.'
                    : 'Vincula la frecuencia cardíaca y las calorías registradas por tu reloj.'}
                </Text>
                <Button
                  label="Vincular desde Health Connect"
                  onPress={() => void handleLink()}
                  disabled={loading}
                />
              </>
            )}
          </Card>
        ) : null}

        {workout.exercises.map((exercise) => (
          <Card key={exercise.id}>
            <Text style={styles.cardTitle}>{exercise.movement.name}</Text>
            {exercise.results.map((set) => (
              <Text key={set.id} style={styles.cardText}>
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
          <Text style={styles.cardTitle}>{formatScore(workout.workoutType, workout.score ?? emptyScore())}</Text>
        ) : null}
        <Text style={styles.cardTitle}>
          {workout.personalRecords.length ? 'Marcas personales' : 'Sin marcas nuevas esta vez'}
        </Text>
        {workout.personalRecords.map((item) => (
          <Text key={item.record.id} style={styles.cardText}>
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
        {aiAvailable ? <Button label="Analizar entrenamiento" onPress={onAnalyze} secondary /> : null}
        <Button label="Borrar" onPress={onRemove} danger />
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

const styles = StyleSheet.create({
  scroll: { backgroundColor: colors.background, flex: 1 },
  exerciseSection: { gap: 12 },
  exerciseTitle: { color: colors.text, fontSize: 20, fontWeight: '700' },
  setCard: { gap: 12 },
  setHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  removeSetText: {
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
  cardTitle: { color: colors.text, fontSize: 17, fontWeight: '700' },
  cardText: { color: colors.text, fontSize: 15 },
  roundRow: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  roundsText: { color: colors.text, fontSize: 18, fontWeight: '700' },
  error: { color: colors.danger, fontSize: 15 },
  statRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: 12,
    marginVertical: 4,
  },
  buttonRow: {
    flexDirection: 'row',
    gap: 12,
    marginTop: 4,
  },
  flexHalf: {
    flex: 1,
  },
});
