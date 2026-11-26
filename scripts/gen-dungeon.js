#!/usr/bin/env node
// Generate dungeon, boss and item pages from a research JSON file.
// Usage: node scripts/gen-dungeon.js research/hall-of-thanes.json
// Writes to site/w/<Page_name>.html (overwrites). Set WIKI_OUT to write somewhere else.
const fs = require('fs');
const path = require('path');
const { slug, slugRegistry } = require('./slug');

const RESEARCH = path.join(__dirname, '..', 'research');
const load = (file) => {
  const d = JSON.parse(fs.readFileSync(file, 'utf8'));
  normalize(d);
  return d;
};
const data = load(process.argv[2]);
const OUT = process.env.WIKI_OUT || path.join(__dirname, '..', 'site', 'w');

// Some items drop in several dungeons (the Scarlet Monastery wings share one trash list).
// Index every research file so an item page lists all of its sources, whichever dungeon
// was generated last.
const ICONS = path.join(RESEARCH, 'icons.json'); // item_id -> icon name, from scripts/fetch-icons.js
const icons = fs.existsSync(ICONS) ? JSON.parse(fs.readFileSync(ICONS, 'utf8')) : {};
const allData = fs.readdirSync(RESEARCH).filter((f) => f.endsWith('.json') && f !== 'icons.json').map((f) => {
  const file = path.join(RESEARCH, f);
  return path.resolve(file) === path.resolve(process.argv[2]) ? data : load(file);
});
const itemSources = new Map(); // item name -> [{ d, it }]
for (const d of allData) {
  for (const it of d.items) {
    if (!itemSources.has(it.name)) itemSources.set(it.name, []);
    itemSources.get(it.name).push({ d, it });
  }
}
// The same item can be more complete in another dungeon's file (an ID only one wing found)
const best = (it) => itemSources.get(it.name).map((s) => s.it).find((x) => x.item_id) || it;

const esc = (s) => String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
// Page file names and links both come from slug() in scripts/slug.js, which keeps them valid on every OS
const href = (name) => '/w/' + encodeURI(slug(name));
const link = (name, cls = '') => `<a${cls ? ` class="${cls}"` : ''} href="${esc(href(name))}">${esc(name)}</a>`;
const unknown = '<span class="unknown">?</span>';
const val = (v) => (v === null || v === undefined || v === '' ? unknown : esc(v));
const cap = (s) => s.charAt(0).toUpperCase() + s.slice(1);
const article = (w) => (/^[aeiou]/i.test(w) ? 'an' : 'a'); // "an uncommon", "an epic"
const qBorder = (q) => (q === 'poor' || q === 'common' ? '' : ` q-border-${q}`);
const rarityClass = (display) => {
  if (display === null || display === undefined) return '';
  const n = Number(String(display).replace(/[^0-9]/g, '').slice(1) || 1); // "~1/33" -> 33
  return n <= 1 ? 'r-always' : n <= 9 ? 'r-common' : n <= 99 ? 'r-uncommon' : n <= 999 ? 'r-rare' : 'r-veryrare';
};
const bossNames = new Set(data.bosses.map((b) => b.name));
const rateCell = (d) => `<td class="rarity ${rarityClass(d)}">${val(d)}</td>`;
const META_NOTE = /npc id|warcraft ?tavern|timesaver|wowtbc|verified|^level /i; // research notes, not lore

