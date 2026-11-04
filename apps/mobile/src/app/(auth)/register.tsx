import { Image } from 'expo-image';
import { useRouter } from 'expo-router';
import { useState } from 'react';
import { KeyboardAvoidingView, Platform, ScrollView, StyleSheet, Text, View } from 'react-native';
import { registerSchema } from '@garfit/validation';
import { Button, Field, uiStyles } from '@/components/ui';
import { colors, space, type } from '@/constants/theme';
import { messageFor, useSession } from '@/lib/auth';

const heron = require('@/assets/images/splash-icon.png');

export default function RegisterScreen() {
  const router = useRouter();
  const { register } = useSession();
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function submit() {
    const parsed = registerSchema.safeParse({ name, email, password });
    if (!parsed.success) {
      setError(parsed.error.issues[0]?.message ?? 'Revisa tus datos.');
      return;
    }

    setLoading(true);
    setError(null);
    try {
      await register(parsed.data);
    } catch (cause) {
      setError(messageFor(cause));
    } finally {
      setLoading(false);
    }
  }

  return (
    <KeyboardAvoidingView
      style={styles.flex}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      <ScrollView
        contentContainerStyle={styles.container}
        keyboardShouldPersistTaps="handled"
      >
        <View style={styles.brand}>
          <Image source={heron} style={styles.logo} contentFit="contain" accessibilityLabel="Logo de GarFit" />
          <Text style={styles.brandTitle}>GarFit</Text>
          <Text style={styles.brandSubtitle}>Entrena, mide y progresa</Text>
        </View>

        <View style={styles.form}>
          <Field
            label="Nombre"
            value={name}
            onChangeText={setName}
            autoComplete="name"
            placeholder="Nombre"
          />
          <Field
            label="Correo electrónico"
            value={email}
            onChangeText={setEmail}
            autoCapitalize="none"
            autoComplete="email"
            keyboardType="email-address"
            placeholder="Correo electrónico"
          />
          <Field
            label="Contraseña"
            value={password}
            onChangeText={setPassword}
            secureTextEntry
            autoComplete="new-password"
            placeholder="Contraseña"
          />
          {error ? <Text style={styles.error}>{error}</Text> : null}
          <Button
            label={loading ? 'Creando cuenta…' : 'Crear cuenta'}
            disabled={loading}
            onPress={() => void submit()}
          />
          <Button
            label="¿Ya tienes cuenta? Inicia sesión"
            variant="ghost"
            onPress={() => router.push('/(auth)/login')}
          />
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  flex: {
    flex: 1,
    backgroundColor: colors.background,
  },
  container: {
    ...uiStyles.scroll,
    flexGrow: 1,
    justifyContent: 'center',
    paddingVertical: space.xxl,
  },
  brand: {
    alignItems: 'center',
    gap: space.xs,
    marginBottom: space.lg,
  },
  logo: {
    width: 96,
    height: 96,
    marginBottom: space.sm,
  },
  brandTitle: {
    color: colors.text,
    ...type.display,
  },
  brandSubtitle: {
    color: colors.muted,
    ...type.body,
  },
  form: {
    gap: space.md,
  },
  error: {
    color: colors.danger,
    ...type.body,
  },
});
