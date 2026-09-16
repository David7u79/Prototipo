import { ApiProperty } from '@nestjs/swagger';
import { Transform } from 'class-transformer';
import { IsEnum, IsString, Length } from 'class-validator';
import { DISPLAY_NAME_MAX_LENGTH } from '../../common/constants.js';
import { ExperienceLevel, PrimaryGoal } from '../../generated/prisma/enums.js';

export class UpsertAthleteProfileDto {
  @ApiProperty({ maxLength: DISPLAY_NAME_MAX_LENGTH, example: 'Ana' })
  @Transform(({ value }: { value: unknown }) => (typeof value === 'string' ? value.trim() : value))
  @IsString()
  @Length(1, DISPLAY_NAME_MAX_LENGTH)
  displayName!: string;

  @ApiProperty({ enum: ExperienceLevel, enumName: 'ExperienceLevel' })
  @IsEnum(ExperienceLevel)
  experienceLevel!: ExperienceLevel;

  @ApiProperty({ enum: PrimaryGoal, enumName: 'PrimaryGoal' })
  @IsEnum(PrimaryGoal)
  primaryGoal!: PrimaryGoal;
}

export class AthleteProfileResponse {
  @ApiProperty() id!: string;
  @ApiProperty() userId!: string;
  @ApiProperty() displayName!: string;
  @ApiProperty({ enum: ExperienceLevel, enumName: 'ExperienceLevel' })
  experienceLevel!: ExperienceLevel;
  @ApiProperty({ enum: PrimaryGoal, enumName: 'PrimaryGoal' }) primaryGoal!: PrimaryGoal;
  @ApiProperty({ format: 'date-time' }) createdAt!: string;
  @ApiProperty({ format: 'date-time' }) updatedAt!: string;
}
