import { Injectable } from '@nestjs/common';
import { AiProvider, type AiGenerationRequest, type AiGenerationResult } from './ai.provider.js';
@Injectable()
export class FakeAiProvider extends AiProvider {
  readonly name = 'FAKE' as const;
  readonly model = 'fake';
  private readonly queue: (AiGenerationResult | Error | string)[] = [];
  isConfigured(): boolean {
    return true;
  }
  enqueue(result: AiGenerationResult | Error | string): void {
    this.queue.push(result);
  }
  async generate(request: AiGenerationRequest): Promise<AiGenerationResult> {
    const next = this.queue.shift();
    if (next instanceof Error) throw next;
    if (typeof next === 'string') return { text: next, model: this.model, usage: null };
    if (next) return next;
    const match = request.userContent.match(/<garfit_data>\s*([\s\S]*?)\s*<\/garfit_data>/);
    const data = match ? (JSON.parse(match[1]) as { facts?: { id: string }[] }) : {};
    const ids = (data.facts ?? []).slice(0, 2).map((fact) => fact.id);
    return {
      text: JSON.stringify({
        status: 'COMPLETED',
        summary: 'Resumen generado a partir de los datos disponibles.',
        observations: ids.map((id, index) => ({
          title: `Observación ${index + 1}`,
          description: 'Dato registrado por GarFit.',
          evidenceIds: [id],
        })),
        suggestions: [
          {
            title: 'Siguiente paso',
            description: 'Mantén registros consistentes.',
            evidenceIds: [],
          },
        ],
        limitations: [],
        missingData: [],
      }),
      model: this.model,
      usage: null,
    };
  }
}
