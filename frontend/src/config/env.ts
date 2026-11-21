export type AppEnv = 'DEPLOYMENT' | 'PRODUCTION';

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

export const API_BASE_URL: string = (import.meta.env.VITE_API_BASE_URL || '/api/v1').replace(/\/$/, '');

export const isDemoMode = APP_ENV === 'DEPLOYMENT';
export const isMockActive = USE_MOCK;
