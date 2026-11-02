/**
 * Prefix path asset publik dengan BASE_URL Vite.
 * Aman untuk GitHub Pages sub-path (/TALENTA26/) maupun dev lokal (/).
 * URL absolut http/data/blob dibiarkan apa adanya.
 */
export const assetUrl = (path?: string): string => {
  if (!path) return '';
  if (/^(https?:|data:|blob:)/.test(path)) return path;
  const base = import.meta.env.BASE_URL || '/';
  const clean = path.replace(/^\/+/, '');
  return `${base}${clean}`;
};
