import { Module } from '@nestjs/common';
import { AiProvider } from './ai.provider.js';
import { GeminiAiProvider } from './gemini-ai.provider.js';
import { ProgressSnapshotService } from './progress-snapshot.service.js';

@Module({
  providers: [{ provide: AiProvider, useClass: GeminiAiProvider }, ProgressSnapshotService],
  exports: [AiProvider, ProgressSnapshotService],
})
export class AiModule {}
