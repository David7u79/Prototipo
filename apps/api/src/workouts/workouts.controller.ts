import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  Param,
  Patch,
  Post,
  Put,
  Query,
  UseGuards,
} from '@nestjs/common';
import { ApiBearerAuth, ApiCreatedResponse, ApiOkResponse, ApiTags } from '@nestjs/swagger';
import { CurrentUser, JwtAuthGuard } from '../auth/jwt-auth.guard.js';
import type { AuthenticatedUser } from '../auth/jwt.strategy.js';
import {
  CompleteWorkoutDto,
  CreateWorkoutDto,
  ResultsDto,
  UpdateWorkoutDto,
  WorkoutFiltersDto,
} from './dto/workout.dto.js';
import {
  PaginatedWorkoutsResponse,
  WorkoutDetailResponse,
  WorkoutStatsResponse,
} from './dto/workout-responses.dto.js';
import { WorkoutsService } from './workouts.service.js';

@ApiTags('workouts')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('workouts')
export class WorkoutsController {
  constructor(private readonly workouts: WorkoutsService) {}
  @Get() @ApiOkResponse({ type: PaginatedWorkoutsResponse }) list(
    @CurrentUser() user: AuthenticatedUser,
    @Query() filters: WorkoutFiltersDto,
  ) {
    return this.workouts.list(user.id, filters);
  }
  @Get('stats') @ApiOkResponse({ type: WorkoutStatsResponse }) stats(
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.workouts.stats(user.id);
  }
  @Post() @ApiCreatedResponse({ type: WorkoutDetailResponse }) create(
    @CurrentUser() user: AuthenticatedUser,
    @Body() dto: CreateWorkoutDto,
  ) {
    return this.workouts.create(user.id, dto);
  }
  @Get(':id') @ApiOkResponse({ type: WorkoutDetailResponse }) get(
    @CurrentUser() user: AuthenticatedUser,
    @Param('id') id: string,
  ) {
    return this.workouts.get(user.id, id);
  }
  @Patch(':id') @ApiOkResponse({ type: WorkoutDetailResponse }) update(
    @CurrentUser() user: AuthenticatedUser,
    @Param('id') id: string,
    @Body() dto: UpdateWorkoutDto,
  ) {
    return this.workouts.update(user.id, id, dto);
  }
  @Delete(':id') @HttpCode(204) remove(
    @CurrentUser() user: AuthenticatedUser,
    @Param('id') id: string,
  ) {
    return this.workouts.remove(user.id, id);
  }
  @Post(':id/start') @ApiCreatedResponse({ type: WorkoutDetailResponse }) start(
    @CurrentUser() user: AuthenticatedUser,
    @Param('id') id: string,
  ) {
    return this.workouts.start(user.id, id);
  }
  @Put(':id/results') @ApiOkResponse({ type: WorkoutDetailResponse }) results(
    @CurrentUser() user: AuthenticatedUser,
    @Param('id') id: string,
    @Body() dto: ResultsDto,
  ) {
    return this.workouts.saveResults(user.id, id, dto);
  }
  @Post(':id/complete') @ApiCreatedResponse({ type: WorkoutDetailResponse }) complete(
    @CurrentUser() user: AuthenticatedUser,
    @Param('id') id: string,
    @Body() dto: CompleteWorkoutDto,
  ) {
    return this.workouts.complete(user.id, id, dto);
  }
}
