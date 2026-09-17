import {
  ISO_DATE_PATTERN,
  RECORD_NOTES_MAX_LENGTH,
  RECORD_REPETITIONS_LIMITS,
  RECORD_TYPES,
  RECORD_UNITS,
  RECORD_VALUE_MAX_DECIMALS,
  type RecordType,
  type RecordUnit,
  SLUG_MAX_LENGTH,
  SLUG_PATTERN,
} from '@garfit/domain';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Transform } from 'class-transformer';
import {
  IsIn,
  IsInt,
  IsNumber,
  IsOptional,
  IsPositive,
  IsString,
  Matches,
  Max,
  MaxLength,
  Min,
} from 'class-validator';

const trim = ({ value }: { value: unknown }) => (typeof value === 'string' ? value.trim() : value);
const ISO_DATE_MESSAGE = 'Usa el formato AAAA-MM-DD';

/**
 * `POST /records`. La validación de forma está aquí; las reglas que dependen del tipo de marca
 * y del movimiento (unidad, límites canónicos, repeticiones, fecha real) las aplica
 * RecordsService con @garfit/domain. `normalizedValue`, `source` y `userId` no se aceptan: los
 * fija el servidor (whitelist + forbidNonWhitelisted rechazan campos extra).
 */
export class CreateRecordDto {
  @ApiProperty({ maxLength: SLUG_MAX_LENGTH, example: 'barbell-full-squat' })
  @IsString()
  @MaxLength(SLUG_MAX_LENGTH)
  @Matches(SLUG_PATTERN, { message: 'El movimiento no es válido' })
  movementSlug!: string;

  @ApiProperty({ enum: RECORD_TYPES, enumName: 'RecordType' })
  @IsIn(RECORD_TYPES)
  recordType!: RecordType;

  @ApiProperty({ example: 100, description: 'Valor en `unit`, mayor que 0' })
  @IsNumber({ maxDecimalPlaces: RECORD_VALUE_MAX_DECIMALS })
  @IsPositive()
  value!: number;

  @ApiProperty({ enum: RECORD_UNITS, enumName: 'RecordUnit' })
  @IsIn(RECORD_UNITS)
  unit!: RecordUnit;

  @ApiPropertyOptional({
    type: Number,
    nullable: true,
    minimum: RECORD_REPETITIONS_LIMITS.min,
    maximum: RECORD_REPETITIONS_LIMITS.max,
    description: 'Obligatorio en WEIGHT (1 = 1RM); null en el resto',
  })
  @IsOptional()
  @IsInt()
  @Min(RECORD_REPETITIONS_LIMITS.min)
  @Max(RECORD_REPETITIONS_LIMITS.max)
  repetitions: number | null = null;

  @ApiProperty({ format: 'date', example: '2026-05-20' })
  @Matches(ISO_DATE_PATTERN, { message: ISO_DATE_MESSAGE })
  performedAt!: string;

  @ApiPropertyOptional({ type: String, nullable: true, maxLength: RECORD_NOTES_MAX_LENGTH })
  @Transform(trim)
  @IsOptional()
  @IsString()
  @MaxLength(RECORD_NOTES_MAX_LENGTH)
  notes: string | null = null;
}

/** `PATCH /records/:id`. No cambia movimiento, tipo ni origen; `value` y `unit` van juntos. */
export class UpdateRecordDto {
  @ApiPropertyOptional()
  @IsOptional()
  @IsNumber({ maxDecimalPlaces: RECORD_VALUE_MAX_DECIMALS })
  @IsPositive()
  value?: number;

  @ApiPropertyOptional({ enum: RECORD_UNITS, enumName: 'RecordUnit' })
  @IsOptional()
  @IsIn(RECORD_UNITS)
  unit?: RecordUnit;

  @ApiPropertyOptional({ type: Number, nullable: true })
  @IsOptional()
  @IsInt()
  @Min(RECORD_REPETITIONS_LIMITS.min)
  @Max(RECORD_REPETITIONS_LIMITS.max)
  repetitions?: number | null;

  @ApiPropertyOptional({ format: 'date' })
  @IsOptional()
  @Matches(ISO_DATE_PATTERN, { message: ISO_DATE_MESSAGE })
  performedAt?: string;

  @ApiPropertyOptional({ type: String, nullable: true, maxLength: RECORD_NOTES_MAX_LENGTH })
  @Transform(trim)
  @IsOptional()
  @IsString()
  @MaxLength(RECORD_NOTES_MAX_LENGTH)
  notes?: string | null;
}
