import { ApiError } from '@garfit/api-client';
import type {
  AiAnalysisItem,
  AiAnalysisResponse,
  AiAnalysisSummary,
  AiStatusResponse,
  WorkoutListItem,
} from '@garfit/types';
import { useFocusEffect, useLocalSearchParams, useRouter } from 'expo-router';
import { useCallback, useEffect, useState } from 'react';
import { ActivityIndicator, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { Button, Card, Chip, Icon, SectionHeader, Title, uiStyles } from '@/components/ui';
import { colors, radius, space, type } from '@/constants/theme';
import { api, useSession } from '@/lib/auth';

type RequestedAction = 'progress' | 'workout' | 'wod' | 'movement';
const HISTORY_PAGE_SIZE = 10;

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
  return 'No se pudo completar la solicitud. Inténtalo de nuevo.';
}

function dateLabel(value: string) {
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? value : date.toLocaleDateString('es-ES');
}

function analysisTypeLabel(type: AiAnalysisSummary['type']) {
  const labels: Record<AiAnalysisSummary['type'], string> = {
    PROGRESS_ANALYSIS: 'Progreso',
    WORKOUT_ANALYSIS: 'Entrenamiento',
    WOD_EXPLANATION: 'WOD',
    MOVEMENT_EXPLANATION: 'Movimiento',
  };
  return labels[type];
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
  const [history, setHistory] = useState<AiAnalysisSummary[]>([]);
  const [historyPage, setHistoryPage] = useState(1);
  const [historyPages, setHistoryPages] = useState(0);
  const [loading, setLoading] = useState(true);
  const [running, setRunning] = useState(false);
  const [loadingHistory, setLoadingHistory] = useState(false);
  const [openingAnalysisId, setOpeningAnalysisId] = useState<string | null>(null);
  const [deletingAnalysisId, setDeletingAnalysisId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const currentStatus = await request(() => api.ai.status());
      setStatus(currentStatus);
      if (currentStatus.enabled && currentStatus.configured) {
        const [workouts, analyses] = await Promise.all([
          request(() => api.workouts.list({ status: 'COMPLETED', page: 1, limit: 1 })),
          request(() => api.ai.analyses.list({ page: 1, limit: HISTORY_PAGE_SIZE })),
        ]);
        setLatestWorkout(workouts.items[0] ?? null);
        setHistory(analyses.items);
        setHistoryPage(analyses.page);
        setHistoryPages(analyses.totalPages);
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

  const loadHistory = useCallback(
    async (nextPage: number, replace = false) => {
      if (loadingHistory || (!replace && nextPage > historyPages)) return;
      setLoadingHistory(true);
      try {
        const result = await request(() =>
          api.ai.analyses.list({ page: nextPage, limit: HISTORY_PAGE_SIZE }),
        );
        setHistory((current) => (replace ? result.items : [...current, ...result.items]));
        setHistoryPage(result.page);
        setHistoryPages(result.totalPages);
      } catch (cause) {
        setError(aiMessageFor(cause));
      } finally {
        setLoadingHistory(false);
      }
    },
    [historyPages, loadingHistory, request],
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
        await loadHistory(1, true);
      } catch (cause) {
        setError(aiMessageFor(cause));
      } finally {
        setRunning(false);
      }
    },
    [loadHistory, request],
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

  async function openAnalysis(analysisId: string) {
    setOpeningAnalysisId(analysisId);
    setError(null);
    try {
      setAnalysis(await request(() => api.ai.analyses.get(analysisId)));
    } catch (cause) {
      setError(aiMessageFor(cause));
    } finally {
      setOpeningAnalysisId(null);
    }
  }

  async function removeAnalysis(analysisId: string) {
    setDeletingAnalysisId(analysisId);
    setError(null);
    try {
      await request(() => api.ai.analyses.remove(analysisId));
      if (analysis?.id === analysisId) setAnalysis(null);
      await loadHistory(1, true);
    } catch (cause) {
      setError(aiMessageFor(cause));
    } finally {
      setDeletingAnalysisId(null);
    }
  }

  if (loading && !status) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator color={colors.accent} size="large" />
      </View>
    );
  }

  if (!status?.enabled || !status?.configured) {
    return (
      <ScrollView contentContainerStyle={uiStyles.scroll} style={styles.scroll}>
        <Title>Análisis inteligente</Title>
        <Card>
          <Text style={uiStyles.muted}>Servicio de análisis no configurado en este entorno.</Text>
        </Card>
      </ScrollView>
    );
  }

  if (!status.consentGivenAt) {
    return (
      <ScrollView contentContainerStyle={uiStyles.scroll} style={styles.scroll}>
        <Card hero style={styles.heroCard}>
          <View style={styles.headerIconBadge}>
            <Icon name={{ ios: 'sparkles', android: 'auto_awesome' }} size={32} color={colors.onAccent} />
          </View>
          <Title>Análisis inteligente</Title>
          <Text style={styles.heroDescription}>
            GarFit utiliza Google Gemini para analizar tu rendimiento. Tus datos deportivos se
            procesarán de manera confidencial para darte explicaciones y sugerencias precisas.
          </Text>
        </Card>

        <Card style={styles.formCard}>
          <Text style={uiStyles.muted}>
            Al continuar, aceptas el envío de tus sesiones y marcas al servicio de IA. Puedes revocar
            este permiso en cualquier momento desde tu perfil.
          </Text>
          {error ? <Text style={styles.errorText}>{error}</Text> : null}
          <Button
            label={running ? 'Aceptando…' : 'Aceptar y continuar'}
            disabled={running}
            onPress={() => void giveConsent()}
          />
          <Button label="Cancelar" variant="ghost" onPress={() => router.back()} />
        </Card>
      </ScrollView>
    );
  }

  return (
    <ScrollView contentContainerStyle={uiStyles.scroll} style={styles.scroll}>
      {/* Cabecera con icono auto_awesome tintado accent */}
      <Card hero style={styles.heroCard}>
        <View style={styles.headerIconBadge}>
          <Icon name={{ ios: 'sparkles', android: 'auto_awesome' }} size={28} color={colors.onAccent} />
        </View>
        <Title>Análisis inteligente</Title>
        <Text style={styles.heroDescription}>
          Descubre patrones, optimiza tu volumen y entiende tu evolución deportiva con Gemini.
        </Text>
      </Card>

      {error ? (
        <Card style={styles.errorCard}>
          <Text style={styles.errorText}>{error}</Text>
          <Button label="Reintentar" variant="secondary" onPress={() => void load()} />
        </Card>
      ) : null}

      {/* Acciones principales */}
      <Card style={styles.actionCard}>
        <SectionHeader title="Analizar mi progreso" />
        <Text style={uiStyles.muted}>Selecciona el periodo que deseas evaluar:</Text>
        <View style={styles.periodChips}>
          {[30, 60, 90].map((days) => (
            <Chip
              key={days}
              label={`${days} días`}
              selected={false}
              onPress={() => void run('progress', undefined, days)}
            />
          ))}
        </View>
      </Card>

      <Card style={styles.actionCard}>
        <SectionHeader title="Último entrenamiento" />
        <Text style={uiStyles.muted}>
          {latestWorkout
            ? latestWorkout.name
            : 'Aún no tienes entrenamientos completados para analizar.'}
        </Text>
        {latestWorkout ? (
          <Button
            label={running ? 'Analizando sesión…' : 'Analizar último entrenamiento'}
            disabled={running}
            variant="secondary"
            onPress={() => void run('workout', latestWorkout.id)}
          />
        ) : null}
      </Card>

      {running ? (
        <View style={styles.runningContainer}>
          <ActivityIndicator color={colors.accent} size="large" />
          <Text style={uiStyles.muted}>Generando análisis con IA…</Text>
        </View>
      ) : null}

      {/* Resultado del análisis */}
      {analysis ? <AnalysisResult analysis={analysis} /> : null}

      {/* Historial de análisis */}
      <AnalysisHistory
        analyses={history}
        canLoadMore={historyPage < historyPages}
        deletingId={deletingAnalysisId}
        loading={loadingHistory}
        openingId={openingAnalysisId}
        onDelete={removeAnalysis}
        onLoadMore={() => void loadHistory(historyPage + 1)}
        onOpen={openAnalysis}
      />
    </ScrollView>
  );
}

