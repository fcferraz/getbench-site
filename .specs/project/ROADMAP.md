# ROADMAP: Buskai.net
**Last Updated:** 2026-06-24

> **AI CONTEXT:** High-level project milestones and timeline. Update status as features progress.

---

## Roadmap Overview

| Phase | Status | Key Deliverable |
|-------|--------|-----------------|
| Phase 1: Core Directory | ✅ DONE | Tool profiles, categories, Airtable-backed content |
| Phase 2: AI Features | ✅ DONE | Semantic search (Claude), side-by-side compare with AI verdict |
| Phase 3: SEO & Growth | ✅ DONE | pSEO pages, blog, OG/canonical, schema markup, LGPD consent |
| Phase 4: Security & Polish | 🔄 IN PROGRESS | XSS fixes, rate limiting, hardening |
| Phase 5: Scale | 📋 TODO | KV-backed rate limiting, edge caching, more content |

---

## Phase 1: Core Directory ✅

- [x] Airtable schema (Tools, Categories)
- [x] `/tools/[slug]` — individual tool profiles
- [x] `/categories` + `/category/[slug]` — category browsing
- [x] Base layout (nav, footer, search modal)
- [x] Design system (aurora background, Inter Tight, CSS vars, dark mode)
- [x] `public/buskai.css` + `public/buskai.js`

## Phase 2: AI Features ✅

- [x] `/api/search` — Claude Haiku semantic search
- [x] Search modal in Base layout (⌘K, keyboard nav, a11y)
- [x] `/compare/[category]/[slug]` — side-by-side matrix
- [x] AI verdict generation (Claude Haiku) with Airtable cache
- [x] Static fallback bullets when Claude unavailable
- [x] `/compare` index with comparison builder form
- [x] Curated comparison pairs (`src/lib/comparisons.js`)

## Phase 3: SEO & Growth ✅

- [x] pSEO landing pages (`/ferramentas-*`) for 10+ long-tail keywords
- [x] `/alternativas/[slug]` — programmatic "alternatives to X" pages
- [x] Blog (15+ static articles in PT-BR)
- [x] Open Graph + Twitter Card meta tags (Base.astro)
- [x] Canonical URLs on all pages
- [x] Schema.org `SoftwareApplication` on tool pages
- [x] `FAQPage` JSON-LD on blog posts
- [x] LGPD cookie consent banner (gating GTM + AdSense)
- [x] `/en/*` → `/*` 301 redirects (vercel.json)
- [x] Security headers via vercel.json
- [x] AuthorBox component on blog posts
- [x] `/submit` — tool submission form
- [x] `/contato` — contact form (Resend + Airtable log)
- [x] Sitemap at `/sitemap.xml.ts`

## Phase 4: Security & Polish 🔄

- [x] Origin allowlist on all POST APIs
- [x] In-memory IP rate limiting (`rateLimit.js`)
- [x] XSS hardening — `escapeHtml()` in contact API
- [x] Airtable formula injection prevention
- [ ] XSS audit on `[slug].astro` alternativas page (current branch: `fix/002-xss-alternativas`)
- [ ] DOM-safe rendering audit for all user-controlled fields

## Phase 5: Scale 📋

- [ ] Replace in-memory rate limiter with Vercel KV-backed store (noted in `rateLimit.js`: `ponytail: in-memory store, resets on cold start`)
- [ ] Edge caching for Airtable responses (ISR or Vercel Cache Control headers)
- [ ] More `/alternativas/[slug]` pages (content-driven, managed in Airtable)
- [ ] More curated comparison pairs in `comparisons.js`
- [ ] Tool submission workflow (Airtable automation → review → publish)
- [ ] Sitemap auto-generation (currently static)

---

## Sprint Log

### Sprint 1 — Early 2026
**Focus:** MVP — directory + search
**Status:** DONE
- [x] Airtable integration, tool profiles, category pages
- [x] AI semantic search modal

### Sprint 2 — Mid 2026
**Focus:** Compare feature + pSEO
**Status:** DONE
- [x] `/compare` pages with AI verdicts + Airtable cache
- [x] 10+ pSEO landing pages
- [x] `/alternativas/[slug]` dynamic pages

### Sprint 3 — June 2026
**Focus:** SEO polish + security
**Status:** IN PROGRESS
- [x] OG tags, canonicals, FAQPage schema
- [x] Cookie consent / LGPD
- [x] Rate limiting + origin check
- [ ] XSS fixes in alternativas page
