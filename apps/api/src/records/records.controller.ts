import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  Param,
  Patch,
  Post,
  UseGuards,
} from '@nestjs/common';
import {
  ApiBadRequestResponse,
  ApiBearerAuth,
  ApiCreatedResponse,
  ApiNoContentResponse,
  ApiNotFoundResponse,
  ApiOkResponse,
  ApiTags,
  ApiUnauthorizedResponse,
} from '@nestjs/swagger';
import { CurrentUser, JwtAuthGuard } from '../auth/jwt-auth.guard.js';
import type { AuthenticatedUser } from '../auth/jwt.strategy.js';
import { ApiErrorResponse } from '../common/dto/api-error.dto.js';
import {
  MovementRecordsResponse,
  PersonalRecordResponse,
  RecordsOverviewResponse,
  RecordsSummaryResponse,
} from './dto/record-responses.dto.js';
import { CreateRecordDto, UpdateRecordDto } from './dto/record.dto.js';
import { RecordsService } from './records.service.js';

/** Marcas personales del atleta autenticado. Nunca expone marcas de otros usuarios. */
@ApiTags('records')
@ApiBearerAuth()
@ApiUnauthorizedResponse({ type: ApiErrorResponse, description: 'UNAUTHORIZED' })
@UseGuards(JwtAuthGuard)
@Controller('records')
export class RecordsController {
  constructor(private readonly records: RecordsService) {}

  @Get()
  @ApiOkResponse({ type: RecordsOverviewResponse, description: 'Una fila por serie de marcas' })
  overview(@CurrentUser() user: AuthenticatedUser): Promise<RecordsOverviewResponse> {
    return this.records.overview(user.id);
  }

  // Debe declararse antes de `:movementSlug` para que "summary" no se trate como slug.
  @Get('summary')
  @ApiOkResponse({ type: RecordsSummaryResponse })
  summary(@CurrentUser() user: AuthenticatedUser): Promise<RecordsSummaryResponse> {
    return this.records.summary(user.id);
  }

  @Get(':movementSlug')
  @ApiOkResponse({ type: MovementRecordsResponse })
  @ApiBadRequestResponse({ type: ApiErrorResponse, description: 'VALIDATION_FAILED' })
  @ApiNotFoundResponse({ type: ApiErrorResponse, description: 'MOVEMENT_NOT_FOUND' })
  forMovement(
    @CurrentUser() user: AuthenticatedUser,
    @Param('movementSlug') movementSlug: string,
  ): Promise<MovementRecordsResponse> {
    return this.records.forMovement(user.id, movementSlug);
  }

  @Post()
  @ApiCreatedResponse({ type: PersonalRecordResponse })
  @ApiBadRequestResponse({
    type: ApiErrorResponse,
    description: 'VALIDATION_FAILED, RECORD_TYPE_NOT_ALLOWED o INVALID_RECORD_VALUE',
  })
  @ApiNotFoundResponse({ type: ApiErrorResponse, description: 'MOVEMENT_NOT_FOUND' })
  create(
    @CurrentUser() user: AuthenticatedUser,
    @Body() dto: CreateRecordDto,
  ): Promise<PersonalRecordResponse> {
    return this.records.create(user.id, dto);
  }

  @Patch(':id')
  @ApiOkResponse({ type: PersonalRecordResponse })
  @ApiBadRequestResponse({
    type: ApiErrorResponse,
    description: 'VALIDATION_FAILED o INVALID_RECORD_VALUE',
  })
  @ApiNotFoundResponse({ type: ApiErrorResponse, description: 'RECORD_NOT_FOUND' })
  update(
    @CurrentUser() user: AuthenticatedUser,
    @Param('id') id: string,
    @Body() dto: UpdateRecordDto,
  ): Promise<PersonalRecordResponse> {
    return this.records.update(user.id, id, dto);
  }

  @Delete(':id')
  @HttpCode(204)
  @ApiNoContentResponse({ description: 'Marca retirada (borrado lógico)' })
  @ApiNotFoundResponse({ type: ApiErrorResponse, description: 'RECORD_NOT_FOUND' })
  remove(@CurrentUser() user: AuthenticatedUser, @Param('id') id: string): Promise<void> {
    return this.records.remove(user.id, id);
  }
}
