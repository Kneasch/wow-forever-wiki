#!/usr/bin/env node
// Refresh profession research files from the Wowhead Forever tooltip API.
// Usage: node scripts/fetch-professions.js [research/professions/mining.json ...]   (default: every file)
// Node's built-in fetch ignores HTTPS_PROXY; behind a proxy run it with NODE_USE_ENV_PROXY=1 (Node >= 22.21).
//
// Only fields that the tooltip API is authoritative for are overwritten. Hand-researched fields
// (node contents, recipe skill levels, trainers, notes, sources) are left alone.
//   nodes[]      object tooltip  -> name, required_skill, zone_id, zone, zone_level, spawn_count, coords
//   materials[]  item tooltip    -> name, quality, icon, item_level, sell_price, max_stack, dropped_by
//   recipes[]    spell tooltip   -> name, icon, reagents[], creates, tool_note
//   camp[]       item tooltip    -> blueprint name, required_skill, drop source, effect, build reagents
// Item icons are added to research/icons.json and downloaded to site/assets/icons/, like fetch-icons.js;
// so are the profession icons named in research/professions/index.json.
const fs = require('fs');
const path = require('path');

const ROOT = path.join(__dirname, '..');
const DIR = path.join(ROOT, 'research', 'professions');
const ICON_MAP = path.join(ROOT, 'research', 'icons.json');
const ICON_DIR = path.join(ROOT, 'site', 'assets', 'icons');
const API = (type, id) => `https://nether.wowhead.com/forever/tooltip/${type}/${id}`;
const IMAGE = (icon) => `https://wow.zamimg.com/images/wow/icons/large/${icon}.jpg`;
const QUALITY = ['poor', 'common', 'uncommon', 'rare', 'epic', 'legendary'];

