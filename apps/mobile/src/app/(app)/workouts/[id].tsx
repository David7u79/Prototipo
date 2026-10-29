import { formatDuration, formatRecordValue, formatScore, parseDuration } from '@garfit/domain';
import type { WorkoutDetail, WorkoutType } from '@garfit/types';
import type { WorkoutBiometricsInput } from '@garfit/validation';
import { useFocusEffect, useLocalSearchParams, useRouter } from 'expo-router';
import * as SecureStore from 'expo-secure-store';
import { useCallback, useEffect, useState } from 'react';
import { ActivityIndicator, Alert, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { Button, Card, Chip, Field, Icon, SectionHeader, Stat, Title, uiStyles } from '@/components/ui';
import { colors, space, type } from '@/constants/theme';
import { api, messageFor, useSession } from '@/lib/auth';
import {
  ensureReadPermissions,
  healthAvailability,
  readWorkoutBiometrics,
  type HealthAvailability,
} from '@/lib/health';
import { forgetWearSummary, readWearBiometrics, wearBridgeAvailable } from '@/lib/wear';
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
      <ScrollView contentContainerStyle={uiStyles.scroll} style={styles.scroll}>
        <Text style={styles.error}>{error}</Text>
        <Button label="Reintentar" onPress={() => void load()} />
      </ScrollView>
    );

  if (!workout)
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator color={colors.accent} size="large" />
      </View>
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
    <ScrollView style={styles.scroll} contentContainerStyle={uiStyles.scroll}>
      <Card hero style={styles.heroCard}>
        <View style={styles.heroHeader}>
          <Title>{workout.name}</Title>
          <Chip
            label={workout.status === 'DRAFT' ? 'Borrador' : 'En curso'}
            tone={workout.status === 'IN_PROGRESS' ? 'success' : 'neutral'}
          />
        </View>
        <Text style={uiStyles.muted}>
          {workout.performedOn ?? 'Hoy'} · {workout.exercises.length} movimientos
        </Text>
        {workout.status === 'DRAFT' ? (
          <Button label="Empezar entrenamiento" onPress={() => void start()} />
        ) : null}
      </Card>

      <SectionHeader title="Ejercicios y series" />

      {workout.exercises.map((exercise) => (
        <ResultExercise
          key={exercise.id}
          name={exercise.movement.name}
          values={sets[exercise.id] ?? []}
          onChange={(values) => setSets((current) => ({ ...current, [exercise.id]: values }))}
        />
      ))}

      <Score type={workout.workoutType} score={score} onChange={setScore} />

      <View style={styles.actionsGroup}>
        <Button label="Completar entrenamiento" onPress={() => void save(true)} />
        <Button label="Guardar progreso" onPress={() => void save()} variant="secondary" />
        <Button label="Borrar entrenamiento" onPress={remove} variant="danger" />
      </View>
    </ScrollView>
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
    <Card style={styles.exerciseCard}>
      <Text style={styles.exerciseTitle}>{name}</Text>
      {values.map((value, index) => (
        <View key={index} style={styles.setRow}>
          <View style={styles.setHeader}>
            <Chip label={`Serie ${index + 1}`} tone="accent" />
            <Pressable
              accessibilityRole="button"
              accessibilityLabel={`Quitar serie ${index + 1}`}
              hitSlop={12}
              onPress={() => onChange(values.filter((_, i) => i !== index))}
              style={({ pressed }) => [styles.deleteBtn, pressed && uiStyles.pressed]}
            >
              <Icon name={{ ios: 'trash', android: 'delete' }} size={16} color={colors.danger} />
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
                label="Carga (kg)"
                accessibilityLabel={`Carga ${name} ${index + 1}`}
                value={value.loadValue}
                onChangeText={(loadValue) => edit(index, { loadValue })}
                placeholder="kg"
                keyboardType="decimal-pad"
              />
            </View>
            <View style={styles.gridItem}>
              <Field
                label="Distancia (m)"
                accessibilityLabel={`Distancia ${name} ${index + 1}`}
                value={value.distanceValue}
                onChangeText={(distanceValue) => edit(index, { distanceValue })}
                placeholder="m"
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
        variant="secondary"
      />
    </Card>
  );
}

function Score({
  type: workoutType,
  score,
  onChange,
}: {
  type: WorkoutType;
  score: ReturnType<typeof emptyScore>;
  onChange: (score: ReturnType<typeof emptyScore>) => void;
}) {
  if (workoutType === 'FOR_TIME')
    return (
      <Card>
        <Text style={styles.cardTitle}>Resultado</Text>
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
  if (workoutType === 'AMRAP')
    return (
      <Card>
        <Text style={styles.cardTitle}>Resultado</Text>
        <View style={styles.roundRow}>
          <Button
            label="−"
            onPress={() =>
              onChange({ ...emptyScore(), rounds: Math.max(0, (score.rounds ?? 0) - 1) })
            }
            variant="secondary"
          />
          <Text style={styles.roundsText}>{`${score.rounds ?? 0} rondas`}</Text>
          <Button
            label="+"
            onPress={() => onChange({ ...emptyScore(), rounds: (score.rounds ?? 0) + 1 })}
            variant="secondary"
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
  if (workoutType === 'EMOM')
    return (
      <Card>
        <Text style={styles.cardTitle}>Resultado</Text>
        <Button
          label={score.completed ? 'Completado' : 'Marcar completado'}
          onPress={() => onChange({ ...emptyScore(), completed: !score.completed })}
          variant={score.completed ? 'primary' : 'secondary'}
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
      const start = workout.startedAt ?? workout.createdAt;
      const end = workout.completedAt ?? workout.updatedAt;

      if (wearBridgeAvailable()) {
        const wearData = await readWearBiometrics(start, end);
        if (wearData) {
          setPreview(wearData);
          return;
        }
      }

      if (availability === 'available') {
        if (!(await ensureReadPermissions())) {
          setHealthError('Concede a GarFit permiso de lectura en Health Connect para vincular los datos.');
          return;
        }
        const data = await readWorkoutBiometrics(start, end);
        if (data) {
          setPreview(data);
          return;
        }
      }

      setPreview(null);
      setNoDataFound(true);
    } catch (cause) {
      setHealthError(messageFor(cause));
    } finally {
      setLoading(false);
    }
  }

  async function handleLink() {
    try {
      const consentGiven = await SecureStore.getItemAsync('health-consent-v2');
      if (!consentGiven) {
        Alert.alert(
          'Datos de salud',
          'GarFit leerá del reloj (app GarFit Wear o Health Connect) tu frecuencia cardíaca, calorías activas y sesiones de ejercicio durante este entrenamiento. Sólo se guarda el resumen (media, máxima y calorías). Puedes quitarlo cuando quieras.',
          [
            { text: 'Cancelar', style: 'cancel' },
            {
              text: 'Continuar',
              onPress: () => {
                void SecureStore.setItemAsync('health-consent-v2', 'true')
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
    const savingPreview = preview;
    setLoading(true);
    setHealthError(null);
    try {
      const updated = await request(() =>
        api.workouts.putWorkoutBiometrics(workout.id, savingPreview),
      );
      onWorkoutUpdate(updated);
      setPreview(null);
      if (savingPreview.source === 'WEAR_OS' && savingPreview.externalId) {
        try {
          await forgetWearSummary(savingPreview.externalId);
        } catch {
          // Si falla, no mostrar error
        }
      }
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

  const hasWearBridge = wearBridgeAvailable();
  const showBiometricsCard = availability === 'available' || hasWearBridge;
  const showNeedsUpdate = availability === 'needs-update' && !hasWearBridge;

  const totalSets = workout.exercises.reduce((sum, e) => sum + e.results.length, 0);
  const formattedScore = formatScore(workout.workoutType, workout.score ?? emptyScore());

  return (
    <ScrollView style={styles.scroll} contentContainerStyle={uiStyles.scroll}>
      {/* Card hero: nombre, fecha, chip completado */}
      <Card hero style={styles.heroCard}>
        <View style={styles.heroHeader}>
          <Title>{workout.headline ?? workout.name}</Title>
          <Chip label="Completado" tone="success" />
        </View>
        <Text style={uiStyles.muted}>
          {workout.performedOn ?? 'Completado'} · {workout.workoutType}
        </Text>

        {/* Fila de stats: volumen UNA sola vez */}
        <View style={styles.statRow}>
          <Stat
            label="Volumen"
            value={formatRecordValue('WEIGHT', workout.volumeKg)}
            tone="metric"
          />
          <Stat
            label="Series"
            value={totalSets}
            tone="accent"
          />
          {formattedScore ? (
            <Stat
              label="Resultado"
              value={formattedScore}
              tone="metric"
            />
          ) : null}
        </View>
      </Card>

      {/* Card Datos del reloj */}
      {showNeedsUpdate ? (
        <Card>
          <SectionHeader title="Datos del reloj" />
          <Text style={styles.cardText}>
            Actualiza Health Connect para vincular datos del reloj.
          </Text>
        </Card>
      ) : showBiometricsCard ? (
        <Card style={styles.wearCard}>
          <View style={styles.wearHeader}>
            <View style={styles.wearTitleRow}>
              <Icon name={{ ios: 'heart.fill', android: 'favorite' }} size={22} color={colors.danger} />
              <Text style={styles.cardTitle}>Datos del reloj</Text>
            </View>
          </View>

          {healthError ? <Text style={styles.error}>{healthError}</Text> : null}

          {workout.biometrics ? (
            <>
              <View style={styles.statRow}>
                <Stat
                  value={workout.biometrics.avgHeartRateBpm ?? '—'}
                  label="FC media (lpm)"
                  tone="danger"
                />
                <Stat
                  value={workout.biometrics.maxHeartRateBpm ?? '—'}
                  label="FC máx (lpm)"
                  tone="danger"
                />
                <Stat
                  value={workout.biometrics.activeCaloriesKcal ?? '—'}
                  label="Calorías (kcal)"
                  tone="metric"
                />
              </View>
              <Text style={uiStyles.muted}>
                {workout.biometrics.source === 'WEAR_OS'
                  ? 'Origen: GarFit Wear'
                  : 'Origen: Health Connect'}
              </Text>
              <Button
                label="Quitar datos del reloj"
                onPress={() => void handleRemoveBiometrics()}
                disabled={loading}
                variant="danger"
              />
            </>
          ) : preview ? (
            <>
              <View style={styles.statRow}>
                <Stat value={preview.avgHeartRateBpm ?? '—'} label="FC media (lpm)" tone="danger" />
                <Stat value={preview.maxHeartRateBpm ?? '—'} label="FC máx (lpm)" tone="danger" />
                <Stat value={preview.activeCaloriesKcal ?? '—'} label="Calorías (kcal)" tone="metric" />
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
                    variant="secondary"
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
                label="Vincular datos del reloj"
                onPress={() => void handleLink()}
                disabled={loading}
                variant="secondary"
              />
            </>
          )}
        </Card>
      ) : null}

      {/* Ejercicios y tabla de series */}
      <SectionHeader title="Ejercicios realizados" />
      {workout.exercises.map((exercise) => (
        <Card key={exercise.id} style={styles.exerciseCard}>
          <Text style={styles.cardTitle}>{exercise.movement.name}</Text>
          <View style={styles.setsTable}>
            {exercise.results.map((set, sIdx) => {
              const details = [
                set.reps ? `${set.reps} reps` : null,
                set.loadValue ? `${set.loadValue} ${set.loadUnit === 'POUND' ? 'lb' : 'kg'}` : null,
                set.distanceValue ? `${set.distanceValue} ${set.distanceUnit}` : null,
                set.durationSeconds ? `${set.durationSeconds}s` : null,
              ]
                .filter(Boolean)
                .join(' · ');

              return (
                <View key={set.id} style={styles.setResultRow}>
                  <Text style={styles.setResultIndex}>S{sIdx + 1}</Text>
                  <Text style={styles.setResultDetails}>{details || 'Completada'}</Text>
                </View>
              );
            })}
          </View>
        </Card>
      ))}

      {/* Marcas personales obtenidas */}
      <Card style={styles.prCard}>
        <Text style={styles.cardTitle}>
          {workout.personalRecords.length ? 'Marcas personales conseguidas' : 'Sin marcas nuevas esta vez'}
        </Text>
        {workout.personalRecords.map((item) => (
          <Text key={item.record.id} style={styles.prItem}>
            🏆{' '}
            {item.previousBest === null
              ? 'Primera marca registrada'
              : formatMark(
                  item.record.recordType,
                  item.previousBest,
                  item.record.normalizedValue,
                  item.change?.absolute ?? null,
                )}
          </Text>
        ))}
      </Card>

      <View style={styles.actionsGroup}>
        {aiAvailable ? (
          <Button
            label="Analizar entrenamiento con IA"
            onPress={onAnalyze}
            variant="secondary"
            icon={{ ios: 'sparkles', android: 'auto_awesome' }}
          />
        ) : null}
        <Button label="Borrar entrenamiento" onPress={onRemove} variant="danger" />
      </View>
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
  scroll: {
    backgroundColor: colors.background,
    flex: 1,
  },
  loadingContainer: {
    flex: 1,
    backgroundColor: colors.background,
    alignItems: 'center',
    justifyContent: 'center',
  },
  heroCard: {
    gap: space.md,
  },
  heroHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: space.sm,
  },
  exerciseCard: {
    gap: space.md,
  },
  exerciseTitle: {
    color: colors.text,
    ...type.headline,
  },
  setRow: {
    gap: space.sm,
    paddingVertical: space.xs,
  },
  setHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  deleteBtn: {
    padding: 6,
  },
  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: space.sm,
  },
  gridItem: {
    flex: 1,
    minWidth: '45%',
  },
  cardTitle: {
    color: colors.text,
    ...type.headline,
  },
  cardText: {
    color: colors.text,
    ...type.body,
  },
  roundRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: space.md,
  },
  roundsText: {
    color: colors.text,
    fontSize: 18,
    fontWeight: '700',
  },
  error: {
    color: colors.danger,
    ...type.body,
  },
  statRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: space.md,
    marginTop: space.xs,
  },
  buttonRow: {
    flexDirection: 'row',
    gap: space.md,
    marginTop: space.xs,
  },
  flexHalf: {
    flex: 1,
  },
  wearCard: {
    gap: space.md,
  },
  wearHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  wearTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: space.sm,
  },
  setsTable: {
    gap: space.xs,
  },
  setResultRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: space.md,
    paddingVertical: 4,
  },
  setResultIndex: {
    color: colors.muted,
    fontSize: 14,
    fontWeight: '700',
    width: 28,
  },
  setResultDetails: {
    color: colors.metric,
    fontSize: 15,
    fontWeight: '600',
    fontVariant: ['tabular-nums'],
    flex: 1,
  },
  prCard: {
    gap: space.sm,
  },
  prItem: {
    color: colors.text,
    fontSize: 15,
  },
  actionsGroup: {
    gap: space.md,
    marginTop: space.sm,
  },
});
