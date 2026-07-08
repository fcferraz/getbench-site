import { kv } from '@vercel/kv';

const TTL = 6 * 60 * 60; // 6 hours
const LKG_TTL = 30 * 24 * 60 * 60; // 30 days — last-known-good fallback

const isEmpty = v => v == null || (Array.isArray(v) && v.length === 0);

// Returns cached value on hit, falls back to fn() if KV is unavailable or misses.
// Never caches an empty result: an empty [] (or null) means Airtable failed, so we
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
  // Empty — likely an Airtable failure. Don't cache it; serve last-known-good if any.
  const lkg = await kv.get(`${key}:lkg`).catch(() => null);
  if (!isEmpty(lkg)) {
    console.warn(`[airtable] ${key} came back empty, serving last-known-good cache`);
    return lkg;
  }
  return result;
}

async function fetchFromAirtable(table, params = '') {
  const baseId = import.meta.env.AIRTABLE_BASE_ID;
  const apiKey = import.meta.env.AIRTABLE_API_KEY;
  if (!baseId || !apiKey) {
    console.error(`[airtable] Missing env vars — AIRTABLE_BASE_ID=${!!baseId} AIRTABLE_API_KEY=${!!apiKey}`);
    return [];
  }
  const BASE_URL = `https://api.airtable.com/v0/${baseId}`;
  const allRecords = [];
  let offset = null;
  try {
    do {
      const url = `${BASE_URL}/${table}?${params}${offset ? '&offset=' + offset : ''}`;
      const res = await fetch(url, {
        headers: { Authorization: `Bearer ${apiKey}` }
      });
      const data = await res.json();
      if (!res.ok || !Array.isArray(data.records)) {
        console.error(`Airtable error [${table}]:`, data.error ?? data);
        return allRecords;
      }
      allRecords.push(...data.records.map(r => ({ id: r.id, ...r.fields })));
      offset = data.offset ?? null;
    } while (offset);
    return allRecords;
  } catch (err) {
    console.error(`Airtable fetch failed [${table}]:`, err?.message ?? err);
    return allRecords;
  }
}

export function getCategories() {
  return withCache('at:categories', () => fetchFromAirtable('Categories'));
}

// Tool fields: Name, slug, tagline_en, description_pt, website, affiliate_url,
// has_free_plan, starting_price_usd, pricing_model, works_in_brazil, works_in_mexico,
// accepts_brl, has_pt_support, has_latam_data, latam_note_pt, ai_native, categories
export function getTools() {
  return withCache('at:tools', () => fetchFromAirtable('Tools', 'filterByFormula={status}="published"'));
}

export function getToolsByCategory(categoryName) {
  const safeName = String(categoryName).replace(/"/g, '\\"');
  return withCache(`at:cat:${categoryName}`, () =>
    fetchFromAirtable('Tools',
      `filterByFormula=AND(FIND("${safeName}",ARRAYJOIN({categories})),{status}="published")`)
  );
}

export async function getToolBySlug(slug) {
  const safeSlug = String(slug).replace(/"/g, '\\"');
  return withCache(`at:slug:${slug}`, async () => {
    const records = await fetchFromAirtable('Tools',
      `filterByFormula=AND({slug}="${safeSlug}",{status}="published")`);
    return records[0] ?? null;
  });
}

export function getAlternativas() {
  return withCache('at:alternativas', () =>
    fetchFromAirtable('tbl1FgI1foVC7n2HM', 'filterByFormula={published}=1&fields%5B%5D=slug_referencia')
  );
}

// "Compare Cache" table — referenced by ID because the name contains a space.
const COMPARE_CACHE_TABLE = 'tbl0FHXP8lZaaJaIv';

// Looks up a cached Claude verdict for a tool pair. Returns { bulletsA, bulletsB }
// (arrays) on hit, or null on miss / parse error / Airtable error.
export async function getCompareCache(slugA, slugB) {
  const pairKey = `${slugA}|${slugB}`;
  const safeKey = pairKey.replace(/"/g, '\\"');
  const records = await fetchFromAirtable(COMPARE_CACHE_TABLE,
    `filterByFormula={pair_key}="${safeKey}"&maxRecords=1`);
  const rec = records[0];
  if (!rec) return null;
  try {
    const bulletsA = JSON.parse(rec.bulletsA || '[]');
    const bulletsB = JSON.parse(rec.bulletsB || '[]');
    if (!Array.isArray(bulletsA) || !Array.isArray(bulletsB)) return null;
    return { bulletsA, bulletsB };
  } catch {
    return null;
  }
}

// Saves a generated verdict to the Compare Cache table. Returns true on success.
export async function saveCompareCache(slugA, slugB, bulletsA, bulletsB) {
  const BASE_URL = `https://api.airtable.com/v0/${import.meta.env.AIRTABLE_BASE_ID}`;
  try {
    const res = await fetch(`${BASE_URL}/${COMPARE_CACHE_TABLE}`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${import.meta.env.AIRTABLE_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        records: [
          {
            fields: {
              pair_key: `${slugA}|${slugB}`,
              bulletsA: JSON.stringify(bulletsA ?? []),
              bulletsB: JSON.stringify(bulletsB ?? []),
              created_at: new Date().toISOString().split('T')[0],
            },
          },
        ],
      }),
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      console.error('saveCompareCache error:', err.error ?? err);
      return false;
    }
    return true;
  } catch (err) {
    console.error('saveCompareCache failed:', err?.message ?? err);
    return false;
  }
}
