import { Body, Controller, Get, Put, UseGuards } from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiNotFoundResponse,
  ApiOkResponse,
  ApiTags,
  ApiUnauthorizedResponse,
} from '@nestjs/swagger';
import { CurrentUser, JwtAuthGuard } from '../auth/jwt-auth.guard.js';
import type { AuthenticatedUser } from '../auth/jwt.strategy.js';
import { ApiException } from '../common/api-exception.filter.js';
import { ApiErrorResponse } from '../common/dto/api-error.dto.js';
import type { AthleteProfile } from '../generated/prisma/client.js';
import { PrismaService } from '../prisma/prisma.service.js';
import { AthleteProfileResponse, UpsertAthleteProfileDto } from './dto/athlete-profile.dto.js';

/** Perfil deportivo del atleta autenticado (1:1 con el usuario). */
@ApiTags('profile')
@ApiBearerAuth()
@ApiUnauthorizedResponse({ type: ApiErrorResponse })
@UseGuards(JwtAuthGuard)
@Controller('profile')
export class ProfileController {
  constructor(private readonly prisma: PrismaService) {}

  @Get()
  @ApiOkResponse({ type: AthleteProfileResponse })
  @ApiNotFoundResponse({ type: ApiErrorResponse, description: 'PROFILE_NOT_FOUND' })
  async get(@CurrentUser() user: AuthenticatedUser): Promise<AthleteProfileResponse> {
    const profile = await this.prisma.athleteProfile.findUnique({ where: { userId: user.id } });
    if (!profile) {
      throw new ApiException(404, 'PROFILE_NOT_FOUND', 'Aún no has completado tu perfil deportivo');
    }
    return toResponse(profile);
  }

  /** Crea el perfil o lo reemplaza completo. */
  @Put()
  @ApiOkResponse({ type: AthleteProfileResponse })
  async upsert(
    @CurrentUser() user: AuthenticatedUser,
    @Body() dto: UpsertAthleteProfileDto,
  ): Promise<AthleteProfileResponse> {
    const data = {
      displayName: dto.displayName,
      experienceLevel: dto.experienceLevel,
      primaryGoal: dto.primaryGoal,
    };
    const profile = await this.prisma.athleteProfile.upsert({
      where: { userId: user.id },
      update: data,
      create: { ...data, userId: user.id },
    });
    return toResponse(profile);
  }
}

function toResponse(profile: AthleteProfile): AthleteProfileResponse {
  return {
    ...profile,
    createdAt: profile.createdAt.toISOString(),
    updatedAt: profile.updatedAt.toISOString(),
  };
}
