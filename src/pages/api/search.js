import { getTools } from '../../lib/supabase.js';
import { rateLimit } from '../../lib/rateLimit.js';

export async function POST({ request }) {
  const limited = await rateLimit(request);
  if (limited) return limited;

  let body;
  try {
    body = await request.json();
  } catch {
    return new Response(JSON.stringify({ error: 'JSON inválido' }), {
      status: 400,
      headers: { 'Content-Type': 'application/json' }
    });
  }
  const { query } = body;

  if (typeof query !== 'string' || query.length > 200) {
    return new Response(
      JSON.stringify({ error: 'Busca inválida ou muito longa (máx. 200 caracteres)' }),
      { status: 400, headers: { 'Content-Type': 'application/json' } }
    );
  }

  const tools = await getTools();

  const toolsList = tools.map(t => ({
    slug: t.slug,
    name: t.Name,
    tagline: t.tagline_en || '',
    description: (t.description_en || '').substring(0, 200),
    has_free_plan: t.has_free_plan || false,
    starting_price_usd: t.starting_price_usd || 0,
    works_in_brazil: t.works_in_brazil || false,
    accepts_brl: t.accepts_brl || false,
    has_pt_support: t.has_pt_support || false,
    website: t.website || '',
    affiliate_url: t.affiliate_url || '',
  }));

  const prompt = `Voce e um especialista em AI tools para o mercado LATAM.

O usuario busca: "${query}"

Tools disponiveis:
${JSON.stringify(toolsList)}

Selecione as 3 a 5 tools mais relevantes para essa busca. Responda APENAS com JSON valido, sem markdown:
{
  "reasoning": "frase curta em portugues explicando a selecao",
  "tools": [
    {
      "slug": "slug-da-tool",
      "name": "Nome",
      "tagline": "tagline em ingles",
      "reason": "por que essa tool resolve o problema (1 frase em portugues)",
      "price": "Free ou A partir de $X/mo",
      "has_free_plan": true,
      "works_in_brazil": true,
      "website": "url",
      "affiliate_url": "url ou vazio"
    }
  ]
}`;

  const response = await fetch('https://api.anthropic.com/v1/messages', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-api-key': import.meta.env.ANTHROPIC_API_KEY,
      'anthropic-version': '2023-06-01'
    },
    body: JSON.stringify({
      model: 'claude-haiku-4-5-20251001',
      max_tokens: 1000,
      messages: [{ role: 'user', content: prompt }]
    })
  });

  const ai = await response.json();
  if (!ai.content || !ai.content[0]) {
    return new Response(JSON.stringify({ error: ai.error || ai }), { status: 500, headers: { 'Content-Type': 'application/json' } });
  }
  let data;
  try {
    const text = ai.content[0].text.trim();
    const clean = text.replace(/```json/g, '').replace(/```/g, '').trim();
    data = JSON.parse(clean);
  } catch {
    return new Response(JSON.stringify({ error: 'Resposta inválida do assistente' }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' }
    });
  }

  return new Response(JSON.stringify(data), {
    headers: { 'Content-Type': 'application/json' }
  });
}
