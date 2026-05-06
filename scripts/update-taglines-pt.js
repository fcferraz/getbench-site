#!/usr/bin/env node
// Updates the tagline_pt field (Portuguese tagline) for all tools listed below.
// Usage: node --env-file=.env.local.save scripts/update-taglines-pt.js

import { readFileSync } from 'fs';
import { resolve, dirname } from 'path';
import { fileURLToPath } from 'url';

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..');

function loadEnv(file) {
  try {
    const raw = readFileSync(resolve(ROOT, file), 'utf8');
    for (const line of raw.split('\n')) {
      const trimmed = line.trim();
      if (!trimmed || trimmed.startsWith('#')) continue;
      const eq = trimmed.indexOf('=');
      if (eq === -1) continue;
      const key = trimmed.slice(0, eq).trim();
      const val = trimmed.slice(eq + 1).trim().replace(/^["']|["']$/g, '');
      if (!(key in process.env)) process.env[key] = val;
    }
  } catch { /* rely on already-set env vars */ }
}

loadEnv('.env.local.save');

const API_KEY = process.env.AIRTABLE_API_KEY;
const BASE_ID = process.env.AIRTABLE_BASE_ID;
const TABLE   = 'Tools';

if (!API_KEY || !BASE_ID) {
  console.error('ERROR: AIRTABLE_API_KEY and AIRTABLE_BASE_ID are required.');
  process.exit(1);
}

const TAGLINES = {
  'agendor':              'CRM brasileiro para equipes de vendas B2B com gestão de pipeline e insights com IA',
  'bamboohr':             'Plataforma de RH completa para PMEs com contratação, onboarding e gestão de desempenho',
  'brevo':                'Plataforma de marketing completa com e-mail, SMS e WhatsApp para o mercado LATAM',
  'churnzero':            'Plataforma de customer success em tempo real com IA para prever e reduzir churn',
  'clari':                'Plataforma de receita com IA para previsão e visibilidade de pipeline em tempo real',
  'cognism':              'Inteligência de vendas B2B com números verificados e dados de intenção de compra',
  'custify':              'Plataforma de customer success para SaaS com playbooks automatizados e health scores',
  'desk-manager':         'Service desk e ITSM brasileiro com gestão de chamados e controle de SLA',
  'dinamize':             'Plataforma brasileira de e-mail marketing e automação com editor drag-and-drop',
  'e-goi':                'Plataforma luso-brasileira multicanal com e-mail, SMS, push e plano gratuito',
  'feedz':                'Plataforma brasileira de RH para feedback contínuo, OKRs e engajamento',
  'gainsight':            'Plataforma pioneira de customer success com health scoring e insights por IA',
  'hubspot-crm':          'CRM completo com automação por IA para vendas, marketing e atendimento',
  'kaspr':                'Prospecção no LinkedIn com telefones e e-mails verificados e sincronização com CRM',
  'kenoby':               'ATS brasileiro com triagem de currículos por IA para médias e grandes empresas',
  'klaviyo':              'Automação de e-mail e SMS para e-commerce com segmentação avançada e analytics',
  'leadiq':               'Prospecção no LinkedIn com captura de contatos verificados e outreach por IA',
  'lusha':                'Dados de contatos B2B com telefones e e-mails precisos para SDRs no LinkedIn',
  'moskit':               'CRM brasileiro para PMEs com automação de negociações e integração com WhatsApp',
  'movidesk':             'Plataforma brasileira de suporte com roteamento de tickets por IA e gestão de SLA',
  'nectar-crm':           'CRM brasileiro para vendas B2B com WhatsApp integrado e suporte em português',
  'octadesk':             'Atendimento omnichannel brasileiro com WhatsApp, chat e chatbot para PMEs',
  'people-ai':            'Plataforma de RevOps com IA que captura atividades de vendas e enriquece o CRM',
  'planhat':              'Plataforma moderna de customer success com health metrics e otimização de NRR',
  'rd-station-crm':       'CRM brasileiro para equipes de receita com previsões por IA no ecossistema RD',
  'rd-station-marketing': 'Principal plataforma brasileira de automação de marketing para inbound e geração de leads',
  'salesforce':           'Principal CRM do mundo com Einstein AI para vendas, atendimento e marketing',
  'snov-io':              'Plataforma de outbound completa com localizador de e-mails, verificação e CRM',
  'solides':              'Plataforma brasileira de RH com DISC, gestão de talentos e people analytics',
  'taqe':                 'Plataforma brasileira de recrutamento com IA e avaliações gamificadas para alto volume',
  'totango':              'Plataforma de customer success com IA para reduzir churn e monitorar health scores',
  'waalaxy':              'Automação de outreach no LinkedIn e e-mail para prospecção multicanal sem código',
  'zoho-crm':             'CRM completo com IA Zia e planos acessíveis para PMEs na América Latina',
  'zoominfo':             'Maior banco de dados B2B empresarial com dados de intenção e automação de fluxos',
};

const TABLE_ID    = 'tbl66b2aHBKUkkAF0';
const BASE_URL    = `https://api.airtable.com/v0/${BASE_ID}/${TABLE}`;
const META_TABLES = `https://api.airtable.com/v0/meta/bases/${BASE_ID}/tables`;
const META_FIELDS = `https://api.airtable.com/v0/meta/bases/${BASE_ID}/tables/${TABLE_ID}/fields`;
const HEADERS     = { Authorization: `Bearer ${API_KEY}`, 'Content-Type': 'application/json' };

async function fetchSlugToId() {
  const map = new Map();
  let offset = '';
  do {
    const params = new URLSearchParams({ 'fields[]': 'slug', pageSize: '100' });
    if (offset) params.set('offset', offset);
    const res = await fetch(`${BASE_URL}?${params}`, { headers: HEADERS });
    if (!res.ok) throw new Error(`Fetch error ${res.status}: ${await res.text()}`);
    const data = await res.json();
    for (const r of data.records) {
      if (r.fields.slug) map.set(r.fields.slug, r.id);
    }
    offset = data.offset ?? '';
  } while (offset);
  return map;
}

async function patchBatch(records) {
  const res = await fetch(BASE_URL, {
    method: 'PATCH',
    headers: HEADERS,
    body: JSON.stringify({ records }),
  });
  if (!res.ok) throw new Error(`Patch error ${res.status}: ${await res.text()}`);
  return res.json();
}

async function ensureField(name) {
  // List tables to inspect existing fields (GET /tables returns fields; GET /tables/{id}/fields returns 404)
  const res = await fetch(META_TABLES, { headers: HEADERS });
  if (!res.ok) throw new Error(`Metadata fetch error ${res.status}: ${await res.text()}`);
  const { tables } = await res.json();
  const table = tables.find(t => t.id === TABLE_ID);
  if (!table) throw new Error(`Table ${TABLE_ID} not found in metadata.`);

  if (table.fields.some(f => f.name === name)) {
    console.log(`Field "${name}" already exists.`);
    return;
  }

  // Create the field
  process.stdout.write(`Creating field "${name}"… `);
  const create = await fetch(META_FIELDS, {
    method: 'POST',
    headers: HEADERS,
    body: JSON.stringify({ name, type: 'singleLineText' }),
  });

  if (!create.ok) {
    const body = await create.json().catch(() => ({}));
    if (create.status === 403 || body?.error?.type === 'INVALID_PERMISSIONS_OR_MODEL_NOT_FOUND') {
      console.error('\n\n⚠ Token sem permissão para criar campos (schema.bases:write).');
      console.error('  Cria o campo manualmente no Airtable:');
      console.error('  1. Abre a tabela "Tools" no Airtable');
      console.error('  2. Clica em "+" para adicionar campo');
      console.error(`  3. Nome: "${name}" | Tipo: Single line text`);
      console.error('  4. Salva e re-executa este script.\n');
      process.exit(1);
    }
    throw new Error(`Field creation error ${create.status}: ${JSON.stringify(body)}`);
  }
  console.log('✓');
}

async function run() {
  await ensureField('tagline_pt');
  console.log();
  process.stdout.write(`Fetching slug → record ID map… `);
  const slugToId = await fetchSlugToId();
  console.log(`${slugToId.size} tools found.\n`);

  const patches = [];
  const missing = [];

  for (const [slug, tagline_pt] of Object.entries(TAGLINES)) {
    const id = slugToId.get(slug);
    if (!id) { missing.push(slug); continue; }
    patches.push({ id, fields: { tagline_pt } });
  }

  if (missing.length) {
    console.warn(`⚠ Slugs not found in Airtable (skipped): ${missing.join(', ')}\n`);
  }

  console.log(`Updating ${patches.length} records…\n`);

  const BATCH_SIZE = 10;
  let updated = 0;

  for (let i = 0; i < patches.length; i += BATCH_SIZE) {
    const batch = patches.slice(i, i + BATCH_SIZE);
    process.stdout.write(`  Batch ${Math.floor(i / BATCH_SIZE) + 1} (${batch.length} records)… `);
    const result = await patchBatch(batch);
    updated += result.records.length;
    console.log(`✓ ${result.records.map(r => r.fields.Name ?? r.id).join(', ')}`);
  }

  console.log(`\nDone. ${updated}/${patches.length} records updated.`);
}

run().catch(err => {
  console.error('\nFailed:', err.message);
  process.exit(1);
});
