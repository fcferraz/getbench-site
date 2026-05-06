#!/usr/bin/env node
// Backs up all Airtable records for Tools and Categories to backups/.
// Usage: node scripts/backup-airtable.js
// Reads AIRTABLE_API_KEY and AIRTABLE_BASE_ID from .env.local.save.

import { readFileSync, mkdirSync, writeFileSync } from 'fs';
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
  } catch {
    // file doesn't exist — rely on already-set env vars
  }
}

loadEnv('.env.local.save');

const API_KEY = process.env.AIRTABLE_API_KEY;
const BASE_ID = process.env.AIRTABLE_BASE_ID;

if (!API_KEY || !BASE_ID) {
  console.error('ERROR: AIRTABLE_API_KEY and AIRTABLE_BASE_ID are required.');
  console.error('       Set them in .env.local.save or as environment variables.');
  process.exit(1);
}

async function fetchAllRecords(table) {
  const records = [];
  let offset = '';
  const base = `https://api.airtable.com/v0/${BASE_ID}/${encodeURIComponent(table)}`;

  do {
    const params = new URLSearchParams({ pageSize: '100' });
    if (offset) params.set('offset', offset);

    const res = await fetch(`${base}?${params}`, {
      headers: { Authorization: `Bearer ${API_KEY}` },
    });

    if (!res.ok) {
      const err = await res.text();
      throw new Error(`Airtable error [${table}] ${res.status}: ${err}`);
    }

    const data = await res.json();
    for (const r of data.records) records.push({ id: r.id, ...r.fields });
    offset = data.offset ?? '';
  } while (offset);

  return records;
}

async function backup() {
  const date = new Date().toISOString().slice(0, 10);
  const dir = resolve(ROOT, 'backups');
  mkdirSync(dir, { recursive: true });

  for (const table of ['Tools', 'Categories']) {
    process.stdout.write(`Fetching ${table}… `);
    const records = await fetchAllRecords(table);
    const file = resolve(dir, `${table.toLowerCase()}-${date}.json`);
    writeFileSync(file, JSON.stringify(records, null, 2), 'utf8');
    console.log(`${records.length} records → backups/${table.toLowerCase()}-${date}.json`);
  }

  console.log('\nBackup completo.');
}

backup().catch(err => {
  console.error('\nFailed:', err.message);
  process.exit(1);
});
