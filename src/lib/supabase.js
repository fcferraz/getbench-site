import { kv } from '@vercel/kv';

const TTL = 6 * 60 * 60; // 6 hours
const LKG_TTL = 30 * 24 * 60 * 60; // 30 days — last-known-good fallback

const isEmpty = v => v == null || (Array.isArray(v) && v.length === 0);

// Returns cached value on hit, falls back to fn() if KV is unavailable or misses.
// Never caches an empty result: an empty [] (or null) means Supabase failed, so we
// serve the last-known-good copy (`${key}:lkg`) instead of poisoning the cache.
async function withCache(key, fn) {
  try {
    const cached = await kv.get(key);
    if (!isEmpty(cached)) return cached; // treat poisoned/empty cache as a miss
  } catch {
    return fn(); // KV not configured or unreachable — go direct
  }
  const result = await fn();
  if (!isEmpty(result)) {
    kv.set(key, result, { ex: TTL }).catch(() => {});
    kv.set(`${key}:lkg`, result, { ex: LKG_TTL }).catch(() => {});
    return result;
  }
  // Empty — likely a Supabase failure. Don't cache it; serve last-known-good if any.
  const lkg = await kv.get(`${key}:lkg`).catch(() => null);
  if (!isEmpty(lkg)) {
    console.warn(`[supabase] ${key} came back empty, serving last-known-good cache`);
    return lkg;
  }
  return result;
}

function restUrl(path) {
  const base = import.meta.env.SUPABASE_URL;
  return `${base}/rest/v1/${path}`;
}

function readHeaders() {
  const key = import.meta.env.SUPABASE_ANON_KEY;
  return { apikey: key, Authorization: `Bearer ${key}` };
}

// Compare-cache writes need INSERT, which the anon key's RLS policy (read-only)
// doesn't allow — use the service role key, kept server-side only.
function writeHeaders() {
  const key = import.meta.env.SUPABASE_SERVICE_KEY;
  return { apikey: key, Authorization: `Bearer ${key}` };
}

async function fetchTable(path, { write = false } = {}) {
  const url = restUrl(path);
  const anonKey = import.meta.env.SUPABASE_ANON_KEY;
  const serviceKey = import.meta.env.SUPABASE_SERVICE_KEY;
  if (!import.meta.env.SUPABASE_URL || (write ? !serviceKey : !anonKey)) {
    console.error(`[supabase] Missing env vars for ${path} (write=${write})`);
    return [];
  }
  try {
    const res = await fetch(url, { headers: write ? writeHeaders() : readHeaders() });
    const data = await res.json();
    if (!res.ok) {
      console.error(`[supabase] error [${path}]:`, data);
      return [];
    }
    return Array.isArray(data) ? data : [];
  } catch (err) {
    console.error(`[supabase] fetch failed [${path}]:`, err?.message ?? err);
    return [];
  }
}

// ── Shape adapters — mirror the old Airtable field names so every page that
// consumes these functions keeps working unchanged. ────────────────────────

function mapCategory(row) {
  return {
    id: row.id,
    Name: row.name,
    Slug: row.slug,
    title_en: row.title_en,
    title_pt: row.title_pt,
    title_es: row.title_es,
    description_en: row.description_en,
    description_pt: row.description_pt,
    description_es: row.description_es,
  };
}

function mapTool(row) {
  const categories = (row.tool_categories || [])
    .map(tc => tc.categories)
    .filter(Boolean)
    .map(c => ({ slug: c.slug, name: c.name }));

  return {
    id: row.id,
    Name: row.name,
    slug: row.slug,
    website: row.website,
    tagline_en: row.tagline_en,
    tagline_pt: row.tagline_pt,
    tagline_es: row.tagline_es,
    description_en: row.description_en,
    description_pt: row.description_pt,
    description_es: row.description_es,
    has_free_plan: row.has_free_plan,
    starting_price_usd: row.starting_price_usd,
    pricing_model: row.pricing_model,
    currency: row.currency,
    works_in_brazil: row.works_in_brazil,
    works_in_mexico: row.works_in_mexico,
    accepts_brl: row.accepts_brl,
    has_pt_support: row.has_pt_support,
    has_es_support: row.has_es_support,
    has_latam_data: row.has_latam_data,
    latam_note_pt: row.latam_note_pt,
    latam_note_es: row.latam_note_es,
    affiliate_url: row.affiliate_url,
    has_affiliate_program: row.has_affiliate_program,
    is_featured: row.is_featured,
    status: row.status,
    ai_native: row.ai_native,
    is_agent: row.is_agent,
    why_we_chose_pt: row.why_we_chose_pt,
    pros_pt: row.pros_pt,
    cons_pt: row.cons_pt,
    categories,
  };
}

