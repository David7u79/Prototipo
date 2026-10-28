import {
  athleteProfileSchema,
  EXPERIENCE_LEVEL_LABELS,
  EXPERIENCE_LEVELS,
  PRIMARY_GOAL_LABELS,
  PRIMARY_GOALS,
} from '@garfit/validation';
import type { ExperienceLevel, PrimaryGoal, UnitSystem } from '@garfit/types';
import { useCallback, useState } from 'react';
import { useFocusEffect } from 'expo-router';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { Button, Card, Field, Label, Title, uiStyles } from '@/components/ui';
import { colors } from '@/constants/theme';
import { api, messageFor, useSession } from '@/lib/auth';
import { profileCanonicalValue, profileDisplayValue } from '@/lib/presentation';

type ChipProps = {
  label: string;
  selected: boolean;
  onPress: () => void;
};

function Chip({ label, selected, onPress }: ChipProps) {
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityState={{ selected }}
      onPress={onPress}
      style={[styles.chip, selected && styles.selectedChip]}
    >
      <Text style={[styles.chipText, selected && styles.selectedChipText]}>{label}</Text>
    </Pressable>
  );
}

export default function ProfileScreen() {
  const { logout, profile, request, saveProfile, user } = useSession();
  const [displayName, setDisplayName] = useState(profile?.displayName ?? '');
  const [experienceLevel, setExperienceLevel] = useState<ExperienceLevel>(
    profile?.experienceLevel ?? 'BEGINNER',
  );
  const [primaryGoal, setPrimaryGoal] = useState<PrimaryGoal>(
    profile?.primaryGoal ?? 'GENERAL_FITNESS',
  );
  const [preferredUnits, setPreferredUnits] = useState<UnitSystem>(
    profile?.preferredUnits ?? 'METRIC',
  );
  const [birthDate, setBirthDate] = useState(profile?.birthDate ?? '');
  const [height, setHeight] = useState(
    profileDisplayValue(profile?.heightCm ?? null, preferredUnits, 'height'),
  );
  const [weight, setWeight] = useState(
    profileDisplayValue(profile?.weightKg ?? null, preferredUnits, 'weight'),
  );
  const [trainingSince, setTrainingSince] = useState(profile?.trainingSince ?? '');
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [aiConsentGiven, setAiConsentGiven] = useState(false);
  const [aiLoading, setAiLoading] = useState(false);

  useFocusEffect(
    useCallback(() => {
      void request(() => api.ai.status())
        .then((status) => setAiConsentGiven(status.enabled && status.configured && Boolean(status.consentGivenAt)))
        .catch(() => setAiConsentGiven(false));
    }, [request]),
  );

  async function revokeAiConsent() {
    setAiLoading(true);
    setError(null);
    try {
      await request(() => api.ai.revokeConsent());
      setAiConsentGiven(false);
    } catch (cause) {
      setError(messageFor(cause));
    } finally {
      setAiLoading(false);
    }
  }

  async function submit() {
    const parsed = athleteProfileSchema.safeParse({
      displayName,
      experienceLevel,
      primaryGoal,
      preferredUnits,
      birthDate: birthDate || null,
      heightCm: profileCanonicalValue(height, preferredUnits, 'height'),
      weightKg: profileCanonicalValue(weight, preferredUnits, 'weight'),
      trainingSince: trainingSince || null,
    });

    if (!parsed.success) {
      setError(parsed.error.issues[0]?.message ?? 'Revisa tu perfil.');
      return;
    }

    setSaving(true);
    setError(null);
    try {
      await saveProfile(parsed.data);
    } catch (cause) {
      setError(messageFor(cause));
    } finally {
      setSaving(false);
    }
  }

  const providers = user?.providers
    .map((provider) => (provider === 'LOCAL' ? 'Correo electrónico' : 'Google'))
    .join(', ');

  return (
    <ScrollView style={styles.scroll} contentContainerStyle={styles.content}>
      <Title>Tu perfil</Title>
      <Card>
        <Label>Correo electrónico</Label>
        <Text style={styles.cardValue}>{user?.email}</Text>
        <Label>Proveedores vinculados</Label>
        <Text style={styles.cardValue}>{providers || 'Sin proveedores'}</Text>
      </Card>
      <Field
        label="Nombre visible"
        value={displayName}
        onChangeText={setDisplayName}
        placeholder="Cómo quieres que te llamemos"
      />
      <Label>Experiencia</Label>
      <View style={styles.chips}>
        {EXPERIENCE_LEVELS.map((level) => (
          <Chip
            key={level}
            label={EXPERIENCE_LEVEL_LABELS[level]}
            selected={experienceLevel === level}
            onPress={() => setExperienceLevel(level)}
          />
        ))}
      </View>
      <Label>Objetivo principal</Label>
      <View style={styles.chips}>
        {PRIMARY_GOALS.map((goal) => (
          <Chip
            key={goal}
            label={PRIMARY_GOAL_LABELS[goal]}
            selected={primaryGoal === goal}
            onPress={() => setPrimaryGoal(goal)}
          />
        ))}
      </View>
      <Label>Unidades</Label>
      <View style={styles.chips}>
        <Chip
          label="Métrico"
          selected={preferredUnits === 'METRIC'}
          onPress={() => setPreferredUnits('METRIC')}
        />
        <Chip
          label="Imperial"
          selected={preferredUnits === 'IMPERIAL'}
          onPress={() => setPreferredUnits('IMPERIAL')}
        />
      </View>
      <Field
        label="Fecha de nacimiento (opcional)"
        value={birthDate}
        onChangeText={setBirthDate}
        placeholder="AAAA-MM-DD"
      />
      <Field
        label={`Altura opcional (${preferredUnits === 'IMPERIAL' ? 'pulgadas' : 'cm'})`}
        value={height}
        onChangeText={setHeight}
        keyboardType="decimal-pad"
      />
      <Field
        label={`Peso opcional (${preferredUnits === 'IMPERIAL' ? 'lb' : 'kg'})`}
        value={weight}
        onChangeText={setWeight}
        keyboardType="decimal-pad"
      />
      <Field
        label="Entrenas desde (opcional)"
        value={trainingSince}
        onChangeText={setTrainingSince}
        placeholder="AAAA-MM-DD"
      />
      {error ? <Text style={styles.error}>{error}</Text> : null}
      <Button
        label={saving ? 'Guardando…' : 'Guardar perfil'}
        disabled={saving}
        secondary
        onPress={() => void submit()}
      />
      {aiConsentGiven ? (
        <Card>
          <Label>Análisis con IA</Label>
          <Text style={uiStyles.muted}>Al revocar tu consentimiento, GarFit dejará de enviar datos deportivos a Google Gemini y no podrás solicitar nuevos análisis hasta aceptarlo otra vez.</Text>
          <Button label={aiLoading ? 'Revocando…' : 'Revocar consentimiento'} disabled={aiLoading} danger onPress={() => void revokeAiConsent()} />
        </Card>
      ) : null}
      <Button label="Cerrar sesión" danger onPress={() => void logout()} />
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  scroll: { flex: 1, backgroundColor: colors.background },
  content: { gap: 14, padding: 20 },
  cardValue: { color: colors.text, fontSize: 15, marginBottom: 8 },
  chips: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  chip: {
    overflow: 'hidden',
    paddingHorizontal: 12,
    paddingVertical: 9,
    borderWidth: 1,
    borderRadius: 20,
    borderColor: colors.border,
    backgroundColor: colors.surface,
  },
  selectedChip: { borderColor: colors.accent, backgroundColor: colors.accentSoft },
  chipText: { color: colors.text },
  selectedChipText: { color: colors.accent },
  error: { color: colors.danger },
});
