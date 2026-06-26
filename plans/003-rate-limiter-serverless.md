# Plan 003: Replace broken in-memory rate limiter with effective serverless protection

> **Executor instructions**: Follow this plan step by step. Run every
> verification command and confirm the expected result before moving to the
> next step. If anything in the "STOP conditions" section occurs, stop and
> report — do not improvise. When done, update the status row for this plan
> in `plans/README.md` — unless a reviewer dispatched you and told you they
> maintain the index.
>
> **Drift check (run first)**: `git diff --stat 9f4d4e4..HEAD -- src/lib/rateLimit.js src/pages/api/search.js src/pages/api/contact.js`
> If any in-scope file changed since this plan was written, compare the
> "Current state" excerpts against the live code before proceeding; on a
> mismatch, treat it as a STOP condition.

## Status

- **Priority**: P1
- **Effort**: M
- **Risk**: LOW
- **Depends on**: none
- **Category**: security
- **Planned at**: commit `9f4d4e4`, 2026-06-23

## Why this matters

`src/lib/rateLimit.js` stores rate-limit state in a module-level `Map`. On Vercel serverless (which this project uses via `@astrojs/vercel`), each function invocation runs in a fresh V8 isolate — the `Map` is empty at the start of every request. The rate limiter appears to work but provides zero actual protection.

The most exposed endpoint is `/api/search`, which makes a Claude API call on every request. An attacker who discovers this endpoint can fire it thousands of times per minute, running up Anthropic API costs with no friction.

This plan replaces the in-memory store with a two-layer approach:
1. **Referer + Origin check** — rejects requests that don't originate from the site itself. Blocks automated scripts that don't bother spoofing headers (the majority of abuse).
2. **Vercel KV (Redis-backed)** — provides actual cross-instance IP rate limiting for `/api/search`. KV is native to Vercel's platform, no new vendor.

The contact endpoint (`/api/contact`) keeps the Referer check only — email abuse is lower-stakes than Claude API cost abuse.

**Prerequisite (human action required before executing this plan)**: Provision a Vercel KV database from the Vercel dashboard → Storage tab → Create KV Store. This generates `KV_URL`, `KV_REST_API_URL`, and `KV_REST_API_TOKEN` environment variables. Pull them locally: `vercel env pull .env.local` (requires Vercel CLI). The executor cannot provision infrastructure — this is a human step.

If KV is not yet provisioned, the executor should STOP at Step 2 and report.

## Current state

### `src/lib/rateLimit.js`

Role: Shared rate-limit helper used by `/api/search` and `/api/contact`.

```js
// rateLimit.js:1 — module-level Map, empty on every cold start in serverless
const store = new Map();

const WINDOW_MS = 60_000;
const MAX_REQUESTS = 10;

function getIP(request) {
  return (
    request.headers.get('x-forwarded-for')?.split(',')[0].trim() ||
    request.headers.get('x-real-ip') ||
    'unknown'
  );
}

export function rateLimit(request) {
  const ip = getIP(request);
  // ...rest of logic references store — always empty, never enforced
}
```

### `src/pages/api/search.js`

```js
// search.js:4-9 — uses rateLimit, then calls Claude API
export async function POST({ request }) {
  const limited = rateLimit(request);
  if (limited) return limited;
  // ...Claude API call follows
```

### `src/pages/api/contact.js`

```js
// contact.js:7-9
export async function POST({ request }) {
  const limited = rateLimit(request);
  if (limited) return limited;
```

### Repo conventions

- Env vars accessed via `process.env.*` in lib files (see `src/lib/airtable.js:2`).
- API endpoints return JSON via `new Response(JSON.stringify(...), { status, headers })`.
- ES module syntax throughout — `import`/`export`, no CommonJS.
- No TypeScript in `.js` files.

## Commands you will need

| Purpose    | Command                                  | Expected on success          |
|------------|------------------------------------------|------------------------------|
| Install    | `npm install`                            | exit 0                       |
| Typecheck  | `npx astro check`                        | exit 0, 0 errors             |
| Build      | `npm run build`                          | exit 0, no errors            |
| Check KV   | `node -e "const {kv} = require('@vercel/kv'); console.log('ok')"` | prints `ok` |

## Scope

**In scope**:
- `src/lib/rateLimit.js` — full rewrite
- `src/pages/api/search.js` — no changes to logic, only the `rateLimit` import may need updating if the function signature changes (it should not)
- `src/pages/api/contact.js` — same
- `package.json` — add `@vercel/kv` dependency

**Out of scope** (do NOT touch):
- `src/lib/airtable.js`
- Any page component (`.astro` files)
- `vercel.json`

## Git workflow

Branch: `fix/003-rate-limiter-serverless`  
Commit style: `fix: <description>` (match repo convention)  
Do NOT push or open a PR.

## Steps

### Step 1: Install `@vercel/kv`

```bash
npm install @vercel/kv
```

**Verify**: `grep '"@vercel/kv"' package.json` → shows the dependency.

### Step 2: Confirm KV environment variables are present

```bash
node -e "console.log('KV_REST_API_URL:', !!process.env.KV_REST_API_URL)"
```

Expected: `KV_REST_API_URL: true`

If this prints `false`, the Vercel KV store has not been provisioned or env vars have not been pulled locally. **STOP and report** — the human must provision KV from the Vercel dashboard and run `vercel env pull .env.local` before this plan can proceed.

### Step 3: Rewrite `src/lib/rateLimit.js`

Replace the entire file with this implementation:

