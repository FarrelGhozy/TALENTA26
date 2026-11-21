import { loadConfig } from '../../lib/config';

const IP_ADDRESS_RE = /^(?:\d{1,3}\.){3}\d{1,3}$|^[0-9a-f:]+$/i;

export function resolveClientIp(headers: Record<string, string | undefined>): string {
  const config = loadConfig();
  if (config.trustProxy) {
    const forwarded = headers['x-forwarded-for']?.split(',')[0]?.trim();
    if (forwarded && IP_ADDRESS_RE.test(forwarded)) return forwarded;
    const realIp = headers['x-real-ip']?.trim();
    if (realIp && IP_ADDRESS_RE.test(realIp)) return realIp;
  }
  return 'unknown';
}
