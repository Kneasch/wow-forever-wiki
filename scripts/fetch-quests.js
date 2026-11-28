#!/usr/bin/env node
// Fetch a zone's quests from Wowhead Forever into research/quests/<key>.json.
// Usage: NODE_USE_ENV_PROXY=1 node scripts/fetch-quests.js desolace [more zone keys]   (keys from research/quests/index.json)
//        add --pages to also load full quest pages on www.wowhead.com (see below; ask before doing this)
//
// Three sources, from most to least complete:
//   zone page    www.wowhead.com/forever/zone=<area id>   the "Quests" list: id, name, level, required level, side,
//                                                         category (the zone Wowhead files the quest under), xp, money
//   quest page   www.wowhead.com/forever/quest=<id>       Quick Facts (start, end, sharable, difficulty, patch),
//                                                         objectives, quest text, rewards, reputation, series
//   tooltip API  nether.wowhead.com/forever/tooltip/quest/<id>   name, objective sentence, requirement list
// www.wowhead.com refuses plain HTTP clients, so its pages can only be read in a browser. The script reads
// them from .cache/quests/ (git-ignored: zone-<area id>.html, quest-<id>.html, saved from a browser) and
// only loads missing ones itself, through Playwright's headless Chromium, when given --pages. Loading pages
// in bulk that way goes around Wowhead's bot protection, so do it only with the wiki owner's go-ahead.
// Without a cached quest page, a quest gets the tooltip fields only, and `basis` says "tooltip".
//
// A zone's quests are the ones Wowhead files under that zone (category = area id). Quests the zone page lists
// but files elsewhere (another zone's chain that ends here, dungeon quests, crafting orders) are kept in
// `related[]` with only the list fields. Hand-written fields (`notes`, `walkthrough`) survive a refresh.
const fs = require('fs');
const path = require('path');

const ROOT = path.join(__dirname, '..');
const DIR = path.join(ROOT, 'research', 'quests');
const CACHE = path.join(ROOT, '.cache', 'quests');
const ICON_MAP = path.join(ROOT, 'research', 'icons.json');
const ICON_DIR = path.join(ROOT, 'site', 'assets', 'icons');
const SITE = 'https://www.wowhead.com/forever';
const IMAGE = (icon) => `https://wow.zamimg.com/images/wow/icons/large/${icon}.jpg`;
const SIDE = { 1: 'Alliance', 2: 'Horde', 3: 'Both' };
const QUALITY = ['poor', 'common', 'uncommon', 'rare', 'epic', 'legendary', 'artifact'];
const KEEP = ['notes', 'walkthrough']; // hand-written fields, never overwritten
const JUNK = /<\s*(unused|nyi|txt)\s*>|^\[?unused\]?/i; // placeholder quests that were never in the game
const PARALLEL = 3;

const allowPages = process.argv.includes('--pages');
const keys = process.argv.slice(2).filter((a) => !a.startsWith('--'));

