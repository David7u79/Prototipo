import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { OAuth2Client } from 'google-auth-library';
import type { Env } from '../common/config/env.js';

/** Identidad que Google certifica sobre el usuario. */
export interface GoogleIdentity {
  /** Identificador estable de la cuenta de Google (claim `sub`). */
  sub: string;
  email: string;
  emailVerified: boolean;
  name: string | null;
  picture: string | null;
}

/**
 * Verifica ID tokens de Google (firma, emisor, expiración y audiencia) con las claves públicas
 * de Google. No usa client secret: GarFit nunca intercambia códigos OAuth, sólo valida la
 * identidad que el cliente obtuvo. Se inyecta por separado para poder sustituirlo en tests.
 */
@Injectable()
export class GoogleIdentityVerifier {
  private readonly client = new OAuth2Client();

  constructor(private readonly config: ConfigService<Env, true>) {}

  isConfigured(): boolean {
    return this.config.get('GOOGLE_WEB_CLIENT_ID', { infer: true }) !== null;
  }

  /** Lanza si el token no es válido para alguna de las audiencias configuradas. */
  async verify(idToken: string): Promise<GoogleIdentity> {
    const webClientId = this.config.get('GOOGLE_WEB_CLIENT_ID', { infer: true });
    if (!webClientId) throw new Error('Google no está configurado');

    const audience = [webClientId, ...this.config.get('GOOGLE_EXTRA_AUDIENCES', { infer: true })];
    const ticket = await this.client.verifyIdToken({ idToken, audience });
    const payload = ticket.getPayload();
    if (!payload?.sub || !payload.email) throw new Error('El token no incluye sub o email');

    return {
      sub: payload.sub,
      email: payload.email,
      emailVerified: payload.email_verified === true,
      name: payload.name ?? null,
      picture: payload.picture ?? null,
    };
  }
}
