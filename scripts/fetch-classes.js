#!/usr/bin/env node
// Refresh class research files from the Wowhead Forever tooltip API.
// Usage: NODE_USE_ENV_PROXY=1 node scripts/fetch-classes.js [research/classes/warlock.json ...]   (default: every file)
//
// Only fields the tooltip API is authoritative for are overwritten:
//   abilities[], passive_talents[]   spell tooltip -> name, icon, level, tooltip_level, is_talent, cost, cast,
//                                    cooldown, reagent, text, summary (the first sentence of text)
// Hand-written fields (spell_id, tab, talent, note, new_in_forever) are left alone. A talent spell's own
// "Requires level" is often missing or 1, so for talents `level` is the row's level instead (10 + 5 x (row - 1)).
// Spell, class and talent-tree icons are downloaded to site/assets/icons/.
const fs = require('fs');
const path = require('path');

const ROOT = path.join(__dirname, '..');
const DIR = path.join(ROOT, 'research', 'classes');
const ICON_DIR = path.join(ROOT, 'site', 'assets', 'icons');
const API = (id) => `https://nether.wowhead.com/forever/tooltip/spell/${id}`;
const IMAGE = (icon) => `https://wow.zamimg.com/images/wow/icons/large/${icon}.jpg`;

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

const text = (html) => html.replace(/<br\s*\/?>/g, '\n').replace(/<!--[^>]*-->/g, '').replace(/<[^>]+>/g, '')
  .replace(/&nbsp;/g, ' ').replace(/&quot;/g, '"').replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/&#39;/g, "'")
  .replace(/&#(\d+);/g, (_, n) => String.fromCodePoint(Number(n))).replace(/&amp;/g, '&').replace(/[ \t]+/g, ' ').trim();
// Unevaluated scaling formulas, e.g. "[10.8 * (((1)))]" or "(4 * 41.5)": evaluate the simple ones. These are damage and
// healing amounts, which the game shows as whole numbers (Immolate rank 1: 11), so the result is rounded.
const formulas = (s) => s
  .replace(/\[\(30 \+ Spirit\) \* \(1\)\]/g, '30 + Spirit')
  .replace(/[[(]([\d.]+) \* \({0,3}([\d.]+)\){0,3}[\])]/g, (_, a, b) => String(Math.round(Number(a) * Number(b))));

const rowLevel = (row) => 10 + 5 * (row - 1);
// The first sentence of the first line (multi-line texts, such as Demonic Sacrifice's per-demon list, stop at the line)
const firstSentence = (s) => { const line = s.split('\n')[0]; return (line.match(/^.*?[.!](?=\s|$)/) || [line])[0]; };

async function refreshSpell(a) {
  const d = await get(API(a.spell_id));
  if (!d || d.error || !d.tooltip) return console.warn(`  spell ${a.spell_id}: not found`);
  const tip = d.tooltip;
  // Header: name, cost, range, cast time, cooldown, requirements. Tags become line breaks so "Level 60" and "25 Mana" stay apart.
  const head = text(tip.split(/<div class="q">/)[0].replace(/<\/(td|th|tr|div|span)>/g, '\n'));
  const desc = formulas(text((tip.match(/<div class="q">([\s\S]*?)<\/div>/) || [])[1] || ''));
  const level = tip.match(/Requires level (\d+)/);
  a.name = d.name;
  a.icon = d.icon || null;
  a.is_talent = /<div class="q0">Talent<\/div>/.test(tip);
  const row = a.talent ? a.talent.row : a.row;
  // Keep the last known level when the tooltip has none
  a.level = row ? rowLevel(row) : (level ? Number(level[1]) : a.level ?? null);
  if (a.level == null) console.warn(`  ${d.name} (${a.spell_id}): no level`);
  a.tooltip_level = level ? Number(level[1]) : null;
  a.cost = (head.match(/([\d,]+% of base mana|[\d,]+ Mana|[\d,]+ Health[^\n]*?per sec|[\d,]+ Health)/) || [])[1] || null;
  a.cast = (head.match(/(Instant|Channeled(?: \(\d+ sec cast\))?|[\d.]+ sec cast)/) || [])[1] || null;
  a.cooldown = (head.match(/([\d.]+ (?:sec|min|hour)s? cooldown)/) || [])[1] || null;
  a.reagent = (tip.match(/Reagents:<br \/><div class="indent q1">(?:<a [^>]*>)?([^<]+)/) || [])[1]?.trim() || null;
  a.text = desc || null;
  a.summary = desc ? firstSentence(desc) : null;
}

(async () => {
  const files = process.argv.slice(2).length ? process.argv.slice(2) : fs.readdirSync(DIR).filter((f) => f.endsWith('.json') && f !== 'index.json').map((f) => path.join(DIR, f));
  const icons = new Set();
  for (const file of files) {
    const d = JSON.parse(fs.readFileSync(file, 'utf8'));
    console.log(`${path.basename(file)}: ${d.abilities.length} abilities, ${(d.passive_talents || []).length} passive talents`);
    await pool([...d.abilities, ...(d.passive_talents || [])], refreshSpell);
    for (const a of d.abilities) if (a.talent && !a.is_talent) console.warn(`  ${a.name} (${a.spell_id}) is marked as a talent but its tooltip does not say Talent`);
    for (const a of d.abilities) if (!a.talent && a.is_talent) console.warn(`  ${a.name} (${a.spell_id}) is a talent on Wowhead but has no talent row here`);
    fs.writeFileSync(file, JSON.stringify(d, null, 2) + '\n');
    [d.icon, ...(d.trees || []).map((t) => t.icon), ...d.abilities.map((a) => a.icon), ...(d.passive_talents || []).map((a) => a.icon)].forEach((i) => i && icons.add(i));
  }
  const index = JSON.parse(fs.readFileSync(path.join(DIR, 'index.json'), 'utf8'));
  index.classes.forEach((c) => c.icon && icons.add(c.icon));
  const missing = [...icons].filter((i) => !fs.existsSync(path.join(ICON_DIR, i + '.jpg')));
  await pool(missing, async (icon) => {
    const img = await get(IMAGE(icon), 'buffer');
    if (img) fs.writeFileSync(path.join(ICON_DIR, icon + '.jpg'), img);
    else console.warn(`  icon ${icon}: not downloaded`);
  });
  console.log(`Downloaded ${missing.length} icon images`);
})().catch((e) => { console.error(e); process.exit(1); });
