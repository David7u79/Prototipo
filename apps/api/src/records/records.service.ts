import {
  type Change,
  compareChronologically,
  computeChange,
  isNotInFuture,
  isUnitAllowed,
  isValidIsoDate,
  RECORD_LIMITS,
  RECORD_MIN_DATE,
  type RecordEntry,
  type RecordType,
  type RecordUnit,
  seriesKey,
  summarizeAll,
  summarizeSeries,
  toCanonical,
  UUID_PATTERN,
} from '@garfit/domain';
import { Injectable } from '@nestjs/common';
import { ApiException } from '../common/api-exception.filter.js';
import { fromIsoDate, toIsoDate } from '../common/iso-date.js';
import { MOVEMENT_SUMMARY_SELECT, toMovementSummary } from '../movements/movement.mapper.js';
import { assertValidSlug, movementNotFound } from '../movements/movements.service.js';
import { PrismaService } from '../prisma/prisma.service.js';
import type { CreateRecordDto, UpdateRecordDto } from './dto/record.dto.js';
import type {
  MovementRecordsResponse,
  PersonalRecordResponse,
  RecordsOverviewResponse,
  RecordsSummaryResponse,
} from './dto/record-responses.dto.js';
import {
  type RecordRow,
  toMovementRef,
  toPersonalRecord,
  toRecordEntry,
  toSeriesResponse,
  toSeriesWithHistory,
} from './records.mapper.js';

const RECENT_RECORDS_LIMIT = 5;

const recordNotFound = () => new ApiException(404, 'RECORD_NOT_FOUND', 'No encontramos esa marca');
const invalidValue = (message: string) => new ApiException(400, 'INVALID_RECORD_VALUE', message);
const validationFailed = (message: string) => new ApiException(400, 'VALIDATION_FAILED', message);

interface RecordValues {
  value: number;
  unit: RecordUnit;
  repetitions: number | null;
  performedAt: string;
}

/**
 * Marcas personales. Todas las consultas se filtran por el `userId` del token y excluyen las
 * marcas retiradas (`deletedAt`). Un id ajeno responde 404, igual que uno inexistente, para no
 * revelar que existe. Los cálculos de progreso se delegan en @garfit/domain.
 */
@Injectable()
export class RecordsService {
  constructor(private readonly prisma: PrismaService) {}

  async create(userId: string, dto: CreateRecordDto): Promise<PersonalRecordResponse> {
    const movement = await this.prisma.movement.findFirst({
      where: { slug: dto.movementSlug, isActive: true },
    });
    if (!movement) throw movementNotFound();
    if (!movement.recordTypes.includes(dto.recordType)) {
      throw new ApiException(
        400,
        'RECORD_TYPE_NOT_ALLOWED',
        'Ese movimiento no admite ese tipo de marca',
      );
    }
    assertRecordValues(dto.recordType, dto);

    const row = await this.prisma.personalRecord.create({
      data: {
        userId,
        movementId: movement.id,
        recordType: dto.recordType,
        value: dto.value,
        unit: dto.unit,
        normalizedValue: toCanonical(dto.value, dto.unit),
        repetitions: dto.repetitions,
        performedAt: fromIsoDate(dto.performedAt),
        notes: emptyToNull(dto.notes),
        source: 'MANUAL',
      },
      include: { movement: true },
    });
    return toPersonalRecord(row);
  }

  async update(userId: string, id: string, dto: UpdateRecordDto): Promise<PersonalRecordResponse> {
    assertValidId(id);
    if (Object.keys(dto).length === 0) throw validationFailed('No hay cambios que guardar');
    if ((dto.value === undefined) !== (dto.unit === undefined)) {
      throw validationFailed('El valor y la unidad se envían juntos');
    }
    const record = await this.findOwnedRecord(userId, id);

    // Las reglas se comprueban sobre el resultado final (valores nuevos + los que no cambian).
    const next: RecordValues = {
      value: dto.value ?? Number(record.value),
      unit: dto.unit ?? record.unit,
      repetitions: dto.repetitions === undefined ? record.repetitions : dto.repetitions,
      performedAt: dto.performedAt ?? toIsoDate(record.performedAt),
    };
    assertRecordValues(record.recordType, next);

    const row = await this.prisma.personalRecord.update({
      where: { id: record.id },
      data: {
        ...(dto.value !== undefined && dto.unit !== undefined
          ? {
              value: dto.value,
              unit: dto.unit,
              normalizedValue: toCanonical(dto.value, dto.unit),
            }
          : {}),
        ...(dto.repetitions !== undefined ? { repetitions: dto.repetitions } : {}),
        ...(dto.performedAt !== undefined ? { performedAt: fromIsoDate(dto.performedAt) } : {}),
        ...(dto.notes !== undefined ? { notes: emptyToNull(dto.notes) } : {}),
      },
      include: { movement: true },
    });
    return toPersonalRecord(row);
  }

  /** Borrado lógico: conserva la fila para trazabilidad, pero deja de contar en todo cálculo. */
  async remove(userId: string, id: string): Promise<void> {
    assertValidId(id);
    const record = await this.findOwnedRecord(userId, id);
    await this.prisma.personalRecord.update({
      where: { id: record.id },
      data: { deletedAt: new Date() },
    });
  }

  async overview(userId: string): Promise<RecordsOverviewResponse> {
    const rows = await this.activeRows(userId);
    const rowsById = new Map(rows.map((row) => [row.id, row]));
    const items = groupByMovement(rows).flatMap((movementRows) => {
      const movement = toMovementRef(movementRows[0]!.movement);
      return summarizeAll(movementRows.map(toRecordEntry)).map((series) => ({
        movement,
        series: toSeriesResponse(series, rowsById),
      }));
    });
    items.sort((a, b) => compareRecency(b.series.current, a.series.current));
    return { items };
  }

