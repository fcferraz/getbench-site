import { defineConfig } from 'astro/config';

import vercel from '@astrojs/vercel';

export default defineConfig({
  output: 'server',
  adapter: vercel(),
  redirects: {
    '/en/categories':                    { destination: '/categories',                    status: 301 },
    '/en/compare':                       { destination: '/compare',                       status: 301 },
    '/en/blog':                          { destination: '/blog',                          status: 301 },
    '/en/submit':                        { destination: '/submit',                        status: 301 },
    '/en/search':                        { destination: '/search',                        status: 301 },
    '/en/category/[slug]':               { destination: '/category/[slug]',               status: 301 },
    '/en/tools/[slug]':                  { destination: '/tools/[slug]',                  status: 301 },
    '/en/compare/[category]/[slug]':     { destination: '/compare/[category]/[slug]',     status: 301 },
  },
});