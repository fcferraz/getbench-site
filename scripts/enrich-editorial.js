#!/usr/bin/env node
/**
 * Buskai.net — Script de Enriquecimento Editorial
 * Gera why_we_chose_pt, pros_pt e cons_pt via Claude para cada ferramenta publicada.
 *
 * Uso:
 *   AIRTABLE_API_KEY=... ANTHROPIC_API_KEY=... node scripts/enrich-editorial.js
 *
 * Flags opcionais:
 *   --slug=chatgpt          (processa apenas uma ferramenta)
 *   --overwrite             (sobrescreve campos já preenchidos)
 *   --dry-run               (mostra o conteúdo gerado sem salvar)
 */

import Anthropic from '@anthropic-ai/sdk';

// ─── Config ────────────────────────────────────────────────────────────────
const AIRTABLE_BASE   = process.env.AIRTABLE_BASE_ID  || 'appFwfYV1xtqMcEMg';
const AIRTABLE_KEY    = process.env.AIRTABLE_API_KEY;
const ANTHROPIC_KEY   = process.env.ANTHROPIC_API_KEY;
const MODEL           = 'claude-sonnet-4-6';
const DELAY_MS        = 1200; // delay entre ferramentas
const PAGE_SIZE       = 100;

// Flags de linha de comando
const args      = process.argv.slice(2);
const slugFlag  = args.find(a => a.startsWith('--slug='))?.split('=')[1];
const overwrite = args.includes('--overwrite');
const dryRun    = args.includes('--dry-run');

if (!AIRTABLE_KEY)  { console.error('❌  AIRTABLE_API_KEY não definida'); process.exit(1); }
if (!ANTHROPIC_KEY) { console.error('❌  ANTHROPIC_API_KEY não definida'); process.exit(1); }

const anthropic = new Anthropic({ apiKey: ANTHROPIC_KEY });

// ─── Airtable helpers ───────────────────────────────────────────────────────
const AT_BASE = `https://api.airtable.com/v0/${AIRTABLE_BASE}/tbl66b2aHBKUkkAF0`;
const atHeaders = {
  Authorization: `Bearer ${AIRTABLE_KEY}`,
  'Content-Type': 'application/json',
};

async function fetchAllPublished() {
  const tools = [];
  let offset = null;
  do {
    const params = new URLSearchParams({
      filterByFormula: '{status}="published"',
      pageSize: String(PAGE_SIZE),
      fields: [
        'Name', 'slug', 'tagline_pt', 'tagline_en',
        'description_pt', 'description_en',
        'works_in_brazil', 'has_free_plan',
        'starting_price_usd', 'pricing_model',
        'has_pt_support', 'currency',
        'why_we_chose_pt', 'pros_pt', 'cons_pt',
      ].map(f => `fields[]=${encodeURIComponent(f)}`).join('&'),
    });
    // Airtable não aceita fields[] em URLSearchParams padrão — montar na mão
    const qs = `filterByFormula=${encodeURIComponent('{status}="published"')}&pageSize=${PAGE_SIZE}` +
      `&fields[]=Name&fields[]=slug&fields[]=tagline_pt&fields[]=tagline_en` +
      `&fields[]=description_pt&fields[]=description_en&fields[]=works_in_brazil` +
      `&fields[]=has_free_plan&fields[]=starting_price_usd&fields[]=pricing_model` +
      `&fields[]=has_pt_support&fields[]=currency` +
      `&fields[]=why_we_chose_pt&fields[]=pros_pt&fields[]=cons_pt` +
      (offset ? `&offset=${offset}` : '');

    const res = await fetch(`${AT_BASE}?${qs}`, { headers: atHeaders });
    const data = await res.json();
    if (!res.ok) throw new Error(`Airtable error: ${JSON.stringify(data)}`);

    tools.push(...data.records.map(r => ({ id: r.id, ...r.fields })));
    offset = data.offset ?? null;
  } while (offset);
  return tools;
}

async function updateRecord(id, fields) {
  const res = await fetch(`${AT_BASE}/${id}`, {
    method: 'PATCH',
    headers: atHeaders,
    body: JSON.stringify({ fields }),
  });
  const data = await res.json();
  if (!res.ok) throw new Error(`Airtable update error: ${JSON.stringify(data)}`);
  return data;
}