// ---------- HTML helpers ----------
const decode = (s) => s.replace(/&nbsp;/g, ' ').replace(/&quot;/g, '"').replace(/&#0?39;|&apos;/g, "'").replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/&amp;/g, '&');
const text = (html) => decode(html.replace(/<br\s*\/?>/gi, '\n').replace(/<script[\s\S]*?<\/script>/gi, '').replace(/<[^>]+>/g, ''))
  .replace(/[ \t]+/g, ' ').replace(/ *\n */g, '\n').replace(/\n{3,}/g, '\n\n').trim();
const num = (s) => (s == null ? null : Number(String(s).replace(/,/g, '')));
// The first link in some HTML: { type, id, name }
const linkIn = (html) => {
  const m = html.match(/href="(?:https:\/\/www\.wowhead\.com)?\/forever\/(npc|object|item|quest|faction|spell|zone)=(-?\d+)[^"]*"[^>]*>([\s\S]*?)<\/a>/);
  return m ? { type: m[1], id: Number(m[2]), name: text(m[3]) } : null;
};
// Copper -> "1g 2s 3c"
const money = (c) => {
  if (!c) return null;
  const g = Math.floor(c / 10000), s = Math.floor((c % 10000) / 100), k = c % 100;
  return [g && `${g}g`, s && `${s}s`, k && `${k}c`].filter(Boolean).join(' ');
};

// ---------- page fetching ----------
let browser;
async function fetchPage(url, file) {
  const cached = path.join(CACHE, file);
  if (fs.existsSync(cached)) return fs.readFileSync(cached, 'utf8');
  if (!allowPages) return null;
  if (!browser) browser = await require('playwright').chromium.launch();
  for (let attempt = 1; ; attempt++) {
    const page = await browser.newPage({ userAgent: 'Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/130.0 Safari/537.36' });
    try {
      await page.goto(url, { waitUntil: 'domcontentloaded', timeout: 60000 });
      await page.waitForSelector('h1.heading-size-1', { timeout: 30000 });
      await page.waitForTimeout(500);
      const html = await page.content();
      fs.mkdirSync(CACHE, { recursive: true });
      fs.writeFileSync(cached, html);
      return html;
    } catch (e) {
      if (attempt === 3) throw new Error(`${url}: ${e.message}`);
      await new Promise((r) => setTimeout(r, 2000 * attempt));
    } finally {
      await page.close();
    }
  }
}
async function pool(items, fn, n = PARALLEL) {
  const queue = [...items];
  await Promise.all(Array.from({ length: n }, async () => { while (queue.length) await fn(queue.shift()); }));
}

// ---------- zone page: the quest list ----------
function zoneQuests(html) {
  const m = html.match(/template: 'quest', id: 'quests'[\s\S]*?data: (\[[\s\S]*?\])\s*\}\);/);
  if (!m) throw new Error('no quest list on the zone page');
  return JSON.parse(m[1]).map((q) => ({
    quest_id: q.id, name: q.name, level: q.level ?? null, required_level: q.reqlevel ?? null,
    side: SIDE[q.side] || null, category_id: q.category ?? null, xp: q.xp ?? null, money: money(q.money),
  }));
}

