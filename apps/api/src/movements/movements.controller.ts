import { Controller, Get, Param, Query } from '@nestjs/common';
import {
  ApiBadRequestResponse,
  ApiNotFoundResponse,
  ApiOkResponse,
  ApiTags,
} from '@nestjs/swagger';
import { ApiErrorResponse } from '../common/dto/api-error.dto.js';
import {
  MovementDetailResponse,
  MovementFiltersDto,
  PaginatedMovementsResponse,
} from './dto/movement.dto.js';
import { MovementsService } from './movements.service.js';

/** Catálogo de movimientos: lectura pública, sin endpoints de alta, edición ni borrado. */
@ApiTags('movements')
@Controller('movements')
export class MovementsController {
  constructor(private readonly movements: MovementsService) {}

  @Get()
  @ApiOkResponse({ type: PaginatedMovementsResponse })
  @ApiBadRequestResponse({ type: ApiErrorResponse, description: 'VALIDATION_FAILED' })
  list(@Query() filters: MovementFiltersDto): Promise<PaginatedMovementsResponse> {
    return this.movements.list(filters);
  }

  @Get(':slug')
  @ApiOkResponse({ type: MovementDetailResponse })
  @ApiBadRequestResponse({ type: ApiErrorResponse, description: 'VALIDATION_FAILED' })
  @ApiNotFoundResponse({ type: ApiErrorResponse, description: 'MOVEMENT_NOT_FOUND' })
  get(@Param('slug') slug: string): Promise<MovementDetailResponse> {
    return this.movements.getBySlug(slug);
  }
}
