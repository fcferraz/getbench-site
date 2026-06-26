# STATE: Buskai.net
**Last Updated:** 2026-06-24

> **AI CONTEXT:** Append-only log of decisions, blockers, risks, and lessons learned. Never overwrite past entries.

---

## Recent Decisions (ADR)

<!-- AD-001: Airtable as primary datastore
**Date:** Early 2026
**Status:** Accepted
**Context:** Needed a database that allows non-technical content updates (adding tools, editing pricing, publishing alternativas pages) without code deploys.
**Decision:** Use Airtable as CMS and datastore for all content. Access via REST API (no official SDK in lib — raw fetch with pagination).
**Consequences:** Simple content management; no DB migrations; no real-time; pagination required for >100 tools; Airtable rate limits can bite at scale. Compare Cache stored in a separate Airtable table.
**Alternatives:** Supabase, Postgres, Notion. Rejected in favor of non-technical CMS ergonomics.
-->

<!-- AD-002: In-memory rate limiter
**Date:** Mid 2026
**Status:** Accepted (acknowledged temporary)
**Context:** APIs needed rate limiting before shipping; no Vercel KV provisioned yet.
**Decision:** In-memory Map store per Vercel Function instance (resets on cold start). Noted explicitly in code: `ponytail: in-memory store, resets on cold start`.
**Consequences:** Rate limiting is per-instance, not global — aggressive users on Vercel's multi-instance scale can bypass it. Acceptable for current traffic level.
**Alternatives:** Vercel KV (Redis). Upgrade path documented in rateLimit.js.
-->

<!-- AD-003: Claude Haiku for all AI features
**Date:** Mid 2026
**Status:** Accepted
**Context:** AI-powered search and comparison verdicts needed a model that's fast and cost-effective.
**Decision:** Use `claude-haiku-4-5-20251001` for all AI calls (search ranking, compare verdict generation). Never use Sonnet/Opus — latency and cost are too high for per-request use.
**Consequences:** Haiku is fast and cheap. Quality is good enough for JSON-structured outputs with clear prompts. Compare verdicts cached in Airtable to further reduce API spend.
**Alternatives:** GPT-4o-mini (Anthropic preference; simpler dependency), Gemini Flash.
-->

<!-- AD-004: Blog as static .astro files (no CMS, no MDX)
**Date:** Mid 2026
**Status:** Accepted
**Context:** Blog needed to ship quickly; content volume is manageable by a solo operator.
**Decision:** Each blog post is a hand-authored `.astro` file. Metadata registered in `src/data/blog-posts.ts` for index generation.
**Consequences:** No headless CMS overhead. Adding a post = creating a file + adding an entry to blog-posts.ts. No real-time editing. This scales to ~50 posts before becoming unwieldy.
**Alternatives:** Astro Content Collections (MDX), Contentful, Sanity. Too much setup for current scale.
-->

<!-- AD-005: No frontend JS framework
**Date:** Project start
**Status:** Accepted
**Context:** Astro was chosen specifically to avoid shipping JS by default. No React/Vue/Svelte needed.
**Decision:** All interactivity via vanilla JS (`public/buskai.js` + `<script is:inline>`). Global `window.GB` object manages theme, search modal, and tour.
**Consequences:** Smaller bundles, faster Time-to-Interactive. More verbose client-side DOM manipulation. No component reactivity.
**Alternatives:** Astro + React islands. Not needed given the interactivity requirements.
-->

<!-- AD-006: Airtable Compare Cache
**Date:** Mid 2026
**Status:** Accepted
**Context:** Compare verdict generation (Claude call) on every page load would be expensive and slow.
**Decision:** First-load generates verdict and writes `bulletsA/bulletsB` as JSON to the `Compare Cache` Airtable table keyed by `slugA|slugB`. Subsequent loads read from cache — no Claude call.
**Consequences:** Dramatically reduced Claude API spend on compare pages. Cache is permanent (no TTL). Stale verdicts if tool data changes significantly — acceptable trade-off.
-->

---

## Active Blockers

<!-- None currently -->

---

## Active Risks

<!-- R-001: Rate limiter bypass on Vercel multi-instance
**Impact:** Medium
**Probability:** Medium (at scale)
**Mitigation:** Replace in-memory Map with Vercel KV when traffic warrants it. Current traffic level makes this acceptable.
-->

<!-- R-002: Airtable quota limits
**Impact:** High (site goes down)
**Probability:** Low (current traffic)
**Mitigation:** Airtable free tier is 1,000 API calls/month per base. At scale, need to add response caching (Vercel Cache-Control headers or ISR). Watch Airtable usage in their dashboard.
-->

<!-- R-003: Claude API cost spike
**Impact:** Medium (unexpected bill)
**Probability:** Low (Haiku is cheap; compare results cached)
**Mitigation:** Search is the main cost driver (no cache). Rate limiting (10 req/min per IP) limits abuse. Monitor Anthropic dashboard.
-->

---

## Lessons Learned

<!-- L-001: Airtable table names vs. IDs
**Context:** Table named "Compare Cache" (with space) caused Airtable API errors when used as URL segment.
**Problem:** Spaces in table names break REST API calls.
**Solution:** Use table ID (`tbl0FHXP8lZaaJaIv`) for any table whose name contains spaces.
-->

<!-- L-002: Claude sometimes wraps JSON in markdown fences
**Context:** Claude Haiku responses were causing JSON.parse() failures.
**Problem:** Model occasionally wraps JSON output in ```json ... ``` blocks despite prompt instructions.
**Solution:** Strip markdown fences before parsing: `text.replace(/\`\`\`json/g, '').replace(/\`\`\`/g, '').trim()`. Now standard in all AI response parsing.
-->

<!-- L-003: Vercel Function freeze vs. async writes
**Context:** `saveCompareCache()` was being cut off on Vercel because the function froze after the response was sent.
**Problem:** `await` on the cache write was placed after response return — the write never completed.
**Solution:** `await saveCompareCache(...)` before returning the response. Adds ~100ms but ensures the cache is written before the function exits.
-->

---

## Deferred Ideas

- User-submitted reviews / ratings for tools
- BRL price converter (live USD→BRL rate)
- Email digest / newsletter for new tools
- Tool comparison via URL share (`/compare?a=clay&b=apollo&cat=sales-outreach`)
- Airtable automation to auto-publish submitted tools after review
- Sitemap auto-generation from Airtable (currently static `/sitemap.xml.ts`)
- `/api/search` response caching (e.g. 60s cache per query string hash)