const TOOLS_SELECT = '*,tool_categories(categories(slug,name))';

export function getCategories() {
  return withCache('sb:categories', async () => {
    const rows = await fetchTable(`categories?select=*&order=name`);
    return rows.map(mapCategory);
  });
}

// Tool shape: Name, slug, tagline_en, description_pt, website, affiliate_url,
// has_free_plan, starting_price_usd, pricing_model, works_in_brazil, works_in_mexico,
// accepts_brl, has_pt_support, has_latam_data, latam_note_pt, ai_native, categories
export function getTools() {
  return withCache('sb:tools', async () => {
    const rows = await fetchTable(`tools?select=${TOOLS_SELECT}&status=eq.published`);
    return rows.map(mapTool);
  });
}

export function getToolsByCategory(categoryName) {
  return withCache(`sb:cat:${categoryName}`, async () => {
    const tools = await getTools();
    return tools.filter(t => (t.categories || []).some(c => c.name === categoryName));
  });
}

export async function getToolBySlug(slug) {
  const safeSlug = encodeURIComponent(slug);
  return withCache(`sb:slug:${slug}`, async () => {
    const rows = await fetchTable(
      `tools?select=${TOOLS_SELECT}&slug=eq.${safeSlug}&status=eq.published&limit=1`
    );
    return rows[0] ? mapTool(rows[0]) : null;
  });
}

export function getAlternativas() {
  return withCache('sb:alternativas', async () => {
    const rows = await fetchTable(`alternativas_pages?select=slug_referencia&published=eq.true`);
    return rows;
  });
}

// Full page content for one alternativas/[slug] page. `alternativas` on the
// row is a comma-separated list of tool NAMES (not ids) — match against
// getTools() (already cached) to resolve the actual tool cards.
export async function getAlternativaBySlug(slug) {
  const safeSlug = encodeURIComponent(slug);
  return withCache(`sb:alt:${slug}`, async () => {
    const rows = await fetchTable(
      `alternativas_pages?select=*&slug_referencia=eq.${safeSlug}&published=eq.true&limit=1`
    );
    const page = rows[0];
    if (!page) return null;
    const altNames = (page.alternativas || '').split(',').map(s => s.trim()).filter(Boolean);
    const allTools = await getTools();
    const tools = allTools.filter(t => altNames.includes(t.Name));
    return { page, tools };
  });
}

// Looks up a cached Claude verdict for a tool pair. Returns { bulletsA, bulletsB }
// (arrays) on hit, or null on miss / parse error / Supabase error.
export async function getCompareCache(slugA, slugB) {
  const pairKey = encodeURIComponent(`${slugA}|${slugB}`);
  const rows = await fetchTable(
    `compare_cache?select=bullets_a,bullets_b&pair_key=eq.${pairKey}&limit=1`
  );
  const rec = rows[0];
  if (!rec) return null;
  const bulletsA = Array.isArray(rec.bullets_a) ? rec.bullets_a : [];
  const bulletsB = Array.isArray(rec.bullets_b) ? rec.bullets_b : [];
  return { bulletsA, bulletsB };
}

// Saves a generated verdict to the compare_cache table. Returns true on success.
// Requires the service role key — the anon key's RLS policy is read-only.
export async function saveCompareCache(slugA, slugB, bulletsA, bulletsB) {
  const url = restUrl('compare_cache');
  const serviceKey = import.meta.env.SUPABASE_SERVICE_KEY;
  if (!import.meta.env.SUPABASE_URL || !serviceKey) {
    console.error('[supabase] saveCompareCache: missing SUPABASE_SERVICE_KEY');
    return false;
  }
  try {
    const res = await fetch(`${url}?on_conflict=pair_key`, {
      method: 'POST',
      headers: {
        ...writeHeaders(),
        'Content-Type': 'application/json',
        Prefer: 'resolution=merge-duplicates',
      },
      body: JSON.stringify({
        pair_key: `${slugA}|${slugB}`,
        bullets_a: bulletsA ?? [],
        bullets_b: bulletsB ?? [],
        created_at: new Date().toISOString(),
      }),
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      console.error('saveCompareCache error:', err);
      return false;
    }
    return true;
  } catch (err) {
    console.error('saveCompareCache failed:', err?.message ?? err);
    return false;
  }
}