```js
import { kv } from '@vercel/kv';

const WINDOW_SEC = 60;

// Layer 1: Referer/Origin check — rejects requests not from this site.
// Effective against automated scripts that don't spoof headers.
function checkOrigin(request) {
  const origin = request.headers.get('origin') || '';
  const referer = request.headers.get('referer') || '';
  const allowed = ['https://www.buskai.net', 'https://buskai.net', 'http://localhost:4321'];
  const fromSite = allowed.some(h => origin.startsWith(h) || referer.startsWith(h));
  if (!fromSite) {
    return new Response(JSON.stringify({ error: 'Forbidden' }), {
      status: 403,
      headers: { 'Content-Type': 'application/json' },
    });
  }
  return null;
}

function getIP(request) {
  return (
    request.headers.get('x-forwarded-for')?.split(',')[0].trim() ||
    request.headers.get('x-real-ip') ||
    'unknown'
  );
}

// Layer 2: KV-backed IP rate limit.
// maxRequests per WINDOW_SEC seconds, stored in Vercel KV (Redis).
async function kvRateLimit(request, maxRequests) {
  const ip = getIP(request);
  const key = `rl:${ip}`;
  try {
    const count = await kv.incr(key);
    if (count === 1) {
      await kv.expire(key, WINDOW_SEC);
    }
    if (count > maxRequests) {
      const ttl = await kv.ttl(key);
      return new Response(JSON.stringify({ error: 'Too many requests' }), {
        status: 429,
        headers: {
          'Content-Type': 'application/json',
          'Retry-After': String(ttl > 0 ? ttl : WINDOW_SEC),
          'X-RateLimit-Limit': String(maxRequests),
          'X-RateLimit-Remaining': '0',
        },
      });
    }
  } catch (err) {
    // ponytail: KV failure is non-fatal — fail open to avoid blocking legit users.
    // Log and continue; the origin check still provides basic protection.
    console.error('rateLimit KV error:', err?.message ?? err);
  }
  return null;
}

// rateLimit(request, maxRequests?) — drop-in replacement for the old export.
// maxRequests defaults to 10 (same as before). Search callers pass 5.
export async function rateLimit(request, maxRequests = 10) {
  const originBlocked = checkOrigin(request);
  if (originBlocked) return originBlocked;
  return kvRateLimit(request, maxRequests);
}
```

**Verify**: `node --input-type=module < src/lib/rateLimit.js` → exits 0 (syntax check only — KV calls won't run without env).

Actually, use this safer syntax check:
```bash
node -e "import('./src/lib/rateLimit.js').then(() => console.log('ok')).catch(e => { console.error(e); process.exit(1); })"
```

### Step 4: Update callers to `await rateLimit()`

The old `rateLimit` was synchronous. The new one is `async`. Both callers must `await` it.

**`src/pages/api/search.js`** — change line 4 (the `const limited = rateLimit(request)` line):
```js
// Before:
const limited = rateLimit(request);
// After:
const limited = await rateLimit(request, 5);
```

The lower limit (5 instead of 10) for search is because each call costs real money (Claude API).

**`src/pages/api/contact.js`** — change line 8 (the `const limited = rateLimit(request)` line):
```js
// Before:
const limited = rateLimit(request);
// After:
const limited = await rateLimit(request);
```

**Verify**: `grep -n "rateLimit(request)" src/pages/api/search.js src/pages/api/contact.js` → should show `await rateLimit` in both files (no bare unawited call).

### Step 5: Typecheck and build

```bash
npx astro check
npm run build
```

Both must exit 0.

### Step 6: Commit

```bash
git add package.json package-lock.json src/lib/rateLimit.js src/pages/api/search.js src/pages/api/contact.js
git commit -m "fix: replace in-memory rate limiter with KV-backed serverless rate limiting"
```

## Test plan

No test framework configured. Structural verification:

- `grep -n "new Map()" src/lib/rateLimit.js` → 0 matches (in-memory store gone).
- `grep -n "@vercel/kv" src/lib/rateLimit.js` → 1 match (KV import present).
- `grep -n "await rateLimit" src/pages/api/search.js src/pages/api/contact.js` → 2 matches (both callers await).

## Done criteria

- [ ] `npm install` exits 0 and `@vercel/kv` appears in `package.json`
- [ ] `npx astro check` exits 0
- [ ] `npm run build` exits 0
- [ ] `grep -n "new Map()" src/lib/rateLimit.js` returns 0 matches
- [ ] `grep -n "await rateLimit" src/pages/api/search.js src/pages/api/contact.js` returns 2 matches
- [ ] `git diff --name-only HEAD` shows only the five in-scope files
- [ ] `plans/README.md` status row updated to DONE

## STOP conditions

Stop and report back if:

- KV env vars are not present (Step 2 check fails) — infrastructure must be provisioned first.
- The code at the "Current state" excerpts doesn't match the live files.
- `npx astro check` fails on the rewritten `rateLimit.js` with a type error that can't be resolved by adjusting the import or the function signature.
- The build fails because `@vercel/kv` can't be imported in this Astro + Vercel SSR context.
- Fixing the await requires changes to files outside the scope list.

## Maintenance notes

- The `checkOrigin` function allows `http://localhost:4321` for local dev. If the dev port changes, update this list.
- The KV key namespace is `rl:<ip>`. If other rate-limit uses are added (e.g., for the submit form), use a different prefix to avoid collisions: `rl:submit:<ip>`.
- The `catch` in `kvRateLimit` fails open (logs error, continues). This is intentional — a KV outage should not take down the site. If you want fail-closed behavior (block all requests when KV is down), remove the catch.
- When the Vercel KV store is eventually provisioned and env vars are added, the endpoint will also need those vars in production via `vercel env add` or the Vercel dashboard.
