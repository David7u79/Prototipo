import { displayUnitFor, type DistanceUnit, type RecordType } from '@garfit/domain';
import { RECORD_TYPE_LABELS, createRecordSchema } from '@garfit/validation';
import type { MovementDetail } from '@garfit/types';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useEffect, useState } from 'react';
import { Pressable, ScrollView, Text, View } from 'react-native';
import { Button, Field, Title } from '@/components/ui';
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
  if (!movement || !type || !unit) return <Text>{error ?? 'Cargando movimiento…'}</Text>;
  return (
    <ScrollView contentContainerStyle={{ gap: 14, padding: 20 }}>
      <Title>Registrar marca</Title>
      <Text>{movement.name}</Text>
      <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
        {movement.recordTypes.map((recordType) => (
          <Pressable
            accessibilityRole="button"
            accessibilityState={{ selected: type === recordType }}
            key={recordType}
            onPress={() => setType(recordType)}
          >
            <Text>{RECORD_TYPE_LABELS[recordType]}</Text>
          </Pressable>
        ))}
      </View>
      <Text>
        {type === 'TIME' || type === 'DURATION'
          ? 'Tiempo (mm:ss o h:mm:ss)'
          : `Valor (${unit === 'KILOGRAM' ? 'kg' : unit === 'POUND' ? 'lb' : unit})`}
      </Text>
      <Field
        accessibilityLabel="Valor de la marca"
        value={value}
        onChangeText={setValue}
        keyboardType={
          type === 'TIME' || type === 'DURATION' ? 'numbers-and-punctuation' : 'decimal-pad'
        }
        placeholder={type === 'TIME' || type === 'DURATION' ? '01:30' : '0'}
      />
      {type === 'WEIGHT' ? (
        <>
          <Text>Repeticiones</Text>
          <Field
            accessibilityLabel="Repeticiones"
            value={repetitions}
            onChangeText={setRepetitions}
            keyboardType="number-pad"
          />
        </>
      ) : null}
      {type === 'TIME' ? (
        <>
          <Text>Distancia cronometrada</Text>
          <Field
            accessibilityLabel="Distancia cronometrada"
            value={distanceValue}
            onChangeText={setDistanceValue}
            keyboardType="decimal-pad"
            placeholder="5"
          />
          <View style={{ flexDirection: 'row', gap: 8 }}>
            {(['METER', 'KILOMETER', 'MILE'] as const).map((candidate) => (
              <Button
                key={candidate}
                label={distanceLabel(candidate)}
                onPress={() => setDistanceUnit(candidate)}
                secondary={distanceUnit !== candidate}
              />
            ))}
          </View>
        </>
      ) : null}
      <Text>Fecha</Text>
      <Field
        accessibilityLabel="Fecha"
        value={performedAt}
        onChangeText={setPerformedAt}
        placeholder="AAAA-MM-DD"
      />
      <View style={{ flexDirection: 'row', gap: 8 }}>
        <Button label="Hoy" secondary onPress={() => setPerformedAt(today())} />
        <Button label="Ayer" secondary onPress={() => setPerformedAt(today(-1))} />
      </View>
      <Text>Notas (opcional)</Text>
      <Field
        accessibilityLabel="Notas"
        value={notes}
        onChangeText={setNotes}
        multiline
        maxLength={500}
      />
      {error ? <Text>{error}</Text> : null}
      <Button
        label={saving ? 'Guardando…' : 'Guardar marca'}
        disabled={saving}
        onPress={() => void submit()}
      />
    </ScrollView>
  );
}

function distanceLabel(unit: DistanceUnit): string {
  return unit === 'METER' ? 'm' : unit === 'KILOMETER' ? 'km' : 'mi';
}
