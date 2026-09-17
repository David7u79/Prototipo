import { describe, expect, it } from 'vitest';
import { ApiError } from '@garfit/api-client';
import { aiErrorMessage } from '../lib/ai';
describe('aiErrorMessage', () => {
  it.each([
    ['AI_CONSENT_REQUIRED', 403, /consentimiento/i],
    ['AI_DISABLED', 503, /no configurado/i],
    ['AI_PROVIDER_UNAVAILABLE', 503, /no está disponible/i],
    ['AI_RATE_LIMITED', 429, /límite/i],
    ['AI_INVALID_RESPONSE', 502, /respuesta no válida/i],
  ])('traduce %s', (code, statusCode, message) => {
    expect(aiErrorMessage(new ApiError(statusCode, { statusCode, code, message: '' }))).toMatch(
      message,
    );
  });
});