// Research JSON is hand-collected and inconsistent. Clean it up before rendering:
// - strip "(rare, optional)" style suffixes from boss names, keep them as flags
// - match item sources to bosses case-insensitively ("Rhahk'Zor" vs "Rhahk'zor")
// - promote boss/rare item sources missing from bosses[] (e.g. Sneed) to bosses
// - drop research remarks from item sources: "Trash (unspecified mob)", "Defias trash (per wowtbc.gg)"
// - flatten the several quest_rewards shapes into [{quest, faction, items:[{name,id}]}];
//   rewards whose quest is not known share one entry with quest: null
// - drop items with no name (IDs Wowhead does not know); there is nothing to title a page with
function normalize(d) {
  d.items = d.items.filter((it) => it.name);
  for (const b of d.bosses) {
    const m = b.name.match(/^(.*?)\s*\(([^)]*)\)$/);
    if (m) { b.name = m[1]; b.rare = /rare/i.test(m[2]); b.optional = /optional/i.test(m[2]); }
    if (/^rare mob/i.test(b.notes || '')) b.rare = true;
  }
  const byLower = new Map(d.bosses.map((b) => [b.name.toLowerCase(), b]));
  for (const it of d.items) {
    if (it.source) it.source = it.source.replace(/\s*\((unspecified mob|per [^)]*)\)$/i, '');
    if (!it.source || !['boss', 'rare', 'quest_item'].includes(it.source_type)) continue;
    let b = byLower.get(it.source.toLowerCase());
    if (!b) {
      b = { name: it.source, level: null, npc_id: null, notes: null, rare: it.source_type === 'rare' };
      // place right after the boss whose name it prefixes (Sneed after Sneed's Shredder), else at the end
      const at = d.bosses.findIndex((x) => x.name.startsWith(it.source));
      d.bosses.splice(at === -1 ? d.bosses.length : at + 1, 0, b);
      byLower.set(b.name.toLowerCase(), b);
    }
    if (it.source_type === 'rare') b.rare = true;
    it.source = b.name;
  }
  d.quest_rewards = (d.quest_rewards || []).reduce((acc, q) => {
    let e = acc.find((x) => x.quest === (q.quest || null));
    if (!e) acc.push((e = { quest: q.quest || null, faction: q.faction || null, items: [] }));
    // skip repeats: class variants share a name (nine Royal Seals of Eldre'Thalas)
    const add = (name, id) => name && !e.items.some((x) => x.name === name) && e.items.push({ name, id: id ?? null });
    if (q.items) q.items.forEach((n) => add(n, null));
    if (q.item) add(q.item, null);
    if (q.name) add(q.name, q.item_id);
    if (q.rewards) q.rewards.forEach((r) => { const n = r.replace(/\s*\(.*\)$/, ''); add(n, q.item_ids?.[n]); });
    return acc;
  }, []).filter((e) => e.quest || e.items.length); // a bare { note } entry has nothing to show
}
const dungeonLoc = data.dungeon;

function page({ title, tabLabel, body, toc }) {
  const self = href(title);
  return `<!DOCTYPE html>
<html lang="en">
<head>
<!--# include virtual="/_includes/head.html" -->
<title>${esc(title)} - WoW Forever Wiki</title>
</head>
<body>
<!--# include virtual="/_includes/header.html" -->
<!--# include virtual="/_includes/sidebar.html" -->
<div id="page">
  <nav class="tabs" aria-label="Page">
    <ul class="tabs-left">
      <li class="selected"><a href="${esc(self)}">${tabLabel}</a></li>
      <li><a href="#">Discussion</a></li>
    </ul>
    <ul class="tabs-right">
      <li class="selected"><a href="${esc(self)}">Read</a></li>
    </ul>
    <form class="search" role="search" action="#"><input type="search" name="q" placeholder="Search the wiki" aria-label="Search the wiki"></form>
  </nav>

  <main id="content">
    <h1 class="page-title">${esc(title)}</h1>
    <p class="byline">From the WoW Forever Wiki</p>
${body}
  </main>
<!--# include virtual="/_includes/footer.html" -->
</div>
</body>
</html>
`;
}

const toc = (entries) => `    <nav class="toc" aria-label="Contents">
      <h2>Contents</h2>
      <ol>
${entries.map(([id, label]) => `        <li><a href="#${esc(id)}">${esc(label)}</a></li>`).join('\n')}
      </ol>
    </nav>`;

const rarityKey = `    <ul class="rarity-key" aria-label="Rarity key">
      <li><span class="swatch r-always"></span>Always</li>
      <li><span class="swatch r-common"></span>Common (to 1/9)</li>
      <li><span class="swatch r-uncommon"></span>Uncommon (1/10 &ndash; 1/99)</li>
      <li><span class="swatch r-rare"></span>Rare (1/100 &ndash; 1/999)</li>
      <li><span class="swatch r-veryrare"></span>Very rare (1/1,000+)</li>
    </ul>`;

const rateNote = `    <p>Drop rates are estimates rounded from Wowhead's drop percentage (for example 32.25% is shown as ~1/3), not from counted kills and drops.</p>`;

