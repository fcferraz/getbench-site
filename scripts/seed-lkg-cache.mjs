// Disaster-recovery seed: writes the last-known-good (:lkg) fallback cache from
// CSV-exported JSON, bypassing Airtable's rate-limited API. NOT part of the build.
// Run with prod KV creds in env: KV_REST_API_URL + KV_REST_API_TOKEN.
//   node scripts/seed-lkg-cache.mjs
// Only writes the :lkg keys — never touches the 6h at:tools / at:categories keys.
// scripts/data/*.json are a point-in-time snapshot (2026-07-08). Once Airtable
// recovers, live fetches overwrite :lkg (30d TTL); this only acts as a cold-start
// floor. To refresh: re-export from Airtable and re-run.
import { kv } from '@vercel/kv';
import { readFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';

const dir = new URL('./data/', import.meta.url);

async function seed(key, file) {
  const data = JSON.parse(await readFile(new URL(file, dir), 'utf8'));
  if (!Array.isArray(data) || data.length === 0) {
    throw new Error(`${file} is not a non-empty array — refusing to seed ${key}`);
  }
  await kv.set(key, data); // no ex: persistent last-known-good, matches DR intent
  console.log(`Seeded ${key} with ${data.length} records`);
}

await seed('at:tools:lkg', 'tools-lkg-seed.json');
await seed('at:categories:lkg', 'categories-lkg-seed.json');
