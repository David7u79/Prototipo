import { Body, Controller, Get, Param, Post, Query, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiCreatedResponse, ApiOkResponse, ApiTags } from '@nestjs/swagger';
import { CurrentUser, JwtAuthGuard } from '../auth/jwt-auth.guard.js';
import type { AuthenticatedUser } from '../auth/jwt.strategy.js';
import { CreateWodDto, WodFiltersDto } from './dto/wod.dto.js';
import { PaginatedWodsResponse, WodDetailResponse } from './dto/wod-responses.dto.js';
import { WodsService } from './wods.service.js';

@ApiTags('wods')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('wods')
export class WodsController {
  constructor(private readonly wods: WodsService) {}
  @Get() @ApiOkResponse({ type: PaginatedWodsResponse }) list(
    @CurrentUser() user: AuthenticatedUser,
    @Query() filters: WodFiltersDto,
  ) {
    return this.wods.list(user.id, filters);
  }
  @Get(':slug') @ApiOkResponse({ type: WodDetailResponse }) get(
    @CurrentUser() user: AuthenticatedUser,
    @Param('slug') slug: string,
  ) {
    return this.wods.get(user.id, slug);
  }
  @Post() @ApiCreatedResponse({ type: WodDetailResponse }) create(
    @CurrentUser() user: AuthenticatedUser,
    @Body() dto: CreateWodDto,
  ) {
    return this.wods.create(user.id, dto);
  }
}
