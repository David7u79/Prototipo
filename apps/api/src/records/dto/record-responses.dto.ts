// Clases de respuesta para OpenAPI. Reflejan packages/types/src/index.ts campo a campo.
import {
  RECORD_SOURCES,
  RECORD_TYPES,
  RECORD_UNITS,
  type RecordSource,
  type RecordType,
  type RecordUnit,
} from '@garfit/domain';
import {
  EQUIPMENT,
  type Equipment,
  MOVEMENT_CATEGORIES,
  type MovementCategory,
} from '@garfit/movements';
import { ApiProperty } from '@nestjs/swagger';
import { MovementSummaryResponse } from '../../movements/dto/movement.dto.js';

export class ChangeResponse {
  @ApiProperty({ description: 'Diferencia en unidad canónica (nuevo − anterior)' })
  absolute!: number;
  @ApiProperty({ type: Number, nullable: true, description: 'Null si el valor anterior es 0' })
  percent!: number | null;
  @ApiProperty({ description: 'Mejora según la dirección del tipo (en TIME menor es mejor)' })
  improved!: boolean;
}

export class MovementRefResponse {
  @ApiProperty() slug!: string;
  @ApiProperty() name!: string;
  @ApiProperty({ enum: MOVEMENT_CATEGORIES, enumName: 'MovementCategory' })
  category!: MovementCategory;
  @ApiProperty({ enum: EQUIPMENT, enumName: 'Equipment' }) equipment!: Equipment;
}

class RecordFieldsResponse {
  @ApiProperty() id!: string;
  @ApiProperty({ enum: RECORD_TYPES, enumName: 'RecordType' }) recordType!: RecordType;
  @ApiProperty({ description: 'Valor tal como se introdujo' }) value!: number;
  @ApiProperty({ enum: RECORD_UNITS, enumName: 'RecordUnit' }) unit!: RecordUnit;
  @ApiProperty({ description: 'kg, repeticiones, metros o segundos' }) normalizedValue!: number;
  @ApiProperty({ type: Number, nullable: true }) repetitions!: number | null;
  @ApiProperty({ format: 'date' }) performedAt!: string;
  @ApiProperty({ type: String, nullable: true }) notes!: string | null;
  @ApiProperty({ enum: RECORD_SOURCES, enumName: 'RecordSource' }) source!: RecordSource;
  @ApiProperty({ format: 'date-time' }) createdAt!: string;
  @ApiProperty({ format: 'date-time' }) updatedAt!: string;
}

export class PersonalRecordResponse extends RecordFieldsResponse {
  @ApiProperty({ type: MovementRefResponse }) movement!: MovementRefResponse;
}

export class RecordHistoryEntryResponse extends RecordFieldsResponse {
  @ApiProperty({ description: 'Superó todas las marcas anteriores de su serie al registrarse' })
  isPersonalBest!: boolean;
}

export class RecordSeriesResponse {
  @ApiProperty({ example: 'WEIGHT:1' }) key!: string;
  @ApiProperty({ enum: RECORD_TYPES, enumName: 'RecordType' }) recordType!: RecordType;
  @ApiProperty({ type: Number, nullable: true }) repetitions!: number | null;
  @ApiProperty() lowerIsBetter!: boolean;
  @ApiProperty() count!: number;
  @ApiProperty({ type: RecordHistoryEntryResponse }) first!: RecordHistoryEntryResponse;
  @ApiProperty({ type: RecordHistoryEntryResponse }) current!: RecordHistoryEntryResponse;
  @ApiProperty({ type: RecordHistoryEntryResponse }) best!: RecordHistoryEntryResponse;
  @ApiProperty({ type: ChangeResponse, nullable: true })
  changeFromPrevious!: ChangeResponse | null;
  @ApiProperty({ type: ChangeResponse, nullable: true })
  bestImprovement!: ChangeResponse | null;
  @ApiProperty({ type: ChangeResponse, nullable: true })
  totalProgress!: ChangeResponse | null;
}

export class RecordSeriesWithHistoryResponse extends RecordSeriesResponse {
  @ApiProperty({ type: [RecordHistoryEntryResponse] }) history!: RecordHistoryEntryResponse[];
}

export class MovementRecordsResponse {
  @ApiProperty({ type: MovementSummaryResponse }) movement!: MovementSummaryResponse;
  @ApiProperty({ type: [RecordSeriesWithHistoryResponse] })
  series!: RecordSeriesWithHistoryResponse[];
}

class RecordsOverviewItemResponse {
  @ApiProperty({ type: MovementRefResponse }) movement!: MovementRefResponse;
  @ApiProperty({ type: RecordSeriesResponse }) series!: RecordSeriesResponse;
}

export class RecordsOverviewResponse {
  @ApiProperty({ type: [RecordsOverviewItemResponse] }) items!: RecordsOverviewItemResponse[];
}

class RecentImprovementResponse {
  @ApiProperty({ type: PersonalRecordResponse }) record!: PersonalRecordResponse;
  @ApiProperty({ type: ChangeResponse }) improvement!: ChangeResponse;
}

export class RecordsSummaryResponse {
  @ApiProperty() movementsWithRecords!: number;
  @ApiProperty() totalRecords!: number;
  @ApiProperty({ type: PersonalRecordResponse, nullable: true })
  latestRecord!: PersonalRecordResponse | null;
  @ApiProperty({ type: RecentImprovementResponse, nullable: true })
  recentImprovement!: RecentImprovementResponse | null;
  @ApiProperty({ type: [PersonalRecordResponse] }) recentRecords!: PersonalRecordResponse[];
}
