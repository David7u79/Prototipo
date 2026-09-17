import type { RecordsSummaryResponse } from '@garfit/types';
import { useFocusEffect, useRouter } from 'expo-router';
import { useCallback, useState } from 'react';
import {
  ActivityIndicator,
  Pressable,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { Card, Title, uiStyles } from '@/components/ui';
import { colors } from '@/constants/theme';
import { api, messageFor, useSession } from '@/lib/auth';
import { formatChange, formatValue } from '@/lib/presentation';

export default function HomeScreen() {
  const { loadProfile, profile, request, user } = useSession();
  const router = useRouter();
  const [data, setData] = useState<RecordsSummaryResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(
    async (isRefresh = false) => {
      if (isRefresh) {
        setRefreshing(true);
      } else {
        setLoading(true);
      }
      setError(null);
      try {
        const [summary] = await Promise.all([
          request(() => api.records.summary()),
          loadProfile().catch(() => null),
        ]);
        setData(summary);
      } catch (cause) {
        setError(messageFor(cause));
      } finally {
        setLoading(false);
        setRefreshing(false);
      }
    },
    [loadProfile, request],
  );

  useFocusEffect(
    useCallback(() => {
      void load();
    }, [load]),
  );

  const system = profile?.preferredUnits ?? 'METRIC';
  const latestRecord = data?.latestRecord;
  const recentImprovement = data?.recentImprovement;
  const recentRecords = (data?.recentRecords ?? []).slice(0, 5);
  const hasNoData = Boolean(data && data.totalRecords === 0);

  return (
    <ScrollView
      contentContainerStyle={styles.content}
      refreshControl={
        <RefreshControl
          colors={[colors.accent]}
          onRefresh={() => void load(true)}
          refreshing={refreshing}
          tintColor={colors.accent}
        />
      }
      style={styles.container}
    >
      <Title>Hola{user?.name ? `, ${user.name}` : ''}.</Title>

      {!profile ? (
        <Pressable
          accessibilityLabel="Completa tu perfil deportivo. Personaliza tu experiencia como atleta."
          accessibilityRole="button"
          onPress={() => router.navigate('/(app)/(tabs)/profile')}
        >
          <Card>
            <Text style={styles.cardTitle}>Completa tu perfil deportivo.</Text>
            <Text style={uiStyles.muted}>Personaliza tu experiencia como atleta.</Text>
          </Card>
        </Pressable>
      ) : null}

      {error ? (
        <View accessible={true} accessibilityLabel={`Error: ${error}`}>
          <Card style={styles.errorCard}>
            <Text style={styles.errorText}>{error}</Text>
            <Pressable
              accessibilityLabel="Reintentar carga de datos"
              accessibilityRole="button"
              onPress={() => void load()}
              style={({ pressed }) => [uiStyles.button, pressed && uiStyles.dimmed]}
            >
              <Text style={uiStyles.buttonText}>Reintentar</Text>
            </Pressable>
          </Card>
        </View>
      ) : null}

      {loading && !data && !error ? (
        <View
          accessible={true}
          accessibilityLabel="Cargando resumen de marcas"
          style={styles.loadingContainer}
        >
          <ActivityIndicator color={colors.accent} size="large" />
        </View>
      ) : null}

      {data ? (
        <>
          <View
            accessible={true}
            accessibilityLabel={`Movimientos con marca: ${data.movementsWithRecords}`}
          >
            <Card>
              <Text style={styles.cardTitle}>Movimientos con marca</Text>
              <Text style={styles.cardValue}>{data.movementsWithRecords}</Text>
            </Card>
          </View>

          <View accessible={true} accessibilityLabel={`Marcas registradas: ${data.totalRecords}`}>
            <Card>
              <Text style={styles.cardTitle}>Marcas registradas</Text>
              <Text style={styles.cardValue}>{data.totalRecords}</Text>
            </Card>
          </View>

          {latestRecord ? (
            <Pressable
              accessibilityLabel={`Última marca: ${latestRecord.movement.name}, ${formatValue(
                latestRecord.recordType,
                latestRecord.normalizedValue,
                system,
              )}, ${latestRecord.performedAt}`}
              accessibilityRole="button"
              onPress={() => router.push(`/(app)/records/${latestRecord.movement.slug}`)}
            >
              <Card>
                <Text style={styles.cardTitle}>Última marca</Text>
                <Text style={uiStyles.muted}>
                  {`${latestRecord.movement.name} · ${formatValue(
                    latestRecord.recordType,
                    latestRecord.normalizedValue,
                    system,
                  )} · ${latestRecord.performedAt}`}
                </Text>
              </Card>
            </Pressable>
          ) : null}

          {recentImprovement ? (
            <Pressable
              accessibilityLabel={`Mejora reciente: ${
                recentImprovement.record.movement.name
              }, ${formatChange(
                recentImprovement.record.recordType,
                Math.abs(recentImprovement.improvement.absolute),
                system,
              )}`}
              accessibilityRole="button"
              onPress={() =>
                router.push(`/(app)/records/${recentImprovement.record.movement.slug}`)
              }
            >
              <Card>
                <Text style={styles.cardTitle}>Mejora reciente</Text>
                <Text style={uiStyles.muted}>
                  {`${recentImprovement.record.movement.name} · ${formatChange(
                    recentImprovement.record.recordType,
                    Math.abs(recentImprovement.improvement.absolute),
                    system,
                  )}`}
                </Text>
              </Card>
            </Pressable>
          ) : null}

          <View
            accessible={true}
            accessibilityLabel="Entrenamientos: disponible en la próxima fase"
          >
            <Card>
              <Text style={styles.cardTitle}>Entrenamientos</Text>
              <Text style={uiStyles.muted}>Disponible en la próxima fase.</Text>
            </Card>
          </View>

          {hasNoData ? (
            <View
              accessible={true}
              accessibilityLabel="Marcas personales: No hay marcas personales registradas."
            >
              <Card>
                <Text style={styles.cardTitle}>Marcas personales</Text>
                <Text style={uiStyles.muted}>No hay marcas personales registradas.</Text>
                <Pressable
                  accessibilityLabel="Explorar movimientos"
                  accessibilityRole="button"
                  onPress={() => router.push('/(app)/movements')}
                  style={({ pressed }) => [uiStyles.button, pressed && uiStyles.dimmed]}
                >
                  <Text style={uiStyles.buttonText}>Explorar movimientos</Text>
                </Pressable>
              </Card>
            </View>
          ) : (
            <>
              <Text style={styles.sectionTitle}>Últimos registros</Text>
              {recentRecords.map((record) => {
                const formatted = formatValue(record.recordType, record.normalizedValue, system);
                const subtitle = `${formatted} · ${record.performedAt}`;
                return (
                  <Pressable
                    accessibilityLabel={`${record.movement.name}, ${subtitle}`}
                    accessibilityRole="button"
                    key={record.id}
                    onPress={() => router.push(`/(app)/records/${record.movement.slug}`)}
                  >
                    <Card>
                      <Text style={styles.cardTitle}>{record.movement.name}</Text>
                      <Text style={uiStyles.muted}>{subtitle}</Text>
                    </Card>
                  </Pressable>
                );
              })}
              <Pressable
                accessibilityLabel="Explorar movimientos"
                accessibilityRole="button"
                onPress={() => router.push('/(app)/movements')}
                style={({ pressed }) => [
                  uiStyles.button,
                  styles.secondaryButton,
                  pressed && uiStyles.dimmed,
                ]}
              >
                <Text style={styles.secondaryButtonText}>Explorar movimientos</Text>
              </Pressable>
            </>
          )}
        </>
      ) : null}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  cardTitle: { color: colors.text, fontSize: 17, fontWeight: '700' },
  cardValue: { color: colors.accent, fontSize: 24, fontWeight: '700' },
  container: { backgroundColor: colors.background, flex: 1 },
  content: { gap: 16, padding: 20 },
  errorCard: { borderColor: colors.danger, gap: 12 },
  errorText: { color: colors.danger, fontSize: 15 },
  loadingContainer: { alignItems: 'center', paddingVertical: 32 },
  secondaryButton: {
    backgroundColor: colors.surface,
    borderColor: colors.accent,
    borderWidth: 1,
  },
  secondaryButtonText: { color: colors.accent, fontSize: 16, fontWeight: '700' },
  sectionTitle: { color: colors.text, fontSize: 20, fontWeight: '700', marginTop: 8 },
});