function AnalysisHistory({
  analyses,
  canLoadMore,
  deletingId,
  loading,
  openingId,
  onDelete,
  onLoadMore,
  onOpen,
}: {
  analyses: AiAnalysisSummary[];
  canLoadMore: boolean;
  deletingId: string | null;
  loading: boolean;
  openingId: string | null;
  onDelete: (id: string) => void;
  onLoadMore: () => void;
  onOpen: (id: string) => void;
}) {
  return (
    <View style={styles.historySection}>
      <SectionHeader title="Análisis anteriores" />
      {analyses.length ? (
        analyses.map((item) => (
          <Card key={item.id} style={styles.historyCard}>
            <Pressable
              accessibilityLabel={`Abrir análisis de ${analysisTypeLabel(item.type)}`}
              accessibilityRole="button"
              disabled={openingId === item.id}
              onPress={() => void onOpen(item.id)}
              style={({ pressed }) => [styles.historyPressable, pressed && uiStyles.pressed]}
            >
              <View style={styles.historyCardHeader}>
                <Chip label={analysisTypeLabel(item.type)} tone="accent" />
                <Text style={styles.historyDate}>{dateLabel(item.createdAt)}</Text>
              </View>
              <Text style={styles.historyTarget}>{item.targetLabel ?? 'Mi progreso'}</Text>
              <Text numberOfLines={3} style={uiStyles.muted}>
                {item.summary}
              </Text>
            </Pressable>
            <Button
              label={deletingId === item.id ? 'Borrando…' : 'Borrar análisis'}
              disabled={deletingId === item.id}
              onPress={() => void onDelete(item.id)}
              variant="danger"
            />
          </Card>
        ))
      ) : (
        <Card>
          <Text style={uiStyles.muted}>Aún no tienes análisis guardados.</Text>
        </Card>
      )}
      {loading ? <ActivityIndicator color={colors.accent} /> : null}
      {canLoadMore ? <Button label="Cargar más análisis" onPress={onLoadMore} variant="secondary" /> : null}
    </View>
  );
}

