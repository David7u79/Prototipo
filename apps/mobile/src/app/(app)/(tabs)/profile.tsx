import {
  athleteProfileSchema,
  EXPERIENCE_LEVEL_LABELS,
  EXPERIENCE_LEVELS,
  PRIMARY_GOAL_LABELS,
  PRIMARY_GOALS,
} from '@garfit/validation';
import type { ExperienceLevel, PrimaryGoal, UnitSystem } from '@garfit/types';
import { useCallback, useState } from 'react';
import { useFocusEffect, useRouter } from 'expo-router';
import { Alert, ScrollView, StyleSheet, Text, View } from 'react-native';
import {
  Button,
  Card,
  Chip,
  Field,
  Label,
  ListRow,
  SectionHeader,
  uiStyles,
} from '@/components/ui';
import { colors, gradients, radius, space, type } from '@/constants/theme';
import { api, messageFor, useSession } from '@/lib/auth';
import { profileCanonicalValue, profileDisplayValue } from '@/lib/presentation';

export default function ProfileScreen() {
  const router = useRouter();
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
        .then((status) =>
          setAiConsentGiven(status.enabled && status.configured && Boolean(status.consentGivenAt)),
        )
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

  function confirmRevokeAiConsent() {
    Alert.alert(
      '¿Revocar consentimiento?',
      'Al revocarlo, GarFit dejará de enviar datos deportivos a Google Gemini y no podrás solicitar nuevos análisis hasta aceptarlo otra vez.',
      [
        { text: 'Cancelar', style: 'cancel' },
        { text: 'Revocar', style: 'destructive', onPress: () => void revokeAiConsent() },
      ],
    );
  }

  function confirmLogout() {
    Alert.alert('Cerrar sesión', '¿Estás seguro de que quieres cerrar sesión?', [
      { text: 'Cancelar', style: 'cancel' },
      { text: 'Cerrar sesión', style: 'destructive', onPress: () => void logout() },
    ]);
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
      Alert.alert('Perfil actualizado', 'Tus datos se guardaron correctamente.');
    } catch (cause) {
      setError(messageFor(cause));
    } finally {
      setSaving(false);
    }
  }

  const initial = (displayName || user?.name || user?.email || 'A').charAt(0).toUpperCase();

  return (
    <ScrollView style={styles.scroll} contentContainerStyle={uiStyles.scroll}>
      {/* Cabecera con avatar grande */}
      <View style={styles.avatarHeader}>
        <View style={styles.avatar}>
          <Text style={styles.avatarText}>{initial}</Text>
        </View>
        <Text style={styles.userName}>{displayName || user?.name || 'Atleta'}</Text>
        <Text style={uiStyles.muted}>{user?.email}</Text>
      </View>

      {/* Accesos rápidos */}
      <View style={styles.group}>
        <SectionHeader title="Servicios" />
        <ListRow
          icon={{ ios: 'sparkles', android: 'auto_awesome' }}
          tone="accent"
          title="Análisis inteligente"
          subtitle="Historial y reportes con IA"
          onPress={() => router.push('/(app)/ai')}
        />
      </View>

      {/* Datos atléticos */}
      <View style={styles.group}>
        <SectionHeader title="Datos atléticos" />

        <Field
          label="Nombre visible"
          value={displayName}
          onChangeText={setDisplayName}
          placeholder="Cómo quieres que te llamemos"
        />

        <View style={styles.fieldBlock}>
          <Label>Nivel de experiencia</Label>
          <View style={styles.chipsRow}>
            {EXPERIENCE_LEVELS.map((level) => (
              <Chip
                key={level}
                label={EXPERIENCE_LEVEL_LABELS[level]}
                selected={experienceLevel === level}
                onPress={() => setExperienceLevel(level)}
              />
            ))}
          </View>
        </View>

        <View style={styles.fieldBlock}>
          <Label>Objetivo principal</Label>
          <View style={styles.chipsRow}>
            {PRIMARY_GOALS.map((goal) => (
              <Chip
                key={goal}
                label={PRIMARY_GOAL_LABELS[goal]}
                selected={primaryGoal === goal}
                onPress={() => setPrimaryGoal(goal)}
              />
            ))}
          </View>
        </View>

        <View style={styles.fieldBlock}>
          <Label>Sistema de unidades</Label>
          <View style={styles.chipsRow}>
            <Chip
              label="Métrico (kg, cm)"
              selected={preferredUnits === 'METRIC'}
              onPress={() => setPreferredUnits('METRIC')}
            />
            <Chip
              label="Imperial (lb, in)"
              selected={preferredUnits === 'IMPERIAL'}
              onPress={() => setPreferredUnits('IMPERIAL')}
            />
          </View>
        </View>

        <Field
          label="Fecha de nacimiento (opcional)"
          value={birthDate}
          onChangeText={setBirthDate}
          placeholder="AAAA-MM-DD"
        />

        <Field
          label={`Altura (${preferredUnits === 'IMPERIAL' ? 'pulgadas' : 'cm'})`}
          value={height}
          onChangeText={setHeight}
          keyboardType="decimal-pad"
          placeholder={preferredUnits === 'IMPERIAL' ? '68' : '175'}
        />

        <Field
          label={`Peso (${preferredUnits === 'IMPERIAL' ? 'lb' : 'kg'})`}
          value={weight}
          onChangeText={setWeight}
          keyboardType="decimal-pad"
          placeholder={preferredUnits === 'IMPERIAL' ? '165' : '75'}
        />

        <Field
          label="Entrenas desde (opcional)"
          value={trainingSince}
          onChangeText={setTrainingSince}
          placeholder="AAAA-MM-DD"
        />

        {error ? <Text style={styles.errorText}>{error}</Text> : null}

        <Button
          label={saving ? 'Guardando…' : 'Guardar perfil'}
          disabled={saving}
          variant="primary"
          onPress={() => void submit()}
        />
      </View>

      {/* Privacidad y consentimiento de IA */}
      {aiConsentGiven ? (
        <View style={styles.group}>
          <SectionHeader title="Privacidad e IA" />
          <Card style={styles.aiCard}>
            <Text style={uiStyles.muted}>
              GarFit envía datos deportivos a Google Gemini para los análisis. Puedes revocar el
              consentimiento en cualquier momento.
            </Text>
            <Button
              label={aiLoading ? 'Revocando…' : 'Revocar consentimiento de IA'}
              disabled={aiLoading}
              variant="danger"
              onPress={confirmRevokeAiConsent}
            />
          </Card>
        </View>
      ) : null}

      {/* Acciones de cuenta */}
      <View style={styles.group}>
        <SectionHeader title="Cuenta" />
        <Button
          label="Cerrar sesión"
          variant="danger"
          icon={{ ios: 'rectangle.portrait.and.arrow.right', android: 'logout' }}
          onPress={confirmLogout}
        />
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  scroll: {
    flex: 1,
    backgroundColor: colors.background,
  },
  avatarHeader: {
    alignItems: 'center',
    gap: space.xs,
    paddingVertical: space.md,
  },
  avatar: {
    width: 88,
    height: 88,
    borderRadius: radius.pill,
    alignItems: 'center',
    justifyContent: 'center',
    experimental_backgroundImage: gradients.primary,
    marginBottom: space.xs,
  },
  avatarText: {
    color: colors.onAccent,
    fontSize: 34,
    fontWeight: '800',
  },
  userName: {
    color: colors.text,
    ...type.title,
  },
  group: {
    gap: space.md,
  },
  fieldBlock: {
    gap: 6,
  },
  chipsRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: space.sm,
  },
  aiCard: {
    gap: space.md,
  },
  errorText: {
    color: colors.danger,
    ...type.body,
  },
});
