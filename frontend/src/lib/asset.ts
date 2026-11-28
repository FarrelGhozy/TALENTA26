import { RUNTIME_API_ORIGIN } from '../config/env';

/**
 * Prefix path asset publik dengan BASE_URL Vite atau origin API runtime.
 * Aman untuk GitHub Pages sub-path (/TALENTA26/), dev lokal (/), dan backend lintas subdomain.
 * URL absolut http/data/blob dibiarkan apa adanya.
 */
export const assetUrl = (path?: string): string => {
  if (!path) return '';
  if (/^(https?:|data:|blob:)/.test(path)) return path;
  if (path.startsWith('/api/')) {
    return RUNTIME_API_ORIGIN ? `${RUNTIME_API_ORIGIN}${path}` : path;
  }
  const base = import.meta.env.BASE_URL || '/';
  const clean = path.replace(/^\/+/, '');
  return `${base}${clean}`;
};
