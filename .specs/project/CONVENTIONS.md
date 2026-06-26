# CONVENTIONS: Buskai.net
**Last Updated:** 2026-06-24

> **AI CONTEXT:** Coding rules and patterns specific to this project. Follow these conventions for all code changes.

---

## 1. File & Directory Naming

- Pages: `kebab-case.astro` (matches URL slug)
- Dynamic pages: `[param].astro` inside a folder
- Components: `PascalCase.astro`
- Lib utilities: `camelCase.js`
- Data files: `kebab-case.ts`

## 2. Language & Localization

- UI copy: **Portuguese (PT-BR)** everywhere. No English labels in the frontend.
- Content fields from Airtable: `_pt` suffix = Portuguese, `_en` = English fallback.
- SEO: all page titles and descriptions in PT-BR.
- Exception: category slugs and tool slugs are in English (URL-safe, SEO-friendly globally).

## 3. Astro Page Pattern

All dynamic SSR pages follow this structure:

```astro
---
// 1. imports
import Base from '../../layouts/Base.astro';
import { getToolBySlug } from '../../lib/airtable.js';

// 2. fetch data (runs server-side on every request)
const { slug } = Astro.params;
const tool = await getToolBySlug(slug);

// 3. redirect on missing data
if (!tool) return Astro.redirect('/categories');

// 4. compute derived values
const seoTitle = `${tool.Name} — Buskai.net`;
---

<style>/* page-scoped styles */</style>

<Base title={seoTitle} description={...} canonicalUrl={...}>
  <!-- HTML content -->
</Base>
```

## 4. API Route Pattern

Every API route:
1. Calls `rateLimit(request)` first — returns early if blocked
2. Parses and validates input explicitly
3. Calls external service
4. Returns `new Response(JSON.stringify(data), { headers: { 'Content-Type': 'application/json' } })`

```js
export async function POST({ request }) {
  const limited = await rateLimit(request);
  if (limited) return limited;

  // validate input...
  // call service...
  return new Response(JSON.stringify(result), {
    headers: { 'Content-Type': 'application/json' }
  });
}
```

## 5. Environment Variable Access

- **In Astro SSR frontmatter and API routes:** `import.meta.env.VARIABLE_NAME` (Astro-compiled)
- **In `src/lib/*.js` files:** `process.env.VARIABLE_NAME` (Node.js runtime)
- Both forms exist in the codebase — use whichever matches the execution context.

## 6. Styling Conventions

- **Global design system:** `public/buskai.css` — CSS custom properties (`--accent`, `--bg`, `--text`, `--line`, `--mono`, `--sans`, `--radius`, etc.). Never override these directly.
- **Page styles:** `<style>` blocks inside `.astro` files — Astro scopes them automatically.
- **Component styles:** inline `style="..."` attributes are acceptable for one-off layout (common in `tools/[slug].astro`).
- **No CSS framework** (no Tailwind, no Bootstrap).
- **Theme:** data attribute `document.documentElement.dataset.theme` = `'light'` | `'dark'`, persisted in `localStorage.buskai_ui_v1`.

## 7. Client-Side JavaScript

- **No frontend framework.** All client JS is vanilla.
- **Global object:** `window.GB` (defined in `public/buskai.js`) — exposes `GB.init()`, `GB.toggleTheme()`.
- **Inline scripts:** Use `<script is:inline>` for page-specific JS (Astro won't process these).
- **DOM safety:** Build DOM nodes programmatically (not `innerHTML`) for user-controlled data (see `runModalSearch()` in Base.astro).

## 8. XSS / Security Rules

- Never set `innerHTML` with user-controlled content.
- Escape HTML with `escapeHtml()` before inserting user data into HTML email strings (`/api/contact.js`).
- Airtable filter formula values: always sanitize with `String(x).replace(/"/g, '\\"')` before interpolation.
- Slug parameters: validate with `safeSlug()` (strips non-`[a-zA-Z0-9_-]` chars) before building URLs.
- All POST APIs must go through `rateLimit()` at the top.

## 9. Airtable Query Conventions

- All queries go through `src/lib/airtable.js` — do not inline Airtable fetch calls in pages (exception: `alternativas/[slug].astro` fetches directly due to linked record resolution).
- Use `filterByFormula=` for server-side filtering; never fetch all records and filter client-side.
- When table name has spaces, use the table ID (e.g. `tbl0FHXP8lZaaJaIv`) instead.
- The `fetchFromAirtable()` internal function handles pagination automatically (offset loop).
- On Airtable error, functions return `[]` (empty array) silently — pages must handle empty gracefully.

## 10. Claude / AI Conventions

- Model: always `claude-haiku-4-5-20251001` (fast + cheap for search/compare use cases)
- Prompts: written in Portuguese, request JSON-only response
- Response parsing: strip markdown fences before `JSON.parse()` — Claude sometimes wraps JSON in ` ```json ``` `
- Always provide a non-AI fallback (static bullet generation in compare, redirect on search failure)

## 11. SEO Conventions

- Every page passes `title`, `description`, and `canonicalUrl` to `Base.astro`
- Canonical: always absolute `https://www.buskai.net/path`
- Schema.org: `SoftwareApplication` on tool pages, `FAQPage` on blog posts (via `faqs` prop on Base)
- Open Graph: handled centrally in `Base.astro` — pass `title` and `description` props
- Redirects: English paths (`/en/*`) redirect 301 to root in `vercel.json`

## 12. Git Conventions

- **Branch naming:** `feat/NNN-description` or `fix/NNN-description`
- **Commit format:** Conventional Commits — `feat:`, `fix:`, `style:`, `perf:`, `refactor:`
- **Language in commits:** English (commit messages observed in git log)
- No squash policy observed — commits are granular

## 13. Testing Conventions

No automated tests exist in the project. Manual testing via local `astro dev` and production verification.
