async function fetchFromAirtable(table, params = '') {
  const BASE_URL = `https://api.airtable.com/v0/${process.env.AIRTABLE_BASE_ID}`;
  const res = await fetch(`${BASE_URL}/${table}?${params}`, {
    headers: { Authorization: `Bearer ${process.env.AIRTABLE_API_KEY}` }
  });
  const data = await res.json();
  if (!res.ok || !Array.isArray(data.records)) {
    console.error(`Airtable error [${table}]:`, data.error ?? data);
    return [];
  }
  return data.records.map(r => ({ id: r.id, ...r.fields }));
}

export async function getCategories() {
  return fetchFromAirtable('Categories');
}

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
