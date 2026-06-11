#!/usr/bin/env node
// Enriches Tools records missing starting_price_usd by scraping each website
// with Firecrawl and extracting pricing data with Claude.
// Usage: node --env-file=.env.local scripts/enrich-tools.mjs

import Anthropic from '@anthropic-ai/sdk';
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
loadEnv('.env.local');

const AIRTABLE_API_KEY  = process.env.AIRTABLE_API_KEY;
const AIRTABLE_BASE_ID  = process.env.AIRTABLE_BASE_ID;
const ANTHROPIC_API_KEY = process.env.ANTHROPIC_API_KEY;
const FIRECRAWL_API_KEY = process.env.FIRECRAWL_API_KEY;

if (!AIRTABLE_API_KEY || !AIRTABLE_BASE_ID || !ANTHROPIC_API_KEY || !FIRECRAWL_API_KEY) {
  console.error('ERROR: AIRTABLE_API_KEY, AIRTABLE_BASE_ID, ANTHROPIC_API_KEY, and FIRECRAWL_API_KEY are required.');
  process.exit(1);
}

// --- Constants ---
const AT_BASE = `https://api.airtable.com/v0/${AIRTABLE_BASE_ID}/Tools`;
const AT_HDR  = { Authorization: `Bearer ${AIRTABLE_API_KEY}`, 'Content-Type': 'application/json' };

const FIELD_STARTING_PRICE = 'fldrCp51VGKud4z8c';
const FIELD_PRICING_MODEL  = 'fldctUHWM5061c4PB'; // singleSelect — valid: per_month, per_user, custom
const FIELD_TAGLINE_EN     = 'fldfTvsYNDzn5yaAM';

const VALID_PRICING_MODELS = new Set(['per_month', 'per_user', 'custom']);

const anthropic = new Anthropic({ apiKey: ANTHROPIC_API_KEY });

// --overwrite: re-scrape every published tool instead of only those missing a price
const OVERWRITE = process.argv.includes('--overwrite');

// --- Airtable ---
async function fetchToolsMissingPrice() {
  const tools = [];
  let offset = '';
  do {
    const params = new URLSearchParams({
      filterByFormula: OVERWRITE
        ? `{status}="published"`
        : `AND({status}="published",{starting_price_usd}=BLANK())`,
      pageSize: '100',
    });
    ['Name', 'website', 'tagline_en'].forEach(f => params.append('fields[]', f));
    if (offset) params.set('offset', offset);

    const res = await fetch(`${AT_BASE}?${params}`, { headers: AT_HDR });
    if (!res.ok) throw new Error(`Airtable fetch ${res.status}: ${await res.text()}`);
    const data = await res.json();
    tools.push(...data.records);
    offset = data.offset ?? '';
  } while (offset);
  return tools;
}

async function updateRecord(id, fields) {
  const res = await fetch(AT_BASE, {
    method: 'PATCH',
    headers: AT_HDR,
    body: JSON.stringify({ records: [{ id, fields }] }),
  });
  if (!res.ok) throw new Error(`Airtable patch ${res.status}: ${await res.text()}`);
  return res.json();
}

