import { getCategories, getToolsByCategory } from '../../lib/supabase.js';

export async function GET({ url }) {
  const slug = url.searchParams.get('category');
  if (!slug) return new Response(JSON.stringify([]), { status: 400 });

  const categories = await getCategories();
  const cat = categories.find(c => c.Slug === slug);
  if (!cat) return new Response(JSON.stringify([]), { status: 404 });

  const tools = await getToolsByCategory(cat.Name);
  return new Response(JSON.stringify(tools.map(t => ({ slug: t.slug, Name: t.Name }))), {
    headers: { 'Content-Type': 'application/json' }
  });
}
