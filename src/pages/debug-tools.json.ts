import type { APIRoute } from 'astro';
import { getTools } from '../../lib/airtable.js';

export const GET: APIRoute = async () => {
  const tools = await getTools();
  const sample = tools.slice(0, 3).map(t => Object.keys(t));
  return new Response(JSON.stringify(sample, null, 2), {
    headers: { 'Content-Type': 'application/json' }
  });
};