// --- Firecrawl ---
async function scrape(url) {
  const res = await fetch('https://api.firecrawl.dev/v1/scrape', {
    method: 'POST',
    headers: { Authorization: `Bearer ${FIRECRAWL_API_KEY}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({ url, formats: ['markdown'] }),
  });
  if (!res.ok) throw new Error(`Firecrawl ${res.status}: ${(await res.text()).slice(0, 200)}`);
  const data = await res.json();
  return data?.data?.markdown || '';
}

// A 404/bot-wall/login page still returns a few hundred chars of markdown,
// so "non-empty" is not good enough to trust a guessed pricing URL.
const THIN_CONTENT = 1000;

async function scrapeWithFallback(website) {
  const base = website.replace(/\/$/, '');
  const candidates = [`${base}/pricing`];
  let isBr = false;
  try { isBr = /\.br$/.test(new URL(website).hostname); } catch { /* keep defaults */ }
  if (isBr) candidates.push(`${base}/planos`, `${base}/precos`, `${base}/planos-e-precos`);
  candidates.push(website);

  let best = '';
  for (const url of candidates) {
    try {
      process.stdout.write(`  Scraping ${url}… `);
      const content = await scrape(url);
      console.log(`${content.length} chars`);
      if (content.length >= THIN_CONTENT) return content;
      if (content.length > best.length) best = content;
    } catch (e) {
      console.log(`failed (${e.message.split('\n')[0]})`);
    }
  }
  return best;
}

// Strip markdown images/links/URLs — pure noise for pricing extraction that
// can push the actual plan prices past the truncation window on heavy pages.
function cleanMarkdown(md) {
  return md
    .replace(/!\[[^\]]*\]\([^)]*\)/g, '')
    .replace(/\[([^\]]*)\]\(([^)]*)\)/g, '$1')
    .replace(/https?:\/\/\S+/g, '')
    .replace(/\n{3,}/g, '\n\n');
}

// --- Claude extraction ---
async function extractPricing(toolName, content, hasTagline) {
  const message = await anthropic.messages.create({
    model: 'claude-sonnet-4-6',
    max_tokens: 512,
    messages: [{
      role: 'user',
      content: `Extract pricing info from this SaaS website content.

Tool: ${toolName}
Content:
---
${cleanMarkdown(content).substring(0, 30000)}
---

Respond ONLY with a JSON object:
{
  "starting_price_usd": <number | null — lowest paid plan $/month; 0 if fully free; null if unknown>,
  "has_free_plan": <boolean | null>,
  "pricing_model": <"per_month" | "per_user" | "custom" | null — use "custom" for per_year/usage_based/enterprise/contact-us>,
  "tagline_en": <string | null — max 100 chars concise English tagline${hasTagline ? '; set null since tagline exists' : '; craft from content'}>
}

Rules: annual pricing → divide by 12 for monthly. Return null for anything uncertain.`,
    }],
  });

  const text = message.content[0]?.text?.trim() ?? '';
  const match = text.match(/\{[\s\S]*\}/);
  if (!match) throw new Error(`No JSON in Claude response: ${text.slice(0, 100)}`);
  return JSON.parse(match[0]);
}

// --- Main ---
const sleep = ms => new Promise(r => setTimeout(r, ms));

async function run() {
  console.log(OVERWRITE
    ? 'Fetching all published tools (--overwrite)…'
    : 'Fetching published tools missing starting_price_usd…');
  const tools = await fetchToolsMissingPrice();
  console.log(`Found ${tools.length} tool(s) to enrich.\n`);

  if (!tools.length) { console.log('Nothing to do.'); return; }

  let updated = 0, skipped = 0, errors = 0;

  for (let i = 0; i < tools.length; i++) {
    const tool = tools[i];
    const name    = tool.fields.Name ?? tool.id;
    const website = tool.fields.website;

    console.log(`[${i + 1}/${tools.length}] ${name}`);

    if (!website) {
      console.log('  ⚠ No website — skipping.\n');
      skipped++;
      continue;
    }

    // Scrape
    let content = '';
    try {
      content = await scrapeWithFallback(website);
    } catch (e) {
      console.log(`  ✗ Scrape failed: ${e.message.split('\n')[0]}\n`);
      errors++;
      await sleep(2000);
      continue;
    }

    if (!content.trim()) {
      console.log('  ⚠ Empty content — skipping.\n');
      skipped++;
      await sleep(2000);
      continue;
    }

    // Extract
    let extracted;
    try {
      process.stdout.write('  Extracting with Claude… ');
      extracted = await extractPricing(name, content, !!tool.fields.tagline_en);
      console.log('done');
    } catch (e) {
      console.log(`failed: ${e.message}`);
      errors++;
      await sleep(2000);
      continue;
    }

    const priceStr  = extracted.starting_price_usd ?? 'null';
    const freeStr   = extracted.has_free_plan ?? 'null';
    const modelStr  = extracted.pricing_model ?? 'null';
    const tagStr    = extracted.tagline_en ? `"${extracted.tagline_en.slice(0, 60)}…"` : 'null';
    console.log(`  Found: price=$${priceStr} free=${freeStr} model=${modelStr} tagline=${tagStr}`);

    // Build Airtable payload (field IDs only)
    const fields = {};

    if (extracted.starting_price_usd !== null && extracted.starting_price_usd !== undefined) {
      fields[FIELD_STARTING_PRICE] = extracted.starting_price_usd;
    }
    if (extracted.pricing_model && VALID_PRICING_MODELS.has(extracted.pricing_model)) {
      fields[FIELD_PRICING_MODEL] = extracted.pricing_model;
    }
    if (extracted.tagline_en && !tool.fields.tagline_en) {
      fields[FIELD_TAGLINE_EN] = extracted.tagline_en.slice(0, 100);
    }

    if (!Object.keys(fields).length) {
      console.log('  ⚠ Nothing useful extracted — skipping update.\n');
      skipped++;
      await sleep(2000);
      continue;
    }

    try {
      process.stdout.write(`  Updating ${Object.keys(fields).length} field(s)… `);
      await updateRecord(tool.id, fields);
      console.log('✓');
      updated++;
    } catch (e) {
      console.log(`✗ ${e.message}`);
      errors++;
    }

    console.log();
    await sleep(2000);
  }

  console.log('--- Summary ---');
  console.log(`Total:   ${tools.length}`);
  console.log(`Updated: ${updated}`);
  console.log(`Skipped: ${skipped}`);
  console.log(`Errors:  ${errors}`);
}

run().catch(err => {
  console.error('\nFatal:', err.message);
  process.exit(1);
});
