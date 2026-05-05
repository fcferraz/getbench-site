#!/usr/bin/env node
// Seed 20 AI tools into the Airtable Tools table.
// Usage: AIRTABLE_API_KEY=... AIRTABLE_BASE_ID=... node scripts/seed-tools.js

const API_KEY = process.env.AIRTABLE_API_KEY;
const BASE_ID = process.env.AIRTABLE_BASE_ID;
const TABLE_ID = 'tbl66b2aHBKUkkAF0';

if (!API_KEY || !BASE_ID) {
  console.error('ERROR: AIRTABLE_API_KEY and AIRTABLE_BASE_ID env vars are required.');
  process.exit(1);
}

// Category record IDs resolved from the Categories table
const CAT = {
  CRM:      'recVRK8xtKv0lfcXI', // CRM Automation
  MKTG:     'rec5CYgldi7FSVLLJ', // Marketing Automation
  CS:       'recJ18peeGz2LObpG', // Customer Success
  HR:       'recVnFpzFca8zG6ff', // HR Automation
  REVOPS:   'recWj2RbK5TnzdI3M', // Revenue Operations
  OUTREACH: 'receWd1o84vxpAgcM', // Sales Outreach
  SUPPORT:  'reckEZwYRXhXmb0wM', // Customer Support
  SDR:      'recypr4sbbtcy3Tje', // SDR Automation
};

