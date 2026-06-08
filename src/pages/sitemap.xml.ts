import type { APIContext } from 'astro';
import { getCategories, getTools } from '../lib/airtable.js';
import { curatedComparisons } from '../lib/comparisons.js';

export async function GET({ request }: APIContext) {
  const siteUrl = new URL(request.url).origin;
  const today = new Date().toISOString().split('T')[0];

  const [categories, tools] = await Promise.all([
    getCategories(),
    getTools(),
  ]);

  const staticUrls = [
    { loc: '/',              priority: '1.0', changefreq: 'daily'   },
    { loc: '/sobre',         priority: '0.5', changefreq: 'monthly' },
    { loc: '/privacidade',   priority: '0.3', changefreq: 'yearly'  },
    { loc: '/contato',       priority: '0.5', changefreq: 'monthly' },
    { loc: '/categories',    priority: '0.8', changefreq: 'weekly'  },
    { loc: '/compare',       priority: '0.7', changefreq: 'weekly'  },
    { loc: '/blog',          priority: '0.7', changefreq: 'weekly'  },
    { loc: '/submit',        priority: '0.5', changefreq: 'monthly' },
  ];

  const categoryUrls = categories
    .filter((c: any) => c.Slug)
    .map((c: any) => ({
      loc: `/category/${c.Slug}`,
      priority: '0.8',
      changefreq: 'weekly',
    }));

  const toolUrls = tools
    .filter((t: any) => t.slug)
    .map((t: any) => ({
      loc: `/tools/${t.slug}`,
      priority: '0.7',
      changefreq: 'weekly',
    }));

  const comparisonUrls = curatedComparisons.map(({ category, slugA, slugB }) => ({
    loc: `/compare/${category}/${slugA}-vs-${slugB}`,
    priority: '0.6',
    changefreq: 'monthly',
  }));

  const allUrls = [...staticUrls, ...categoryUrls, ...toolUrls, ...comparisonUrls];

  const xml = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${allUrls
  .map(
    ({ loc, priority, changefreq }) => `  <url>
    <loc>${siteUrl}${loc}</loc>
    <lastmod>${today}</lastmod>
    <changefreq>${changefreq}</changefreq>
    <priority>${priority}</priority>
  </url>`,
  )
  .join('\n')}
</urlset>`;

  return new Response(xml, {
    headers: {
      'Content-Type': 'application/xml; charset=utf-8',
      'Cache-Control': 'public, max-age=3600',
    },
  });
}
