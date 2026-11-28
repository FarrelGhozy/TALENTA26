import { afterEach, describe, expect, it } from 'bun:test';
import {
  buildSitemapXml,
  normalizeSeoPath,
  renderSeoMetaHtml,
  resolvePublicFrontendOrigin,
  resolveSeoMetaDescriptor,
} from '../../src/modules/seo';
import { createServer } from '../../src/app/server';

const prevEnv = { ...process.env };

afterEach(() => {
  process.env = { ...prevEnv };
});

describe('SEO & Open Graph Dinamis Berbasis PUBLIC_ORIGIN (.env)', () => {
  it('resolvePublicFrontendOrigin mengikuti PUBLIC_ORIGIN dari .env dan jatuh kembali ke https://talenta.utc.web.id bila cacat', () => {
    process.env.PUBLIC_ORIGIN = 'https://talenta.utc.web.id/';
    expect(resolvePublicFrontendOrigin()).toBe('https://talenta.utc.web.id');

    process.env.PUBLIC_ORIGIN = 'https://usc.kampus-baru.ac.id/';
    expect(resolvePublicFrontendOrigin()).toBe('https://usc.kampus-baru.ac.id');

    process.env.PUBLIC_ORIGIN = 'bukan-url';
    expect(resolvePublicFrontendOrigin()).toBe('https://talenta.utc.web.id');
  });

  it('normalizeSeoPath menolak URL eksternal/protocol-relative dan merapikan trailing slash', () => {
    expect(normalizeSeoPath('/')).toBe('/');
    expect(normalizeSeoPath('/kompetisi/gemastik-2026/?tab=syarat')).toBe('/kompetisi/gemastik-2026');
    expect(normalizeSeoPath('https://evil.com/phish')).toBe('/');
    expect(normalizeSeoPath('//evil.com/phish')).toBe('/evil.com/phish');
  });

  it('buildSitemapXml menyertakan URL publik & kompetisi terbit memakai origin .env dengan XML escaping aman', () => {
    const xml = buildSitemapXml('https://talenta.utc.web.id', [
      { slug: 'gemastik-2026', updatedAt: new Date('2026-11-28T00:00:00Z') },
      { slug: 'lomba&<script>', updatedAt: '2026-11-27T10:00:00Z' },
    ]);

    expect(xml).toContain('<loc>https://talenta.utc.web.id/</loc>');
    expect(xml).toContain('<loc>https://talenta.utc.web.id/kompetisi</loc>');
    expect(xml).toContain('<loc>https://talenta.utc.web.id/ranking</loc>');
    expect(xml).toContain('<loc>https://talenta.utc.web.id/kompetisi/gemastik-2026</loc>');
    expect(xml).toContain('<lastmod>2026-11-28</lastmod>');
    expect(xml).not.toContain('<script>');
  });

  it('resolveSeoMetaDescriptor & renderSeoMetaHtml merender OG/Twitter absolut, escaping XSS, serta noindex halaman privat', () => {
    const landingDesc = resolveSeoMetaDescriptor('https://talenta.utc.web.id', '/');
    expect(landingDesc.noindex).toBe(false);
    expect(landingDesc.canonicalUrl).toBe('https://talenta.utc.web.id/');
    expect(landingDesc.imageUrl).toBe('https://talenta.utc.web.id/images/usc-og-image.png?v=usc-2');

    const compDesc = resolveSeoMetaDescriptor(
      'https://usc.kampus-baru.ac.id',
      '/kompetisi/gemastik-2026',
      {
        slug: 'gemastik-2026',
        name: 'GEMASTIK <2026>',
        organizer: 'Kemdiktisaintek',
        level: 'nasional',
        description: 'Kompetisi "TIK" & Inovasi Mahasiswa tingkat nasional.',
      }
    );
    const html = renderSeoMetaHtml(compDesc);
    expect(html).toContain('<title>GEMASTIK &lt;2026&gt; — UNIDA Student Championship (USC)</title>');
    expect(html).toContain('<link rel="canonical" href="https://usc.kampus-baru.ac.id/kompetisi/gemastik-2026" />');
    expect(html).toContain('<meta property="og:image" content="https://usc.kampus-baru.ac.id/images/usc-og-image.png?v=usc-2" />');
    expect(html).toContain('<meta property="og:image:secure_url" content="https://usc.kampus-baru.ac.id/images/usc-og-image.png?v=usc-2" />');
    expect(html).toContain('<meta name="robots" content="index, follow" />');
    expect(html).not.toContain('<2026>');

    const privatePaths = ['/app/beranda', '/admin/sistem', '/masuk', '/reset-password'];
    for (const p of privatePaths) {
      const priv = resolveSeoMetaDescriptor('https://talenta.utc.web.id', p);
      expect(priv.noindex).toBe(true);
      expect(renderSeoMetaHtml(priv)).toContain('<meta name="robots" content="noindex, nofollow" />');
    }
  });

  it('GET /sitemap.xml dan GET /api/v1/public/meta merespons domain dinamis dari PUBLIC_ORIGIN', async () => {
    process.env.NODE_ENV = 'test';
    process.env.PUBLIC_ORIGIN = 'https://talenta.utc.web.id';

    const app = createServer();

    const sitemapRes = await app.handle(new Request('https://api.talenta.utc.web.id/sitemap.xml'));
    expect(sitemapRes.status).toBe(200);
    expect(sitemapRes.headers.get('content-type')).toContain('application/xml');
    const xml = await sitemapRes.text();
    expect(xml).toContain('https://talenta.utc.web.id/');

    const metaRes = await app.handle(
      new Request('https://api.talenta.utc.web.id/api/v1/public/meta?path=%2Franking')
    );
    expect(metaRes.status).toBe(200);
    expect(metaRes.headers.get('content-type')).toContain('text/html');
    const html = await metaRes.text();
    expect(html).toContain('<meta property="og:url" content="https://talenta.utc.web.id/ranking" />');
    expect(html).toContain('<meta property="og:image" content="https://talenta.utc.web.id/images/usc-og-image.png?v=usc-2" />');
  });
});
