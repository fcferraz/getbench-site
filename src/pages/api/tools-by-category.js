import { getToolsByCategory } from '../../lib/airtable.js';

export async function GET({ url }) {
  const category = url.searchParams.get('category');
  if (!category) return new Response(JSON.stringify([]), { status: 400 });
  const name = category.split('-').map(w => w.charAt(0).toUpperCase() + w.slice(1)).join(' ');
  const tools = await getToolsByCategory(name);
  return new Response(JSON.stringify(tools.map(t => ({ slug: t.slug, Name: t.Name }))), {
    headers: { 'Content-Type': 'application/json' }
  });
}
