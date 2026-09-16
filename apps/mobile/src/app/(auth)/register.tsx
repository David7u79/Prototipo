import { Link } from 'expo-router';
import { useState } from 'react';
import { KeyboardAvoidingView, Platform, StyleSheet, Text } from 'react-native';
import { registerSchema } from '@garfit/validation';
import { Button, Field, Screen, Title, uiStyles } from '@/components/ui';
import { messageFor, useSession } from '@/lib/auth';

export default function RegisterScreen() {
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
      <Screen>
        <Title>Crea tu cuenta.</Title>
        <Text style={uiStyles.muted}>Tu progreso comienza con una sesión.</Text>
        <Field value={name} onChangeText={setName} autoComplete="name" placeholder="Nombre" />
        <Field
          value={email}
          onChangeText={setEmail}
          autoCapitalize="none"
          autoComplete="email"
          keyboardType="email-address"
          placeholder="Correo electrónico"
        />
        <Field
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
        <Link href="/(auth)/login" style={styles.link}>
          ¿Ya tienes cuenta? Inicia sesión
        </Link>
      </Screen>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  error: { color: '#B42318' },
  link: {
    marginTop: 8,
    color: '#176B4D',
    fontWeight: '600',
    textAlign: 'center',
  },
});
