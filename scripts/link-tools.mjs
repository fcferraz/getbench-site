#!/usr/bin/env node
import { readFileSync, writeFileSync, readdirSync } from 'fs';
import { join } from 'path';

const BLOG_DIR = new URL('../src/pages/blog', import.meta.url).pathname;
const LINK_STYLE = 'color:#1D9E75;text-decoration:underline;font-weight:500;';
const VER_STYLE = 'font-size:13px;color:#1D9E75;text-decoration:none;font-weight:500;';

// Sorted longest-first to prevent partial-name shadowing
const TOOL_MAP = [
  ['RD Station Marketing', 'rd-station-marketing'],
  ['Microsoft Copilot',    'microsoft-copilot'],
  ['Factorial HR',         'factorial-hr'],
  ['ActiveCampaign',       'activecampaign'],
  ['HubSpot Sales',        'hubspot-sales'],
  ['HubSpot CRM',          'hubspot-crm'],
  ['RD Station CRM',       'rd-station-crm'],
  ['Notion AI',            'notion-ai'],
  ['Reply Chat',           'reply-chat'],
  ['Apollo.io',            'apollo-io'],
  ['Meta AI',              'meta-ai'],
  ['ElevenLabs',           'elevenlabs'],
  ['AdCreative',           'adcreative'],
  ['OpusClip',             'opusclip'],
  ['Submagic',             'submagic'],
  ['Beehiiv',              'beehiiv'],
  ['Octadesk',             'octadesk'],
  ['Chatbase',             'chatbase'],
  ['Salesloft',            'salesloft'],
  ['Instantly',            'instantly'],
  ['Klaviyo',              'klaviyo'],
  ['Fireflies',            'fireflies'],
  ['Pipedrive',            'pipedrive'],
  ['Sólides',              'solides'],
  ['Gemini',               'gemini'],
  ['Agendor',              'agendor'],
  ['ChatGPT',              'chatgpt'],
  ['Bluedot',              'bluedot'],
  ['HeyGen',               'heygen'],
  ['Funnels',              'funnels'],
  ['Runway',               'runway'],
  ['Moskit',               'moskit'],
  ['Kenoby',               'kenoby'],
  ['Lemlist',              'lemlist'],
  ['Tidio',                'tidio'],
  ['Kaspr',                'kaspr'],
  ['Claude',               'claude'],
  ['Canva',                'canva'],
  ['Gupy',                 'gupy'],
  ['VEED',                 'veed'],
  ['Gong',                 'gong'],
  ['Clay',                 'clay'],
  ['tldv',                 'tldv'],
  ['Noty',                 'noty'],
  ['Taqe',                 'taqe'],
  ['Pika',                 'pika'],
];

// div id → tool slug for non-standard ids
const ID_SLUG = new Map([
  ['chatbase-ecom',  'chatbase'],
  ['funnels-sales',  'funnels'],
  ['pipedrive-sales','pipedrive'],
  ['tidio-ecom',     'tidio'],
  ['opus-clip',      'opusclip'],
  ['copilot',        'microsoft-copilot'],
]);
// add direct matches
for (const [, s] of TOOL_MAP) ID_SLUG.set(s, s);

