import {
  DISPLAY_NAME_MAX_LENGTH,
  EXPERIENCE_LEVELS,
  type ExperienceLevel,
  ISO_DATE_PATTERN,
  PRIMARY_GOALS,
  type PrimaryGoal,
  PROFILE_LIMITS,
  UNIT_SYSTEMS,
  type UnitSystem,
} from '@garfit/domain';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Transform } from 'class-transformer';
import { IsIn, IsNumber, IsOptional, IsString, Length, Matches, Max, Min } from 'class-validator';

const trim = ({ value }: { value: unknown }) => (typeof value === 'string' ? value.trim() : value);
const ISO_DATE_MESSAGE = 'Usa el formato AAAA-MM-DD';

/**
 * `PUT /profile`: crea o reemplaza el perfil completo. Los campos opcionales ausentes se guardan
 * como null. Altura en cm y peso en kg. Las reglas entre campos (edad, fechas futuras,
 * trainingSince ≥ birthDate) las comprueba ProfileService con @garfit/domain.
 */
export class UpsertAthleteProfileDto {
  @ApiProperty({ maxLength: DISPLAY_NAME_MAX_LENGTH, example: 'Ana' })
  @Transform(trim)
  @IsString()
  @Length(1, DISPLAY_NAME_MAX_LENGTH)
  displayName!: string;

  @ApiProperty({ enum: EXPERIENCE_LEVELS, enumName: 'ExperienceLevel' })
  @IsIn(EXPERIENCE_LEVELS)
  experienceLevel!: ExperienceLevel;

  @ApiProperty({ enum: PRIMARY_GOALS, enumName: 'PrimaryGoal' })
  @IsIn(PRIMARY_GOALS)
  primaryGoal!: PrimaryGoal;

  @ApiPropertyOptional({ enum: UNIT_SYSTEMS, enumName: 'UnitSystem', default: 'METRIC' })
  @IsOptional()
  @IsIn(UNIT_SYSTEMS)
  preferredUnits: UnitSystem = 'METRIC';

  @ApiPropertyOptional({ type: String, nullable: true, format: 'date', example: '1998-04-21' })
  @IsOptional()
  @Matches(ISO_DATE_PATTERN, { message: ISO_DATE_MESSAGE })
  birthDate: string | null = null;

  @ApiPropertyOptional({
    type: Number,
    nullable: true,
    minimum: PROFILE_LIMITS.heightCm.min,
    maximum: PROFILE_LIMITS.heightCm.max,
  })
  @IsOptional()
  @IsNumber({ maxDecimalPlaces: 1 })
  @Min(PROFILE_LIMITS.heightCm.min)
  @Max(PROFILE_LIMITS.heightCm.max)
  heightCm: number | null = null;

  @ApiPropertyOptional({
    type: Number,
    nullable: true,
    minimum: PROFILE_LIMITS.weightKg.min,
    maximum: PROFILE_LIMITS.weightKg.max,
    description: 'Siempre en kg',
  })
  @IsOptional()
  @IsNumber({ maxDecimalPlaces: 2 })
  @Min(PROFILE_LIMITS.weightKg.min)
  @Max(PROFILE_LIMITS.weightKg.max)
  weightKg: number | null = null;

  @ApiPropertyOptional({ type: String, nullable: true, format: 'date' })
  @IsOptional()
  @Matches(ISO_DATE_PATTERN, { message: ISO_DATE_MESSAGE })
  trainingSince: string | null = null;
}

export class AthleteProfileResponse {
  @ApiProperty() id!: string;
  @ApiProperty() userId!: string;
  @ApiProperty() displayName!: string;
  @ApiProperty({ enum: EXPERIENCE_LEVELS, enumName: 'ExperienceLevel' })
  experienceLevel!: ExperienceLevel;
  @ApiProperty({ enum: PRIMARY_GOALS, enumName: 'PrimaryGoal' }) primaryGoal!: PrimaryGoal;
  @ApiProperty({ enum: UNIT_SYSTEMS, enumName: 'UnitSystem' }) preferredUnits!: UnitSystem;
  @ApiProperty({ type: String, nullable: true, format: 'date' }) birthDate!: string | null;
  @ApiProperty({ type: Number, nullable: true }) heightCm!: number | null;
  @ApiProperty({ type: Number, nullable: true, description: 'kg' }) weightKg!: number | null;
  @ApiProperty({ type: String, nullable: true, format: 'date' }) trainingSince!: string | null;
  @ApiProperty({ format: 'date-time' }) createdAt!: string;
  @ApiProperty({ format: 'date-time' }) updatedAt!: string;
}
