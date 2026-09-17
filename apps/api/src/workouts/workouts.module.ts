import { Module } from '@nestjs/common';
import { AuthModule } from '../auth/auth.module.js';
import { PrismaModule } from '../prisma/prisma.module.js';
import { WorkoutsController } from './workouts.controller.js';
import { WorkoutsService } from './workouts.service.js';

@Module({
  imports: [AuthModule, PrismaModule],
  controllers: [WorkoutsController],
  providers: [WorkoutsService],
})
export class WorkoutsModule {}