// Word-boundary chars (for names that need boundary checks)
const BEFORE_OK = /[\s>'"(\-,;:\n]|^/;
const AFTER_OK  = /[\s<'"!?.,;:\)\-\n]|$/;
// Names that are unique enough to skip boundary checks
const NO_BOUNDARY = new Set(['tldv', 'VEED', 'Apollo.io', 'ChatGPT', 'HeyGen', 'OpusClip',
  'AdCreative', 'ElevenLabs', 'Submagic', 'Beehiiv', 'Salesloft', 'Fireflies',
  'Bluedot', 'Instantly', 'Klaviyo', 'Octadesk', 'Chatbase', 'Sólides',
  'Lemlist', 'Kaspr', 'Agendor', 'Moskit', 'Kenoby', 'Pipedrive', 'Gemini',
  'ActiveCampaign', 'Factorial HR', 'Microsoft Copilot', 'Reply Chat',
  'RD Station CRM', 'RD Station Marketing', 'HubSpot CRM', 'HubSpot Sales',
  'Notion AI', 'Meta AI', 'Apollo.io']);

function processFile(filePath) {
  const raw = readFileSync(filePath, 'utf-8');

  // Split off frontmatter (content between first --- and second ---)
  const fm0 = raw.indexOf('---');
  const fm1 = raw.indexOf('---', fm0 + 3) + 3;
  const front = raw.slice(0, fm1);
  let html = raw.slice(fm1);

  // Precompute style block ranges to skip
  const styleRanges = [];
  for (const m of html.matchAll(/<style[\s\S]*?<\/style>/g)) {
    styleRanges.push([m.index, m.index + m[0].length]);
  }
  const inStyle = (i) => styleRanges.some(([a, b]) => i >= a && i < b);

  // ── Step 1: first-occurrence tool-name links ──────────────────────────────
  for (const [name, slug] of TOOL_MAP) {
    let from = 0;
    while (true) {
      const idx = html.indexOf(name, from);
      if (idx === -1) break;

      // Skip positions inside style blocks
      if (inStyle(idx)) { from = idx + 1; continue; }

      // Skip inside HTML tag attributes (between < and > without a closing >)
      const lastOpen  = html.lastIndexOf('<', idx);
      const lastClose = html.lastIndexOf('>', idx);
      if (lastOpen > lastClose) { from = idx + 1; continue; }

      // Skip if already inside <a>
      const before = html.slice(0, idx);
      const opens  = (before.match(/<a[\s>]/g) || []).length;
      const closes = (before.match(/<\/a>/g) || []).length;
      if (opens > closes) { from = idx + 1; continue; }

      // Word boundary check for ambiguous short names
      if (!NO_BOUNDARY.has(name)) {
        const cb = idx > 0 ? html[idx - 1] : '\n';
        const ca = html[idx + name.length] ?? '\n';
        if (!BEFORE_OK.test(cb) || !AFTER_OK.test(ca)) { from = idx + 1; continue; }
      }

      // Replace and stop (first occurrence only)
      html = html.slice(0, idx)
        + `<a href="/tools/${slug}" style="${LINK_STYLE}">${name}</a>`
        + html.slice(idx + name.length);
      break;
    }
  }

  // ── Step 2: "Ver site →" after first <p> in each .tool-block ─────────────
  const insertions = [];
  const divRe = /<div\b([^>]*)class="tool-block"([^>]*)>/g;
  for (const m of html.matchAll(divRe)) {
    const attrs = m[1] + m[2];
    const idM = attrs.match(/\bid="([^"]+)"/);
    if (!idM) continue;
    const slug = ID_SLUG.get(idM[1]);
    if (!slug) continue;

    const after = m.index + m[0].length;
    const pEnd = html.indexOf('</p>', after);
    if (pEnd === -1) continue;

    insertions.push({
      pos: pEnd + 4,
      text: `\n          <p style="margin-top:8px;"><a href="/tools/${slug}" style="${VER_STYLE}">Ver site →</a></p>`,
    });
  }

  // Apply in reverse so earlier positions stay valid
  for (const { pos, text } of insertions.sort((a, b) => b.pos - a.pos)) {
    html = html.slice(0, pos) + text + html.slice(pos);
  }

  return front + html;
}

const files = readdirSync(BLOG_DIR).filter(f => f.endsWith('.astro') && f !== 'index.astro');
let ok = 0;
for (const f of files) {
  try {
    const out = processFile(join(BLOG_DIR, f));
    writeFileSync(join(BLOG_DIR, f), out, 'utf-8');
    console.log(`✓  ${f}`);
    ok++;
  } catch (e) {
    console.error(`✗  ${f}:`, e.message);
  }
}
console.log(`\n${ok}/${files.length} files updated`);
