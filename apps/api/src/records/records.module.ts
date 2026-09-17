import { Module } from '@nestjs/common';
import { AuthModule } from '../auth/auth.module.js';
import { RecordsController } from './records.controller.js';
import { RecordsService } from './records.service.js';

@Module({
  imports: [AuthModule],
  controllers: [RecordsController],
  providers: [RecordsService],
})
export class RecordsModule {}
