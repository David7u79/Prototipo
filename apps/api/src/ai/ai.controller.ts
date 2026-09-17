import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  Param,
  Post,
  Query,
  UseGuards,
} from '@nestjs/common';
import { ApiBearerAuth, ApiOkResponse, ApiTags } from '@nestjs/swagger';
import type { AiAnalysisResponse as AiAnalysisResponseType } from '@garfit/types';
import { CurrentUser, JwtAuthGuard } from '../auth/jwt-auth.guard.js';
import type { AuthenticatedUser } from '../auth/jwt.strategy.js';
import { AiService } from './ai.service.js';
import { AiAnalysisFiltersDto } from './dto/ai.dto.js';
import {
  AiAnalysisResponse,
  AiConsentResponse,
  AiStatusResponse,
  PaginatedAiAnalysesResponse,
} from './dto/ai-responses.dto.js';
@ApiTags('ai')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('ai')
export class AiController {
  constructor(private readonly ai: AiService) {}
  @Get('analyses')
  @ApiOkResponse({ type: PaginatedAiAnalysesResponse })
  listAnalyses(@CurrentUser() user: AuthenticatedUser, @Query() filters: AiAnalysisFiltersDto) {
    return this.ai.list(user.id, filters);
  }
  @Get('analyses/:id')
  @ApiOkResponse({ type: AiAnalysisResponse })
  getAnalysis(@CurrentUser() user: AuthenticatedUser, @Param('id') id: string) {
    return this.ai.getAnalysis(user.id, id);
  }
  @Delete('analyses/:id')
  @HttpCode(204)
  removeAnalysis(@CurrentUser() user: AuthenticatedUser, @Param('id') id: string) {
    return this.ai.removeAnalysis(user.id, id);
  }
  @Delete('analyses')
  @HttpCode(204)
  removeAllAnalyses(@CurrentUser() user: AuthenticatedUser) {
    return this.ai.removeAllAnalyses(user.id);
  }
  @Get('status')
  @ApiOkResponse({ type: AiStatusResponse })
  status(
    @CurrentUser() user: AuthenticatedUser,
  ): Promise<import('@garfit/types').AiStatusResponse> {
    return this.ai.status(user.id);
  }
  @Post('consent')
  @HttpCode(200)
  @ApiOkResponse({ type: AiConsentResponse })
  consent(
    @CurrentUser() user: AuthenticatedUser,
  ): Promise<import('@garfit/types').AiConsentResponse> {
    return this.ai.giveConsent(user.id);
  }
  @Delete('consent')
  @HttpCode(200)
  @ApiOkResponse({ type: AiConsentResponse })
  revoke(
    @CurrentUser() user: AuthenticatedUser,
  ): Promise<import('@garfit/types').AiConsentResponse> {
    return this.ai.revokeConsent(user.id);
  }
  @Post('analyze/progress')
  @HttpCode(200)
  @ApiOkResponse({ type: AiAnalysisResponse })
  progress(
    @CurrentUser() user: AuthenticatedUser,
    @Body() body: unknown,
  ): Promise<AiAnalysisResponseType> {
    const periodDays =
      typeof body === 'object' && body !== null && 'periodDays' in body
        ? (body as { periodDays?: unknown }).periodDays
        : 30;
    if (periodDays !== 30 && periodDays !== 60 && periodDays !== 90)
      throw new Error('periodDays inválido');
    return this.ai.analyzeProgress(user.id, periodDays);
  }

  @Post('analyze/workout/:workoutId')
  @HttpCode(200)
  @ApiOkResponse({ type: AiAnalysisResponse })
  analyzeWorkout(
    @CurrentUser() user: AuthenticatedUser,
    @Param('workoutId') workoutId: string,
  ): Promise<AiAnalysisResponseType> {
    return this.ai.analyzeWorkout(user.id, workoutId);
  }

  @Post('explain/wod/:slug')
  @HttpCode(200)
  @ApiOkResponse({ type: AiAnalysisResponse })
  explainWod(
    @CurrentUser() user: AuthenticatedUser,
    @Param('slug') slug: string,
  ): Promise<AiAnalysisResponseType> {
    return this.ai.explainWod(user.id, slug);
  }

  @Post('explain/movement/:slug')
  @HttpCode(200)
  @ApiOkResponse({ type: AiAnalysisResponse })
  explainMovement(
    @CurrentUser() user: AuthenticatedUser,
    @Param('slug') slug: string,
  ): Promise<AiAnalysisResponseType> {
    return this.ai.explainMovement(user.id, slug);
  }
}
