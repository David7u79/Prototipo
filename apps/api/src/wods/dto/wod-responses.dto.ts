// Clases de respuesta para OpenAPI. Reflejan packages/types/src/index.ts campo a campo.
import {
  DISTANCE_UNITS,
  LOAD_UNITS,
  RECORD_TYPES,
  WORKOUT_TYPES,
  type DistanceUnit,
  type LoadUnit,
  type RecordType,
  type WorkoutType,
} from '@garfit/domain';
import { ApiProperty } from '@nestjs/swagger';
import { MovementRefResponse } from '../../records/dto/record-responses.dto.js';
import { ChangeResponse } from '../../records/dto/record-responses.dto.js';

class WodMovementResponse extends MovementRefResponse {
  @ApiProperty({ enum: RECORD_TYPES, enumName: 'RecordType', isArray: true })
  recordTypes!: RecordType[];
}

export class WodExerciseResponse {
  @ApiProperty()
  position!: number;

  @ApiProperty({ type: WodMovementResponse })
  movement!: WodMovementResponse;

  @ApiProperty({ type: Number, nullable: true })
  reps!: number | null;

  @ApiProperty({ type: Number, nullable: true })
  loadValue!: number | null;

  @ApiProperty({ enum: LOAD_UNITS, enumName: 'LoadUnit', nullable: true })
  loadUnit!: LoadUnit | null;

  @ApiProperty({ type: Number, nullable: true })
  distanceValue!: number | null;

  @ApiProperty({ enum: DISTANCE_UNITS, enumName: 'DistanceUnit', nullable: true })
  distanceUnit!: DistanceUnit | null;

  @ApiProperty({ type: Number, nullable: true })
  durationSeconds!: number | null;

  @ApiProperty({ type: String, nullable: true })
  notes!: string | null;
}

export class WodSummaryResponse {
  @ApiProperty()
  id!: string;

  @ApiProperty()
  slug!: string;

  @ApiProperty()
  name!: string;

  @ApiProperty({ enum: WORKOUT_TYPES, enumName: 'WorkoutType' })
  workoutType!: WorkoutType;

  @ApiProperty({ type: Number, nullable: true })
  durationSeconds!: number | null;

  @ApiProperty({ type: Number, nullable: true })
  rounds!: number | null;

  @ApiProperty({ type: Number, nullable: true })
  intervalSeconds!: number | null;

  @ApiProperty({ type: [Number] })
  repScheme!: number[];

  @ApiProperty()
  isBenchmark!: boolean;

  @ApiProperty()
  isPersonal!: boolean;

  @ApiProperty()
  exerciseCount!: number;
}

export class WodDetailResponse extends WodSummaryResponse {
  @ApiProperty({ type: String, nullable: true })
  description!: string | null;

  @ApiProperty({ type: String, nullable: true })
  source!: string | null;

  @ApiProperty({ type: [WodExerciseResponse] })
  exercises!: WodExerciseResponse[];
}

export class PaginatedWodsResponse {
  @ApiProperty({ type: [WodSummaryResponse] })
  items!: WodSummaryResponse[];

  @ApiProperty()
  page!: number;

  @ApiProperty()
  limit!: number;

  @ApiProperty()
  total!: number;

  @ApiProperty()
  totalPages!: number;
}

class WodAttemptResponse {
  @ApiProperty() workoutId!: string;
  @ApiProperty({ format: 'date' }) performedOn!: string;
  @ApiProperty() value!: number;
  @ApiProperty() display!: string;
}

class WodPerformanceComparisonResponse {
  @ApiProperty({ enum: WORKOUT_TYPES, enumName: 'WorkoutType' }) workoutType!: WorkoutType;
  @ApiProperty() comparisonAvailable!: boolean;
  @ApiProperty({
    enum: ['SCORE_NO_COMPARABLE', 'ESQUEMA_DESCONOCIDO', 'TIPO_NO_SOPORTADO'],
    nullable: true,
  })
  unavailableReason!: string | null;
  @ApiProperty({ enum: ['s', 'reps', 'kg'], nullable: true }) unit!: string | null;
  @ApiProperty() lowerIsBetter!: boolean;
  @ApiProperty() attempts!: number;
  @ApiProperty({ type: WodAttemptResponse, nullable: true }) best!: WodAttemptResponse | null;
  @ApiProperty({ type: WodAttemptResponse, nullable: true }) latest!: WodAttemptResponse | null;
  @ApiProperty({ type: WodAttemptResponse, nullable: true }) previous!: WodAttemptResponse | null;
  @ApiProperty({ type: ChangeResponse, nullable: true }) change!: ChangeResponse | null;
  @ApiProperty({ type: [WodAttemptResponse] }) history!: WodAttemptResponse[];
}

class WodPerformanceWodResponse {
  @ApiProperty() slug!: string;
  @ApiProperty() name!: string;
  @ApiProperty({ enum: WORKOUT_TYPES, enumName: 'WorkoutType' }) workoutType!: WorkoutType;
  @ApiProperty() isBenchmark!: boolean;
}

export class WodPerformanceResponse {
  @ApiProperty({ type: WodPerformanceWodResponse }) wod!: WodPerformanceWodResponse;
  @ApiProperty({ type: WodPerformanceComparisonResponse })
  performance!: WodPerformanceComparisonResponse;
}
