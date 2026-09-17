import 'dotenv/config';
import { ConfigService } from '@nestjs/config';
import { unknownEvidenceIds, type AiContextBundle } from '@garfit/domain';
import { aiModelOutputJsonSchema, aiModelOutputSchema } from '@garfit/validation';
import type { Env } from '../common/config/env.js';
import { buildAiUserContent } from '../ai/ai-prompt.js';
import { GeminiAiProvider } from '../ai/gemini-ai.provider.js';
import { SYSTEM_INSTRUCTION } from '../ai/prompts/movement-explanation.js';

if (!process.env.GEMINI_API_KEY) {
  console.log('SKIPPED — GEMINI_API_KEY not configured');
  process.exit(0);
}

process.env.GEMINI_MODEL ??= 'gemini-3.8-flash';
process.env.AI_TIMEOUT_MS ??= '25000';

const context: AiContextBundle = {
  sufficient: true,
  facts: [
    { id: 'movement:name', category: 'MOVEMENT', label: 'Nombre', value: 'Sentadilla' },
    { id: 'movement:equipment', category: 'MOVEMENT', label: 'Equipamiento', value: 'Barra' },
    {
      id: 'movement:instruction:1',
      category: 'MOVEMENT',
      label: 'Instrucción 1 del catálogo',
      value: 'Mantén los pies apoyados durante el descenso.',
    },
  ],
  dataUsed: [{ label: 'Movimiento', value: 'Sentadilla de ejemplo' }],
};

const provider = new GeminiAiProvider(new ConfigService<Env, true>());
const started = Date.now();
const result = await provider.generate({
  operation: 'MOVEMENT_EXPLANATION',
  systemInstruction: SYSTEM_INSTRUCTION,
  userContent: buildAiUserContent(
    'MOVEMENT_EXPLANATION',
    'Explica el movimiento de ejemplo usando únicamente los hechos recibidos.',
    null,
    context,
  ),
  responseJsonSchema: aiModelOutputJsonSchema,
});
const parsed = aiModelOutputSchema.safeParse(JSON.parse(result.text));
const evidenceValid = parsed.success && unknownEvidenceIds(parsed.data, context.facts).length === 0;

console.log(`model=${result.model}`);
console.log(`durationMs=${Date.now() - started}`);
console.log(`inputTokens=${result.usage?.inputTokens ?? 'unknown'}`);
console.log(`outputTokens=${result.usage?.outputTokens ?? 'unknown'}`);
console.log(`evidenceValid=${evidenceValid}`);

if (!parsed.success || !evidenceValid) process.exitCode = 1;