const tools = [
  // ── CRM Automation ──────────────────────────────────────────────────────────
  {
    Name: 'Agendor',
    slug: 'agendor',
    categories: [CAT.CRM],
    status: 'published',
    works_in_brazil: true,
    has_pt_support: true,
    description_en: 'Brazilian CRM built for B2B sales teams with pipeline management, activity tracking, and AI-powered insights tailored for the Latin American market.',
    description_pt: 'CRM brasileiro desenvolvido para equipes de vendas B2B com gestão de pipeline, rastreamento de atividades e insights com IA voltados para o mercado latino-americano.',
  },
  {
    Name: 'Moskit',
    slug: 'moskit',
    categories: [CAT.CRM],
    status: 'published',
    works_in_brazil: true,
    has_pt_support: true,
    description_en: 'Brazilian CRM focused on SMBs with deal automation, WhatsApp integration, and sales performance dashboards in Portuguese.',
    description_pt: 'CRM brasileiro focado em pequenas e médias empresas com automação de negociações, integração com WhatsApp e dashboards de desempenho em português.',
  },
  {
    Name: 'HubSpot CRM',
    slug: 'hubspot-crm',
    categories: [CAT.CRM],
    status: 'published',
    works_in_brazil: true,
    has_pt_support: true,
    description_en: 'All-in-one CRM platform with AI-powered automation for sales, marketing, and customer service. Widely adopted in Brazil with full Portuguese interface and local support.',
    description_pt: 'Plataforma CRM completa com automação por IA para vendas, marketing e atendimento. Amplamente adotada no Brasil com interface em português e suporte local.',
  },

  // ── Marketing Automation ─────────────────────────────────────────────────────
  {
    Name: 'RD Station Marketing',
    slug: 'rd-station-marketing',
    categories: [CAT.MKTG],
    status: 'published',
    works_in_brazil: true,
    has_pt_support: true,
    description_en: "Brazil's leading marketing automation platform for inbound marketing, lead generation, email campaigns, and analytics — built natively for the Brazilian market.",
    description_pt: 'A principal plataforma brasileira de automação de marketing para inbound marketing, geração de leads, campanhas de e-mail e análises — desenvolvida nativamente para o mercado brasileiro.',
  },
  {
    Name: 'ActiveCampaign',
    slug: 'activecampaign',
    categories: [CAT.MKTG],
    status: 'published',
    works_in_brazil: true,
    has_pt_support: true,
    description_en: 'AI-powered marketing automation and CRM platform with advanced email marketing, customer segmentation, and multi-channel campaign orchestration popular across Brazil.',
    description_pt: 'Plataforma de automação de marketing e CRM com IA, com e-mail marketing avançado, segmentação de clientes e orquestração de campanhas multicanal, popular no Brasil.',
  },
  {
    Name: 'Brevo',
    slug: 'brevo',
    categories: [CAT.MKTG],
    status: 'published',
    works_in_brazil: true,
    has_pt_support: true,
    description_en: 'All-in-one marketing platform (formerly Sendinblue) offering email, SMS, and WhatsApp campaigns with marketing automation, Portuguese support, and LATAM-friendly pricing.',
    description_pt: 'Plataforma de marketing completa (anteriormente Sendinblue) com e-mail, SMS e campanhas no WhatsApp, automação de marketing, suporte em português e preços acessíveis para o mercado LATAM.',
  },

  // ── Customer Success ──────────────────────────────────────────────────────────
  {
    Name: 'Totango',
    slug: 'totango',
    categories: [CAT.CS],
    status: 'published',
    works_in_brazil: true,
    has_pt_support: false,
    description_en: 'AI-driven customer success platform that helps SaaS companies reduce churn, improve onboarding, and track health scores across the entire customer lifecycle.',
    description_pt: 'Plataforma de customer success com IA que ajuda empresas SaaS a reduzir churn, melhorar o onboarding e monitorar health scores ao longo de todo o ciclo de vida do cliente.',
  },
  {
    Name: 'ChurnZero',
    slug: 'churnzero',
    categories: [CAT.CS],
    status: 'published',
    works_in_brazil: true,
    has_pt_support: false,
    description_en: 'Real-time customer success platform that uses AI to predict churn risk, automate playbooks, and enable CS teams to proactively engage at-risk accounts.',
    description_pt: 'Plataforma de customer success em tempo real que usa IA para prever risco de churn, automatizar playbooks e permitir que equipes de CS engajem contas em risco de forma proativa.',
  },

  // ── HR Automation ─────────────────────────────────────────────────────────────
  {
    Name: 'Gupy',
    slug: 'gupy',
    categories: [CAT.HR],
    status: 'published',
    works_in_brazil: true,
    has_pt_support: true,
    description_en: "Brazil's leading AI-powered HR and recruitment platform for attracting, selecting, and hiring talent at scale with automated screening and DEI-focused features.",
    description_pt: 'A principal plataforma brasileira de RH e recrutamento com IA para atrair, selecionar e contratar talentos em escala com triagem automatizada e recursos focados em diversidade.',
  },
  {
    Name: 'Sólides',
    slug: 'solides',
    categories: [CAT.HR],
    status: 'published',
    works_in_brazil: true,
    has_pt_support: true,
    description_en: 'Brazilian HR tech platform combining DISC behavioral assessment, talent management, performance reviews, and people analytics to develop and retain employees.',
    description_pt: 'Plataforma brasileira de RH que combina avaliação comportamental DISC, gestão de talentos, avaliações de desempenho e people analytics para desenvolver e reter colaboradores.',
  },
  {
    Name: 'Kenoby',
    slug: 'kenoby',
    categories: [CAT.HR],
    status: 'published',
    works_in_brazil: true,
    has_pt_support: true,
    description_en: 'Brazilian ATS with AI-assisted resume screening, automated candidate communication, and structured selection workflows for mid-to-large enterprises.',
    description_pt: 'ATS brasileiro com triagem de currículos assistida por IA, comunicação automatizada com candidatos e fluxos de seleção estruturados para médias e grandes empresas.',
  },

  // ── Revenue Operations ────────────────────────────────────────────────────────
  {
    Name: 'RD Station CRM',
    slug: 'rd-station-crm',
    categories: [CAT.REVOPS],
    status: 'published',
    works_in_brazil: true,
    has_pt_support: true,
    description_en: 'Brazilian CRM for revenue teams to manage leads, track deals, and gain AI-powered forecasting within the TOTVS/RD Station ecosystem.',
    description_pt: 'CRM brasileiro para equipes de receita gerenciarem leads, acompanharem negociações e obterem previsões com IA dentro do ecossistema TOTVS/RD Station.',
  },
  {
    Name: 'Clari',
    slug: 'clari',
    categories: [CAT.REVOPS],
    status: 'published',
    works_in_brazil: true,
    has_pt_support: false,
    description_en: 'AI revenue platform that provides real-time pipeline visibility, revenue forecasting, and deal inspection to help revenue teams hit their numbers with confidence.',
    description_pt: 'Plataforma de receita com IA que fornece visibilidade de pipeline em tempo real, previsão de receita e inspeção de negociações para ajudar equipes a atingirem suas metas.',
  },
  {
    Name: 'Gong',
    slug: 'gong',
    categories: [CAT.REVOPS],
    status: 'published',
    works_in_brazil: true,
    has_pt_support: false,
    description_en: 'Revenue intelligence platform that analyzes customer interactions via AI to surface insights on deals, rep performance, and market trends across sales and CS teams.',
    description_pt: 'Plataforma de inteligência de receita que analisa interações com clientes via IA para revelar insights sobre negociações, desempenho de representantes e tendências de mercado.',
  },

  // ── Sales Outreach ────────────────────────────────────────────────────────────
  {
    Name: 'Outreach',
    slug: 'outreach',
    categories: [CAT.OUTREACH],
    status: 'published',
    works_in_brazil: true,
    has_pt_support: false,
    description_en: 'AI-powered sales execution platform that automates multi-touch outreach sequences, manages pipelines, and delivers actionable insights to help reps close more deals.',
    description_pt: 'Plataforma de execução de vendas com IA que automatiza sequências de outreach multicanal, gerencia pipelines e fornece insights acionáveis para ajudar representantes a fecharem mais negócios.',
  },
  {
    Name: 'Reply.io',
    slug: 'reply-io',
    categories: [CAT.OUTREACH],
    status: 'published',
    works_in_brazil: true,
    has_pt_support: false,
    description_en: 'AI sales engagement platform with multichannel outreach (email, LinkedIn, WhatsApp, calls), automated follow-ups, and an AI SDR agent that books meetings autonomously.',
    description_pt: 'Plataforma de engajamento de vendas com IA para outreach multicanal (e-mail, LinkedIn, WhatsApp, ligações), follow-ups automáticos e agente SDR com IA que agenda reuniões de forma autônoma.',
  },

  // ── Customer Support ──────────────────────────────────────────────────────────
  {
    Name: 'Movidesk',
    slug: 'movidesk',
    categories: [CAT.SUPPORT],
    status: 'published',
    works_in_brazil: true,
    has_pt_support: true,
    description_en: 'Brazilian customer support and service desk platform with AI-powered ticket routing, SLA management, CSAT surveys, and deep integrations with Brazilian business tools.',
    description_pt: 'Plataforma brasileira de suporte ao cliente e service desk com roteamento de tickets por IA, gestão de SLA, pesquisas de satisfação e integrações com ferramentas de negócios brasileiras.',
  },
  {
    Name: 'Zendesk',
    slug: 'zendesk',
    categories: [CAT.SUPPORT],
    status: 'published',
    works_in_brazil: true,
    has_pt_support: true,
    description_en: 'Global customer service platform with AI-powered ticketing, omnichannel support, and automation. Widely used in Brazil with full Portuguese localization.',
    description_pt: 'Plataforma global de atendimento ao cliente com tickets por IA, suporte omnicanal e automação. Amplamente utilizado no Brasil com localização completa em português.',
  },

  // ── SDR Automation ────────────────────────────────────────────────────────────
  {
    Name: 'Amplemarket',
    slug: 'amplemarket',
    categories: [CAT.SDR],
    status: 'published',
    works_in_brazil: true,
    has_pt_support: false,
    description_en: 'AI-powered sales intelligence and prospecting platform with real-time buyer signals, automated LinkedIn outreach, and email sequences with strong LATAM company coverage.',
    description_pt: 'Plataforma de inteligência de vendas e prospecção com IA, com sinais de comprador em tempo real, outreach automatizado no LinkedIn e sequências de e-mail com forte cobertura de empresas LATAM.',
  },
  {
    Name: 'Apollo.io',
    slug: 'apollo-io',
    categories: [CAT.SDR],
    status: 'published',
    works_in_brazil: true,
    has_pt_support: false,
    description_en: 'All-in-one sales intelligence and engagement platform with 275M+ contact database, AI-powered prospecting, automated sequences, and CRM enrichment — popular among Brazilian SDR teams.',
    description_pt: 'Plataforma completa de inteligência e engajamento de vendas com banco de dados de 275M+ contatos, prospecção com IA, sequências automatizadas e enriquecimento de CRM — popular entre equipes SDR brasileiras.',
  },
];

