import { getToolsByCategory } from '../../lib/supabase.js';

export async function GET({ url }) {
  const slug = url.searchParams.get('category');
  if (!slug) return new Response(JSON.stringify([]), { status: 400 });

  const tools = await getToolsByCategory(slug);
  return new Response(JSON.stringify(tools.map(t => ({ slug: t.slug, Name: t.Name }))), {
    headers: { 'Content-Type': 'application/json' }
  });
}
