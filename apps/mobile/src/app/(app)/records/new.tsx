import { displayUnitFor, type DistanceUnit, type RecordType } from '@garfit/domain';
import { RECORD_TYPE_LABELS, createRecordSchema } from '@garfit/validation';
import type { MovementDetail } from '@garfit/types';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useEffect, useState } from 'react';
import { ActivityIndicator, ScrollView, StyleSheet, Text, View } from 'react-native';
import { Button, Card, Chip, Field, Label, Title, uiStyles } from '@/components/ui';
import { colors, space, type as typography } from '@/constants/theme';
import { api, messageFor, useSession } from '@/lib/auth';
import { parseRecordValue } from '@/lib/presentation';

function today(offset = 0): string {
  const date = new Date();
  date.setDate(date.getDate() + offset);
  return date.toISOString().slice(0, 10);
}

export default function NewRecordScreen() {
  const { movement: slug } = useLocalSearchParams<{ movement: string }>();
  const { profile, request } = useSession();
  const router = useRouter();
  const [movement, setMovement] = useState<MovementDetail | null>(null);
  const [type, setType] = useState<RecordType | null>(null);
  const [value, setValue] = useState('');
  const [distanceValue, setDistanceValue] = useState('');
  const [distanceUnit, setDistanceUnit] = useState<DistanceUnit>('KILOMETER');
  const [repetitions, setRepetitions] = useState('1');
  const [performedAt, setPerformedAt] = useState(today());
  const [notes, setNotes] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (slug)
      void request(() => api.movements.get(slug))
        .then((item) => {
          setMovement(item);
          setType(item.recordTypes[0] ?? null);
        })
        .catch((cause: unknown) => setError(messageFor(cause)));
  }, [request, slug]);

  const unit = type ? displayUnitFor(type, profile?.preferredUnits ?? 'METRIC') : null;

  async function submit() {
    if (!type || !unit || !slug) return;
    const parsedValue = parseRecordValue(type, value);
    const parsed = createRecordSchema.safeParse({
      movementSlug: slug,
      recordType: type,
      value: parsedValue,
      unit,
      repetitions: type === 'WEIGHT' ? Number(repetitions) : null,
      distanceValue: type === 'TIME' ? parseRecordValue('DISTANCE', distanceValue) : null,
      distanceUnit: type === 'TIME' ? distanceUnit : null,
      performedAt,
      notes: notes.trim() || null,
    });
    if (!parsed.success) {
      setError(parsed.error.issues[0]?.message ?? 'Revisa los campos.');
      return;
    }
    setSaving(true);
    setError(null);
    try {
      await request(() => api.records.create(parsed.data));
      router.replace(`/(app)/records/${slug}`);
    } catch (cause) {
      setError(messageFor(cause));
    } finally {
      setSaving(false);
    }
  }

  if (!movement || !type || !unit)
    return (
      <ScrollView contentContainerStyle={uiStyles.scroll} style={styles.scroll}>
        {error ? (
          <Text style={styles.errorText}>{error}</Text>
        ) : (
          <View style={styles.loadingContainer}>
            <ActivityIndicator color={colors.accent} size="large" />
          </View>
        )}
      </ScrollView>
    );

  return (
    <ScrollView contentContainerStyle={uiStyles.scroll} style={styles.scroll}>
      <Card hero style={styles.heroCard}>
        <Title>{movement.name}</Title>
        <Label>Tipo de marca</Label>
        <View style={styles.chipsRow}>
          {movement.recordTypes.map((recordType) => (
            <Chip
              key={recordType}
              label={RECORD_TYPE_LABELS[recordType]}
              selected={type === recordType}
              onPress={() => setType(recordType)}
            />
          ))}
        </View>
      </Card>

      <Card style={styles.formCard}>
        <Field
          label={
            type === 'TIME' || type === 'DURATION'
              ? 'Tiempo (mm:ss o h:mm:ss)'
              : `Valor (${unit === 'KILOGRAM' ? 'kg' : unit === 'POUND' ? 'lb' : unit})`
          }
          accessibilityLabel="Valor de la marca"
          value={value}
          onChangeText={setValue}
          keyboardType={
            type === 'TIME' || type === 'DURATION' ? 'numbers-and-punctuation' : 'decimal-pad'
          }
          placeholder={type === 'TIME' || type === 'DURATION' ? '01:30' : '0'}
        />

        {type === 'WEIGHT' ? (
          <Field
            label="Repeticiones"
            accessibilityLabel="Repeticiones"
            value={repetitions}
            onChangeText={setRepetitions}
            keyboardType="number-pad"
            placeholder="1"
          />
        ) : null}

        {type === 'TIME' ? (
          <View style={styles.block}>
            <Field
              label="Distancia cronometrada"
              accessibilityLabel="Distancia cronometrada"
              value={distanceValue}
              onChangeText={setDistanceValue}
              keyboardType="decimal-pad"
              placeholder="5"
            />
            <View style={styles.chipsRow}>
              {(['METER', 'KILOMETER', 'MILE'] as const).map((candidate) => (
                <Chip
                  key={candidate}
                  label={distanceLabel(candidate)}
                  selected={distanceUnit === candidate}
                  onPress={() => setDistanceUnit(candidate)}
                />
              ))}
            </View>
          </View>
        ) : null}

        <View style={styles.block}>
          <Field
            label="Fecha del registro"
            accessibilityLabel="Fecha"
            value={performedAt}
            onChangeText={setPerformedAt}
            placeholder="AAAA-MM-DD"
          />
          <View style={styles.dateButtonsRow}>
            <Button label="Hoy" variant="secondary" onPress={() => setPerformedAt(today())} />
            <Button label="Ayer" variant="secondary" onPress={() => setPerformedAt(today(-1))} />
          </View>
        </View>

        <Field
          label="Notas (opcional)"
          accessibilityLabel="Notas"
          value={notes}
          onChangeText={setNotes}
          placeholder="Comentarios sobre la serie o sensaciones…"
          multiline
          maxLength={500}
        />

        {error ? <Text style={styles.errorText}>{error}</Text> : null}

        <Button
          label={saving ? 'Guardando marca…' : 'Guardar marca'}
          disabled={saving}
          onPress={() => void submit()}
        />
      </Card>
    </ScrollView>
  );
}

function distanceLabel(unit: DistanceUnit): string {
  return unit === 'METER' ? 'Metros (m)' : unit === 'KILOMETER' ? 'Kilómetros (km)' : 'Millas (mi)';
}

const styles = StyleSheet.create({
  scroll: {
    backgroundColor: colors.background,
    flex: 1,
  },
  loadingContainer: {
    alignItems: 'center',
    paddingVertical: space.xl,
  },
  heroCard: {
    gap: space.md,
  },
  formCard: {
    gap: space.md,
  },
  block: {
    gap: space.sm,
  },
  chipsRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: space.sm,
  },
  dateButtonsRow: {
    flexDirection: 'row',
    gap: space.sm,
  },
  errorText: {
    color: colors.danger,
    ...typography.body,
  },
});