async function fetchExistingSlugs() {
  const slugs = new Set();
  let offset = '';

  do {
    const params = new URLSearchParams({ 'fields[]': 'slug' });
    if (offset) params.set('offset', offset);

    const res = await fetch(`https://api.airtable.com/v0/${BASE_ID}/${TABLE_ID}?${params}`, {
      headers: { Authorization: `Bearer ${API_KEY}` },
    });

    if (!res.ok) {
      const err = await res.text();
      throw new Error(`Airtable API error ${res.status}: ${err}`);
    }

    const data = await res.json();
    for (const record of data.records) {
      if (record.fields.slug) slugs.add(record.fields.slug);
    }
    offset = data.offset ?? '';
  } while (offset);

  return slugs;
}

// Map tool fields to Airtable field names
function toAirtableFields(tool) {
  return {
    Name:           tool.Name,
    slug:           tool.slug,
    categories:     tool.categories,
    status:         tool.status,
    works_in_brazil: tool.works_in_brazil,
    has_pt_support: tool.has_pt_support,
    description_en: tool.description_en,
    description_pt: tool.description_pt,
  };
}

async function createBatch(records) {
  const url = `https://api.airtable.com/v0/${BASE_ID}/${TABLE_ID}`;
  const body = {
    records: records.map((fields) => ({ fields })),
    typecast: true,
  };

  const res = await fetch(url, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${API_KEY}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(body),
  });

  if (!res.ok) {
    const err = await res.text();
    throw new Error(`Airtable API error ${res.status}: ${err}`);
  }

  return res.json();
}

