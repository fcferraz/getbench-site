const BASE_URL = `https://api.airtable.com/v0/${import.meta.env.AIRTABLE_BASE_ID}`;

async function fetchFromAirtable(table, params = '') {
  const res = await fetch(`${BASE_URL}/${table}?${params}`, {
    headers: { Authorization: `Bearer ${import.meta.env.AIRTABLE_API_KEY}` }
  });
  const data = await res.json();
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
