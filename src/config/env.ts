export type AppEnv = 'DEPLOYMENT' | 'PRODUCTION';

const rawAppEnv = (import.meta.env.VITE_APP_ENV as string | undefined)?.toUpperCase();

export const APP_ENV: AppEnv = rawAppEnv === 'PRODUCTION' ? 'PRODUCTION' : 'DEPLOYMENT';
export const USE_MOCK: boolean = (import.meta.env.VITE_USE_MOCK ?? 'true') !== 'false';
export const API_BASE_URL: string = import.meta.env.VITE_API_BASE_URL || 'http://localhost:3000/api';

export const isDemoMode = APP_ENV === 'DEPLOYMENT';
export const isMockActive = USE_MOCK;
