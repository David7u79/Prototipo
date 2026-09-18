import { describe, expect, it } from 'vitest';
import { validateEnvironment } from '../src/common/config/env.js';

const base = {
  DATABASE_URL: 'postgresql://garfit:garfit@db:5432/garfit',
  JWT_ACCESS_SECRET: 'test-secret-with-at-least-thirty-two-characters',
};

describe('validateEnvironment: CORS', () => {
  it('conserva los orígenes explícitos configurados', () => {
    expect(
      validateEnvironment({
        ...base,
        NODE_ENV: 'demo',
        CORS_ORIGINS: 'https://web.example.test, https://landing.example.test',
      }).CORS_ORIGINS,
    ).toEqual(['https://web.example.test', 'https://landing.example.test']);
  });

  it('exige una lista explícita y sin comodines en production', () => {
    expect(() => validateEnvironment({ ...base, NODE_ENV: 'production' })).toThrow(
      'CORS_ORIGINS debe contener orígenes explícitos en production',
    );
    expect(() =>
      validateEnvironment({ ...base, NODE_ENV: 'production', CORS_ORIGINS: '*' }),
    ).toThrow('CORS_ORIGINS debe contener orígenes explícitos en production');
  });
});
