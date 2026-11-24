import { isIP } from 'node:net';

const MAX_IP_LENGTH = 45;

export function normalizeIp(raw?: string | null): string | null {
  if (!raw) return null;
  let cleaned = raw.trim();
  if (!cleaned || cleaned.length > MAX_IP_LENGTH) return null;

  // Hilangkan tanda kurung IPv6 [::1] atau zone id (%eth0)
  if (cleaned.startsWith('[') && cleaned.endsWith(']')) {
    cleaned = cleaned.slice(1, -1);
  }
  const zoneIdx = cleaned.indexOf('%');
  if (zoneIdx !== -1) {
    cleaned = cleaned.slice(0, zoneIdx);
  }

  // Normalisasi IPv4-mapped IPv6 (contoh: ::ffff:127.0.0.1 -> 127.0.0.1)
  if (/^::ffff:/i.test(cleaned)) {
    const v4Candidate = cleaned.slice(7);
    if (isIP(v4Candidate) === 4) {
      return v4Candidate;
    }
  }

  return isIP(cleaned) !== 0 ? cleaned : null;
}

export function isPrivateOrLoopbackIp(ip: string): boolean {
  if (isIP(ip) === 4) {
    const parts = ip.split('.').map((n) => Number(n));
    const [a, b] = parts;
    if (a === 10) return true; // 10.0.0.0/8
    if (a === 127) return true; // 127.0.0.0/8
    if (a === 172 && b >= 16 && b <= 31) return true; // 172.16.0.0/12
    if (a === 192 && b === 168) return true; // 192.168.0.0/16
    if (a === 169 && b === 254) return true; // link-local
    if (a === 100 && b >= 64 && b <= 127) return true; // CGNAT 100.64.0.0/10
    return false;
  }

  const lower = ip.toLowerCase();
  if (lower === '::1' || lower === '::') return true;
  if (lower.startsWith('fc') || lower.startsWith('fd')) return true; // ULA fc00::/7
  if (lower.startsWith('fe8') || lower.startsWith('fe9') || lower.startsWith('fea') || lower.startsWith('feb')) {
    return true; // link-local fe80::/10
  }
  return false;
}

export function resolveClientIp(
  headers: Record<string, string | undefined>,
  socketRemoteAddress?: string | null
): string {
  const trustProxy = process.env.TRUST_PROXY === 'true';

  if (trustProxy) {
    // 1. Prioritaskan CF-Connecting-IP (ditetapkan secara otoritatif oleh Cloudflare edge)
    const cfIp = normalizeIp(headers['cf-connecting-ip']);
    if (cfIp) return cfIp;

    // 2. X-Forwarded-For: ambil IP non-privat paling KANAN agar kebal terhadap header palsu dari klien
    const xffHeader = headers['x-forwarded-for'];
    if (xffHeader) {
      const candidates = xffHeader
        .split(',')
        .map((part) => normalizeIp(part))
        .filter((ip): ip is string => Boolean(ip));

      for (let i = candidates.length - 1; i >= 0; i--) {
        if (!isPrivateOrLoopbackIp(candidates[i])) {
          return candidates[i];
        }
      }
      if (candidates.length > 0) {
        return candidates[candidates.length - 1];
      }
    }

    // 3. Fallback ke X-Real-IP dari reverse proxy tepercaya (Nginx)
    const realIp = normalizeIp(headers['x-real-ip']);
    if (realIp) return realIp;
  }

  const cleanRemote = normalizeIp(socketRemoteAddress);
  if (cleanRemote) {
    return cleanRemote;
  }
  return 'unknown';
}
