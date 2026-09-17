import { Module } from '@nestjs/common';
import { AuthModule } from '../auth/auth.module.js';
import { PrismaModule } from '../prisma/prisma.module.js';
import { WodsController } from './wods.controller.js';
import { WodsService } from './wods.service.js';

@Module({
  imports: [AuthModule, PrismaModule],
  controllers: [WodsController],
  providers: [WodsService],
  exports: [WodsService],
})
export class WodsModule {}
