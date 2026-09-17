import { Body, Controller, Get, Put, UseGuards } from '@nestjs/common';
import {
  ApiBadRequestResponse,
  ApiBearerAuth,
  ApiNotFoundResponse,
  ApiOkResponse,
  ApiTags,
  ApiUnauthorizedResponse,
} from '@nestjs/swagger';
import { CurrentUser, JwtAuthGuard } from '../auth/jwt-auth.guard.js';
import type { AuthenticatedUser } from '../auth/jwt.strategy.js';
import { ApiErrorResponse } from '../common/dto/api-error.dto.js';
import { AthleteProfileResponse, UpsertAthleteProfileDto } from './dto/athlete-profile.dto.js';
import { ProfileService } from './profile.service.js';

/** Perfil deportivo del atleta autenticado (1:1 con el usuario). */
@ApiTags('profile')
@ApiBearerAuth()
@ApiUnauthorizedResponse({ type: ApiErrorResponse })
@UseGuards(JwtAuthGuard)
@Controller('profile')
export class ProfileController {
  constructor(private readonly profiles: ProfileService) {}

  @Get()
  @ApiOkResponse({ type: AthleteProfileResponse })
  @ApiNotFoundResponse({ type: ApiErrorResponse, description: 'PROFILE_NOT_FOUND' })
  get(@CurrentUser() user: AuthenticatedUser): Promise<AthleteProfileResponse> {
    return this.profiles.get(user.id);
  }

  /** Crea el perfil o lo reemplaza completo. */
  @Put()
  @ApiOkResponse({ type: AthleteProfileResponse })
  @ApiBadRequestResponse({ type: ApiErrorResponse, description: 'VALIDATION_FAILED' })
  upsert(
    @CurrentUser() user: AuthenticatedUser,
    @Body() dto: UpsertAthleteProfileDto,
  ): Promise<AthleteProfileResponse> {
    return this.profiles.upsert(user.id, dto);
  }
}
