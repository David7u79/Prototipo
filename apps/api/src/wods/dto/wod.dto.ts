import {
  DISTANCE_UNITS,
  LOAD_UNITS,
  WORKOUT_LIMITS,
  WORKOUT_TYPES,
  type DistanceUnit,
  type LoadUnit,
  type WorkoutType,
} from '@garfit/domain';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import {
  IsArray,
  ArrayMaxSize,
  ArrayMinSize,
  IsIn,
  IsInt,
  IsNumber,
  IsOptional,
  IsString,
  Max,
  MaxLength,
  Min,
  ValidateNested,
} from 'class-validator';

export class WodExerciseDto {
  @IsString() movementSlug!: string;
  @IsOptional() @IsInt() @Min(1) reps: number | null = null;
  @IsOptional() @IsNumber() loadValue: number | null = null;
  @IsOptional() @IsIn(LOAD_UNITS) loadUnit: LoadUnit | null = null;
  @IsOptional() @IsNumber() distanceValue: number | null = null;
  @IsOptional() @IsIn(DISTANCE_UNITS) distanceUnit: DistanceUnit | null = null;
  @IsOptional() @IsInt() @Min(1) durationSeconds: number | null = null;
  @IsOptional() @IsString() @MaxLength(WORKOUT_LIMITS.notesMaxLength) notes: string | null = null;
}

export class CreateWodDto {
  @ApiProperty() @IsString() @MaxLength(WORKOUT_LIMITS.nameMaxLength) name!: string;
  @ApiPropertyOptional() @IsOptional() @IsString() description: string | null = null;
  @ApiProperty({ enum: WORKOUT_TYPES }) @IsIn(WORKOUT_TYPES) workoutType!: WorkoutType;
  @ApiPropertyOptional() @IsOptional() @IsInt() @Min(1) durationSeconds: number | null = null;
  @ApiPropertyOptional() @IsOptional() @IsInt() @Min(1) rounds: number | null = null;
  @ApiPropertyOptional() @IsOptional() @IsInt() @Min(1) intervalSeconds: number | null = null;
  @ApiProperty({ type: [Number] }) @IsArray() @IsInt({ each: true }) repScheme: number[] = [];
  @ApiProperty({ type: [WodExerciseDto] })
  @IsArray()
  @ArrayMinSize(1)
  @ArrayMaxSize(WORKOUT_LIMITS.maxExercises)
  @ValidateNested({ each: true })
  @Type(() => WodExerciseDto)
  exercises!: WodExerciseDto[];
}

export class WodFiltersDto {
  @IsOptional() @IsString() search?: string;
  @IsOptional() @IsIn(WORKOUT_TYPES) workoutType?: WorkoutType;
  @IsOptional() @IsIn(['true', 'false']) benchmark?: 'true' | 'false';
  @IsOptional() @Type(() => Number) @IsInt() @Min(1) page = 1;
  @IsOptional() @Type(() => Number) @IsInt() @Min(1) @Max(50) limit = 20;
}
