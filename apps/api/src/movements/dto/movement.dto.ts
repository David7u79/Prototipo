import { PAGINATION, RECORD_TYPES, type RecordType, SEARCH_MAX_LENGTH } from '@garfit/domain';
import {
  EQUIPMENT,
  type Equipment,
  MOVEMENT_CATEGORIES,
  MOVEMENT_DIFFICULTIES,
  MUSCLE_GROUPS,
  type MovementCategory,
  type MovementDifficulty,
  type MuscleGroup,
} from '@garfit/movements';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Transform, Type } from 'class-transformer';
import { IsIn, IsInt, IsOptional, IsString, Max, MaxLength, Min } from 'class-validator';

const trim = ({ value }: { value: unknown }) => (typeof value === 'string' ? value.trim() : value);

/** Query de `GET /movements` (MovementFilters en @garfit/types). Filtros combinados con AND. */
export class MovementFiltersDto {
  @ApiPropertyOptional({
    maxLength: SEARCH_MAX_LENGTH,
    description: 'Texto contenido en el nombre',
  })
  @Transform(trim)
  @IsOptional()
  @IsString()
  @MaxLength(SEARCH_MAX_LENGTH)
  search?: string;

  @ApiPropertyOptional({ enum: MOVEMENT_CATEGORIES, enumName: 'MovementCategory' })
  @IsOptional()
  @IsIn(MOVEMENT_CATEGORIES)
  category?: MovementCategory;

  @ApiPropertyOptional({ enum: EQUIPMENT, enumName: 'Equipment' })
  @IsOptional()
  @IsIn(EQUIPMENT)
  equipment?: Equipment;

  @ApiPropertyOptional({
    enum: MUSCLE_GROUPS,
    enumName: 'MuscleGroup',
    description: 'Coincide con músculos principales o secundarios',
  })
  @IsOptional()
  @IsIn(MUSCLE_GROUPS)
  muscleGroup?: MuscleGroup;

  @ApiPropertyOptional({ enum: MOVEMENT_DIFFICULTIES, enumName: 'MovementDifficulty' })
  @IsOptional()
  @IsIn(MOVEMENT_DIFFICULTIES)
  difficulty?: MovementDifficulty;

  @ApiPropertyOptional({
    enum: RECORD_TYPES,
    enumName: 'RecordType',
    description: 'Movimientos que admiten este tipo de marca',
  })
  @IsOptional()
  @IsIn(RECORD_TYPES)
  recordType?: RecordType;

  @ApiPropertyOptional({ default: 1, minimum: 1, maximum: PAGINATION.maxPage })
  @Type(() => Number)
  @IsOptional()
  @IsInt()
  @Min(1)
  @Max(PAGINATION.maxPage)
  page: number = 1;

  @ApiPropertyOptional({
    default: PAGINATION.defaultLimit,
    minimum: 1,
    maximum: PAGINATION.maxLimit,
  })
  @Type(() => Number)
  @IsOptional()
  @IsInt()
  @Min(1)
  @Max(PAGINATION.maxLimit)
  limit: number = PAGINATION.defaultLimit;
}

export class MovementSummaryResponse {
  @ApiProperty() id!: string;
  @ApiProperty({ example: 'barbell-full-squat' }) slug!: string;
  @ApiProperty({ example: 'Barbell full squat' }) name!: string;
  @ApiProperty({ enum: MOVEMENT_CATEGORIES, enumName: 'MovementCategory' })
  category!: MovementCategory;
  @ApiProperty({ enum: EQUIPMENT, enumName: 'Equipment' }) equipment!: Equipment;
  @ApiProperty({
    enum: MOVEMENT_DIFFICULTIES,
    enumName: 'MovementDifficulty',
    nullable: true,
    description: 'Nulo si la fuente no clasifica la dificultad',
  })
  difficulty!: MovementDifficulty | null;
  @ApiProperty({ enum: MUSCLE_GROUPS, enumName: 'MuscleGroup', isArray: true })
  primaryMuscles!: MuscleGroup[];
  @ApiProperty({ enum: MUSCLE_GROUPS, enumName: 'MuscleGroup', isArray: true })
  secondaryMuscles!: MuscleGroup[];
  @ApiProperty({ enum: RECORD_TYPES, enumName: 'RecordType', isArray: true })
  recordTypes!: RecordType[];
}

export class MovementDetailResponse extends MovementSummaryResponse {
  @ApiProperty({ type: String, nullable: true }) description!: string | null;
  @ApiProperty({ type: [String], description: 'Pasos de ejecución en español' })
  instructions!: string[];
  @ApiProperty({ type: String, nullable: true, example: 'hasaneyldrm/exercises-dataset' })
  source!: string | null;
}

export class PaginatedMovementsResponse {
  @ApiProperty({ type: [MovementSummaryResponse] }) items!: MovementSummaryResponse[];
  @ApiProperty() page!: number;
  @ApiProperty() limit!: number;
  @ApiProperty() total!: number;
  @ApiProperty() totalPages!: number;
}
