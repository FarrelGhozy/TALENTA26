export type AppEnv = 'DEPLOYMENT' | 'PRODUCTION';

declare global {
  interface Window {
    __USC_RUNTIME_CONFIG__?: {
      publicOrigin?: string;
      apiOrigin?: string;
    };
  }
}

const rawAppEnv = (import.meta.env.VITE_APP_ENV as string | undefined)?.toUpperCase();

// Fail-safe: production build selalu PRODUCTION; default non-demo aman ke PRODUCTION kecuali eksplisit DEPLOYMENT/demo
export const APP_ENV: AppEnv =
  import.meta.env.MODE === 'production'
    ? 'PRODUCTION'
    : import.meta.env.MODE === 'demo' || rawAppEnv === 'DEPLOYMENT'
      ? 'DEPLOYMENT'
      : 'PRODUCTION';

export const USE_MOCK: boolean =
  import.meta.env.MODE !== 'production' &&
  (import.meta.env.MODE === 'demo' || import.meta.env.VITE_USE_MOCK === 'true');

export function resolveRuntimePublicOrigin(
  runtimeConfig: Window['__USC_RUNTIME_CONFIG__'] | undefined =
    typeof window !== 'undefined' ? window.__USC_RUNTIME_CONFIG__ : undefined
): string {
  const raw = runtimeConfig?.publicOrigin;
  if (typeof raw !== 'string') return '';
  return raw.trim().replace(/\/+$/, '');
}

export function resolveRuntimeApiOrigin(
  runtimeConfig: Window['__USC_RUNTIME_CONFIG__'] | undefined =
    typeof window !== 'undefined' ? window.__USC_RUNTIME_CONFIG__ : undefined
): string {
  const raw = runtimeConfig?.apiOrigin;
  if (typeof raw !== 'string') return '';
  return raw.trim().replace(/\/+$/, '');
}

export function resolveApiBaseUrl(
  configuredBase: string | undefined = import.meta.env.VITE_API_BASE_URL,
  runtimeOrigin: string = resolveRuntimeApiOrigin()
): string {
  const base = (configuredBase || '/api/v1').trim().replace(/\/$/, '') || '/api/v1';
  if (runtimeOrigin && base.startsWith('/')) {
    return `${runtimeOrigin}${base}`;
  }
  return base;
}

export const RUNTIME_PUBLIC_ORIGIN: string = resolveRuntimePublicOrigin();

export const RUNTIME_API_ORIGIN: string = resolveRuntimeApiOrigin();

export const API_BASE_URL: string = resolveApiBaseUrl();

export const isDemoMode = APP_ENV === 'DEPLOYMENT';
export const isMockActive = USE_MOCK;
