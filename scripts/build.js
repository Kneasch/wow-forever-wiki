#!/usr/bin/env node
// Production build: plain static HTML for any static host (no nginx, no Node at runtime).
// Usage: npm run build   -> dist/
// - Inlines nginx-style SSI includes (<!--# include virtual="/_includes/x.html" -->) into every page,
//   the same way server.js does at request time. Keep the two in step.
// - Copies everything else under site/ as is, except the _includes fragments.
// Pages stay at dist/w/<Page>.html. Netlify, Cloudflare Pages and GitHub Pages serve those at the
// clean /w/<Page> URLs the links use, and 404.html at the root as the not-found page.
const fs = require('fs');
const path = require('path');

const SITE = path.join(__dirname, '..', 'site');
const DIST = path.join(__dirname, '..', 'dist');
const SSI = /<!--#\s*include\s+virtual="([^"]+)"\s*-->/g;
// Set BASE_PATH when the site is served from a subpath, e.g. GitHub Pages project sites
// (BASE_PATH=/wow-forever-wiki). Root-absolute href/src/action URLs get it as a prefix.
const BASE = (process.env.BASE_PATH || '').replace(/\/+$/, '');
const rebase = (html) => (BASE ? html.replace(/\b(href|src|action)="\/(?!\/)/g, `$1="${BASE}/`) : html);

const includes = new Map();
function include(virtual, depth) {
  const file = path.join(SITE, virtual);
  if (!file.startsWith(SITE + path.sep) || !fs.existsSync(file)) throw new Error(`missing include ${virtual}`);
  if (!includes.has(file)) includes.set(file, fs.readFileSync(file, 'utf8'));
  return render(includes.get(file), depth + 1);
}
const render = (html, depth = 0) => {
  if (depth > 5) throw new Error('includes nested too deep');
  return html.replace(SSI, (_, virtual) => include(virtual, depth));
};

let pages = 0, files = 0;
function copy(dir) {
  for (const entry of fs.readdirSync(path.join(SITE, dir), { withFileTypes: true })) {
    if (entry.name.startsWith('_') || entry.name === '.DS_Store') continue; // _includes is only for SSI
    const rel = path.join(dir, entry.name);
    if (entry.isDirectory()) { fs.mkdirSync(path.join(DIST, rel), { recursive: true }); copy(rel); continue; }
    if (entry.name.endsWith('.html')) {
      fs.writeFileSync(path.join(DIST, rel), rebase(render(fs.readFileSync(path.join(SITE, rel), 'utf8'))));
      pages++;
    } else {
      fs.copyFileSync(path.join(SITE, rel), path.join(DIST, rel));
      files++;
    }
  }
}

fs.rmSync(DIST, { recursive: true, force: true });
fs.mkdirSync(DIST, { recursive: true });
copy('');
console.log(`Built ${pages} pages and ${files} assets into dist/${BASE ? ` (base path ${BASE})` : ''}`);
