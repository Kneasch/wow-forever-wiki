#!/usr/bin/env node
// Fails when the repo would not check out cleanly on Windows, macOS or Linux, or a rendered page has a broken link.
// Usage: npm run check
// - every tracked path must be a portable file name (see portabilityProblem in src/lib/slug.js)
// - no two tracked paths may differ only in letter case (one overwrites the other on Windows/macOS)
// - every page renders, and no two page titles share a file (collectPages throws)
// - every /w/<Page> link in a rendered page points at a page, with the exact case
//   (Linux servers are case-sensitive, so a case mismatch works locally on Windows/macOS but 404s live)
// - every /assets/ URL in a rendered page points at a file in site/
const fs = require('fs');
const path = require('path');
const { execFileSync } = require('child_process');
const { portabilityProblem } = require('../lib/slug');
const { collectPages, renderPage } = require('./render');

const ROOT = path.join(__dirname, '..', '..');
// Read names from git, not the disk: on Windows the bad names never reach the disk at all.
const tracked = execFileSync('git', ['-C', ROOT, 'ls-files', '-z', '--cached', '--others', '--exclude-standard'])
  .toString('utf8').split('\0').filter(Boolean);
const problems = [];

const byLower = new Map();
for (const p of tracked) {
  for (const part of p.split('/')) {
    const why = portabilityProblem(part);
    if (why) problems.push(`${p}: "${part}" ${why}`);
  }
  const key = p.toLowerCase();
  if (byLower.has(key) && byLower.get(key) !== p) problems.push(`${p} and ${byLower.get(key)} differ only in letter case`);
  else byLower.set(key, p);
}

(async () => {
  const pages = collectPages();
  const urls = new Set(pages.map((p) => decodeURI(p.url)));
  const assets = new Map(); // URL -> exists
  for (const page of pages) {
    const why = portabilityProblem(path.basename(page.file));
    if (why) problems.push(`page "${page.title}" would be written to ${page.file}, which ${why}`);
    const html = await renderPage(page);
    // Attribute values as the browser reads them (Vue writes ' as &#39;, so match up to the closing quote first)
    const attrs = (re) => [...html.matchAll(re)].map(([, v]) => v.replace(/&#39;/g, "'").replace(/&quot;/g, '"').replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/&amp;/g, '&'));
    for (const raw of attrs(/href="(\/w\/[^"]+)"/g)) {
      let target;
      try { target = decodeURI(raw.replace(/[#?].*$/, '')); } catch { problems.push(`${page.file}: bad URL ${raw}`); continue; }
      if (!urls.has(target)) problems.push(`${page.file}: link to ${raw} has no page`);
    }
    for (const raw of attrs(/(?:href|src)="(\/assets\/[^"]+)"/g)) {
      const url = raw.replace(/[#?].*$/, '');
      if (!assets.has(url)) assets.set(url, fs.existsSync(path.join(ROOT, 'site', decodeURI(url))));
      if (!assets.get(url)) problems.push(`${page.file}: ${url} is not in site/`);
    }
  }
  if (problems.length) {
    console.error(`${problems.length} problem(s):\n  ` + [...new Set(problems)].join('\n  '));
    process.exit(1);
  }
  console.log(`OK: ${tracked.length} file names are portable, and ${pages.length} pages render with every /w/ link and asset resolving`);
})().catch((err) => { console.error(err); process.exit(1); });