// ─── Geração com Claude ─────────────────────────────────────────────────────
function buildPrompt(tool) {
  const price = tool.starting_price_usd === 0
    ? 'Gratuito (com planos pagos)'
    : tool.starting_price_usd
    ? `A partir de $${tool.starting_price_usd}/mês`
    : 'Preço não informado';

  return `Você é um editor sênior de um diretório de ferramentas de IA para o mercado brasileiro e LATAM.
Escreva conteúdo editorial conciso e útil em PT-BR para a ferramenta abaixo.

FERRAMENTA:
- Nome: ${tool.Name}
- Tagline: ${tool.tagline_pt || tool.tagline_en || ''}
- Descrição: ${tool.description_pt || tool.description_en || ''}
- Funciona no Brasil: ${tool.works_in_brazil ? 'Sim' : 'Não confirmado'}
- Tem plano grátis: ${tool.has_free_plan ? 'Sim' : 'Não'}
- Preço: ${price}
- Modelo de precificação: ${tool.pricing_model || 'Mensal'}
- Suporte em português: ${tool.has_pt_support ? 'Sim' : 'Não'}

Retorne EXATAMENTE neste formato JSON (sem markdown, sem explicações):
{
  "why_we_chose_pt": "2 a 3 frases editoriais explicando por que essa ferramenta se destaca para empresas brasileiras/LATAM. Tom direto, editorial, sem elogios vazios. Mencione diferenciais concretos.",
  "pros_pt": "✓ Primeiro pró real e específico\n✓ Segundo pró real e específico\n✓ Terceiro pró real e específico\n✓ Quarto pró (opcional, só se realmente relevante)",
  "cons_pt": "✗ Primeiro contra real\n✗ Segundo contra real\n✗ Terceiro contra (opcional)"
}`;
}

async function generateContent(tool) {
  const msg = await anthropic.messages.create({
    model: MODEL,
    max_tokens: 600,
    messages: [{ role: 'user', content: buildPrompt(tool) }],
  });

  const text = msg.content[0]?.text?.trim() ?? '';
  // Extrai o JSON mesmo que haja texto extra
  const match = text.match(/\{[\s\S]*\}/);
  if (!match) throw new Error(`JSON não encontrado na resposta: ${text.slice(0, 200)}`);
  const sanitized = match[0]
    .replace(/[\x00-\x1F\x7F]/g, (c) => {
      if (c === '\n' || c === '\r' || c === '\t') return ' ';
      return '';
    });
  return JSON.parse(sanitized);
}

// ─── sleep helper ───────────────────────────────────────────────────────────
const sleep = ms => new Promise(r => setTimeout(r, ms));

// ─── Main ───────────────────────────────────────────────────────────────────
async function main() {
  console.log('🔍  Buscando ferramentas publicadas no Airtable…');
  let tools = await fetchAllPublished();

  if (slugFlag) {
    tools = tools.filter(t => t.slug === slugFlag);
    if (!tools.length) { console.error(`❌  Ferramenta "${slugFlag}" não encontrada ou não publicada.`); process.exit(1); }
  }

  const toProcess = overwrite
    ? tools
    : tools.filter(t => !t.why_we_chose_pt);

  console.log(`📋  Total publicadas: ${tools.length} | A enriquecer: ${toProcess.length}${overwrite ? ' (modo --overwrite)' : ''}\n`);

  if (!toProcess.length) {
    console.log('✅  Nada para enriquecer. Use --overwrite para re-gerar tudo.');
    return;
  }

  let ok = 0, fail = 0;

  for (let i = 0; i < toProcess.length; i++) {
    const tool = toProcess[i];
    const label = `[${i + 1}/${toProcess.length}] ${tool.Name} (${tool.slug})`;
    process.stdout.write(`⚙️   ${label}… `);

    try {
      const content = await generateContent(tool);

      if (dryRun) {
        console.log('\n--- DRY RUN ---');
        console.log('why_we_chose_pt:', content.why_we_chose_pt);
        console.log('pros_pt:\n' + content.pros_pt);
        console.log('cons_pt:\n' + content.cons_pt);
        console.log('---------------\n');
      } else {
        await updateRecord(tool.id, {
          why_we_chose_pt: content.why_we_chose_pt,
          pros_pt: content.pros_pt,
          cons_pt: content.cons_pt,
        });
        console.log('✓');
      }
      ok++;
    } catch (err) {
      console.log(`✗ ERRO: ${err.message}`);
      fail++;
    }

    // delay entre requisições (exceto na última)
    if (i < toProcess.length - 1) await sleep(DELAY_MS);
  }

  console.log(`\n🏁  Concluído. Sucesso: ${ok} | Falhas: ${fail}`);
}

main().catch(err => { console.error('Fatal:', err); process.exit(1); });
