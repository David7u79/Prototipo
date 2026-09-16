import { Link } from 'expo-router';
import { useState } from 'react';
import { KeyboardAvoidingView, Platform, StyleSheet, Text } from 'react-native';
import { loginSchema } from '@garfit/validation';
import { Button, Field, Screen, Title, uiStyles } from '@/components/ui';
import { messageFor, useSession } from '@/lib/auth';

export default function LoginScreen() {
  const { googleEnabled, login, signInWithGoogle } = useSession();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function submit() {
    const parsed = loginSchema.safeParse({ email, password });
    if (!parsed.success) {
      setError(parsed.error.issues[0]?.message ?? 'Revisa tus datos.');
      return;
    }

    setLoading(true);
    setError(null);
    try {
      await login(parsed.data);
    } catch (cause) {
      setError(messageFor(cause));
    } finally {
      setLoading(false);
    }
  }

  async function submitGoogle() {
    setLoading(true);
    setError(null);
    try {
      await signInWithGoogle();
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
        <Title>Entrena con intención.</Title>
        <Text style={uiStyles.muted}>Registra tu evolución y tus mejores marcas.</Text>
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
          autoComplete="password"
          placeholder="Contraseña"
        />
        {error ? <Text style={styles.error}>{error}</Text> : null}
        <Button
          label={loading ? 'Ingresando…' : 'Iniciar sesión'}
          disabled={loading}
          onPress={() => void submit()}
        />
        {googleEnabled ? (
          <Button
            label="Continuar con Google"
            secondary
            disabled={loading}
            onPress={() => void submitGoogle()}
          />
        ) : null}
        <Link href="/(auth)/register" style={styles.link}>
          ¿No tienes cuenta? Regístrate
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