// ---------- quest page ----------
// Quick Facts is Wowhead markup ([li]Level: 32[/li]...) printed by WH.markup.printHtml
function quickFacts(html) {
  const m = html.match(/WH\.markup\.printHtml\("(\[ul\]\[li\][\s\S]*?)", "infobox-contents/);
  if (!m) return {};
  const src = m[1].replace(/\\\//g, '/').replace(/\\"/g, '"');
  const out = { sharable: false, extra: [] };
  for (const [, li] of src.matchAll(/\[li\]([\s\S]*?)\[\/li\]/g)) {
    const plain = li.replace(/\[[^\]]*\]/g, '').replace(/&nbsp;/g, ' ').trim();
    const url = li.match(/\[url=\/forever\/(npc|object|item)=(\d+)[^\]]*\]([^[]*)\[\/url\]/);
    const who = url ? { type: url[1], id: Number(url[2]), name: decode(url[3]) } : null;
    if (/^Level:/.test(plain)) out.level = num(plain.match(/\d+/)?.[0]);
    else if (/^Requires level/.test(plain)) out.required_level = num(plain.match(/\d+/)?.[0]);
    else if (/^Side:/.test(plain)) out.side_label = plain.replace(/^Side:\s*/, '');
    else if (/^Start:/.test(plain)) out.start = who || { type: null, id: null, name: plain.replace(/^Start:\s*/, '') };
    else if (/^End:/.test(plain)) out.end = who || { type: null, id: null, name: plain.replace(/^End:\s*/, '') };
    else if (/^Sharable/.test(plain)) out.sharable = true;
    else if (/^Not sharable/.test(plain)) out.sharable = false;
    else if (/^Difficulty:/.test(plain)) {
      // Wowhead colours: q10 red (too hard), r1 orange, r2 yellow, r3 green, r4 grey
      const names = { q10: 'red', r1: 'orange', r2: 'yellow', r3: 'green', r4: 'grey' };
      out.difficulty = Object.fromEntries([...li.matchAll(/\[color=(q10|r\d)\](\d+)\[\/color\]/g)].map(([, c, v]) => [names[c], Number(v)]));
    } else if (/^Added in patch/.test(plain)) {
      out.patch = (li.match(/\[acronym="([^"]+)"\]/) || [])[1] || null;
      out.patch_label = plain.replace(/^Added in patch\s*/, '');
    } else if (/^Type:/.test(plain)) out.type = plain.replace(/^Type:\s*/, '');
    else out.extra.push(plain);
  }
  if (!out.extra.length) delete out.extra;
  return out;
}

// Rows of an icon-list table: { text, quantity, link }
const iconList = (html) => [...html.matchAll(/<tr[^>]*?(?:data-icon-list-quantity="([^"]*)")?[^>]*>\s*<th>[\s\S]*?<\/th>\s*<td>([\s\S]*?)<\/td>\s*<\/tr>/g)].map(([, qty, td]) => {
  const link = linkIn(td);
  return {
    text: text(td.replace(/<span class="icon-list-quantity-wrapper"[\s\S]*?<\/span>\)?<\/span>/, '')).replace(/\s*\(\d+\)$/, ''),
    quantity: qty == null ? null : /^\d+$/.test(qty) ? Number(qty) : qty,
    ...(link ? { type: link.type, id: link.id } : {}),
  };
});

// Items or spells in an icontab table: th holds the icon, td the name (and " (N)" count)
const iconTab = (html) => [...html.matchAll(/<th id="icontab-icon\d+">([\s\S]*?)<\/th>\s*<td>([\s\S]*?)<\/td>/g)].map(([, th, td]) => {
  const link = linkIn(td) || linkIn(th);
  const icon = (th.match(/icons\/medium\/([^.]+)\.jpg/) || [])[1] || null;
  const q = td.match(/class="q(\d)"/);
  const count = td.match(/<\/a>(?:<\/span>)?\s*(?:&nbsp;)?\s*\((\d+)\)/);
  return { type: link?.type || null, id: link?.id ?? null, name: link?.name || text(td), icon, quality: q ? QUALITY[q[1]] : null, count: count ? Number(count[1]) : 1 };
});

function questPage(html) {
  const facts = quickFacts(html);
  const h1 = html.indexOf('<h1 class="heading-size-1"');
  const body = html.slice(h1);
  const after = body.slice(body.indexOf('</h1>') + 5);
  const objEnd = after.search(/<table class="icon-list"|<script|<h2|<div/);
  const objective = text(after.slice(0, objEnd === -1 ? 2000 : objEnd)) || null;

  // Objectives: icon-list tables before the first section heading
  const firstH2 = after.search(/<h2 class="heading-size-3"/);
  const head = after.slice(0, firstH2 === -1 ? after.length : firstH2);
  const objectives = [];
  const provided = [];
  for (const [whole, table] of head.matchAll(/<table class="icon-list">([\s\S]*?)<\/table>/g)) {
    const before = head.slice(Math.max(0, head.indexOf(whole) - 200), head.indexOf(whole));
    (/Provided item/i.test(before) ? provided : objectives).push(...iconList(table));
  }

  const section = (name) => {
    const m = body.match(new RegExp(`>${name}</h2>([\\s\\S]*?)(?=<h2 class="heading-size-[23]|<div class="pad3"></div>)`));
    return m ? m[1] : null;
  };
  const disclosed = (kind) => { const m = body.match(new RegExp(`id="[^"]*-${kind}"[^>]*>([\\s\\S]*?)</div>`)); return m ? text(m[1]) : null; };
  const description = section('Description');

  // Rewards: blocks introduced by "You will receive:", "...choose one of these rewards:", "You will also learn:"
  const rewards = { choice: [], items: [], spells: [], money: null };
  const rw = section('Rewards');
  if (rw) {
    const parts = rw.split(/(You will be able to choose one of these rewards:|You will (?:also )?receive:|You will (?:also )?learn:|The following spell will be cast on you:)/);
    for (let i = 1; i < parts.length; i += 2) {
      const label = parts[i], content = parts[i + 1] || '';
      const entries = iconTab(content);
      if (/choose/.test(label)) rewards.choice.push(...entries);
      else if (/learn|cast/.test(label)) rewards.spells.push(...entries);
      else {
        rewards.items.push(...entries.filter((e) => e.type === 'item'));
        rewards.spells.push(...entries.filter((e) => e.type === 'spell'));
        const g = [...content.matchAll(/money(gold|silver|copper)[^>]*>([\d,]+)/g)].map(([, u, v]) => num(v) + u[0]);
        if (g.length) rewards.money = g.join(' ');
      }
    }
  }
  // Gains: experience, reputation, and sometimes money or honor
  const gains = { xp: null, reputation: [], other: [] };
  const gn = section('Gains');
  if (gn) {
    for (const [, li] of gn.matchAll(/<li>([\s\S]*?)<\/li>/g)) {
      const t = text(li);
      const xp = t.match(/^([\d,]+) experience/);
      const rep = t.match(/^(-?[\d,]+) reputation with (.+)$/m);
      if (xp) gains.xp = num(xp[1]);
      else if (rep) gains.reputation.push({ faction_id: linkIn(li)?.id ?? null, faction: rep[2].trim(), amount: num(rep[1]) });
      else if (/money(gold|silver|copper)/.test(li)) {
        rewards.money = rewards.money || [...li.matchAll(/money(gold|silver|copper)[^>]*>([\d,]+)/g)].map(([, u, v]) => num(v) + u[0]).join(' ');
      } else if (t) gains.other.push(t.split('\n')[0]);
    }
  }

  // Series: numbered steps; a step can hold several quests (side variants or parallel quests)
  let series = null;
  const st = html.match(/<table class="series">([\s\S]*?)<\/table>/);
  if (st) {
    series = [...st[1].matchAll(/<tr><th>(\d+)\.<\/th><td><div>([\s\S]*?)<\/div><\/td><\/tr>/g)].map(([, n, cell]) =>
      cell.split(/<br\s*\/?>/).map((e) => {
        const l = linkIn(e);
        const side = /icon-alliance/.test(e) ? 'Alliance' : /icon-horde/.test(e) ? 'Horde' : null;
        return l ? { quest_id: l.id, name: l.name, side } : { quest_id: null, name: text(e), side, current: true };
      }));
  }

  return {
    facts, objective, objectives, provided, description: description ? text(description) : null,
    progress: disclosed('progress'), completion: disclosed('completion'), rewards, gains, series,
  };
}

// ---------- tooltip API: objective and requirements ----------
async function tooltip(id) {
  for (let attempt = 1; ; attempt++) {
    try {
      const res = await fetch(`https://nether.wowhead.com/forever/tooltip/quest/${id}`);
      if (res.status === 404) return null;
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const d = await res.json();
      if (d.error) return null;
      const t = text(d.tooltip);
      const [obj, req = ''] = t.replace(/^.*?\n/, '').split(/\nRequirements:\n?/);
      const objectives = req.split('\n').map((l) => l.replace(/^\s*-\s*/, '').trim()).filter(Boolean).map((l) => {
        const m = l.match(/^(.*?) x (\d+)$/);
        return m ? { text: m[1], quantity: Number(m[2]) } : { text: l.replace(/:$/, ''), quantity: null };
      });
      return { name: d.name, objective: obj.trim() || null, objectives };
    } catch (e) {
      if (attempt === 3) { console.warn(`  tooltip ${id}: ${e.message}`); return null; }
      await new Promise((r) => setTimeout(r, 500 * attempt));
    }
  }
}

// ---------- main ----------
(async () => {
  const index = JSON.parse(fs.readFileSync(path.join(DIR, 'index.json'), 'utf8'));
  const zones = index.regions.flatMap((r) => r.zones);
  const icons = fs.existsSync(ICON_MAP) ? JSON.parse(fs.readFileSync(ICON_MAP, 'utf8')) : {};
  const wantIcons = new Set();
  if (!keys.length) { console.error('Name the zones to fetch, e.g. node scripts/fetch-quests.js desolace'); process.exit(1); }
  try {
    for (const key of keys) {
      const zone = zones.find((z) => z.key === key);
      if (!zone) throw new Error(`no zone "${key}" in research/quests/index.json`);
      const file = path.join(DIR, `${key}.json`);
      const prev = fs.existsSync(file) ? JSON.parse(fs.readFileSync(file, 'utf8')) : { quests: [] };
      const keep = new Map(prev.quests.map((q) => [q.quest_id, Object.fromEntries(KEEP.filter((k) => q[k] != null).map((k) => [k, q[k]]))]));

      const zoneHtml = await fetchPage(`${SITE}/zone=${zone.area_id}`, `zone-${zone.area_id}.html`);
      if (!zoneHtml) throw new Error(`.cache/quests/zone-${zone.area_id}.html is missing: save ${SITE}/zone=${zone.area_id} from a browser, or run with --pages`);
      const listed = zoneQuests(zoneHtml);
      const own = listed.filter((q) => q.category_id === zone.area_id && !JUNK.test(q.name));
      const related = listed.filter((q) => !own.includes(q) && !JUNK.test(q.name));
      const skipped = listed.filter((q) => JUNK.test(q.name)).map((q) => ({ quest_id: q.quest_id, name: q.name }));
      console.log(`${zone.name}: ${listed.length} quests listed, ${own.length} filed under the zone, ${related.length} related, ${skipped.length} placeholders`);

      const quests = [];
      let done = 0;
      await pool(own, async (q) => {
        const html = await fetchPage(`${SITE}/quest=${q.quest_id}`, `quest-${q.quest_id}.html`);
        if (!html) {
          const t = await tooltip(q.quest_id);
          quests.push({
            quest_id: q.quest_id, name: t?.name || q.name, basis: 'tooltip',
            level: q.level, required_level: q.required_level, side: q.side, type: null,
            start: null, end: null, sharable: null, difficulty: null, patch: null, patch_label: null, new_in_forever: null,
            objective: t?.objective ?? null, objectives: t?.objectives ?? [], provided: [],
            description: null, progress: null, completion: null,
            rewards: { choice: null, items: null, spells: null, money: q.money }, xp: q.xp,
            reputation: null, other_gains: null, series: null,
            ...keep.get(q.quest_id),
          });
        } else {
          const p = questPage(html);
          const f = p.facts;
          const forever = !!f.patch && Number(f.patch.split('.')[1]) >= 60; // Forever's patches are 1.60 and up
          quests.push({
            quest_id: q.quest_id, name: q.name, basis: 'page',
            level: f.level ?? q.level, required_level: f.required_level ?? q.required_level,
            side: q.side, side_label: f.side_label ?? null, type: f.type ?? null,
            start: f.start ?? null, end: f.end ?? null, sharable: f.sharable ?? null,
            difficulty: f.difficulty ?? null, patch: f.patch ?? null, patch_label: f.patch_label ?? null, new_in_forever: forever,
            objective: p.objective, objectives: p.objectives, provided: p.provided,
            description: p.description, progress: p.progress, completion: p.completion,
            rewards: { ...p.rewards, money: p.rewards.money || q.money }, xp: p.gains.xp ?? q.xp,
            reputation: p.gains.reputation, other_gains: p.gains.other,
            series: p.series?.map((step) => step.map((e) => (e.current ? { ...e, quest_id: q.quest_id } : e))) ?? null,
            ...(f.extra ? { facts_extra: f.extra } : {}),
            ...keep.get(q.quest_id),
          });
          for (const r of [...p.rewards.choice, ...p.rewards.items]) if (r.icon && r.id) { icons[r.id] = r.icon; wantIcons.add(r.icon); }
        }
        if (++done % 10 === 0) console.log(`  ${done}/${own.length}`);
      });
      quests.sort((a, b) => a.level - b.level || a.quest_id - b.quest_id);
      fs.writeFileSync(file, JSON.stringify({
        zone: zone.name, area_id: zone.area_id, source: `${SITE}/zone=${zone.area_id}#quests`,
        fetched: new Date().toISOString().slice(0, 10), quests, related, skipped,
      }, null, 2) + '\n');
      console.log(`  wrote ${path.relative(ROOT, file)}`);
    }
  } finally {
    if (browser) await browser.close();
  }
  fs.writeFileSync(ICON_MAP, JSON.stringify(Object.fromEntries(Object.entries(icons).sort(([a], [b]) => a - b)), null, 2) + '\n');
  {
    fs.mkdirSync(ICON_DIR, { recursive: true });
    const missing = [...wantIcons].filter((i) => !fs.existsSync(path.join(ICON_DIR, i + '.jpg')));
    await pool(missing, async (icon) => {
      const res = await fetch(IMAGE(icon)).catch(() => null);
      if (res?.ok) fs.writeFileSync(path.join(ICON_DIR, icon + '.jpg'), Buffer.from(await res.arrayBuffer()));
    }, 6);
    console.log(`Downloaded ${missing.length} icon images`);
  }
})().catch((e) => { console.error(e); process.exit(1); });