function AnalysisResult({ analysis }: { analysis: AiAnalysisResponse }) {
  return (
    <View style={styles.resultGroup}>
      {analysis.cached ? (
        <Text style={styles.cachedText}>Análisis guardado · {dateLabel(analysis.generatedAt)}</Text>
      ) : null}

      <Card style={styles.resultBlock}>
        <SectionHeader title="Resumen" />
        <Text style={styles.summaryText}>{analysis.summary}</Text>
      </Card>

      {analysis.status === 'INSUFFICIENT_DATA' ? (
        <Card style={styles.resultBlock}>
          <SectionHeader title="Datos pendientes" />
          {analysis.missingData.map((item) => (
            <Text key={item} style={uiStyles.muted}>
              • {item}
            </Text>
          ))}
        </Card>
      ) : null}

      {analysis.status === 'COMPLETED' ? (
        <>
          <Card style={styles.resultBlock}>
            <SectionHeader title="Observaciones" />
            <Items items={analysis.observations} />
          </Card>

          <Card style={styles.resultBlock}>
            <SectionHeader title="Sugerencias" />
            <Items items={analysis.suggestions} />
          </Card>
        </>
      ) : null}

      <Card style={styles.resultBlock}>
        <SectionHeader title="Datos utilizados" />
        {analysis.dataUsed.map((item) => (
          <View key={item.label} style={styles.factRow}>
            <Text style={styles.factLabel}>{item.label}</Text>
            <Text style={styles.factValue}>{item.value}</Text>
          </View>
        ))}
      </Card>

      {analysis.limitations.length ? (
        <Card style={styles.resultBlock}>
          <SectionHeader title="Limitaciones" />
          {analysis.limitations.map((item) => (
            <Text key={item} style={uiStyles.muted}>
              • {item}
            </Text>
          ))}
        </Card>
      ) : null}
    </View>
  );
}

