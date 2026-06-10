async function fetchFromAirtable(table, params = '') {
  const BASE_URL = `https://api.airtable.com/v0/${process.env.AIRTABLE_BASE_ID}`;
  const allRecords = [];
  let offset = null;
  try {
    do {
      const url = `${BASE_URL}/${table}?${params}${offset ? '&offset=' + offset : ''}`;
      const res = await fetch(url, {
        headers: { Authorization: `Bearer ${process.env.AIRTABLE_API_KEY}` }
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

export async function getCategories() {
  return fetchFromAirtable('Categories');
}

// Tool fields: Name, slug, tagline_en, description_pt, website, affiliate_url,
// has_free_plan, starting_price_usd, pricing_model, works_in_brazil, works_in_mexico,
// accepts_brl, has_pt_support, has_latam_data, latam_note_pt, ai_native, categories
export async function getTools() {
  return fetchFromAirtable('Tools', 'filterByFormula={status}="published"');
}

export async function getToolsByCategory(categoryName) {
  const safeName = String(categoryName).replace(/"/g, '\\"');
  return fetchFromAirtable('Tools',
    `filterByFormula=AND(FIND("${safeName}",ARRAYJOIN({categories})),{status}="published")`
  );
}

export async function getToolBySlug(slug) {
  const safeSlug = String(slug).replace(/"/g, '\\"');
  const records = await fetchFromAirtable('Tools',
    `filterByFormula=AND({slug}="${safeSlug}",{status}="published")`);
  return records[0] ?? null;
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
  const BASE_URL = `https://api.airtable.com/v0/${process.env.AIRTABLE_BASE_ID}`;
  try {
    const res = await fetch(`${BASE_URL}/${COMPARE_CACHE_TABLE}`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${process.env.AIRTABLE_API_KEY}`,
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
