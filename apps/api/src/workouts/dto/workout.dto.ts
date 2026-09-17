import {
  DISTANCE_UNITS,
  LOAD_UNITS,
  WORKOUT_LIMITS,
  WORKOUT_STATUSES,
  WORKOUT_TYPES,
  type DistanceUnit,
  type LoadUnit,
  type WorkoutStatus,
  type WorkoutType,
} from '@garfit/domain';
import { Type } from 'class-transformer';
import {
  IsArray,
  ArrayMaxSize,
  ArrayMinSize,
  IsBoolean,
  IsIn,
  IsInt,
  IsNumber,
  IsOptional,
  IsString,
  Max,
  Min,
  ValidateNested,
} from 'class-validator';

export class WorkoutExerciseDto {
  @IsString() movementSlug!: string;
  @IsOptional() @IsInt() @Min(1) targetSets: number | null = null;
  @IsOptional() @IsInt() @Min(1) targetReps: number | null = null;
  @IsOptional() @IsNumber() targetLoadValue: number | null = null;
  @IsOptional() @IsIn(LOAD_UNITS) targetLoadUnit: LoadUnit | null = null;
  @IsOptional() @IsNumber() targetDistanceValue: number | null = null;
  @IsOptional() @IsIn(DISTANCE_UNITS) targetDistanceUnit: DistanceUnit | null = null;
  @IsOptional() @IsInt() @Min(1) targetDurationSeconds: number | null = null;
  @IsOptional() @IsInt() @Min(0) restSeconds: number | null = null;
  @IsOptional() @IsString() notes: string | null = null;
}

export class CreateWorkoutDto {
  @IsOptional() @IsString() wodSlug?: string;
  @IsOptional() @IsString() name?: string;
  @IsOptional() @IsString() description: string | null = null;
  @IsOptional() @IsString() notes: string | null = null;
  @IsOptional() @IsIn(WORKOUT_TYPES) workoutType?: WorkoutType;
  @IsOptional() @IsInt() @Min(1) durationSeconds: number | null = null;
  @IsOptional() @IsInt() @Min(1) rounds: number | null = null;
  @IsOptional() @IsInt() @Min(1) intervalSeconds: number | null = null;
  @IsOptional() @IsArray() @IsInt({ each: true }) repScheme: number[] = [];
  @IsOptional()
  @IsArray()
  @ArrayMinSize(1)
  @ArrayMaxSize(WORKOUT_LIMITS.maxExercises)
  @ValidateNested({ each: true })
  @Type(() => WorkoutExerciseDto)
  exercises?: WorkoutExerciseDto[];
}

export class UpdateWorkoutDto {
  @IsOptional() @IsString() name?: string;
  @IsOptional() @IsString() description?: string | null;
  @IsOptional() @IsString() notes?: string | null;
  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => WorkoutExerciseDto)
  exercises?: WorkoutExerciseDto[];
}
export class WorkoutSetDto {
  @IsInt() @Min(1) setNumber!: number;
  @IsOptional() @IsInt() @Min(1) reps: number | null = null;
  @IsOptional() @IsNumber() loadValue: number | null = null;
  @IsOptional() @IsIn(LOAD_UNITS) loadUnit: LoadUnit | null = null;
  @IsOptional() @IsNumber() distanceValue: number | null = null;
  @IsOptional() @IsIn(DISTANCE_UNITS) distanceUnit: DistanceUnit | null = null;
  @IsOptional() @IsInt() @Min(1) durationSeconds: number | null = null;
}
export class ResultsExerciseDto {
  @IsString() exerciseId!: string;
  @IsArray() @ValidateNested({ each: true }) @Type(() => WorkoutSetDto) sets!: WorkoutSetDto[];
}
export class ScoreDto {
  @IsOptional() @IsInt() @Min(0) timeSeconds: number | null = null;
  @IsOptional() @IsInt() @Min(0) repsAtTimeCap: number | null = null;
  @IsOptional() @IsInt() @Min(0) rounds: number | null = null;
  @IsOptional() @IsInt() @Min(0) extraReps: number | null = null;
  @IsOptional() @IsBoolean() completed: boolean | null = null;
}
export class ResultsDto {
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => ResultsExerciseDto)
  exercises!: ResultsExerciseDto[];
  @IsOptional() @ValidateNested() @Type(() => ScoreDto) score: ScoreDto | null = null;
}
export class CompleteWorkoutDto {
  @IsOptional() @IsString() performedOn?: string;
  @IsOptional() @ValidateNested() @Type(() => ResultsDto) results?: ResultsDto;
}
export class WorkoutFiltersDto {
  @IsOptional() @IsString() from?: string;
  @IsOptional() @IsString() to?: string;
  @IsOptional() @IsString() movement?: string;
  @IsOptional() @IsIn(WORKOUT_TYPES) workoutType?: WorkoutType;
  @IsOptional() @IsIn(WORKOUT_STATUSES) status?: WorkoutStatus;
  @IsOptional() @Type(() => Number) @IsInt() @Min(1) page = 1;
  @IsOptional() @Type(() => Number) @IsInt() @Min(1) @Max(50) limit = 20;
}