function Items({ items }: { items: AiAnalysisItem[] }) {
  if (!items.length) {
    return <Text style={uiStyles.muted}>No hay elementos para mostrar.</Text>;
  }

  return (
    <View style={styles.itemsList}>
      {items.map((item) => (
        <View key={`${item.title}-${item.description}`} style={styles.itemBox}>
          <Text style={styles.itemTitle}>{item.title}</Text>
          <Text style={styles.itemDescription}>{item.description}</Text>
          {item.evidence.map((fact) => (
            <View key={fact.id} style={styles.evidenceBox}>
              <Text style={styles.factLabel}>{fact.label}</Text>
              <Text style={uiStyles.muted}>
                {`${fact.value}${fact.unit ? ` ${fact.unit}` : ''}${
                  fact.occurredAt ? ` · ${dateLabel(fact.occurredAt)}` : ''
                }`}
              </Text>
            </View>
          ))}
        </View>
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  scroll: {
    backgroundColor: colors.background,
    flex: 1,
  },
  loadingContainer: {
    backgroundColor: colors.background,
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  heroCard: {
    gap: space.sm,
  },
  headerIconBadge: {
    width: 48,
    height: 48,
    borderRadius: radius.md,
    backgroundColor: colors.accentSoft,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: space.xs,
  },
  heroDescription: {
    color: colors.text,
    ...type.body,
  },
  formCard: {
    gap: space.md,
  },
  actionCard: {
    gap: space.md,
  },
  periodChips: {
    flexDirection: 'row',
    gap: space.sm,
  },
  runningContainer: {
    alignItems: 'center',
    paddingVertical: space.xl,
    gap: space.sm,
  },
  resultGroup: {
    gap: space.md,
  },
  resultBlock: {
    gap: space.sm,
  },
  cachedText: {
    color: colors.muted,
    fontSize: 13,
  },
  summaryText: {
    color: colors.text,
    ...type.body,
    lineHeight: 22,
  },
  itemsList: {
    gap: space.md,
  },
  itemBox: {
    gap: 4,
    backgroundColor: colors.surfaceRaised,
    padding: space.md,
    borderRadius: radius.md,
  },
  itemTitle: {
    color: colors.text,
    ...type.headline,
  },
  itemDescription: {
    color: colors.text,
    ...type.body,
  },
  evidenceBox: {
    backgroundColor: colors.surface,
    borderRadius: radius.sm,
    padding: space.sm,
    marginTop: space.xs,
    gap: 2,
  },
  factRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: 4,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: colors.border,
  },
  factLabel: {
    color: colors.text,
    fontSize: 14,
    fontWeight: '600',
  },
  factValue: {
    color: colors.metric,
    fontSize: 14,
    fontWeight: '600',
  },
  historySection: {
    gap: space.sm,
    marginTop: space.sm,
  },
  historyCard: {
    gap: space.md,
  },
  historyPressable: {
    gap: space.xs,
  },
  historyCardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  historyDate: {
    color: colors.muted,
    fontSize: 13,
  },
  historyTarget: {
    color: colors.text,
    ...type.headline,
  },
  errorCard: {
    borderColor: colors.danger,
    gap: space.md,
  },
  errorText: {
    color: colors.danger,
    ...type.body,
  },
});
