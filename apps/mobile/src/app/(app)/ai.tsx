import { ApiError } from '@garfit/api-client';
import type {
  AiAnalysisItem,
  AiAnalysisResponse,
  AiStatusResponse,
  WorkoutListItem,
} from '@garfit/types';
import { useFocusEffect, useLocalSearchParams, useRouter } from 'expo-router';
import { useCallback, useEffect, useState } from 'react';
import { ActivityIndicator, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { Button, Card, Title, uiStyles } from '@/components/ui';
import { colors } from '@/constants/theme';
import { api, messageFor, useSession } from '@/lib/auth';

type RequestedAction = 'progress' | 'workout' | 'wod' | 'movement';

function aiMessageFor(error: unknown): string {
  if (error instanceof ApiError) {
    switch (error.code) {
      case 'AI_DISABLED':
      case 'AI_NOT_CONFIGURED':
        return 'Servicio de análisis no configurado.';
      case 'AI_CONSENT_REQUIRED':
        return 'Necesitas aceptar el consentimiento para solicitar un análisis.';
      case 'AI_PROVIDER_UNAVAILABLE':
        return 'El proveedor de IA no está disponible. Inténtalo de nuevo más tarde.';
      case 'AI_RATE_LIMITED':
        return 'Se alcanzó el límite de análisis. Inténtalo de nuevo más tarde.';
      case 'AI_INVALID_RESPONSE':
        return 'No se pudo procesar la respuesta del análisis. Inténtalo de nuevo.';
      case 'AI_ANALYSIS_FAILED':
        return 'No se pudo generar el análisis. Inténtalo de nuevo.';
    }
  }
  return messageFor(error);
}

function dateLabel(value: string) {
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? value : date.toLocaleDateString('es-MX');
}

export default function AiScreen() {
  const { action, id, slug, periodDays } = useLocalSearchParams<{
    action?: RequestedAction;
    id?: string;
    slug?: string;
    periodDays?: string;
  }>();
  const { request } = useSession();
  const router = useRouter();
  const [status, setStatus] = useState<AiStatusResponse | null>(null);
  const [latestWorkout, setLatestWorkout] = useState<WorkoutListItem | null>(null);
  const [analysis, setAnalysis] = useState<AiAnalysisResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [running, setRunning] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const currentStatus = await request(() => api.ai.status());
      setStatus(currentStatus);
      if (currentStatus.enabled && currentStatus.configured) {
        const workouts = await request(() =>
          api.workouts.list({ status: 'COMPLETED', page: 1, limit: 1 }),
        );
        setLatestWorkout(workouts.items[0] ?? null);
      }
    } catch (cause) {
      setError(aiMessageFor(cause));
    } finally {
      setLoading(false);
    }
  }, [request]);

  useFocusEffect(
    useCallback(() => {
      void load();
    }, [load]),
  );

  const run = useCallback(
    async (requested: RequestedAction, target?: string, days = 30) => {
      setRunning(true);
      setError(null);
      try {
        const result = await request(() => {
          if (requested === 'progress')
            return api.ai.analyzeProgress({ periodDays: days as 30 | 60 | 90 });
          if (requested === 'workout' && target) return api.ai.analyzeWorkout(target);
          if (requested === 'wod' && target) return api.ai.explainWod(target);
          if (requested === 'movement' && target) return api.ai.explainMovement(target);
          throw new Error('No se encontró el elemento para analizar.');
        });
        setAnalysis(result);
      } catch (cause) {
        setError(aiMessageFor(cause));
      } finally {
        setRunning(false);
      }
    },
    [request],
  );

  useEffect(() => {
    if (!status?.enabled || !status.configured || !status.consentGivenAt || !action) return;
    const target = action === 'workout' ? id : slug;
    const timer = setTimeout(() => void run(action, target, Number(periodDays) || 30), 0);
    return () => clearTimeout(timer);
  }, [action, id, periodDays, run, slug, status]);

  async function giveConsent() {
    setRunning(true);
    setError(null);
    try {
      const consent = await request(() => api.ai.giveConsent());
      setStatus((current) =>
        current ? { ...current, consentGivenAt: consent.consentGivenAt } : current,
      );
    } catch (cause) {
      setError(aiMessageFor(cause));
    } finally {
      setRunning(false);
    }
  }

  if (loading && !status) {
    return <Loading />;
  }

  if (!status?.enabled || !status?.configured) {
    return (
      <ScrollView contentContainerStyle={styles.content}>
        <Title>Análisis inteligente</Title>
        <Card>
          <Text style={uiStyles.muted}>Servicio de análisis no configurado.</Text>
        </Card>
      </ScrollView>
    );
  }

  if (!status.consentGivenAt) {
    return (
      <ScrollView contentContainerStyle={styles.content}>
        <Title>Análisis inteligente</Title>
        <Card>
          <Text style={uiStyles.muted}>
            GarFit utiliza Google Gemini para generar análisis. Al solicitar un análisis, los datos
            deportivos necesarios para esa operación se enviarán al proveedor de IA. No se envían
            tus credenciales de acceso.
          </Text>
          {error ? <Text style={styles.error}>{error}</Text> : null}
          <Button
            label={running ? 'Aceptando…' : 'Aceptar y continuar'}
            disabled={running}
            onPress={() => void giveConsent()}
          />
          <Button label="Cancelar" secondary onPress={() => router.back()} />
        </Card>
      </ScrollView>
    );
  }

  return (
    <ScrollView contentContainerStyle={styles.content}>
      <Title>Análisis inteligente</Title>
      {error ? <ErrorCard message={error} onRetry={() => void load()} /> : null}
      <Card>
        <Text style={styles.cardTitle}>Analizar mi progreso</Text>
        <Text style={uiStyles.muted}>Elige el periodo que quieres revisar.</Text>
        <View style={styles.periods}>
          {[30, 60, 90].map((days) => (
            <Pressable
              key={days}
              disabled={running}
              onPress={() => void run('progress', undefined, days)}
              style={uiStyles.button}
            >
              <Text style={uiStyles.buttonText}>{days} días</Text>
            </Pressable>
          ))}
        </View>
      </Card>
      <Card>
        <Text style={styles.cardTitle}>Analizar mi último entrenamiento</Text>
        <Text style={uiStyles.muted}>
          {latestWorkout
            ? latestWorkout.name
            : 'Aún no tienes entrenamientos completados para analizar.'}
        </Text>
        {latestWorkout ? (
          <Button
            label={running ? 'Analizando…' : 'Analizar mi último entrenamiento'}
            disabled={running}
            onPress={() => void run('workout', latestWorkout.id)}
          />
        ) : null}
      </Card>
      {running ? <ActivityIndicator color={colors.accent} size="large" /> : null}
      {analysis ? <AnalysisResult analysis={analysis} /> : null}
    </ScrollView>
  );
}

