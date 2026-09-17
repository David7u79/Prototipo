// Clases de respuesta para OpenAPI. Reflejan packages/types/src/index.ts campo a campo.
import {
  DISTANCE_UNITS,
  LOAD_UNITS,
  RECORD_TYPES,
  WORKOUT_STATUSES,
  WORKOUT_TYPES,
  type DistanceUnit,
  type LoadUnit,
  type RecordType,
  type WorkoutStatus,
  type WorkoutType,
} from '@garfit/domain';
import { ApiProperty } from '@nestjs/swagger';
import {
  ChangeResponse,
  MovementRefResponse,
  PersonalRecordResponse,
} from '../../records/dto/record-responses.dto.js';

class WorkoutMovementResponse extends MovementRefResponse {
  @ApiProperty({ enum: RECORD_TYPES, enumName: 'RecordType', isArray: true })
  recordTypes!: RecordType[];
}

class WorkoutWodResponse {
  @ApiProperty()
  slug!: string;

  @ApiProperty()
  name!: string;
}

export class WorkoutSetResultResponse {
  @ApiProperty()
  id!: string;

  @ApiProperty()
  setNumber!: number;

  @ApiProperty({ type: Number, nullable: true })
  reps!: number | null;

  @ApiProperty({ type: Number, nullable: true })
  loadValue!: number | null;

  @ApiProperty({ enum: LOAD_UNITS, enumName: 'LoadUnit', nullable: true })
  loadUnit!: LoadUnit | null;

  @ApiProperty({ type: Number, nullable: true })
  loadKg!: number | null;

  @ApiProperty({ type: Number, nullable: true })
  distanceValue!: number | null;

  @ApiProperty({ enum: DISTANCE_UNITS, enumName: 'DistanceUnit', nullable: true })
  distanceUnit!: DistanceUnit | null;

  @ApiProperty({ type: Number, nullable: true })
  distanceMeters!: number | null;

  @ApiProperty({ type: Number, nullable: true })
  durationSeconds!: number | null;
}

export class WorkoutExerciseResponse {
  @ApiProperty()
  id!: string;

  @ApiProperty()
  position!: number;

  @ApiProperty({ type: WorkoutMovementResponse })
  movement!: WorkoutMovementResponse;

  @ApiProperty({ type: Number, nullable: true })
  targetSets!: number | null;

  @ApiProperty({ type: Number, nullable: true })
  targetReps!: number | null;

  @ApiProperty({ type: Number, nullable: true })
  targetLoadValue!: number | null;

  @ApiProperty({ enum: LOAD_UNITS, enumName: 'LoadUnit', nullable: true })
  targetLoadUnit!: LoadUnit | null;

  @ApiProperty({ type: Number, nullable: true })
  targetDistanceValue!: number | null;

  @ApiProperty({ enum: DISTANCE_UNITS, enumName: 'DistanceUnit', nullable: true })
  targetDistanceUnit!: DistanceUnit | null;

  @ApiProperty({ type: Number, nullable: true })
  targetDurationSeconds!: number | null;

  @ApiProperty({ type: Number, nullable: true })
  restSeconds!: number | null;

  @ApiProperty({ type: String, nullable: true })
  notes!: string | null;

  @ApiProperty({ type: [WorkoutSetResultResponse] })
  results!: WorkoutSetResultResponse[];

  @ApiProperty()
  volumeKg!: number;
}

export class WorkoutScoreResponse {
  @ApiProperty({ type: Number, nullable: true })
  timeSeconds!: number | null;

  @ApiProperty({ type: Number, nullable: true })
  repsAtTimeCap!: number | null;

  @ApiProperty({ type: Number, nullable: true })
  rounds!: number | null;

  @ApiProperty({ type: Number, nullable: true })
  extraReps!: number | null;

  @ApiProperty({ type: Boolean, nullable: true })
  completed!: boolean | null;
}

export class DerivedPersonalRecordResponse {
  @ApiProperty({ type: PersonalRecordResponse })
  record!: PersonalRecordResponse;

  @ApiProperty({ type: Number, nullable: true })
  previousBest!: number | null;

  @ApiProperty({ type: ChangeResponse, nullable: true })
  change!: ChangeResponse | null;
}

export class WorkoutListItemResponse {
  @ApiProperty()
  id!: string;

  @ApiProperty()
  name!: string;

  @ApiProperty({ enum: WORKOUT_TYPES, enumName: 'WorkoutType' })
  workoutType!: WorkoutType;

  @ApiProperty({ enum: WORKOUT_STATUSES, enumName: 'WorkoutStatus' })
  status!: WorkoutStatus;

  @ApiProperty({ type: String, format: 'date', nullable: true })
  performedOn!: string | null;

  @ApiProperty({ type: String, format: 'date-time', nullable: true })
  completedAt!: string | null;

  @ApiProperty({ format: 'date-time' })
  createdAt!: string;

  @ApiProperty({ type: WorkoutWodResponse, nullable: true })
  wod!: WorkoutWodResponse | null;

  @ApiProperty({ type: [String] })
  movements!: string[];

  @ApiProperty({ type: String, nullable: true })
  headline!: string | null;

  @ApiProperty()
  personalRecordCount!: number;
}

export class WorkoutDetailResponse extends WorkoutListItemResponse {
  @ApiProperty({ type: String, nullable: true })
  description!: string | null;

  @ApiProperty({ type: String, nullable: true })
  notes!: string | null;

  @ApiProperty({ type: String, format: 'date-time', nullable: true })
  startedAt!: string | null;

  @ApiProperty({ format: 'date-time' })
  updatedAt!: string;

  @ApiProperty({ type: Number, nullable: true })
  durationSeconds!: number | null;

  @ApiProperty({ type: Number, nullable: true })
  rounds!: number | null;

  @ApiProperty({ type: Number, nullable: true })
  intervalSeconds!: number | null;

  @ApiProperty({ type: [Number] })
  repScheme!: number[];

  @ApiProperty({ type: WorkoutScoreResponse, nullable: true })
  score!: WorkoutScoreResponse | null;

  @ApiProperty()
  volumeKg!: number;

  @ApiProperty({ type: [WorkoutExerciseResponse] })
  exercises!: WorkoutExerciseResponse[];

  @ApiProperty({ type: [DerivedPersonalRecordResponse] })
  personalRecords!: DerivedPersonalRecordResponse[];
}

export class PaginatedWorkoutsResponse {
  @ApiProperty({ type: [WorkoutListItemResponse] })
  items!: WorkoutListItemResponse[];

  @ApiProperty()
  page!: number;

  @ApiProperty()
  limit!: number;

  @ApiProperty()
  total!: number;

  @ApiProperty()
  totalPages!: number;
}

class MovementVolumeResponse {
  @ApiProperty({ type: MovementRefResponse })
  movement!: MovementRefResponse;

  @ApiProperty()
  volumeKg!: number;
}

export class WorkoutStatsResponse {
  @ApiProperty()
  totalCompleted!: number;

  @ApiProperty()
  last7Days!: number;

  @ApiProperty()
  last30Days!: number;

  @ApiProperty({ type: WorkoutListItemResponse, nullable: true })
  lastWorkout!: WorkoutListItemResponse | null;

  @ApiProperty()
  personalRecordsFromWorkoutsLast30Days!: number;

  @ApiProperty({ type: [PersonalRecordResponse] })
  recentPersonalRecords!: PersonalRecordResponse[];

  @ApiProperty({ type: [MovementVolumeResponse] })
  volumeByMovementLast30Days!: MovementVolumeResponse[];
}
