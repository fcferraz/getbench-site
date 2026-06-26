import type { APIContext } from 'astro';
import { getCategories, getTools, getAlternativas } from '../lib/airtable.js';
import { curatedComparisons } from '../lib/comparisons.js';

export async function GET({ request }: APIContext) {
  const siteUrl = new URL(request.url).origin;
  const today = new Date().toISOString().split('T')[0];

  console.log('[sitemap] env check — AIRTABLE_BASE_ID:', !!import.meta.env.AIRTABLE_BASE_ID, 'AIRTABLE_API_KEY:', !!import.meta.env.AIRTABLE_API_KEY);

  let categories: any[] = [], tools: any[] = [], alternativas: any[] = [];
  try { categories = await getCategories(); } catch (e) { console.error('[sitemap] getCategories failed:', e); }
  try { tools = await getTools(); } catch (e) { console.error('[sitemap] getTools failed:', e); }
  try { alternativas = await getAlternativas(); } catch (e) { console.error('[sitemap] getAlternativas failed:', e); }

  console.log(`[sitemap] fetched — categories:${categories.length} tools:${tools.length} alternativas:${alternativas.length}`);

  const blogSlugs = [
    '5-ferramentas-ia-empreendedor-brasileiro',
    'chatgpt-vs-gemini-vs-claude',
    'como-automatizar-atendimento-whatsapp-ia',
    'como-criar-videos-com-ia-sem-ser-designer',
    'como-escolher-assistente-ia-para-sua-empresa',
    'como-ia-esta-transformando-vendas-b2b-brasil',
    'como-usar-ia-gerar-leads-b2b-brasil',
    'como-usar-ia-para-seo-e-conteudo',
    'ferramentas-ia-criadores-conteudo-brasil',
    'ferramentas-ia-reunioes-produtividade',
    'guia-ia-marketing-digital-brasil',
    'guia-produtividade-ia-empresas-brasileiras',
    'ia-para-atendimento-ao-cliente',
    'ia-para-ecommerce-brasileiro',
    'ia-para-pequenas-empresas',
    'ia-para-vendas-times-b2b-brasileiros',
    'melhores-crms-para-pequenas-empresas-brasileiras',
    'melhores-ferramentas-ia-rh-recrutamento-brasil',
  ];

  const staticUrls = [
    { loc: '/',              priority: '1.0', changefreq: 'daily'   },
    { loc: '/sobre',         priority: '0.5', changefreq: 'monthly' },
    { loc: '/privacidade',   priority: '0.3', changefreq: 'yearly'  },
    { loc: '/contato',       priority: '0.5', changefreq: 'monthly' },
    { loc: '/categories',    priority: '0.8', changefreq: 'weekly'  },
    { loc: '/compare',       priority: '0.7', changefreq: 'weekly'  },
    { loc: '/blog',          priority: '0.7', changefreq: 'weekly'  },
    { loc: '/submit',        priority: '0.5', changefreq: 'monthly' },
    // Programmatic SEO landing pages
    { loc: '/ferramentas-ia-gratuitas',          priority: '0.7', changefreq: 'weekly' },
    { loc: '/ferramentas-ia-brasil',             priority: '0.7', changefreq: 'weekly' },
    { loc: '/ferramentas-ia-em-portugues',       priority: '0.7', changefreq: 'weekly' },
    { loc: '/ferramentas-ia-aceita-reais',       priority: '0.7', changefreq: 'weekly' },
    { loc: '/ferramentas-crm-ia-gratis',         priority: '0.6', changefreq: 'weekly' },
    { loc: '/ferramentas-marketing-ia-brasil',   priority: '0.6', changefreq: 'weekly' },
    { loc: '/ferramentas-vendas-ia-brasil',      priority: '0.6', changefreq: 'weekly' },
    { loc: '/ferramentas-suporte-ia-brasil',     priority: '0.6', changefreq: 'weekly' },
    { loc: '/ferramentas-rh-ia-brasil',          priority: '0.6', changefreq: 'weekly' },
    { loc: '/ferramentas-produtividade-ia-brasil', priority: '0.6', changefreq: 'weekly' },
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

  const blogUrls = blogSlugs.map((slug) => ({
    loc: `/blog/${slug}`,
    priority: '0.7',
    changefreq: 'monthly',
  }));

  const alternativasUrls = alternativas
    .filter((a: any) => a.slug_referencia)
    .map((a: any) => ({
      loc: `/alternativas/${a.slug_referencia}`,
      priority: '0.6',
      changefreq: 'monthly',
    }));

  const comparisonUrls = curatedComparisons.map(({ category, slugA, slugB }) => ({
    loc: `/compare/${category}/${slugA}-vs-${slugB}`,
    priority: '0.6',
    changefreq: 'monthly',
  }));

  const allUrls = [...staticUrls, ...blogUrls, ...categoryUrls, ...toolUrls, ...alternativasUrls, ...comparisonUrls];

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
