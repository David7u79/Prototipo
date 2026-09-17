import { Body, Controller, Delete, Get, HttpCode, Post, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiOkResponse, ApiTags } from '@nestjs/swagger';
import type { AiAnalysisResponse, AiConsentResponse, AiStatusResponse } from '@garfit/types';
import { CurrentUser, JwtAuthGuard } from '../auth/jwt-auth.guard.js';
import type { AuthenticatedUser } from '../auth/jwt.strategy.js';
import { AiService } from './ai.service.js';
@ApiTags('ai')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('ai')
export class AiController {
  constructor(private readonly ai: AiService) {}
  @Get('status')
  @ApiOkResponse()
  status(@CurrentUser() user: AuthenticatedUser): Promise<AiStatusResponse> {
    return this.ai.status(user.id);
  }
  @Post('consent')
  @HttpCode(200)
  @ApiOkResponse()
  consent(@CurrentUser() user: AuthenticatedUser): Promise<AiConsentResponse> {
    return this.ai.giveConsent(user.id);
  }
  @Delete('consent')
  @HttpCode(200)
  @ApiOkResponse()
  revoke(@CurrentUser() user: AuthenticatedUser): Promise<AiConsentResponse> {
    return this.ai.revokeConsent(user.id);
  }
  @Post('analyze/progress')
  @HttpCode(200)
  @ApiOkResponse()
  progress(
    @CurrentUser() user: AuthenticatedUser,
    @Body() body: unknown,
  ): Promise<AiAnalysisResponse> {
    const periodDays =
      typeof body === 'object' && body !== null && 'periodDays' in body
        ? (body as { periodDays?: unknown }).periodDays
        : 30;
    if (periodDays !== 30 && periodDays !== 60 && periodDays !== 90)
      throw new Error('periodDays inválido');
    return this.ai.analyzeProgress(user.id, periodDays);
  }
}
