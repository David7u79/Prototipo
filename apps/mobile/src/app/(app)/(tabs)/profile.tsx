import {
  athleteProfileSchema,
  EXPERIENCE_LEVEL_LABELS,
  EXPERIENCE_LEVELS,
  PRIMARY_GOAL_LABELS,
  PRIMARY_GOALS,
} from '@garfit/validation';
import type { ExperienceLevel, PrimaryGoal } from '@garfit/types';
import { useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { Button, Card, Field, Title, uiStyles } from '@/components/ui';
import { messageFor, useSession } from '@/lib/auth';

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
  const { logout, profile, saveProfile, user } = useSession();
  const [displayName, setDisplayName] = useState(profile?.displayName ?? '');
  const [experienceLevel, setExperienceLevel] = useState<ExperienceLevel>(
    profile?.experienceLevel ?? 'BEGINNER',
  );
  const [primaryGoal, setPrimaryGoal] = useState<PrimaryGoal>(
    profile?.primaryGoal ?? 'GENERAL_FITNESS',
  );
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  async function submit() {
    const parsed = athleteProfileSchema.safeParse({
      displayName,
      experienceLevel,
      primaryGoal,
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
        <Text style={styles.label}>Correo electrónico</Text>
        <Text style={uiStyles.muted}>{user?.email}</Text>
        <Text style={styles.label}>Proveedores vinculados</Text>
        <Text style={uiStyles.muted}>{providers || 'Sin proveedores'}</Text>
      </Card>
      <Text style={styles.label}>Nombre visible</Text>
      <Field
        value={displayName}
        onChangeText={setDisplayName}
        placeholder="Cómo quieres que te llamemos"
      />
      <Text style={styles.label}>Experiencia</Text>
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
      <Text style={styles.label}>Objetivo principal</Text>
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
      {error ? <Text style={styles.error}>{error}</Text> : null}
      <Button
        label={saving ? 'Guardando…' : 'Guardar perfil'}
        disabled={saving}
        onPress={() => void submit()}
      />
      <Button label="Cerrar sesión" secondary onPress={() => void logout()} />
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  scroll: { flex: 1, backgroundColor: '#F7F8F6' },
  content: { gap: 14, padding: 20 },
  label: { marginTop: 2, color: '#18221E', fontWeight: '700' },
  chips: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  chip: {
    overflow: 'hidden',
    paddingHorizontal: 12,
    paddingVertical: 9,
    borderWidth: 1,
    borderRadius: 20,
    borderColor: '#DDE3DE',
  },
  selectedChip: { borderColor: '#176B4D', backgroundColor: '#DDEFE7' },
  chipText: { color: '#18221E' },
  selectedChipText: { color: '#176B4D' },
  error: { color: '#B42318' },
});
