# ARCHITECTURE: Buskai.net
**Last Updated:** 2026-06-24

> **AI CONTEXT:** This document is the authoritative technical reference. Read this FIRST for any technical question. Do not guess architectural patterns — verify here.

---

## 1. High-Level Structure

Astro 6 SSR app deployed to Vercel Functions. No frontend framework (React/Vue/etc.) — pages are `.astro` files with server-side data fetching in frontmatter. Client-side interactivity is vanilla JS via `<script is:inline>` tags or `public/buskai.js`.

Data lives entirely in Airtable (no traditional DB). Airtable is queried directly via its REST API on every request (no caching layer beyond Astro's SSR and the Compare Cache table).

```
Browser
  └── Vercel CDN / Functions
        ├── Static assets  → public/buskai.css, public/buskai.js, /og-image.png
        ├── SSR pages      → Astro frontmatter fetches Airtable, renders HTML
        └── API endpoints  → /api/search, /api/contact, /api/tools-by-category
              ├── Airtable REST API  (data)
              ├── Anthropic API      (AI ranking / verdicts)
              └── Resend API         (email delivery)
```

---

## 2. Identified Patterns

### Pattern: Astro SSR with frontmatter data fetching
**Location:** Every dynamic page (`src/pages/tools/[slug].astro`, `src/pages/alternativas/[slug].astro`, etc.)
**Purpose:** Fetch Airtable data server-side, render HTML — zero client-side JS for data fetching on page load.
**Example:** `src/pages/tools/[slug].astro:1-30` — frontmatter calls `getToolBySlug(slug)`, redirects to `/categories` on 404.

### Pattern: Single shared layout
**Location:** `src/layouts/Base.astro`
**Purpose:** All pages use this single layout. It owns: `<head>` (SEO meta, OG tags, canonical, GTM, fonts, critical CSS), nav (with dropdown + mobile menu + search modal), footer, cookie consent banner.
**FAQPage schema:** Base.astro accepts a `faqs` prop — if passed, injects `FAQPage` JSON-LD automatically.

### Pattern: API routes as thin handlers
**Location:** `src/pages/api/*.js`
**Purpose:** Input validation → rate limit check → external service call → JSON response. No business logic in routes — Airtable queries are in `src/lib/airtable.js`.

### Pattern: Airtable as CMS
**Location:** `src/lib/airtable.js`
**Purpose:** All Airtable queries centralized here. Handles pagination (offset loop), error suppression (returns `[]` on failure), and maps `r.fields` onto flat objects with `r.id`.
**Note:** Table names are used where spaces allow; table IDs (e.g. `tbl0FHXP8lZaaJaIv`) are used where Airtable rejects the name.

### Pattern: Compare verdict cache (Airtable-backed)
**Location:** `src/pages/compare/[category]/[slug].astro:82-134`, `src/lib/airtable.js:56-106`
**Purpose:** On first comparison load, generate verdict with Claude Haiku and write to Airtable `Compare Cache` table (pair_key = `slugA|slugB`). On subsequent loads, read from cache — no Claude call. Fallback: static bullet generation from tool fields if Claude is unavailable.

### Pattern: pSEO (Programmatic SEO) landing pages
**Location:** `src/pages/ferramentas-*.astro`, `src/pages/alternativas/[slug].astro`
**Purpose:** Long-tail SEO. Static editorial pages (`ferramentas-ia-brasil.astro` etc.) are hardcoded filter pages. Dynamic pages (`/alternativas/[slug]`) are driven by an Airtable table.

### Pattern: Origin-gated + IP rate limiting
**Location:** `src/lib/rateLimit.js`
**Purpose:** Every POST API first checks request origin against `ALLOWED_ORIGINS`, then applies in-memory IP rate limit (10 req/min). Called as `const limited = await rateLimit(request); if (limited) return limited;` at the top of each handler.

### Pattern: Blog as static `.astro` files
**Location:** `src/pages/blog/*.astro`, `src/data/blog-posts.ts`
**Purpose:** Each article is a standalone `.astro` file. Metadata (title, slug, date, description) is registered manually in `src/data/blog-posts.ts` — no content collections, no MDX.

---

## 3. Data Flow

### AI-powered search (search modal / homepage)
```
User types query
  → POST /api/search { query }
  → rateLimit() check (origin + IP)
  → getTools() from Airtable (all published tools)
  → Build Claude Haiku prompt with tools JSON
  → POST https://api.anthropic.com/v1/messages
  → Parse JSON from Claude response
  → Return { reasoning, tools[] } to browser
  → Modal renders ranked tool cards
```

### Tool comparison with AI verdict
```
GET /compare/[category]/[slugA-vs-slugB]
  → Parse slugA and slugB from slug param
  → getTools() from Airtable
  → getCompareCache(slugA, slugB) from Airtable
    → HIT: use cached bulletsA/bulletsB
    → MISS: call Claude Haiku SDK → parse JSON
            → saveCompareCache() to Airtable
            → fallback: static bullet generation from tool fields
  → Render comparison matrix + verdict cards
```

### Contact form
```
POST /api/contact { name, email, subject, message }
  → rateLimit() check
  → Input validation (required fields + email regex)
  → escapeHtml() all user input
  → Resend.send() → email to buskai.net@gmail.com
  → Best-effort Airtable POST to Contacts table (non-blocking)
  → Return { ok: true }
```

---

## 4. Code Organization & Conventions

**Structure approach:** Page-based (Astro file-system routing). Shared utilities in `src/lib/`. Components in `src/components/`.

```
src/
  components/        # Reusable .astro components
  data/              # Static data (blog-posts.ts)
  layouts/           # Base.astro (single layout)
  lib/               # Pure JS utilities
    airtable.js      # All Airtable queries
    comparisons.js   # Category criteria + curated comparison pairs
    rateLimit.js     # Origin check + IP rate limiter
  pages/             # Astro file-system routes
    api/             # API endpoints (GET/POST named exports)
    alternativas/    # [slug].astro — dynamic alternatives pages
    blog/            # Static .astro articles
    category/        # [slug].astro — category tool lists
    compare/         # compare.astro + [category]/[slug].astro
    tools/           # [slug].astro — tool profiles
    ferramentas-*.astro  # pSEO landing pages (hardcoded)
```

**File naming:**
- Pages: kebab-case (Astro convention + SEO-friendly URLs)
- Components: PascalCase (`AuthorBox.astro`, `CookieBanner.astro`)
- Lib: camelCase (`airtable.js`, `rateLimit.js`)

**Testing strategy:** None currently. No test files exist.

---

## 5. Integrations & External Services

| Service | How used | Location |
|---------|----------|----------|
| Airtable | Primary datastore (CMS) — all tool/category/cache data | `src/lib/airtable.js` |
| Anthropic Claude Haiku | AI search ranking + comparison verdicts | `/api/search`, `/compare/[...]` |
| Resend | Transactional email (contact form) | `/api/contact` |
| Google Tag Manager (GTM-MGVXP6BK) | Analytics (GA4) — consent-gated | `Base.astro` |
| Google AdSense (ca-pub-3858312966776117) | Monetization — consent-gated | `Base.astro` |
| Google Fonts | Inter Tight + JetBrains Mono | `Base.astro` |
| Google Favicon API | Tool logos (`google.com/s2/favicons?domain=…&sz=128`) | `tools/[slug]`, `compare/[...]` |
| Vercel | Hosting + serverless functions | `astro.config.mjs`, `vercel.json` |

---

## 6. Security Measures

| Measure | Implementation |
|---------|----------------|
| XSS prevention on contact form | `escapeHtml()` in `/api/contact.js` before building HTML email |
| Rate limiting on APIs | `rateLimit()` in `/api/search.js`, `/api/contact.js` |
| Origin allowlist | `ALLOWED_ORIGINS` in `rateLimit.js` blocks cross-origin POST requests |
| Airtable formula injection | `String(x).replace(/"/g, '\\"')` before interpolating into filter formulas |
| Security headers | `vercel.json` sets `X-Content-Type-Options`, `X-Frame-Options`, `Referrer-Policy`, `X-XSS-Protection` |
| Safe slug rendering | `safeSlug()` in Base.astro search modal strips non-slug chars before building links |
| Consent gating | GTM + AdSense load only after `localStorage.buskai_cookie_consent === 'accepted'` |

---

## 7. Structural Tree

```
getbench-site/
├── astro.config.mjs       # output:'server', adapter:vercel()
├── vercel.json            # /en/* redirects + security headers
├── package.json           # astro, @astrojs/vercel, @anthropic-ai/sdk, resend
├── tsconfig.json
├── public/
│   ├── buskai.css         # Global design system (CSS vars, components)
│   ├── buskai.js          # GB global object (theme toggle, search, tour)
│   ├── favicon.svg / .ico
│   └── og-image.png
└── src/
    ├── components/
    │   ├── AuthorBox.astro
    │   ├── BlogSidebar.astro
    │   ├── CookieBanner.astro
    │   └── PSeoToolList.astro
    ├── data/blog-posts.ts
    ├── layouts/Base.astro
    ├── lib/
    │   ├── airtable.js
    │   ├── comparisons.js
    │   └── rateLimit.js
    └── pages/
        ├── index.astro
        ├── categories.astro
        ├── compare.astro
        ├── search.astro
        ├── submit.astro
        ├── ferramentas-*.astro  (10+ pSEO pages)
        ├── api/
        │   ├── contact.js
        │   ├── search.js
        │   └── tools-by-category.js
        ├── alternativas/[slug].astro
        ├── blog/
        │   ├── index.astro
        │   └── *.astro (15+ articles)
        ├── category/[slug].astro
        ├── compare/[category]/[slug].astro
        └── tools/[slug].astro
```