function Loading() {
  return (
    <View style={styles.loading}>
      <ActivityIndicator color={colors.accent} size="large" />
    </View>
  );
}

function ErrorCard({ message, onRetry }: { message: string; onRetry: () => void }) {
  return (
    <Card style={styles.errorCard}>
      <Text style={styles.error}>{message}</Text>
      <Button label="Reintentar" onPress={onRetry} />
    </Card>
  );
}

function AnalysisResult({ analysis }: { analysis: AiAnalysisResponse }) {
  return (
    <View style={styles.result}>
      {analysis.cached ? (
        <Text style={styles.cached}>Análisis anterior · {dateLabel(analysis.generatedAt)}</Text>
      ) : null}
      <Section title="Resumen" open>
        <Text style={uiStyles.muted}>{analysis.summary}</Text>
      </Section>
      {analysis.status === 'INSUFFICIENT_DATA' ? (
        <Section title="Datos pendientes" open>
          {analysis.missingData.map((item) => (
            <Text key={item} style={uiStyles.muted}>
              • {item}
            </Text>
          ))}
        </Section>
      ) : null}
      {analysis.status === 'COMPLETED' ? (
        <>
          <Section title="Observaciones">
            <Items items={analysis.observations} />
          </Section>
          <Section title="Sugerencias">
            <Items items={analysis.suggestions} />
          </Section>
        </>
      ) : null}
      <Section title="Datos utilizados">
        {analysis.dataUsed.map((item) => (
          <View key={item.label} style={styles.fact}>
            <Text style={styles.factLabel}>{item.label}</Text>
            <Text style={uiStyles.muted}>{item.value}</Text>
          </View>
        ))}
      </Section>
      <Section title="Limitaciones">
        {analysis.limitations.length ? (
          analysis.limitations.map((item) => (
            <Text key={item} style={uiStyles.muted}>
              • {item}
            </Text>
          ))
        ) : (
          <Text style={uiStyles.muted}>No se informaron limitaciones.</Text>
        )}
      </Section>
    </View>
  );
}

function Items({ items }: { items: AiAnalysisItem[] }) {
  return (
    <View style={styles.items}>
      {items.length ? (
        items.map((item) => (
          <Card key={`${item.title}-${item.description}`}>
            <Text style={styles.cardTitle}>{item.title}</Text>
            <Text style={uiStyles.muted}>{item.description}</Text>
            {item.evidence.map((fact) => (
              <View key={fact.id} style={styles.fact}>
                <Text style={styles.factLabel}>{fact.label}</Text>
                <Text
                  style={uiStyles.muted}
                >{`${fact.value}${fact.unit ? ` ${fact.unit}` : ''}${fact.occurredAt ? ` · ${dateLabel(fact.occurredAt)}` : ''}`}</Text>
              </View>
            ))}
          </Card>
        ))
      ) : (
        <Text style={uiStyles.muted}>No hay elementos para mostrar.</Text>
      )}
    </View>
  );
}

function Section({
  title,
  children,
  open = false,
}: {
  title: string;
  children: React.ReactNode;
  open?: boolean;
}) {
  const [expanded, setExpanded] = useState(open);
  return (
    <Card>
      <Pressable onPress={() => setExpanded((value) => !value)} style={styles.sectionHeader}>
        <Text style={styles.cardTitle}>{title}</Text>
        <Text style={styles.chevron}>{expanded ? '−' : '+'}</Text>
      </Pressable>
      {expanded ? children : null}
    </Card>
  );
}

const styles = StyleSheet.create({
  cached: { color: colors.muted, fontSize: 14 },
  cardTitle: { color: colors.text, fontSize: 17, fontWeight: '700' },
  chevron: { color: colors.accent, fontSize: 22, fontWeight: '700' },
  content: { gap: 16, padding: 20 },
  error: { color: colors.danger, fontSize: 15 },
  errorCard: { borderColor: colors.danger },
  fact: { backgroundColor: colors.background, borderRadius: 10, gap: 2, padding: 10 },
  factLabel: { color: colors.text, fontSize: 14, fontWeight: '700' },
  items: { gap: 10 },
  loading: {
    alignItems: 'center',
    backgroundColor: colors.background,
    flex: 1,
    justifyContent: 'center',
  },
  periods: { flexDirection: 'row', gap: 8 },
  result: { gap: 12 },
  sectionHeader: { alignItems: 'center', flexDirection: 'row', justifyContent: 'space-between' },
});