// ---------- Item page ----------
// Wowhead icon when we have one (site/assets/icons, see scripts/fetch-icons.js), else the placeholder hammer
const iconHtml = (it) => {
  const icon = icons[it.item_id];
  const inner = icon
    ? `<img src="/assets/icons/${esc(icon)}.jpg" alt="" width="56" height="56">`
    : `<svg viewBox="0 0 36 36" width="36" height="36" aria-hidden="true"><path d="M9 7h13v9H9zM14 16h3v14h-3z" fill="currentColor"/></svg>`;
  return `          <span class="item-icon${qBorder(it.quality)}" role="img" aria-label="${icon ? esc(it.name) + ' icon' : 'Item icon placeholder'}">
            ${inner}
          </span>`;
};
function itemPage(it) {
  it = best(it);
  const w = it.weapon;
  const knownQuality = it.quality; // null for stubs; still styled as common, but not claimed in text
  it = { ...it, quality: it.quality || 'common' };
  const rows = [
    `      <tr><th>Quality</th><td>${knownQuality ? `<span class="q-${it.quality}">${cap(it.quality)}</span>` : unknown}</td></tr>`,
    `      <tr><th>Item level</th><td>${val(it.item_level)}</td></tr>`,
    `      <tr><th>Requires level</th><td>${val(it.required_level)}</td></tr>`,
    `      <tr><th>Slot</th><td>${val(it.slot)}</td></tr>`,
    `      <tr><th>Type</th><td>${val(it.type)}</td></tr>`,
    `      <tr><th>Binding</th><td>${val(it.binding)}</td></tr>`,
    `      <tr><th>Sell price</th><td>${val(it.sell_price)}</td></tr>`,
  ];
  if (it.armor !== null) rows.push(`      <tr><th>Armor</th><td>${it.armor}</td></tr>`);
  if (w) {
    rows.push(
      `      <tr><th colspan="2" class="infobox-subheader">Weapon</th></tr>`,
      `      <tr><th>Damage</th><td>${w.damage_min} &ndash; ${w.damage_max}</td></tr>`,
      `      <tr><th>Speed</th><td>${w.speed.toFixed(2)}</td></tr>`,
      `      <tr><th>DPS</th><td>${w.dps}</td></tr>`
    );
  }
  rows.push(
    `      <tr><th colspan="2" class="infobox-subheader">Database</th></tr>`,
    `      <tr><th>Item ID</th><td>${val(it.item_id)}</td></tr>`,
    it.wowhead_url ? `      <tr><th>Source</th><td><a class="external" href="${esc(it.wowhead_url)}">Wowhead</a></td></tr>` : ''
  );

  const stats = it.stats.map((s) => (/^Equip:/.test(s) ? `      <div class="tt-green">${esc(s)}</div>` : `      <div>${esc(s)}</div>`));
  const tooltip = [
    `      <div class="tt-name q-${it.quality}">${esc(it.name)}</div>`,
    `      <div class="tt-dim">Item Level ${val(it.item_level)}</div>`,
    it.binding ? `      <div>${esc(it.binding)}</div>` : '',
    `      <div class="tt-split"><span>${val(it.slot)}</span><span>${it.type ? esc(it.type) : ''}</span></div>`,
    w ? `      <div class="tt-split"><span>${w.damage_min} - ${w.damage_max} Damage</span><span>Speed ${w.speed.toFixed(2)}</span></div>\n      <div>(${w.dps} damage per second)</div>` : '',
    it.armor !== null ? `      <div>${it.armor} Armor</div>` : '',
    ...stats,
    `      <div>Requires Level ${val(it.required_level)}</div>`,
    it.sell_price ? `      <div>Sell Price: ${esc(it.sell_price)}</div>` : '',
  ].filter(Boolean).join('\n');

  const sources = itemSources.get(it.name);
  const srcLink = ({ d, it: x }) => (d.bosses.some((b) => b.name === x.source) ? link(x.source) : x.source ? esc(x.source) : unknown);
  const dungeons = [...new Set(sources.map((s) => s.d.dungeon))].map((n) => link(n));
  const where = dungeons.length > 1
    ? `It drops in ${dungeons.slice(0, -1).join(', ')} and ${dungeons[dungeons.length - 1]}.`
    : sources[0].it.source
      ? `It drops from ${srcLink(sources[0]).replace(/^(Any|Trash)\b/, (m) => m.toLowerCase())} in ${dungeons[0]}.` // "drops from any enemy"
      : `It drops in ${dungeons[0]}; which enemies drop it is not known yet.`;
  // "an uncommon cloth wrist item that requires level 20"; unknown parts are left out
  const words = [...new Set([it.type, it.slot].filter(Boolean).map((s) => String(s).toLowerCase()))]
    .filter((w, i, a) => !(i === 1 && a[0].endsWith(' ' + w))); // "10 slot bag", not "10 slot bag bag"
  const desc = [knownQuality && `<span class="q-${it.quality}">${esc(it.quality)}</span>`, ...words.map(esc), !/item$/.test(words.join(' ')) && 'item'].filter(Boolean).join(' '); // no "quest item item"
  const lvlReq = it.required_level != null ? ` that requires level ${esc(it.required_level)}` : '';
  const intro = `<b>${esc(it.name)}</b> is ${article(knownQuality || words[0] || 'item')} ${desc}${lvlReq}. ${where}${it.source_type === 'quest_item' && !/quest item$/.test(desc) ? ' It is a quest item.' : ''}`;
  const sourceRows = sources.map((s) => {
    const lvl = s.d.bosses.find((b) => b.name === s.it.source)?.level ?? s.it.source_level ?? null;
    return `          <tr><td>${srcLink(s)}</td><td class="num">${lvl ?? unknown}</td><td>${link(s.d.dungeon)}</td><td class="num">1</td>${rateCell(s.it.drop_rate_display)}</tr>`;
  }).join('\n');

  const body = `
    <table class="infobox">
      <tr><th colspan="2" class="infobox-header">${esc(it.name)}</th></tr>
      <tr>
        <td colspan="2" class="infobox-image">
${iconHtml(it)}
        </td>
      </tr>
${rows.filter(Boolean).join('\n')}
    </table>

    <p>${intro}</p>

${toc([['Tooltip', 'Tooltip'], ['Item_sources', 'Item sources']])}

    <h2 id="Tooltip">Tooltip</h2>
    <div class="wow-tooltip">
${tooltip}
    </div>

    <h2 id="Item_sources">Item sources</h2>
${rateNote}
    <div class="table-scroll">
      <table class="wikitable item-drops">
        <thead>
          <tr><th>Source</th><th>Level</th><th>Location</th><th>Quantity</th><th>Rarity</th></tr>
        </thead>
        <tbody>
${sourceRows}
        </tbody>
      </table>
    </div>
${rarityKey}`;
  return page({ title: it.name, tabLabel: 'Item', body });
}

