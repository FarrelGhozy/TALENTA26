import { Elysia, t } from 'elysia';
import { prisma } from '../../lib/prisma';
import { loadConfig, safeOrigin } from '../../lib/config';
import { appReadCache } from '../../lib/cache';

const DEFAULT_FE_ORIGIN = 'https://talenta.utc.web.id';
const SITE_NAME = 'UNIDA Student Championship (USC)';
const DEFAULT_TITLE = 'UNIDA Student Championship (USC) — UNIDA Gontor';
const DEFAULT_DESCRIPTION =
  'Platform pembinaan lomba, rekrutmen tim, roadmap persiapan, dan pendataan prestasi mahasiswa Universitas Darussalam Gontor.';
const OG_IMAGE_PATH = '/images/usc-og-image.png?v=usc-2';

export interface SitemapCompetitionEntry {
  slug: string;
  updatedAt?: Date | string | null;
}

export interface SeoCompetitionSummary {
  slug: string;
  name: string;
  organizer: string;
  level: string;
  description: string;
}

export interface SeoMetaDescriptor {
  title: string;
  description: string;
  canonicalUrl: string;
  imageUrl: string;
  noindex: boolean;
}

export function resolvePublicFrontendOrigin(): string {
  const conf = loadConfig();
  return safeOrigin(conf.publicOrigin) || DEFAULT_FE_ORIGIN;
}