async function seed() {
  process.stdout.write('Checking existing slugs… ');
  const existingSlugs = await fetchExistingSlugs();
  console.log(`${existingSlugs.size} tools already in table.\n`);

  const toCreate = [];
  for (const tool of tools) {
    if (existingSlugs.has(tool.slug)) {
      console.log(`  já existe: ${tool.Name}`);
    } else {
      toCreate.push(tool);
    }
  }

  if (toCreate.length === 0) {
    console.log('\nNada a criar. Todas as ferramentas já existem.');
    return;
  }

  console.log(`\nCreating ${toCreate.length} new tools…\n`);

  const fields = toCreate.map(toAirtableFields);
  const BATCH_SIZE = 10;
  let created = 0;

  for (let i = 0; i < fields.length; i += BATCH_SIZE) {
    const batch = fields.slice(i, i + BATCH_SIZE);
    const batchNum = Math.floor(i / BATCH_SIZE) + 1;

    process.stdout.write(`  Batch ${batchNum} (${batch.length} records)… `);
    const result = await createBatch(batch);
    created += result.records.length;
    console.log(`✓ ${result.records.map((r) => r.fields.Name).join(', ')}`);
  }

  console.log(`\nDone. ${created}/${toCreate.length} tools created.`);
}

seed().catch((err) => {
  console.error('\nFailed:', err.message);
  process.exit(1);
});
