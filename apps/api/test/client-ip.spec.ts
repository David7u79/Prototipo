import { describe, expect, it } from 'vitest';
import { clientIp } from '../src/common/client-ip.throttler-guard.js';

const TRAEFIK = '::ffff:10.0.2.2';
const CF_EDGE = '172.71.10.20';

describe('clientIp', () => {
  it('usa CF-Connecting-IP cuando Traefik reenvía un salto de Cloudflare', () => {
    expect(
      clientIp({ socketAddress: TRAEFIK, forwardedFor: CF_EDGE, cfConnectingIp: '201.141.5.9' }),
    ).toBe('201.141.5.9');
  });

  it('ignora CF-Connecting-IP si el salto no es de Cloudflare (acceso directo al origen)', () => {
    expect(
      clientIp({ socketAddress: TRAEFIK, forwardedFor: '45.12.1.1', cfConnectingIp: '1.2.3.4' }),
    ).toBe('45.12.1.1');
  });

  it('ignora cabeceras si la conexión no viene de un proxy privado', () => {
    expect(
      clientIp({ socketAddress: '45.12.1.1', forwardedFor: CF_EDGE, cfConnectingIp: '1.2.3.4' }),
    ).toBe('45.12.1.1');
  });

  it('toma el último salto de X-Forwarded-For', () => {
    expect(clientIp({ socketAddress: TRAEFIK, forwardedFor: '9.9.9.9, 45.12.1.1' })).toBe('45.12.1.1');
  });

  it('sin cabeceras devuelve la IP del socket', () => {
    expect(clientIp({ socketAddress: TRAEFIK })).toBe('10.0.2.2');
  });

  it('reconoce rangos IPv6 de Cloudflare', () => {
    expect(
      clientIp({ socketAddress: '::1', forwardedFor: '2606:4700::1', cfConnectingIp: '2001:db8::5' }),
    ).toBe('2001:db8::5');
  });
});
