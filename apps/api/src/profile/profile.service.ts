import { ageInYears, isNotInFuture, isValidIsoDate, PROFILE_LIMITS } from '@garfit/domain';
import { Injectable } from '@nestjs/common';
import { ApiException } from '../common/api-exception.filter.js';
import { fromIsoDate, toIsoDate } from '../common/iso-date.js';
import type { AthleteProfile } from '../generated/prisma/client.js';
import { PrismaService } from '../prisma/prisma.service.js';
import type { AthleteProfileResponse, UpsertAthleteProfileDto } from './dto/athlete-profile.dto.js';

const invalid = (message: string, field: string) =>
  new ApiException(400, 'VALIDATION_FAILED', message, [`${field}: ${message}`]);

@Injectable()
export class ProfileService {
  constructor(private readonly prisma: PrismaService) {}

  async get(userId: string): Promise<AthleteProfileResponse> {
    const profile = await this.prisma.athleteProfile.findUnique({ where: { userId } });
    if (!profile) {
      throw new ApiException(404, 'PROFILE_NOT_FOUND', 'Aún no has completado tu perfil deportivo');
    }
    return toProfileResponse(profile);
  }

  async upsert(userId: string, dto: UpsertAthleteProfileDto): Promise<AthleteProfileResponse> {
    // Las fechas se validan como texto ANTES de convertirlas: new Date('2026-02-30') no falla,
    // se desborda a marzo.
    assertProfileDates(dto.birthDate, dto.trainingSince);
    const data = {
      displayName: dto.displayName,
      experienceLevel: dto.experienceLevel,
      primaryGoal: dto.primaryGoal,
      preferredUnits: dto.preferredUnits,
      birthDate: dto.birthDate ? fromIsoDate(dto.birthDate) : null,
      heightCm: dto.heightCm,
      weightKg: dto.weightKg,
      trainingSince: dto.trainingSince ? fromIsoDate(dto.trainingSince) : null,
    };
    const profile = await this.prisma.athleteProfile.upsert({
      where: { userId },
      update: data,
      create: { ...data, userId },
    });
    return toProfileResponse(profile);
  }
}

/** Reglas entre campos del perfil, idénticas a athleteProfileSchema de @garfit/validation. */
export function assertProfileDates(birthDate: string | null, trainingSince: string | null): void {
  for (const [field, value] of [
    ['birthDate', birthDate],
    ['trainingSince', trainingSince],
  ] as const) {
    if (value === null) continue;
    if (!isValidIsoDate(value)) throw invalid('La fecha no existe', field);
    if (!isNotInFuture(value)) throw invalid('La fecha no puede estar en el futuro', field);
  }
  if (birthDate) {
    const age = ageInYears(birthDate);
    const { min, max } = PROFILE_LIMITS.ageYears;
    if (age < min || age > max) {
      throw invalid(`La edad debe estar entre ${min} y ${max} años`, 'birthDate');
    }
  }
  if (birthDate && trainingSince && trainingSince < birthDate) {
    throw invalid('No puede ser anterior a la fecha de nacimiento', 'trainingSince');
  }
}

export function toProfileResponse(profile: AthleteProfile): AthleteProfileResponse {
  return {
    id: profile.id,
    userId: profile.userId,
    displayName: profile.displayName,
    experienceLevel: profile.experienceLevel,
    primaryGoal: profile.primaryGoal,
    preferredUnits: profile.preferredUnits,
    birthDate: profile.birthDate ? toIsoDate(profile.birthDate) : null,
    heightCm: profile.heightCm === null ? null : Number(profile.heightCm),
    weightKg: profile.weightKg === null ? null : Number(profile.weightKg),
    trainingSince: profile.trainingSince ? toIsoDate(profile.trainingSince) : null,
    createdAt: profile.createdAt.toISOString(),
    updatedAt: profile.updatedAt.toISOString(),
  };
}