async function get(url, as = 'json') {
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
async function pool(items, fn, n = 6) {
  const queue = [...items];
  await Promise.all(Array.from({ length: n }, async () => { while (queue.length) await fn(queue.shift()); }));
}

const text = (html) => html.replace(/<br\s*\/?>/g, '\n').replace(/<[^>]+>/g, '').replace(/&nbsp;/g, ' ').replace(/&quot;/g, '"').replace(/&amp;/g, '&');
// "<span class="moneygold">1</span><span class="moneysilver">50</span>" -> "1g 50s"
const money = (html) => {
  const m = html.match(/whtt-sellprice">Sell Price:(.*?)<\/div>/);
  if (!m) return null;
  const parts = [...m[1].matchAll(/money(gold|silver|copper)">(\d+)/g)].map(([, u, v]) => v + u[0]);
  return parts.length ? parts.join(' ') : null;
};
// Item links with an optional "&nbsp;(N)" count after them: reagent lists in spell and blueprint tooltips
const itemLinks = (html) => [...html.matchAll(/<a href="\/forever\/item=(\d+)[^"]*">([^<]+)<\/a>(?:&nbsp;\((\d+)\))?/g)]
  .map(([, id, name, n]) => ({ name: text(name), item_id: Number(id), count: n ? Number(n) : 1 }));
const droppedBy = (html) => {
  const t = text(html);
  const by = t.match(/Dropped by: ([^\n]+?)(?=Drop Chance|$|\n)/);
  const pct = t.match(/Drop Chance: ([\d.]+)%/);
  return by ? { npc: by[1].trim(), drop_chance_pct: pct ? Number(pct[1]) : null } : null;
};

const zones = new Map();
async function zone(id) {
  if (!zones.has(id)) {
    const z = await get(API('zone', id));
    zones.set(id, z ? { name: z.name, level: (z.tooltip.match(/Level ([\d-]+)/) || [])[1] || null } : { name: null, level: null });
  }
  return zones.get(id);
}

async function refreshNode(n) {
  const d = await get(API('object', n.object_id));
  if (!d || d.error) return console.warn(`  object ${n.object_id}: not found`);
  n.name = d.name;
  const skill = text(d.tooltip).match(/Requires ([A-Za-z ]+) \((\d+)\)/);
  n.required_skill = skill ? Number(skill[2]) : null;
  const zid = d.map?.zone ?? null;
  const z = zid ? await zone(zid) : { name: null, level: null };
  n.zone_id = zid;
  n.zone = z.name;
  n.zone_level = z.level;
  // The tooltip only maps the zone with the most spawns; floor "0" is the outdoor map
  const coords = Object.values(d.map?.coords || {}).flat();
  n.spawn_count = coords.length || null;
  n.coords = coords;
}

async function refreshMaterial(m, icons) {
  const d = await get(API('item', m.item_id));
  if (!d || d.error) return console.warn(`  item ${m.item_id}: not found`);
  Object.assign(m, {
    name: d.name,
    quality: QUALITY[d.quality] ?? null,
    icon: d.icon || null,
    item_level: Number((d.tooltip.match(/<!--ilvl-->(\d+)/) || [])[1]) || null,
    sell_price: money(d.tooltip),
    max_stack: Number((text(d.tooltip).match(/Max Stack: (\d+)/) || [])[1]) || null,
    dropped_by: droppedBy(d.tooltip),
  });
  if (d.icon) icons[m.item_id] = d.icon;
}

async function refreshRecipe(r) {
  const d = await get(API('spell', r.spell_id));
  if (!d || d.error) return console.warn(`  spell ${r.spell_id}: not found`);
  // Reagents sit in the "indent" block after "Reagents:"; the created item is the first quality-coloured
  // item link after it, with an optional " (N)" count; the description (when there is one) is div.q
  const reagentHtml = (d.tooltip.match(/Reagents:<br \/><div class="indent[^"]*">(.*?)<\/div>/s) || [])[1] || '';
  const made = d.tooltip.match(/<span class="q\d"><a href="\/forever\/item=(\d+)[^"]*">([^<]+)<\/a><\/span>(?:\s*\((\d+)\))?/);
  const desc = (d.tooltip.match(/<div class="q">(.*?)<\/div>/s) || [])[1] || '';
  Object.assign(r, {
    name: d.name,
    icon: d.icon || null,
    reagents: itemLinks(reagentHtml),
    creates: made ? { name: text(made[2]), item_id: Number(made[1]), count: made[3] ? Number(made[3]) : 1 } : null,
    description: text(desc).replace(/\s+/g, ' ').trim() || null,
  });
}

async function refreshCamp(c, icons) {
  const d = await get(API('item', c.blueprint_item_id));
  if (!d || d.error) return console.warn(`  item ${c.blueprint_item_id}: not found`);
  const t = text(d.tooltip);
  // The placed item's "Use:" text, minus Wowhead's unrendered [formula] fragments
  const uses = [...t.matchAll(/Use: ([^\n]*)/g)].map((m) => m[1]);
  const effect = uses.length ? [uses[uses.length - 1].replace(/\s*May be placed.*$/, '').replace(/\[\(.*$/, '').trim()] : null;
  // The blueprint tooltip embeds the placed item's tooltip; its "Requires" list at the end is the build cost
  const buildHtml = d.tooltip.split(/Requires\s*<a href="\/forever\/item=/).length > 1 ? d.tooltip.slice(d.tooltip.lastIndexOf('Requires')) : '';
  Object.assign(c, {
    blueprint: d.name,
    name: d.name.replace(/^Blueprint: /, ''),
    required_skill: Number((t.match(/Requires [A-Za-z ]+ \((\d+)\)/) || [])[1]) || null,
    blueprint_source: droppedBy(d.tooltip),
    effect: effect ? effect[0].replace(/\s+/g, ' ').trim() : null,
    build_reagents: itemLinks(buildHtml),
  });
  if (d.icon) icons[c.blueprint_item_id] = d.icon;
}

(async () => {
  const files = process.argv.slice(2).length
    ? process.argv.slice(2)
    : fs.readdirSync(DIR).filter((f) => f.endsWith('.json') && f !== 'index.json').map((f) => path.join(DIR, f));
  const icons = fs.existsSync(ICON_MAP) ? JSON.parse(fs.readFileSync(ICON_MAP, 'utf8')) : {};
  for (const file of files) {
    const d = JSON.parse(fs.readFileSync(file, 'utf8'));
    console.log(`${path.basename(file)}: ${d.nodes?.length || 0} nodes, ${d.materials?.length || 0} materials, ${d.recipes?.length || 0} recipes, ${d.camp?.length || 0} camp items`);
    await pool(d.nodes || [], refreshNode);
    await pool(d.materials || [], (m) => refreshMaterial(m, icons));
    await pool(d.recipes || [], refreshRecipe);
    await pool(d.camp || [], (c) => refreshCamp(c, icons));
    d.fetched = new Date().toISOString().slice(0, 10);
    fs.writeFileSync(file, JSON.stringify(d, null, 2).replace(/\[\n\s+([\d.]+),\n\s+([\d.]+)\n\s+\]/g, '[$1, $2]') + '\n');
  }
  fs.writeFileSync(ICON_MAP, JSON.stringify(Object.fromEntries(Object.entries(icons).sort(([a], [b]) => a - b)), null, 2) + '\n');
  fs.mkdirSync(ICON_DIR, { recursive: true });
  // Profession icons for the hub page and profession infoboxes (spell icons, not in icons.json)
  const index = JSON.parse(fs.readFileSync(path.join(DIR, 'index.json'), 'utf8'));
  const extra = index.groups.flatMap((g) => g.professions.map((p) => p.icon)).filter(Boolean);
  const missing = [...new Set([...Object.values(icons), ...extra])].filter((i) => !fs.existsSync(path.join(ICON_DIR, i + '.jpg')));
  await pool(missing, async (icon) => {
    const img = await get(IMAGE(icon), 'buffer');
    if (img) fs.writeFileSync(path.join(ICON_DIR, icon + '.jpg'), img);
  });
  console.log(`Downloaded ${missing.length} icon images`);
})();
