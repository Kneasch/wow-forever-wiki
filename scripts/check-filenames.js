#!/usr/bin/env node
// Fails when the repo would not check out cleanly on Windows, macOS or Linux, or a wiki link is broken.
// Usage: npm run check
// - every tracked path must be a portable file name (see portabilityProblem in scripts/slug.js)
// - no two tracked paths may differ only in letter case (one overwrites the other on Windows/macOS)
// - every /w/<Page> link in site/ must point at an existing site/w/<Page>.html, with the exact case
//   (Linux servers are case-sensitive, so a case mismatch works locally on Windows/macOS but 404s live)
const fs = require('fs');
const path = require('path');
const { execFileSync } = require('child_process');
const { portabilityProblem } = require('./slug');

const ROOT = path.join(__dirname, '..');
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

const pages = new Set(tracked.filter((p) => /^site\/w\/[^/]+\.html$/.test(p)).map((p) => p.slice('site/w/'.length, -'.html'.length)));
const LINK = /href="\/w\/([^"#?]+)/g;
for (const p of tracked) {
  if (!p.startsWith('site/') || !p.endsWith('.html') || !fs.existsSync(path.join(ROOT, p))) continue;
  const html = fs.readFileSync(path.join(ROOT, p), 'utf8');
  for (const [, raw] of html.matchAll(LINK)) {
    let target;
    try { target = decodeURI(raw.replace(/&amp;/g, '&')); } catch { problems.push(`${p}: bad URL /w/${raw}`); continue; }
    if (!pages.has(target)) problems.push(`${p}: link to /w/${raw} has no page site/w/${target}.html`);
  }
}

if (problems.length) {
  console.error(`${problems.length} problem(s):\n  ` + [...new Set(problems)].join('\n  '));
  process.exit(1);
}
console.log(`OK: ${tracked.length} file names are portable and every /w/ link resolves`);
