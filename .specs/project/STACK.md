# STACK: Buskai.net
**Last Updated:** 2026-06-24

> **AI CONTEXT:** This document is the authoritative source of truth for the project's scope, tech stack, and goals. DO NOT guess or hallucinate these details. Always refer to this document.

---

## 1. Objective & Scope

### Mission
Buskai.net is a curated directory of AI tools for the Brazilian and LATAM market — helping companies find, compare, and evaluate tools with Brazilian-specific data: BRL pricing, PT support, and operational availability in Brazil.

### Value Proposition
- **For:** Brazilian and LATAM companies evaluating AI tools
- **Problem:** Most AI tool directories are US-centric — no BRL pricing, no PT-BR support info, no Brazil availability signal
- **Solution:** Curated directory with LATAM-specific filters, AI-powered semantic search, and side-by-side comparisons

### In Scope
| Feature | Status | Description |
|---------|--------|-------------|
| Tool directory | ✅ Live | `/tools/[slug]` — individual tool profiles from Airtable |
| Category browser | ✅ Live | `/categories`, `/category/[slug]` — grouped by use case |
| AI semantic search | ✅ Live | `/api/search` + search modal — Claude Haiku ranks tools by query |
| Tool comparison | ✅ Live | `/compare/[category]/[slug]` — side-by-side matrix with AI verdict |
| Alternatives pages | ✅ Live | `/alternativas/[slug]` — "best alternatives to X" pSEO pages |
| pSEO landing pages | ✅ Live | 10+ `/ferramentas-*` pages for long-tail SEO |
| Blog | ✅ Live | Static `.astro` posts in `/blog/`, ~15 articles |
| Contact form | ✅ Live | `/contato` → Resend email + Airtable log |
| Tool submission | ✅ Live | `/submit` form |
| Cookie consent / LGPD | ✅ Live | Consent-gated GTM + AdSense via `CookieBanner` |

### Out of Scope
- User accounts / authentication
- Reviews or ratings by users
- Real-time pricing from tool APIs
- Pricing in BRL (stored in USD, converted contextually)

---

## 2. Tech Stack

### Current Stack

```
┌─────────────────────────────────────────────────────────────┐
│                   FRONTEND / SSR                            │
│  Astro 6 (server output) + Vanilla JS + Custom CSS          │
│  Fonts: Inter Tight + JetBrains Mono (Google Fonts)        │
└───────────────────────┬─────────────────────────────────────┘
                        │ SSR — Vercel Functions
┌───────────────────────▼─────────────────────────────────────┐
│                 API ROUTES (Astro endpoints)                 │
│  /api/search   — Claude Haiku (tool ranking)                │
│  /api/contact  — Resend (email) + Airtable (log)            │
│  /api/tools-by-category — Airtable proxy for compare form   │
└───────────────┬────────────────┬────────────────────────────┘
                │                │
    ┌───────────▼──────┐  ┌──────▼──────────────────┐
    │   Airtable       │  │   Anthropic API          │
    │   (database)     │  │   claude-haiku-4-5       │
    │   Tables:        │  │   - /api/search          │
    │   - Tools        │  │   - /compare/[...] SSR   │
    │   - Categories   │  └─────────────────────────-┘
    │   - Compare Cache│
    │   - Alternativas │  ┌──────────────────────────┐
    │   - Contacts log │  │   Resend                 │
    └──────────────────┘  │   (transactional email)  │
                          └──────────────────────────┘
```

### Key Technologies
| Layer | Technology | Version | Purpose |
|-------|------------|---------|---------|
| Framework | Astro | ^6.2.2 | SSR framework, file-based routing |
| Deployment | Vercel | @astrojs/vercel ^10 | Serverless functions adapter |
| Database | Airtable | REST API (no SDK) | Content CMS + compare cache + contact log |
| AI | Anthropic Claude Haiku | claude-haiku-4-5-20251001 | Search ranking + compare verdicts |
| AI SDK | @anthropic-ai/sdk | ^0.94.0 | Used in `/compare/[...].astro` SSR |
| Email | Resend | ^6.12.4 | Contact form delivery |
| Styling | Custom CSS | — | `public/buskai.css` + per-page `<style>` blocks |
| JS | Vanilla JS | — | `public/buskai.js` + inline `<script is:inline>` |
| Analytics | GTM (GTM-MGVXP6BK) | — | Consent-gated via CookieBanner |
| Ads | Google AdSense (ca-pub-3858312966776117) | — | Consent-gated |
| TypeScript | typescript ^6 | Dev only | Type-checking via `@astrojs/check` |
| Node | >=22.12.0 | — | Runtime requirement |

---

## 3. Environment Variables

| Variable | Used in | Purpose |
|----------|---------|---------|
| `AIRTABLE_API_KEY` | `src/lib/airtable.js`, `src/pages/alternativas/[slug].astro` | Airtable personal access token |
| `AIRTABLE_BASE_ID` | Same as above | Airtable base identifier |
| `ANTHROPIC_API_KEY` | `src/pages/api/search.js`, `src/pages/compare/[category]/[slug].astro` | Claude API key |
| `RESEND_API_KEY` | `src/pages/api/contact.js` | Resend email API key |

`AIRTABLE_API_KEY` and `AIRTABLE_BASE_ID` are accessed both as `import.meta.env.*` (in Astro SSR frontmatter) and `process.env.*` (in API routes / lib).

---

## 4. Airtable Schema (key tables)

| Table | Identifier | Key Fields |
|-------|------------|-----------|
| Tools | `tbl66b2aHBKUkkAF0` | slug, Name, tagline_en/pt, description_pt, website, affiliate_url, has_free_plan, starting_price_usd, pricing_model, works_in_brazil, works_in_mexico, accepts_brl, has_pt_support, has_latam_data, latam_note_pt, ai_native, categories, status |
| Categories | `Categories` | Name, Slug, title_pt |
| Compare Cache | `tbl0FHXP8lZaaJaIv` | pair_key (`slugA\|slugB`), bulletsA (JSON), bulletsB (JSON), created_at |
| Alternativas | `tbl1FgI1foVC7n2HM` | slug_referencia, published, nome_referencia, descricao_referencia, motivo_busca, como_escolher, contexto_brasil, alternativas (linked record IDs) |
| Contacts | `tblDBDppZjrC0hLAS` | Name, Email, Subject, Message, Status |

---

## 5. Stakeholders & Constraints
- Solo project — fcferraz
- LGPD compliance required (cookie consent gating)
- SEO is a primary growth channel (pSEO + blog + schema markup)
- Airtable is the CMS for non-technical content updates (no code deploy for adding tools)
- In-memory rate limiter resets on Vercel cold starts — known limitation

## 6. Success Metrics
- Indexed tools count (live stat on homepage)
- Organic search traffic (GA4 via GTM)
- AdSense revenue
- Contact / tool submission form conversions
