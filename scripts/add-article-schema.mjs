#!/usr/bin/env node
import { readFileSync, writeFileSync, readdirSync } from 'fs';
import { join } from 'path';

const BLOG_DIR = new URL('../src/pages/blog', import.meta.url).pathname;

const SCHEMA_TAG = `  <script type="application/ld+json" set:html={JSON.stringify({
    "@context": "https://schema.org",
    "@type": "Article",
    "headline": frontmatter.title,
    "description": frontmatter.description,
    "datePublished": frontmatter.date,
    "dateModified": frontmatter.date,
    "author": {
      "@type": "Organization",
      "name": "Buskai",
      "url": "https://buskai.net"
    },
    "publisher": {
      "@type": "Organization",
      "name": "Buskai",
      "url": "https://buskai.net"
    }
  })} />`;

function processFile(filePath) {
  const content = readFileSync(filePath, 'utf-8');

  // Find the closing > of the <Base ...> opening tag.
  // The tag may span multiple lines: <Base\n  title="..."\n  description="..."\n>
  const baseIdx = content.indexOf('<Base');
  if (baseIdx === -1) return content;

  // Walk forward from <Base to find its closing >
  let depth = 0;
  let i = baseIdx;
  while (i < content.length) {
    if (content[i] === '<') depth++;
    if (content[i] === '>') {
      depth--;
      if (depth === 0) break;
    }
    i++;
  }
  // i is now the index of the closing > of <Base ...>
  const insertAt = i + 1; // right after >

  return content.slice(0, insertAt) + '\n' + SCHEMA_TAG + '\n' + content.slice(insertAt);
}

const files = readdirSync(BLOG_DIR).filter(f => f.endsWith('.astro') && f !== 'index.astro');
let ok = 0;
for (const f of files) {
  try {
    const result = processFile(join(BLOG_DIR, f));
    writeFileSync(join(BLOG_DIR, f), result, 'utf-8');
    console.log(`✓  ${f}`);
    ok++;
  } catch (e) {
    console.error(`✗  ${f}:`, e.message);
  }
}
console.log(`\n${ok}/${files.length} files updated`);
