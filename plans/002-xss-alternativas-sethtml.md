# Plan 002: Eliminate XSS risk from `set:html` with raw Airtable content

> **Executor instructions**: Follow this plan step by step. Run every
> verification command and confirm the expected result before moving to the
> next step. If anything in the "STOP conditions" section occurs, stop and
> report — do not improvise. When done, update the status row for this plan
> in `plans/README.md` — unless a reviewer dispatched you and told you they
> maintain the index.
>
> **Drift check (run first)**: `git diff --stat 9f4d4e4..HEAD -- src/pages/alternativas/`
> If the in-scope file changed since this plan was written, compare the
> "Current state" excerpt against the live code before proceeding; on a
> mismatch, treat it as a STOP condition.

## Status

- **Priority**: P1
- **Effort**: S
- **Risk**: LOW
- **Depends on**: none
- **Category**: security
- **Planned at**: commit `9f4d4e4`, 2026-06-23

## Why this matters

`src/pages/alternativas/[slug].astro` renders the `como_escolher` field from Airtable directly as HTML using Astro's `set:html` directive. If the Airtable base is ever compromised — a leaked API key, a compromised Airtable account, or a malicious insider — an attacker can inject arbitrary JavaScript into every `/alternativas/*` page for every visitor.

The fix is simple: the content is plain text with line breaks. Replace `set:html` with Astro's safe text interpolation and manual paragraph wrapping. The visible output is identical; the attack surface is gone.

Astro auto-escapes all content rendered via `{...}` expression syntax. `set:html` deliberately bypasses that escaping — it should only be used with content you own and control at deploy time, not with runtime data from a third-party source.

## Current state

### `src/pages/alternativas/[slug].astro`

Role: SSR page for `/alternativas/[slug]` — renders SEO content about alternatives to a reference tool. Pulls content from the "Alternativas" Airtable table.

The vulnerable block (lines 275-279):

```astro
{page.como_escolher && (
  <div class="alt-section">
    <h2>Como escolher a melhor alternativa para você</h2>
    <div class="alt-editorial" set:html={page.como_escolher.split('\n').map((p: string) => p ? `<p>${p}</p>` : '').join('')} />
  </div>
)}
```

`page.como_escolher` is a string field from Airtable (plain text with newlines as paragraph separators). The code wraps each line in `<p>` tags and passes the result to `set:html`, which renders it as raw HTML — no escaping. If the Airtable field contains `<script>alert(1)</script>`, it executes.

### Other `set:html` uses in this file

Search the file for `set:html` — there should be only the one instance above. Confirm with:
```
grep -n "set:html" src/pages/alternativas/\[slug\].astro
```
If more than one is found, STOP and report — this plan only covers the `como_escolher` instance.

### Repo conventions

- All other Airtable fields on this page (`page.motivo_busca`, `page.descricao_referencia`, tool names, taglines) are rendered via `{...}` expression syntax, which Astro auto-escapes. Match that pattern.
- The page has its own `<style>` block with `.alt-editorial` defined — keep that class, just change how content is injected.

## Commands you will need

| Purpose   | Command                                  | Expected on success          |
|-----------|------------------------------------------|------------------------------|
| Typecheck | `npx astro check`                        | exit 0, 0 errors             |
| Build     | `npm run build`                          | exit 0, no errors            |
| Grep      | `grep -n "set:html" src/pages/alternativas/\[slug\].astro` | 0 matches after fix |

## Scope

**In scope**:
- `src/pages/alternativas/[slug].astro`

**Out of scope** (do NOT touch):
- Any other page, layout, or component
- The Airtable data itself
- Any other field on this page — only the `como_escolher` rendering changes

## Git workflow

Branch: `fix/002-xss-alternativas`  
Commit style: `fix: <description>` (match repo convention)  
Do NOT push or open a PR.

## Steps

### Step 1: Replace `set:html` with safe paragraph rendering

Open `src/pages/alternativas/[slug].astro`. Locate the `como_escolher` block (lines ~275-279 in the original; confirm with `grep -n "como_escolher" src/pages/alternativas/\[slug\].astro`).

Replace this:
```astro
{page.como_escolher && (
  <div class="alt-section">
    <h2>Como escolher a melhor alternativa para você</h2>
    <div class="alt-editorial" set:html={page.como_escolher.split('\n').map((p: string) => p ? `<p>${p}</p>` : '').join('')} />
  </div>
)}
```

With this:
```astro
{page.como_escolher && (
  <div class="alt-section">
    <h2>Como escolher a melhor alternativa para você</h2>
    <div class="alt-editorial">
      {page.como_escolher.split('\n').filter((p: string) => p.trim()).map((p: string) => (
        <p>{p}</p>
      ))}
    </div>
  </div>
)}
```

The visual output is identical (each non-empty line becomes a `<p>`). The difference: Astro now escapes the content of each `<p>` automatically. A `<script>` tag in the Airtable field becomes visible text, not executable code. The `filter` call also cleans up blank lines that would produce empty `<p>` tags (minor improvement over the original).

**Verify**: `grep -n "set:html" src/pages/alternativas/\[slug\].astro` → 0 matches.

### Step 2: Typecheck and build

```
npx astro check
npm run build
```

Both must exit 0.

### Step 3: Commit

```bash
git add "src/pages/alternativas/[slug].astro"
git commit -m "fix: render como_escolher as safe text instead of set:html"
```

## Test plan

No test framework is configured. Verification is structural:

- `grep -n "set:html" src/pages/alternativas/\[slug\].astro` → 0 matches (the only `set:html` is gone).
- Visual equivalence: the new template maps the same lines to `<p>` elements; the difference is Astro's auto-escaping is now active.

## Done criteria

- [ ] `npx astro check` exits 0
- [ ] `npm run build` exits 0
- [ ] `grep -n "set:html" src/pages/alternativas/\[slug\].astro` returns 0 matches
- [ ] `git diff --name-only HEAD` shows only `src/pages/alternativas/[slug].astro`
- [ ] `plans/README.md` status row updated to DONE

## STOP conditions

Stop and report back if:

- The `como_escolher` block in the live file doesn't match the "Current state" excerpt (drift).
- `grep -n "set:html"` finds more than one match — there may be additional instances not covered by this plan.
- `npx astro check` fails with errors unrelated to this file.
- The fix requires changes to any other file (e.g., the layout or a shared component).

## Maintenance notes

- If other fields on this page are later changed to support rich text (Markdown, HTML), do not use `set:html` with Airtable data. Sanitize with a library like `sanitize-html` first, or use Airtable's structured rich-text format and render it safely.
- The `filter((p) => p.trim())` change is a minor behavioral improvement — it drops blank lines rather than rendering empty `<p>` tags. Verify with the Airtable data that this doesn't unintentionally collapse intentional paragraph spacing.
