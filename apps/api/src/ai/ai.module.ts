import { Module } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { AuthModule } from '../auth/auth.module.js';
import type { Env } from '../common/config/env.js';
import { PrismaModule } from '../prisma/prisma.module.js';
import { WorkoutsModule } from '../workouts/workouts.module.js';
import { AiController } from './ai.controller.js';
import { AiService } from './ai.service.js';
import { AiProvider } from './ai.provider.js';
import { FakeAiProvider } from './fake-ai.provider.js';
import { GeminiAiProvider } from './gemini-ai.provider.js';
import { ProgressSnapshotService } from './progress-snapshot.service.js';

@Module({
  imports: [AuthModule, PrismaModule, WorkoutsModule],
  controllers: [AiController],
  providers: [
    GeminiAiProvider,
    FakeAiProvider,
    {
      provide: AiProvider,
      inject: [ConfigService, GeminiAiProvider, FakeAiProvider],
      useFactory: (
        config: ConfigService<Env, true>,
        gemini: GeminiAiProvider,
        fake: FakeAiProvider,
      ) => (config.get('AI_PROVIDER', { infer: true }) === 'fake' ? fake : gemini),
    },
    ProgressSnapshotService,
    AiService,
  ],
  exports: [AiProvider, ProgressSnapshotService, AiService],
})
export class AiModule {}
