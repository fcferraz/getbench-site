# Plan 001: Fix three correctness defects in search and compare pages

> **Executor instructions**: Follow this plan step by step. Run every
> verification command and confirm the expected result before moving to the
> next step. If anything in the "STOP conditions" section occurs, stop and
> report — do not improvise. When done, update the status row for this plan
> in `plans/README.md` — unless a reviewer dispatched you and told you they
> maintain the index.
>
> **Drift check (run first)**: `git diff --stat 9f4d4e4..HEAD -- src/pages/api/search.js src/pages/compare/`
> If any in-scope file changed since this plan was written, compare the
> "Current state" excerpts against the live code before proceeding; on a
> mismatch, treat it as a STOP condition.

## Status

- **Priority**: P1
- **Effort**: S
- **Risk**: LOW
- **Depends on**: none
- **Category**: bug
- **Planned at**: commit `9f4d4e4`, 2026-06-23

## Why this matters

Three small defects, each causing silent failures visible to real users:

1. `api/search.js` has no try/catch around either `request.json()` or `JSON.parse(aiResponse)`. A malformed request body or a Claude response that isn't valid JSON both throw unhandled exceptions, which Vercel turns into a generic 500 with no useful message. The search modal then shows a red error banner and no results.

2. `compare/[category]/[slug].astro` doesn't validate that the slug contains `-vs-`. When it's absent, `indexOf` returns -1, `substring(0, -1)` returns an empty string, and `substring(3)` returns a garbage tail — both tool lookups return undefined, and the page renders `undefined vs undefined` in the `<title>` with empty compare slots.

3. The same compare page calls the Claude API with model ID `claude-haiku-4-5` (no date suffix), while `api/search.js` correctly uses `claude-haiku-4-5-20251001`. The versioned form is stable; the bare alias will silently upgrade (or stop resolving) when Anthropic makes changes.

## Current state

### `src/pages/api/search.js`

Role: AI-powered search endpoint — fetches all tools from Airtable, sends them to Claude, returns ranked results.

```js
// search.js:8 — no try/catch around request.json()
const { query } = await request.json();

// search.js:78 — no try/catch around JSON.parse
const data = JSON.parse(clean);

// search.js:80-82 — response returned assuming data is valid
return new Response(JSON.stringify(data), {
  headers: { 'Content-Type': 'application/json' }
});
```

### `src/pages/compare/[category]/[slug].astro`

Role: Side-by-side comparison page for two tools, with AI-generated verdict.

```astro
// compare/[category]/[slug].astro:8-9 — no guard on missing -vs-
const vsIndex = slug.indexOf('-vs-');
const slugA = slug.substring(0, vsIndex);
const slugB = slug.substring(vsIndex + 4);

// compare/[category]/[slug].astro:89 — unversioned model alias
model: 'claude-haiku-4-5',
```

### Repo conventions

- API endpoints return JSON via a `json(data, status)` helper (already defined in `api/contact.js:105-110`). `search.js` does not use this helper — it returns `new Response(...)` directly. Stay consistent with what `search.js` already does (raw `new Response`).
- Astro SSR pages redirect with `return Astro.redirect('/categories')` — see `tools/[slug].astro:11-12` for the pattern.
- JS files use ES module syntax (`import`/`export`). No TypeScript in `.js` files.

## Commands you will need

| Purpose   | Command                                  | Expected on success          |
|-----------|------------------------------------------|------------------------------|
| Typecheck | `npx astro check`                        | exit 0, 0 errors             |
| Build     | `npm run build`                          | exit 0, no errors            |

Note: there are no automated tests in this repo. The verification gate is `npx astro check` (TypeScript + Astro template checking) and a successful build.

## Scope

**In scope** (the only files you should modify):
- `src/pages/api/search.js`
- `src/pages/compare/[category]/[slug].astro`

**Out of scope** (do NOT touch):
- `src/lib/airtable.js` — separate concern; touched by plan 003
- `src/lib/rateLimit.js` — separate concern; touched by plan 003
- Any other page, layout, or component

## Git workflow

Branch: `fix/001-correctness-quickfixes`  
Commit style (match repo): `fix: <description>` (examples from git log: `fix: redirect 301 de /en/* para rotas sem /en e canonical em /tools/[slug]`)  
Do NOT push or open a PR.

## Steps

