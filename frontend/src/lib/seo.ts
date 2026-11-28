import { useEffect } from 'react';
import { RUNTIME_PUBLIC_ORIGIN } from '../config/env';

export const DEFAULT_SEO_TITLE =
  'UNIDA Student Championship (USC) — Platform Pembinaan & Prestasi Mahasiswa';
export const DEFAULT_SEO_DESCRIPTION =
  'Platform pembinaan lomba, rekrutmen tim, roadmap persiapan, dan pendataan prestasi mahasiswa Universitas Darussalam Gontor.';
export const DEFAULT_FE_ORIGIN = 'https://talenta.utc.web.id';
const OG_IMAGE_PATH = '/images/usc-og-image.png?v=usc-2';

export interface DocumentMetaOptions {
  title: string;
  description?: string;
  path?: string;
  noindex?: boolean;
}

/**
 * Menghasilkan URL kanonik absolut menggunakan PUBLIC_ORIGIN dari runtime `.env`,
 * lalu fallback ke origin browser aktif atau baseline domain produksi.
 */
export function buildCanonicalUrl(path = '/', configuredOrigin?: string): string {
  const fallbackOrigin =
    typeof window !== 'undefined' && window.location?.origin
      ? window.location.origin
      : DEFAULT_FE_ORIGIN;
  const origin = (configuredOrigin || RUNTIME_PUBLIC_ORIGIN || fallbackOrigin).replace(/\/+$/, '');
  const cleanPath = path.startsWith('/') ? path : `/${path}`;
  return `${origin}${cleanPath}`;
}

function upsertMetaTag(attr: 'name' | 'property', key: string, content: string): void {
  if (typeof document === 'undefined') return;
  let el = document.querySelector<HTMLMetaElement>(`meta[${attr}="${key}"]`);
  if (!el) {
    el = document.createElement('meta');
    el.setAttribute(attr, key);
    document.head.appendChild(el);
  }
  el.setAttribute('content', content);
}

function upsertCanonicalLink(href: string): void {
  if (typeof document === 'undefined') return;
  let link = document.querySelector<HTMLLinkElement>('link[rel="canonical"]');
  if (!link) {
    link = document.createElement('link');
    link.setAttribute('rel', 'canonical');
    document.head.appendChild(link);
  }
  link.setAttribute('href', href);
}

/**
 * Memperbarui title, meta description, canonical, robots, dan Open Graph/Twitter saat navigasi SPA.
 */
export function applyDocumentMeta(options: DocumentMetaOptions): void {
  if (typeof document === 'undefined') return;

  const title = options.title.trim() || DEFAULT_SEO_TITLE;
  const description = (options.description || DEFAULT_SEO_DESCRIPTION).trim();
  const path =
    options.path ??
    (typeof window !== 'undefined' ? window.location.pathname || '/' : '/');
  const canonicalUrl = buildCanonicalUrl(path);
  const ogImageUrl = buildCanonicalUrl(OG_IMAGE_PATH);

  document.title = title;
  upsertCanonicalLink(canonicalUrl);
  upsertMetaTag('name', 'description', description);
  upsertMetaTag('name', 'robots', options.noindex ? 'noindex, nofollow' : 'index, follow');

  upsertMetaTag('property', 'og:title', title);
  upsertMetaTag('property', 'og:description', description);
  upsertMetaTag('property', 'og:url', canonicalUrl);
  upsertMetaTag('property', 'og:image', ogImageUrl);

  upsertMetaTag('name', 'twitter:title', title);
  upsertMetaTag('name', 'twitter:description', description);
  upsertMetaTag('name', 'twitter:image', ogImageUrl);
}

export function useDocumentMeta(options: DocumentMetaOptions): void {
  useEffect(() => {
    applyDocumentMeta(options);
  }, [options.title, options.description, options.path, options.noindex]);
}
