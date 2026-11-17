#!/usr/bin/env node
// Look up every researched item's icon on Wowhead and download the icon images.
// Usage: node scripts/fetch-icons.js
// Writes research/icons.json ({ "<item_id>": "<icon name>" }) and site/assets/icons/<icon>.jpg.
// Icon names come from the same Forever tooltip endpoint as the item stats. Only missing
// entries and files are fetched, so re-running after adding a dungeon is cheap.
const fs = require('fs');
const path = require('path');

const ROOT = path.join(__dirname, '..');
const RESEARCH = path.join(ROOT, 'research');
const MAP = path.join(RESEARCH, 'icons.json');
const ICONS = path.join(ROOT, 'site', 'assets', 'icons');
const TOOLTIP = (id) => `https://nether.wowhead.com/forever/tooltip/item/${id}`;
const IMAGE = (icon) => `https://wow.zamimg.com/images/wow/icons/large/${icon}.jpg`; // 56x56, matches .item-icon

const icons = fs.existsSync(MAP) ? JSON.parse(fs.readFileSync(MAP, 'utf8')) : {};
const ids = new Set();
for (const f of fs.readdirSync(RESEARCH).filter((f) => f.endsWith('.json') && f !== 'icons.json')) {
  for (const it of JSON.parse(fs.readFileSync(path.join(RESEARCH, f), 'utf8')).items) {
    if (it.item_id) ids.add(String(it.item_id));
  }
}

async function get(url, as) {
  for (let attempt = 1; ; attempt++) {
    try {
      const res = await fetch(url);
      if (res.status === 404) return null;
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      return as === 'json' ? await res.json() : Buffer.from(await res.arrayBuffer());
    } catch (e) {
      if (attempt === 3) { console.warn(`  failed ${url}: ${e.message}`); return null; }
      await new Promise((r) => setTimeout(r, 500 * attempt));
    }
  }
}

// Run fn over items with a small fixed concurrency, to be polite to Wowhead.
async function pool(items, fn, n = 8) {
  const queue = [...items];
  await Promise.all(Array.from({ length: n }, async () => { while (queue.length) await fn(queue.shift()); }));
}

(async () => {
  const todo = [...ids].filter((id) => !icons[id]);
  console.log(`${ids.size} item IDs, ${todo.length} without an icon name`);
  await pool(todo, async (id) => {
    const tip = await get(TOOLTIP(id), 'json');
    if (tip?.icon) icons[id] = tip.icon;
  });
  const sorted = Object.fromEntries(Object.entries(icons).sort(([a], [b]) => a - b));
  fs.writeFileSync(MAP, JSON.stringify(sorted, null, 2) + '\n');

  fs.mkdirSync(ICONS, { recursive: true });
  const files = [...new Set(Object.values(icons))].filter((icon) => !fs.existsSync(path.join(ICONS, icon + '.jpg')));
  console.log(`${Object.keys(icons).length} icon names, ${files.length} images to download`);
  await pool(files, async (icon) => {
    const img = await get(IMAGE(icon));
    if (img) fs.writeFileSync(path.join(ICONS, icon + '.jpg'), img);
  });
  const missing = [...ids].filter((id) => !icons[id]);
  if (missing.length) console.log(`No icon for ${missing.length} IDs: ${missing.join(', ')}`);
})();