### Step 1: Add error handling to `src/pages/api/search.js`

Open `src/pages/api/search.js`. Make these two changes:

**Change A** — wrap `request.json()` in a try/catch (currently line 8, bare `const { query } = await request.json()`):

```js
let body;
try {
  body = await request.json();
} catch {
  return new Response(JSON.stringify({ error: 'JSON inválido' }), {
    status: 400,
    headers: { 'Content-Type': 'application/json' }
  });
}
const { query } = body;
```

**Change B** — wrap the `JSON.parse` and final response (currently lines 76-82) in a try/catch:

```js
let data;
try {
  const text = ai.content[0].text.trim();
  const clean = text.replace(/```json/g, '').replace(/```/g, '').trim();
  data = JSON.parse(clean);
} catch {
  return new Response(JSON.stringify({ error: 'Resposta inválida do assistente' }), {
    status: 500,
    headers: { 'Content-Type': 'application/json' }
  });
}

return new Response(JSON.stringify(data), {
  headers: { 'Content-Type': 'application/json' }
});
```

Remove the old lines 76-82 (the original `const text = ...`, `const clean = ...`, `const data = JSON.parse(clean)`, and `return new Response(...)`) — they are now inside the try/catch above.

**Verify**: `grep -n "JSON.parse" src/pages/api/search.js` → shows the parse inside a try block.

### Step 2: Add slug validation and fix model ID in `src/pages/compare/[category]/[slug].astro`

Open `src/pages/compare/[category]/[slug].astro`.

**Change A** — add slug validation immediately after `const { category, slug } = Astro.params;` (currently line 7). Insert after line 7:

```astro
if (!slug || !slug.includes('-vs-')) {
  return Astro.redirect('/compare');
}
```

**Change B** — fix the model ID on the `client.messages.create` call (currently line 89):

```js
// Change this:
model: 'claude-haiku-4-5',
// To this:
model: 'claude-haiku-4-5-20251001',
```

**Verify**: `grep -n "claude-haiku-4-5'" src/pages/compare/` → should return 0 matches (no bare unversioned alias remaining).  
`grep -n "claude-haiku-4-5-20251001" src/pages/compare/` → should show 1 match.

### Step 3: Typecheck and build

```
npx astro check
npm run build
```

Both must exit 0. If either fails, investigate and fix before committing — do not commit a broken build.

### Step 4: Commit

```bash
git add src/pages/api/search.js src/pages/compare/[category]/[slug].astro
git commit -m "fix: add error handling in search API and validate compare slug"
```

## Test plan

No test framework is configured in this repo. Manual verification:

- For the JSON.parse fix: confirm `grep -n "JSON.parse" src/pages/api/search.js` shows the parse is inside a try/catch block.
- For the slug validation: confirm `grep -n "includes('-vs-')" src/pages/compare/[category]/[slug].astro` returns 1 match.
- For the model ID: confirm `grep -rn "claude-haiku-4-5'" src/pages/` returns 0 matches (only versioned IDs remain).

## Done criteria

- [ ] `npx astro check` exits 0
- [ ] `npm run build` exits 0
- [ ] `grep -n "JSON.parse" src/pages/api/search.js` shows the parse is inside a try block
- [ ] `grep -rn "claude-haiku-4-5'" src/pages/` returns 0 results
- [ ] `grep -n "includes('-vs-')" src/pages/compare/[category]/[slug].astro` returns 1 match
- [ ] `git diff --name-only HEAD` shows only the two in-scope files
- [ ] `plans/README.md` status row updated to DONE

## STOP conditions

Stop and report back (do not improvise) if:

- The code at any "Current state" excerpt doesn't match the live file (drift since `9f4d4e4`).
- `npx astro check` fails with errors unrelated to these two files.
- `npm run build` fails with errors unrelated to these two files.
- Fixing the JSON.parse requires touching Airtable lib or rate limit code (out of scope).

## Maintenance notes

- If the Claude model used in `compare/[category]/[slug].astro` is changed in the future, update `api/search.js` in the same commit so both files stay in sync.
- The error message `'Resposta inválida do assistente'` is in Portuguese to match the rest of the search UI error messages.
- A follow-up improvement (not in this plan): `search.js` still uses raw `fetch` to call Anthropic instead of the `@anthropic-ai/sdk` already installed. That would improve error handling further but is out of scope here.
