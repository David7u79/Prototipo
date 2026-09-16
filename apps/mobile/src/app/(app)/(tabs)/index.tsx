import { useRouter } from 'expo-router';
import { useEffect, useState } from 'react';
import { Pressable, StyleSheet, Text } from 'react-native';
import { Card, Screen, Title, uiStyles } from '@/components/ui';
import { messageFor, useSession } from '@/lib/auth';

export default function HomeScreen() {
  const { loadProfile, profile, user } = useSession();
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    void loadProfile().catch((cause: unknown) => setError(messageFor(cause)));
  }, [loadProfile]);

  return (
    <Screen>
      <Title>Hola{user?.name ? `, ${user.name}` : ''}.</Title>
      {!profile ? (
        <Pressable onPress={() => router.navigate('/(app)/(tabs)/profile')}>
          <Card>
            <Text style={styles.cardTitle}>Completa tu perfil deportivo.</Text>
            <Text style={uiStyles.muted}>Personaliza tu experiencia como atleta.</Text>
          </Card>
        </Pressable>
      ) : null}
      {error ? <Text style={styles.error}>{error}</Text> : null}
      <Card>
        <Text style={styles.cardTitle}>Entrenamientos</Text>
        <Text style={uiStyles.muted}>No has registrado entrenamientos.</Text>
      </Card>
      <Card>
        <Text style={styles.cardTitle}>Marcas personales</Text>
        <Text style={uiStyles.muted}>No hay marcas personales registradas.</Text>
      </Card>
    </Screen>
  );
}

const styles = StyleSheet.create({
  cardTitle: { color: '#18221E', fontSize: 17, fontWeight: '700' },
  error: { color: '#B42318' },
});
