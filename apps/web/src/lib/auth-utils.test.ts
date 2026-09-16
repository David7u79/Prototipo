import { describe, expect, it } from 'vitest';
import { authErrorMessage, safeNext } from './auth-utils';

describe('safeNext', () => {
  it('only accepts local app routes', () => {
    expect(safeNext('/app/profile')).toBe('/app/profile');
    expect(safeNext('https://evil.test')).toBe('/app');
    expect(safeNext('//evil.test')).toBe('/app');
    expect(safeNext('/login')).toBe('/app');
  });
});
describe('authErrorMessage', () => {
  it('maps known authentication errors into Spanish', () => {
    expect(authErrorMessage('INVALID_CREDENTIALS')).toBe(
      'El correo o la contraseña no son correctos.',
    );
    expect(authErrorMessage('NETWORK_ERROR')).toBe('No fue posible conectar con el servidor.');
  });
});