// ---------- Boss page ----------
function bossPage(b) {
  const drops = data.items.filter((i) => i.source === b.name);
  const kind = b.rare ? 'rare' : 'boss';
  const note = b.notes && / /.test(b.notes) && !META_NOTE.test(b.notes) ? ' ' + esc(b.notes.replace(/[.;]?$/, '.')) : '';
  const dropsSection = drops.length ? `${rateNote}
    <div class="table-scroll">
      <table class="wikitable">
        <thead><tr><th>Item</th><th>Slot</th><th>Type</th><th>Rarity</th></tr></thead>
        <tbody>
${drops.map((i) => lootRow(i)).join('\n')}
        </tbody>
      </table>
    </div>
${rarityKey}` : `    <p>No drops are known yet.</p>`;
  const body = `
    <table class="infobox">
      <tr><th colspan="2" class="infobox-header">${esc(b.name)}</th></tr>
      <tr><th>Level</th><td>${val(b.level)}</td></tr>
      <tr><th>Location</th><td>${link(dungeonLoc)}</td></tr>
      <tr><th>Type</th><td>${cap(kind)}${b.optional ? ' (optional)' : ''}</td></tr>
      <tr><th colspan="2" class="infobox-subheader">Database</th></tr>
      <tr><th>NPC ID</th><td>${val(b.npc_id)}</td></tr>
    </table>

    <p><b>${esc(b.name)}</b> is ${b.optional ? 'an optional' : 'a'} ${kind} in ${link(dungeonLoc)}.${note}</p>

${toc([['Drops', 'Drops']])}

    <h2 id="Drops">Drops</h2>
${dropsSection}`;
  return page({ title: b.name, tabLabel: 'NPC', body });
}

// ---------- Dungeon page ----------
const lootRow = (i, extraCell = '') => {
  const b = best(i); // stats from the most complete record, drop rate from this dungeon's
  return `          <tr><td>${link(i.name, 'q-' + (b.quality || 'common'))}</td><td>${val(b.slot)}</td><td>${val(b.type)}</td>${extraCell}${rateCell(i.drop_rate_display)}</tr>`;
};

