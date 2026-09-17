import { describe, expect, it } from 'vitest';
import { athleteProfileSchema, loginSchema, registerSchema } from './index.js';

describe('esquemas de validación', () => {
  it('acepta registro y normaliza el correo', () => {
    const result = registerSchema.parse({
      email: '  ATLETA@EXAMPLE.COM ',
      password: 'segura123',
      name: ' Atleta ',
    });
    expect(result.email).toBe('atleta@example.com');
  });

  it('rechaza una contraseña corta al registrarse', () => {
    expect(
      registerSchema.safeParse({ email: 'a@b.com', password: 'corta', name: 'A' }).success,
    ).toBe(false);
  });

  it('rechaza enum inválido en el perfil', () => {
    expect(
      athleteProfileSchema.safeParse({
        displayName: 'A',
        experienceLevel: 'EXPERT',
        primaryGoal: 'STRENGTH',
      }).success,
    ).toBe(false);
  });

  it('no aplica longitud mínima de registro al inicio de sesión', () => {
    expect(loginSchema.safeParse({ email: 'a@b.com', password: 'x' }).success).toBe(true);
  });
});
