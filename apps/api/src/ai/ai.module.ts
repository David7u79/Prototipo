import { Module } from '@nestjs/common';
import { AiProvider } from './ai.provider.js';
import { GeminiAiProvider } from './gemini-ai.provider.js';

@Module({
  providers: [{ provide: AiProvider, useClass: GeminiAiProvider }],
  exports: [AiProvider],
})
export class AiModule {}
