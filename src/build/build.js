#!/usr/bin/env node
// Production build: renders every wiki page with Vue into dist/, as plain static HTML for any static host.
// Usage: npm run build   -> dist/
// - Pages come from src/data (research JSON -> page models) and src/pages (Vue templates); see src/build/render.js.
//   They are not committed: CI and the GitHub Pages workflow build them.
// - Static files (site/assets: CSS, scripts, icons, maps, the pin sprite) are copied as they are.
// - search-index.json: every page title, for the search box (site/assets/search.js).
// Pages are dist/w/<Page>.html, dist/index.html and dist/404.html. Netlify, Cloudflare Pages and GitHub Pages
// serve those at the clean /w/<Page> URLs the links use, and 404.html as the not-found page.
const fs = require('fs');
const path = require('path');
const { collectPages, renderPage, searchIndex } = require('./render');

const ROOT = path.join(__dirname, '..', '..');
const SITE = path.join(ROOT, 'site');
const DIST = process.env.WIKI_OUT ? path.resolve(process.env.WIKI_OUT) : path.join(ROOT, 'dist');
// Set BASE_PATH when the site is served from a subpath, e.g. GitHub Pages project sites
// (BASE_PATH=/wow-forever-wiki). Root-absolute href/src/action URLs get it as a prefix.
const BASE = (process.env.BASE_PATH || '').replace(/\/+$/, '');
const rebase = (html) => (BASE ? html.replace(/\b(href|src|action)="\/(?!\/)/g, `$1="${BASE}/`) : html);

let files = 0;
function copy(dir) {
  for (const entry of fs.readdirSync(path.join(SITE, dir), { withFileTypes: true })) {
    if (entry.name === '.DS_Store') continue;
    const rel = path.join(dir, entry.name);
    if (entry.isDirectory()) { fs.mkdirSync(path.join(DIST, rel), { recursive: true }); copy(rel); continue; }
    fs.copyFileSync(path.join(SITE, rel), path.join(DIST, rel));
    files++;
  }
}

(async () => {
  const start = Date.now();
  fs.rmSync(DIST, { recursive: true, force: true });
  fs.mkdirSync(path.join(DIST, 'w'), { recursive: true });
  copy('');
  const pages = collectPages();
  for (const page of pages) fs.writeFileSync(path.join(DIST, page.file), rebase(await renderPage(page)));
  // Page titles for site/assets/search.js; its URLs are root paths, and the script adds the base path itself
  fs.writeFileSync(path.join(DIST, 'search-index.json'), JSON.stringify(searchIndex(pages)));
  console.log(`Built ${pages.length} pages and ${files} assets into ${path.relative(ROOT, DIST) || '.'}/ in ${((Date.now() - start) / 1000).toFixed(1)}s${BASE ? ` (base path ${BASE})` : ''}`);
})().catch((err) => { console.error(err); process.exit(1); });
