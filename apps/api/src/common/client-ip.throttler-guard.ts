import { Injectable } from '@nestjs/common';
import { ThrottlerGuard } from '@nestjs/throttler';
import { BlockList, isIPv4 } from 'node:net';

// Rangos publicados en https://www.cloudflare.com/ips (consultados el 2026-10-27).
const CLOUDFLARE = new BlockList();
for (const cidr of [
  '173.245.48.0/20',
  '103.21.244.0/22',
  '103.22.200.0/22',
  '103.31.4.0/22',
  '141.101.64.0/18',
  '108.162.192.0/18',
  '190.93.240.0/20',
  '188.114.96.0/20',
  '197.234.240.0/22',
  '198.41.128.0/17',
  '162.158.0.0/15',
  '104.16.0.0/13',
  '104.24.0.0/14',
  '172.64.0.0/13',
  '131.0.72.0/22',
  '2400:cb00::/32',
  '2606:4700::/32',
  '2803:f800::/32',
  '2405:b500::/32',
  '2405:8100::/32',
  '2a06:98c0::/29',
  '2c0f:f248::/32',
]) {
  const [address, prefix] = cidr.split('/');
  CLOUDFLARE.addSubnet(address!, Number(prefix), isIPv4(address!) ? 'ipv4' : 'ipv6');
}

// Proxy de la propia infraestructura (Traefik en la red de Docker).
const PRIVATE = new BlockList();
PRIVATE.addSubnet('10.0.0.0', 8, 'ipv4');
PRIVATE.addSubnet('172.16.0.0', 12, 'ipv4');
PRIVATE.addSubnet('192.168.0.0', 16, 'ipv4');
PRIVATE.addSubnet('127.0.0.0', 8, 'ipv4');
PRIVATE.addAddress('::1', 'ipv6');
PRIVATE.addSubnet('fc00::', 7, 'ipv6');

function normalize(ip: string): string {
  const trimmed = ip.trim();
  return trimmed.startsWith('::ffff:') && isIPv4(trimmed.slice(7)) ? trimmed.slice(7) : trimmed;
}

function inList(list: BlockList, ip: string): boolean {
  try {
    return list.check(ip, isIPv4(ip) ? 'ipv4' : 'ipv6');
  } catch {
    return false;
  }
}

export interface ClientIpSource {
  socketAddress?: string;
  forwardedFor?: string | string[];
  cfConnectingIp?: string | string[];
}

/**
 * IP del cliente para el límite de peticiones. Cadena en producción:
 * cliente → Cloudflare → Traefik → API. Sin esto todas las peticiones llegan con la IP
 * de Traefik y comparten un único contador.
 *
 * `CF-Connecting-IP` sólo se acepta si la conexión viene de un proxy privado y el salto
 * que ese proxy reenvía es de Cloudflare; quien llegue directo al origen no puede falsificarla.
 */
export function clientIp({ socketAddress, forwardedFor, cfConnectingIp }: ClientIpSource): string {
  const socket = normalize(socketAddress ?? '');
  if (!inList(PRIVATE, socket)) return socket;

  const header = Array.isArray(forwardedFor) ? forwardedFor.join(',') : (forwardedFor ?? '');
  const hops = header.split(',').map(normalize).filter(Boolean);
  const peer = hops.at(-1);
  if (!peer) return socket;

  const cf = normalize(Array.isArray(cfConnectingIp) ? (cfConnectingIp[0] ?? '') : (cfConnectingIp ?? ''));
  return inList(CLOUDFLARE, peer) && cf ? cf : peer;
}

@Injectable()
export class ClientIpThrottlerGuard extends ThrottlerGuard {
  protected override async getTracker(req: {
    socket?: { remoteAddress?: string };
    headers?: Record<string, string | string[] | undefined>;
  }): Promise<string> {
    return clientIp({
      socketAddress: req.socket?.remoteAddress,
      forwardedFor: req.headers?.['x-forwarded-for'],
      cfConnectingIp: req.headers?.['cf-connecting-ip'],
    });
  }
}