  async summary(userId: string): Promise<RecordsSummaryResponse> {
    const rows = await this.activeRows(userId);
    const byRecency = [...rows].sort((a, b) => compareRecency(toRecordEntry(b), toRecordEntry(a)));
    const improvement = mostRecentImprovement(rows);
    const rowsById = new Map(rows.map((row) => [row.id, row]));

    return {
      movementsWithRecords: new Set(rows.map((row) => row.movementId)).size,
      totalRecords: rows.length,
      latestRecord: byRecency[0] ? toPersonalRecord(byRecency[0]) : null,
      recentImprovement: improvement
        ? {
            record: toPersonalRecord(rowsById.get(improvement.entry.id)!),
            improvement: improvement.change,
          }
        : null,
      recentRecords: byRecency.slice(0, RECENT_RECORDS_LIMIT).map(toPersonalRecord),
    };
  }

  /** Historial del atleta en un movimiento. Incluye movimientos inactivos con marcas previas. */
  async forMovement(userId: string, slug: string): Promise<MovementRecordsResponse> {
    assertValidSlug(slug);
    const movement = await this.prisma.movement.findUnique({
      where: { slug },
      select: MOVEMENT_SUMMARY_SELECT,
    });
    if (!movement) throw movementNotFound();

    const rows = await this.activeRows(userId, movement.id);
    const rowsById = new Map(rows.map((row) => [row.id, row]));
    return {
      movement: toMovementSummary(movement),
      series: summarizeAll(rows.map(toRecordEntry)).map((series) =>
        toSeriesWithHistory(series, rowsById),
      ),
    };
  }

  private activeRows(userId: string, movementId?: string): Promise<RecordRow[]> {
    return this.prisma.personalRecord.findMany({
      where: { userId, deletedAt: null, ...(movementId ? { movementId } : {}) },
      include: { movement: true },
    });
  }

  private async findOwnedRecord(userId: string, id: string) {
    const record = await this.prisma.personalRecord.findFirst({
      where: { id, userId, deletedAt: null },
    });
    if (!record) throw recordNotFound();
    return record;
  }
}

/** Reglas que dependen del tipo de marca (idénticas a createRecordSchema de @garfit/validation). */
function assertRecordValues(recordType: RecordType, values: RecordValues): void {
  if (!isUnitAllowed(recordType, values.unit)) {
    throw invalidValue('La unidad no corresponde a ese tipo de marca');
  }
  const canonical = toCanonical(values.value, values.unit);
  const { min, max } = RECORD_LIMITS[recordType];
  if (canonical < min || canonical > max) {
    throw invalidValue('El valor está fuera del rango permitido');
  }
  if (recordType === 'WEIGHT' && values.repetitions === null) {
    throw validationFailed('Indica las repeticiones de la marca de peso (1 para 1RM)');
  }
  if (recordType !== 'WEIGHT' && values.repetitions !== null) {
    throw validationFailed('Las repeticiones sólo aplican a marcas de peso');
  }
  if (!isValidIsoDate(values.performedAt)) throw validationFailed('La fecha no existe');
  if (!isNotInFuture(values.performedAt)) {
    throw validationFailed('La fecha no puede estar en el futuro');
  }
  if (values.performedAt < RECORD_MIN_DATE) {
    throw validationFailed(`La fecha no puede ser anterior a ${RECORD_MIN_DATE}`);
  }
}

function assertValidId(id: string): void {
  if (!UUID_PATTERN.test(id)) throw validationFailed('El identificador de la marca no es válido');
}

function emptyToNull(text: string | null): string | null {
  return text ? text : null;
}

/** Orden por fecha de realización y, a igual fecha, por fecha de registro. */
function compareRecency(
  a: Pick<RecordEntry, 'performedAt' | 'createdAt'>,
  b: Pick<RecordEntry, 'performedAt' | 'createdAt'>,
): number {
  return a.performedAt.localeCompare(b.performedAt) || a.createdAt.localeCompare(b.createdAt);
}

function groupByMovement(rows: RecordRow[]): RecordRow[][] {
  const groups = new Map<string, RecordRow[]>();
  for (const row of rows) {
    groups.set(row.movementId, [...(groups.get(row.movementId) ?? []), row]);
  }
  return [...groups.values()];
}

/**
 * La mejora más reciente de una mejor marca: de todas las series, la última entrada que superó
 * a una mejor marca previa, con el cambio respecto a esa mejor marca previa.
 */
function mostRecentImprovement(rows: RecordRow[]): { entry: RecordEntry; change: Change } | null {
  const series = new Map<string, RecordEntry[]>();
  for (const row of rows) {
    const entry = toRecordEntry(row);
    const key = `${row.movementId}|${seriesKey(entry)}`;
    series.set(key, [...(series.get(key) ?? []), entry]);
  }

  let latest: { entry: RecordEntry; change: Change } | null = null;
  for (const entries of series.values()) {
    const { history, recordType } = summarizeSeries(entries);
    let previousBest: RecordEntry | null = null;
    for (const point of history) {
      if (!point.isPersonalBest) continue;
      if (previousBest) {
        const candidate = {
          entry: point,
          change: computeChange(recordType, previousBest.normalizedValue, point.normalizedValue),
        };
        if (!latest || compareChronologically(candidate.entry, latest.entry) > 0) {
          latest = candidate;
        }
      }
      previousBest = point;
    }
  }
  return latest;
}