export function escapeHtml(raw: string): string {
  return raw
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

export function escapeXml(raw: string): string {
  return escapeHtml(raw);
}

export function normalizeSeoPath(rawPath?: string): string {
  if (!rawPath) return '/';
  const cleaned = rawPath.split('#')[0]?.split('?')[0]?.trim() || '/';
  if (!cleaned.startsWith('/')) return '/';
  // Cegah protocol-relative URL (//evil.com)
  const collapsed = cleaned.replace(/^\/+/, '/').replace(/\/+$/, '');
  return collapsed || '/';
}

function truncateText(text: string, maxLen = 160): string {
  const normalized = text.replace(/\s+/g, ' ').trim();
  if (normalized.length <= maxLen) return normalized;
  return `${normalized.slice(0, maxLen - 3).trimEnd()}...`;
}

/**
 * Menghasilkan sitemap XML publik memakai PUBLIC_ORIGIN dari `.env`.
 */
export function buildSitemapXml(
  origin: string,
  competitions: SitemapCompetitionEntry[] = []
): string {
  const cleanOrigin = origin.replace(/\/+$/, '');
  const staticEntries: Array<{ loc: string; changefreq: string; priority: string; lastmod?: string }> = [
    { loc: `${cleanOrigin}/`, changefreq: 'daily', priority: '1.0' },
    { loc: `${cleanOrigin}/kompetisi`, changefreq: 'daily', priority: '0.9' },
    { loc: `${cleanOrigin}/ranking`, changefreq: 'daily', priority: '0.8' },
  ];

  const competitionEntries = competitions
    .filter((c) => Boolean(c.slug))
    .map((c) => {
      const lastmod =
        c.updatedAt instanceof Date
          ? c.updatedAt.toISOString().split('T')[0]
          : typeof c.updatedAt === 'string' && c.updatedAt
            ? c.updatedAt.split('T')[0]
            : undefined;
      return {
        loc: `${cleanOrigin}/kompetisi/${encodeURIComponent(c.slug)}`,
        changefreq: 'weekly',
        priority: '0.7',
        lastmod,
      };
    });

  const allUrls = [...staticEntries, ...competitionEntries];
  const urlTags = allUrls
    .map((u) => {
      const lastmodTag = u.lastmod ? `\n    <lastmod>${escapeXml(u.lastmod)}</lastmod>` : '';
      return `  <url>\n    <loc>${escapeXml(u.loc)}</loc>${lastmodTag}\n    <changefreq>${u.changefreq}</changefreq>\n    <priority>${u.priority}</priority>\n  </url>`;
    })
    .join('\n');

  return `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${urlTags}\n</urlset>\n`;
}

/**
 * Menentukan metadata SEO & Open Graph per rute publik / privat secara aman.
 */
export function resolveSeoMetaDescriptor(
  origin: string,
  rawPath?: string,
  competition?: SeoCompetitionSummary | null
): SeoMetaDescriptor {
  const cleanOrigin = origin.replace(/\/+$/, '');
  const pathname = normalizeSeoPath(rawPath);
  const imageUrl = `${cleanOrigin}${OG_IMAGE_PATH}`;

  const isPrivateOrAuth =
    pathname.startsWith('/app') ||
    pathname.startsWith('/admin') ||
    pathname === '/masuk' ||
    pathname === '/daftar' ||
    pathname === '/lupa-password' ||
    pathname === '/reset-password' ||
    pathname === '/403' ||
    pathname === '/404';

  if (isPrivateOrAuth) {
    return {
      title: `${SITE_NAME} — Portal Pembinaan & Prestasi Mahasiswa`,
      description: DEFAULT_DESCRIPTION,
      canonicalUrl: `${cleanOrigin}/`,
      imageUrl,
      noindex: true,
    };
  }

  if (pathname === '/kompetisi') {
    return {
      title: `Katalog Lomba Resmi — ${SITE_NAME}`,
      description:
        'Jelajahi daftar kompetisi mahasiswa resmi, syarat tim, jadwal pembinaan, dan aturan poin prestasi di UNIDA Gontor.',
      canonicalUrl: `${cleanOrigin}/kompetisi`,
      imageUrl,
      noindex: false,
    };
  }

  if (pathname === '/ranking') {
    return {
      title: `Papan Peringkat Prestasi Mahasiswa — ${SITE_NAME}`,
      description:
        'Klasemen resmi poin prestasi mahasiswa Universitas Darussalam Gontor periode berjalan dan sepanjang masa berdasarkan verifikasi validator.',
      canonicalUrl: `${cleanOrigin}/ranking`,
      imageUrl,
      noindex: false,
    };
  }

  const compMatch = pathname.match(/^\/kompetisi\/([^/]+)$/);
  if (compMatch) {
    if (competition) {
      const summary = competition.description
        ? truncateText(competition.description, 155)
        : `${competition.organizer} (${competition.level}) — Informasi pembinaan & tim di ${SITE_NAME}.`;
      return {
        title: `${competition.name} — ${SITE_NAME}`,
        description: summary,
        canonicalUrl: `${cleanOrigin}/kompetisi/${encodeURIComponent(competition.slug)}`,
        imageUrl,
        noindex: false,
      };
    }

    return {
      title: `Detail Kompetisi — ${SITE_NAME}`,
      description: DEFAULT_DESCRIPTION,
      canonicalUrl: `${cleanOrigin}/kompetisi`,
      imageUrl,
      noindex: true,
    };
  }

  if (pathname !== '/') {
    return {
      title: DEFAULT_TITLE,
      description: DEFAULT_DESCRIPTION,
      canonicalUrl: `${cleanOrigin}/`,
      imageUrl,
      noindex: true,
    };
  }

  return {
    title: DEFAULT_TITLE,
    description: DEFAULT_DESCRIPTION,
    canonicalUrl: `${cleanOrigin}/`,
    imageUrl,
    noindex: false,
  };
}

/**
 * Merender dokumen HTML ringkas untuk perayap tautan media sosial/chat.
 */
export function renderSeoMetaHtml(desc: SeoMetaDescriptor): string {
  const safeTitle = escapeHtml(desc.title);
  const safeDescription = escapeHtml(desc.description);
  const safeCanonical = escapeHtml(desc.canonicalUrl);
  const safeImage = escapeHtml(desc.imageUrl);
  const safeSiteName = escapeHtml(SITE_NAME);
  const robots = desc.noindex ? 'noindex, nofollow' : 'index, follow';
  const secureImageTag = desc.imageUrl.startsWith('https://')
    ? `\n    <meta property="og:image:secure_url" content="${safeImage}" />`
    : '';

  return `<!doctype html>
<html lang="id">
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <title>${safeTitle}</title>
    <meta name="description" content="${safeDescription}" />
    <meta name="robots" content="${robots}" />
    <link rel="canonical" href="${safeCanonical}" />
    <meta property="og:type" content="website" />
    <meta property="og:locale" content="id_ID" />
    <meta property="og:site_name" content="${safeSiteName}" />
    <meta property="og:url" content="${safeCanonical}" />
    <meta property="og:title" content="${safeTitle}" />
    <meta property="og:description" content="${safeDescription}" />
    <meta property="og:image" content="${safeImage}" />${secureImageTag}
    <meta property="og:image:type" content="image/png" />
    <meta property="og:image:width" content="1200" />
    <meta property="og:image:height" content="630" />
    <meta property="og:image:alt" content="${safeTitle}" />
    <meta name="twitter:card" content="summary_large_image" />
    <meta name="twitter:title" content="${safeTitle}" />
    <meta name="twitter:description" content="${safeDescription}" />
    <meta name="twitter:image" content="${safeImage}" />
    <meta name="twitter:image:alt" content="${safeTitle}" />
  </head>
  <body>
    <main>
      <h1>${safeTitle}</h1>
      <p>${safeDescription}</p>
      <p><a href="${safeCanonical}">${safeCanonical}</a></p>
    </main>
  </body>
</html>
`;
}

export const seoRoutes = new Elysia()
  .get('/sitemap.xml', async () => {
    const origin = resolvePublicFrontendOrigin();
    let competitions: SitemapCompetitionEntry[] = [];
    try {
      competitions = await appReadCache.getOrSet('seo:sitemap:competitions', () =>
        prisma.competition.findMany({
          where: { status: 'published' },
          select: { slug: true, updatedAt: true },
          orderBy: { updatedAt: 'desc' },
          take: 500,
        })
      );
    } catch {
      competitions = [];
    }

    const xml = buildSitemapXml(origin, competitions);
    return new Response(xml, {
      status: 200,
      headers: {
        'Content-Type': 'application/xml; charset=utf-8',
        'Cache-Control': 'public, max-age=3600',
      },
    });
  })
  .get(
    '/api/v1/public/meta',
    async ({ query }) => {
      const origin = resolvePublicFrontendOrigin();
      const pathname = normalizeSeoPath(query.path);
      const compMatch = pathname.match(/^\/kompetisi\/([^/]+)$/);

      let competition: SeoCompetitionSummary | null = null;
      if (compMatch?.[1]) {
        const slug = decodeURIComponent(compMatch[1]);
        try {
          competition = await appReadCache.getOrSet(`seo:comp:${slug}`, () =>
            prisma.competition.findFirst({
              where: { slug, status: 'published' },
              select: {
                slug: true,
                name: true,
                organizer: true,
                level: true,
                description: true,
              },
            })
          );
        } catch {
          competition = null;
        }
      }

      const descriptor = resolveSeoMetaDescriptor(origin, pathname, competition);
      const html = renderSeoMetaHtml(descriptor);

      return new Response(html, {
        status: 200,
        headers: {
          'Content-Type': 'text/html; charset=utf-8',
          'Cache-Control': descriptor.noindex ? 'no-store' : 'public, max-age=300',
          'X-Robots-Tag': descriptor.noindex ? 'noindex, nofollow' : 'index, follow',
        },
      });
    },
    {
      query: t.Object({
        path: t.Optional(t.String({ maxLength: 512 })),
      }),
    }
  );
