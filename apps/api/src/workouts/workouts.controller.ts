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
import { ApiBearerAuth, ApiOkResponse, ApiTags } from '@nestjs/swagger';
import { CurrentUser, JwtAuthGuard } from '../auth/jwt-auth.guard.js';
import type { AuthenticatedUser } from '../auth/jwt.strategy.js';
import {
  CompleteWorkoutDto,
  CreateWorkoutDto,
  ResultsDto,
  UpdateWorkoutDto,
  WorkoutFiltersDto,
} from './dto/workout.dto.js';
import { WorkoutsService } from './workouts.service.js';

@ApiTags('workouts')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('workouts')
export class WorkoutsController {
  constructor(private readonly workouts: WorkoutsService) {}
  @Get() @ApiOkResponse({ type: Object }) list(
    @CurrentUser() user: AuthenticatedUser,
    @Query() filters: WorkoutFiltersDto,
  ) {
    return this.workouts.list(user.id, filters);
  }
  @Get('stats') @ApiOkResponse({ type: Object }) stats(@CurrentUser() user: AuthenticatedUser) {
    return this.workouts.stats(user.id);
  }
  @Post() create(@CurrentUser() user: AuthenticatedUser, @Body() dto: CreateWorkoutDto) {
    return this.workouts.create(user.id, dto);
  }
  @Get(':id') get(@CurrentUser() user: AuthenticatedUser, @Param('id') id: string) {
    return this.workouts.get(user.id, id);
  }
  @Patch(':id') update(
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
  @Post(':id/start') start(@CurrentUser() user: AuthenticatedUser, @Param('id') id: string) {
    return this.workouts.start(user.id, id);
  }
  @Put(':id/results') results(
    @CurrentUser() user: AuthenticatedUser,
    @Param('id') id: string,
    @Body() dto: ResultsDto,
  ) {
    return this.workouts.saveResults(user.id, id, dto);
  }
  @Post(':id/complete') complete(
    @CurrentUser() user: AuthenticatedUser,
    @Param('id') id: string,
    @Body() dto: CompleteWorkoutDto,
  ) {
    return this.workouts.complete(user.id, id, dto);
  }
}
