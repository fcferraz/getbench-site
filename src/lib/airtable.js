async function fetchFromAirtable(table, params = '') {
  const BASE_URL = `https://api.airtable.com/v0/${process.env.AIRTABLE_BASE_ID}`;
  try {
    const res = await fetch(`${BASE_URL}/${table}?${params}`, {
      headers: { Authorization: `Bearer ${process.env.AIRTABLE_API_KEY}` }
    });
    const data = await res.json();
    if (!res.ok || !Array.isArray(data.records)) {
      console.error(`Airtable error [${table}]:`, data.error ?? data);
      return [];
    }
    return data.records.map(r => ({ id: r.id, ...r.fields }));
  } catch (err) {
    console.error(`Airtable fetch failed [${table}]:`, err?.message ?? err);
    return [];
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
  return fetchFromAirtable('Tools',
    `filterByFormula=AND(FIND("${categoryName}",ARRAYJOIN({categories})),{status}="published")`
  );
}

export async function getToolBySlug(slug) {
  const records = await fetchFromAirtable('Tools',
    `filterByFormula=AND({slug}="${slug}",{status}="published")`);
  return records[0] ?? null;
}
