import type { Metadata } from 'next';
import Link from 'next/link';
import { ApiError } from '@garfit/api-client';
import { redirect } from 'next/navigation';
import { Stat } from '@/components/stat';
import { serverApi } from '@/lib/auth';
import { formatChange, formatValue } from '@/lib/records';
import { formatPeriodChange } from '@/lib/comparisons';

export const metadata: Metadata = {
  title: 'Inicio',
};

async function dashboardData() {
  try {
    const api = serverApi();
    return await Promise.all([
      api.auth.me(),
      api.profile.get().catch((error: unknown) => {
        if (error instanceof ApiError && error.code === 'PROFILE_NOT_FOUND') return null;
        throw error;
      }),
      api.records.summary(),
      api.workouts.stats(),
    ]);
  } catch (error) {
    if (error instanceof ApiError && error.status === 401) redirect('/login');
    throw error;
  }
}

export default async function Dashboard() {
  const [user, profile, summary, workoutStats] = await dashboardData();
  const units = profile?.preferredUnits ?? 'METRIC';
  const movementsWithRecords = summary?.movementsWithRecords ?? 0;
  const totalRecords = summary?.totalRecords ?? 0;
  const recentRecords = summary?.recentRecords ?? [];
  const period = workoutStats.periodComparison;
  const hasNoActivity = workoutStats.last7Days === 0 && workoutStats.last30Days === 0;

  return (
    <section className="mx-auto max-w-5xl space-y-8">
      {/* Encabezado */}
      <div>
        <p className="text-xs font-bold uppercase tracking-wider text-accent">Tu espacio deportivo</p>
        <h1 className="mt-1 text-3xl font-extrabold tracking-tight text-ink sm:text-4xl">
          Hola{user.name ? `, ${user.name}` : ''}
        </h1>
        <p className="mt-1 text-sm text-muted">Revisa tu resumen de actividad y métricas clave.</p>
      </div>

      {/* Alerta de perfil incompleto */}
      {!profile && (
        <div className="rounded-2xl border border-accent/40 bg-accent-soft/50 p-5">
          <p className="font-semibold text-ink">Completa tu perfil deportivo.</p>
          <p className="mt-1 text-xs text-muted">
            Configura tus unidades de peso y objetivos para personalizar tu experiencia.
          </p>
          <Link
            href="/app/profile"
            className="mt-3 inline-block text-sm font-semibold text-accent underline hover:text-ink"
          >
            Ir a mi perfil →
          </Link>
        </div>
      )}

      {/* Primer CTA destacado para usuario sin entrenamientos (M5) */}
      {hasNoActivity && (
        <div className="rounded-2xl border border-accent/40 bg-gradient-to-br from-surface via-surface to-accent-soft p-6 shadow-xl sm:p-8">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <span className="text-xs font-bold uppercase tracking-wider text-metric">
                Primeros pasos
              </span>
              <h2 className="mt-1 text-2xl font-black tracking-tight text-ink">
                ¡Registra tu primer entrenamiento!
              </h2>
              <p className="mt-1 max-w-xl text-sm text-muted">
                Registra una sesión o explora los WODs de la comunidad para empezar a seguir tu
                progreso y romper marcas personales.
              </p>
            </div>
            <div className="flex shrink-0 flex-wrap gap-2.5">
              <Link href="/app/workouts/new" className="btn-primary">
                Registrar entrenamiento
              </Link>
              <Link href="/app/wods" className="btn-secondary">
                Explorar WODs
              </Link>
            </div>
          </div>
        </div>
      )}

      {/* Métricas clave generales (M5 con componente Stat) */}
      <div>
        <h2 className="text-lg font-bold text-ink">Resumen general</h2>
        <div className="mt-3 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <Stat
            label="Esta semana"
            value={workoutStats.last7Days}
            hint="sesiones completadas"
          />
          <Stat
            label="Este mes"
            value={workoutStats.last30Days}
            hint="sesiones en 30 días"
          />
          <Stat
            label="Movimientos con marca"
            value={movementsWithRecords}
            hint="en tu catálogo"
          />
          <Stat
            label="Marcas registradas"
            value={totalRecords}
            hint="historial de marcas"
          />
        </div>
      </div>

      {/* Comparación de periodos (M5) */}
      <section>
        <div className="flex flex-wrap items-baseline justify-between gap-2">
          <h2 className="text-lg font-bold text-ink">Comparación de periodos</h2>
          <span className="text-xs text-muted">
            Últimos {period.days} días vs. {period.days} días anteriores
          </span>
        </div>
        <div className="mt-3 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <Stat
            label="Entrenamientos"
            value={period.current.workouts}
            previous={period.previous.workouts}
            change={formatPeriodChange(period.change.workouts)}
          />
          <Stat
            label="Días entrenados"
            value={period.current.trainingDays}
            previous={period.previous.trainingDays}
            change={formatPeriodChange(period.change.trainingDays)}
          />
          <Stat
            label="Volumen total"
            value={period.current.volumeKg}
            unit="kg"
            previous={period.previous.volumeKg}
            change={formatPeriodChange(period.change.volumeKg)}
          />
          <Stat
            label="Nuevas marcas"
            value={period.current.personalRecords}
            previous={period.previous.personalRecords}
            change={formatPeriodChange(period.change.personalRecords)}
          />
        </div>
      </section>

      {/* Accesos y estado reciente */}
      <div className="grid gap-4 sm:grid-cols-2">
        <article className="rounded-2xl border border-line bg-surface p-5">
          <h3 className="text-xs font-semibold uppercase tracking-wider text-muted">
            Último entrenamiento
          </h3>
          {workoutStats.lastWorkout ? (
            <div className="mt-2">
              <Link
                className="text-base font-bold text-accent underline hover:text-ink"
                href={`/app/workouts/${workoutStats.lastWorkout.id}`}
              >
                {workoutStats.lastWorkout.name}
              </Link>
              <p className="mt-1 text-sm text-muted">
                {workoutStats.lastWorkout.headline ?? 'Sin resultado registrado'}
              </p>
            </div>
          ) : (
            <div className="mt-2">
              <p className="text-sm text-muted">Sin entrenamientos recientes.</p>
              <Link
                className="mt-2 inline-block text-sm font-semibold text-accent underline hover:text-ink"
                href="/app/workouts/new"
              >
                Registrar entrenamiento →
              </Link>
            </div>
          )}
        </article>

        <article className="rounded-2xl border border-line bg-surface p-5">
          <h3 className="text-xs font-semibold uppercase tracking-wider text-muted">
            Marcas desde entrenamientos (30 días)
          </h3>
          <div className="mt-2 flex items-baseline gap-2">
            <span className="text-3xl font-extrabold text-metric tabular-nums">
              {workoutStats.personalRecordsFromWorkoutsLast30Days}
            </span>
            <span className="text-sm text-muted">marcas personales superadas</span>
          </div>
        </article>
      </div>

      {/* Asistente IA */}
      <article className="rounded-2xl border border-line bg-surface p-5">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h3 className="text-base font-bold text-ink">Asistente IA</h3>
            <p className="mt-1 text-sm text-muted">
              Interpreta tus datos deportivos con evidencia trazable y explicaciones claras.
            </p>
          </div>
          <Link href="/app/ai" className="btn-secondary self-start sm:self-auto">
            Ir al análisis
          </Link>
        </div>
      </article>

      {/* Marcas y mejoras */}
      <div className="grid gap-4 sm:grid-cols-2">
        <article className="rounded-2xl border border-line bg-surface p-5">
          <h3 className="text-xs font-semibold uppercase tracking-wider text-muted">Última marca</h3>
          {summary?.latestRecord ? (
            <p className="mt-3 text-sm font-medium text-ink">
              <span className="font-bold">{summary.latestRecord.movement.name}</span> ·{' '}
              <span className="text-metric">
                {formatValue(
                  summary.latestRecord.recordType,
                  summary.latestRecord.normalizedValue,
                  units,
                )}
              </span>{' '}
              · <span className="text-muted">{summary.latestRecord.performedAt}</span>
            </p>
          ) : (
            <p className="mt-3 text-sm text-muted">
              Aún no hay marcas.{' '}
              <Link className="text-accent underline hover:text-ink" href="/app/movements">
                Explorar movimientos
              </Link>
            </p>
          )}
        </article>

        <article className="rounded-2xl border border-line bg-surface p-5">
          <h3 className="text-xs font-semibold uppercase tracking-wider text-muted">Mejora reciente</h3>
          {summary?.recentImprovement ? (
            <p className="mt-3 text-sm font-medium text-ink">
              <span className="font-bold">{summary.recentImprovement.record.movement.name}</span> ·{' '}
              <span className="text-success">
                {formatChange(
                  summary.recentImprovement.record.recordType,
                  summary.recentImprovement.improvement.absolute,
                  units,
                )}
              </span>
            </p>
          ) : (
            <p className="mt-3 text-sm text-muted">
              Aún no hay mejoras registradas.{' '}
              <Link className="text-accent underline hover:text-ink" href="/app/movements">
                Explorar movimientos
              </Link>
            </p>
          )}
        </article>
      </div>

      {/* Historial de últimos registros */}
      {recentRecords.length > 0 && (
        <section>
          <h2 className="text-lg font-bold text-ink">Últimos registros</h2>
          <ul className="mt-3 divide-y divide-line rounded-2xl border border-line bg-surface">
            {recentRecords.map((record) => (
              <li key={record.id} className="p-4 transition hover:bg-raised/40">
                <Link
                  className="flex flex-wrap items-center justify-between gap-2 text-sm no-underline hover:text-accent"
                  href={`/app/records/${record.movement.slug}`}
                >
                  <span className="font-semibold text-ink">{record.movement.name}</span>
                  <div className="flex items-center gap-3">
                    <span className="font-bold text-metric tabular-nums">
                      {formatValue(record.recordType, record.normalizedValue, units)}
                    </span>
                    <span className="text-xs text-muted">{record.performedAt}</span>
                  </div>
                </Link>
              </li>
            ))}
          </ul>
        </section>
      )}
    </section>
  );
}