function dungeonPage() {
  const d = data;
  const bossList = d.bosses.map((b) => `        <li>${link(b.name)}${b.rare ? ' (rare)' : b.optional ? ' (optional)' : ''}</li>`).join('\n');
  const loot = d.bosses.map((b) => {
    const drops = d.items.filter((i) => i.source === b.name);
    if (!drops.length) return '';
    const rows = drops.map((i) => lootRow(i)).join('\n');
    return `    <h3 id="${esc(slug(b.name))}">${link(b.name)}</h3>
    <div class="table-scroll">
      <table class="wikitable">
        <thead><tr><th>Item</th><th>Slot</th><th>Type</th><th>Rarity</th></tr></thead>
        <tbody>
${rows}
        </tbody>
      </table>
    </div>`;
  }).filter(Boolean).join('\n');
  const trash = d.items.filter((i) => !bossNames.has(i.source));
  const trashLoot = trash.length ? `    <h3 id="Trash">Trash and other drops</h3>
    <div class="table-scroll">
      <table class="wikitable">
        <thead><tr><th>Item</th><th>Slot</th><th>Type</th><th>Source</th><th>Rarity</th></tr></thead>
        <tbody>
${trash.map((i) => lootRow(i, `<td>${i.source ? esc(i.source) : unknown}</td>`)).join('\n')}
        </tbody>
      </table>
    </div>` : '';
  const quests = d.quest_rewards.filter((q) => q.quest).map((q) => `        <li><b>${esc(q.quest)}</b>${q.faction ? ` (${esc(q.faction)})` : ''}${q.items.length ? ': ' + q.items.map((i) => esc(i.name)).join(', ') : ' &ndash; no item reward listed'}</li>`).join('\n');
  const unknownQuest = d.quest_rewards.find((q) => !q.quest)?.items || [];
  const questSection = [
    d.quest_rewards.length ? `    <p>Quest reward names are listed from community sources and have not been checked against item data.</p>` : '',
    quests ? `    <ul>\n${quests}\n    </ul>` : `    <p>No quests are known yet.</p>`,
    unknownQuest.length ? `    <p>These items are probably quest rewards, but their quests are not known yet:</p>
    <ul>
${unknownQuest.map((i) => `        <li>${esc(i.name)}</li>`).join('\n')}
    </ul>` : '',
  ].filter(Boolean).join('\n');
  const body = `
    <table class="infobox">
      <tr><th colspan="2" class="infobox-header">${esc(d.dungeon)}</th></tr>
      <tr><th>Type</th><td>Dungeon</td></tr>
      <tr><th>Level range</th><td>${esc(d.recommended_level_range || d.level_range)}</td></tr>
      <tr><th>Minimum level</th><td>${val(d.min_level)}</td></tr>
      <tr><th>Zone</th><td>${val(d.zone)}</td></tr>
      <tr><th>Bosses</th><td>${d.bosses.filter((b) => !b.rare).length}</td></tr>
      <tr><th>New in Forever</th><td>${d.new_in_forever ? 'Yes' : 'No'}</td></tr>
    </table>

    <p><b>${esc(d.dungeon)}</b> is a ${d.new_in_forever ? 'new ' : ''}dungeon in WoW Forever for characters of level ${esc(d.recommended_level_range || d.level_range)}.</p>

${toc([['Location', 'Location'], ['Bosses', 'Bosses'], ['Loot', 'Loot'], ['Quests', 'Quests']])}

    <h2 id="Location">Location</h2>
    <p>${d.location ? esc(d.location) : 'The entrance location is not known yet.'}</p>

    <h2 id="Bosses">Bosses</h2>
    <ol>
${bossList}
    </ol>

    <h2 id="Loot">Loot</h2>
${rateNote}
${loot}${trashLoot ? '\n' + trashLoot : ''}
${rarityKey}

    <h2 id="Quests">Quests</h2>
${questSection}`;
  return page({ title: d.dungeon, tabLabel: 'Dungeon', body });
}

const written = [];
const fileFor = slugRegistry(); // throws if two titles would share a file
function write(title, html) {
  fs.writeFileSync(path.join(OUT, fileFor(title) + '.html'), html);
  written.push(title);
}
write(data.dungeon, dungeonPage());
data.bosses.forEach((b) => write(b.name, bossPage(b)));
data.items.forEach((i) => write(i.name, itemPage(i)));
console.log(`Wrote ${written.length} pages:\n  ` + written.join('\n  '));
