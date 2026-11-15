#!/usr/bin/env node
// Generate dungeon, boss and item pages from a research JSON file.
// Usage: node scripts/gen-dungeon.js research/hall-of-thanes.json
// Writes to site/w/<Page_name>.html (overwrites).
const fs = require('fs');
const path = require('path');

const data = JSON.parse(fs.readFileSync(process.argv[2], 'utf8'));
normalize(data);
const OUT = path.join(__dirname, '..', 'site', 'w');

const esc = (s) => String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
const slug = (name) => name.replace(/ /g, '_');
const href = (name) => '/w/' + encodeURI(slug(name));
const link = (name, cls = '') => `<a${cls ? ` class="${cls}"` : ''} href="${esc(href(name))}">${esc(name)}</a>`;
const unknown = '<span class="unknown">?</span>';
const val = (v) => (v === null || v === undefined || v === '' ? unknown : esc(v));
const cap = (s) => s.charAt(0).toUpperCase() + s.slice(1);
const qBorder = (q) => (q === 'poor' || q === 'common' ? '' : ` q-border-${q}`);
const rarityClass = (display) => {
  if (display === null || display === undefined) return '';
  const n = Number(String(display).replace(/[^0-9]/g, '').slice(1) || 1); // "~1/33" -> 33
  return n <= 1 ? 'r-always' : n <= 9 ? 'r-common' : n <= 99 ? 'r-uncommon' : n <= 999 ? 'r-rare' : 'r-veryrare';
};
const bossNames = new Set(data.bosses.map((b) => b.name));
const rateCell = (d) => `<td class="rarity ${rarityClass(d)}">${val(d)}</td>`;
const META_NOTE = /npc id|warcraft ?tavern|verified|^level /i;

// Research JSON is hand-collected and inconsistent. Clean it up before rendering:
// - strip "(rare, optional)" style suffixes from boss names, keep them as flags
// - match item sources to bosses case-insensitively ("Rhahk'Zor" vs "Rhahk'zor")
// - promote boss/rare item sources missing from bosses[] (e.g. Sneed) to bosses
// - flatten the several quest_rewards shapes into [{quest, faction, items:[{name,id}]}]
function normalize(d) {
  for (const b of d.bosses) {
    const m = b.name.match(/^(.*?)\s*\(([^)]*)\)$/);
    if (m) { b.name = m[1]; b.rare = /rare/i.test(m[2]); b.optional = /optional/i.test(m[2]); }
    if (/^rare mob/i.test(b.notes || '')) b.rare = true;
  }
  const byLower = new Map(d.bosses.map((b) => [b.name.toLowerCase(), b]));
  for (const it of d.items) {
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
  d.quest_rewards = (d.quest_rewards || []).filter((q) => q.quest).reduce((acc, q) => {
    let e = acc.find((x) => x.quest === q.quest);
    if (!e) acc.push((e = { quest: q.quest, faction: q.faction || null, items: [] }));
    const add = (name, id) => name && e.items.push({ name, id: id ?? null });
    if (q.items) q.items.forEach((n) => add(n, null));
    if (q.item) add(q.item, null);
    if (q.name) add(q.name, q.item_id);
    if (q.rewards) q.rewards.forEach((r) => { const n = r.replace(/\s*\(.*\)$/, ''); add(n, q.item_ids?.[n]); });
    return acc;
  }, []);
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
      <li><a href="#">Edit</a></li>
      <li><a href="#">History</a></li>
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
${entries.map(([id, label]) => `        <li><a href="#${id}">${label}</a></li>`).join('\n')}
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
function itemPage(it) {
  const w = it.weapon;
  it = { ...it, quality: it.quality || 'common' };
  const rows = [
    `      <tr><th>Quality</th><td><span class="q-${it.quality}">${cap(it.quality)}</span></td></tr>`,
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

  const srcLink = bossNames.has(it.source) ? link(it.source) : it.source ? esc(it.source) : 'unknown enemies';
  const lvl = data.bosses.find((b) => b.name === it.source)?.level ?? null;
  const intro = `<b>${esc(it.name)}</b> is a <span class="q-${it.quality}">${esc(it.quality)}</span> ${it.type ? esc(it.type.toLowerCase()) + ' ' : ''}${esc(String(it.slot || 'item').toLowerCase())} item that requires level ${it.required_level ?? '?'}. It drops from ${srcLink} in ${link(dungeonLoc)}.${it.source_type === 'quest_item' ? ' It is a quest item.' : ''}`;

  const body = `
    <table class="infobox">
      <tr><th colspan="2" class="infobox-header">${esc(it.name)}</th></tr>
      <tr>
        <td colspan="2" class="infobox-image">
          <span class="item-icon${qBorder(it.quality)}" role="img" aria-label="Item icon placeholder">
            <svg viewBox="0 0 36 36" width="36" height="36" aria-hidden="true"><path d="M9 7h13v9H9zM14 16h3v14h-3z" fill="currentColor"/></svg>
          </span>
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
          <tr><td>${srcLink}</td><td class="num">${lvl ?? unknown}</td><td>${link(dungeonLoc)}</td><td class="num">1</td>${rateCell(it.drop_rate_display)}</tr>
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
${drops.map(lootRow).join('\n')}
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
const lootRow = (i) => `          <tr><td>${link(i.name, 'q-' + (i.quality || 'common'))}</td><td>${val(i.slot)}</td><td>${val(i.type)}</td>${rateCell(i.drop_rate_display)}</tr>`;

function dungeonPage() {
  const d = data;
  const bossList = d.bosses.map((b) => `        <li>${link(b.name)}${b.rare ? ' (rare)' : b.optional ? ' (optional)' : ''}</li>`).join('\n');
  const loot = d.bosses.map((b) => {
    const drops = d.items.filter((i) => i.source === b.name);
    if (!drops.length) return '';
    const rows = drops.map(lootRow).join('\n');
    return `    <h3 id="${slug(b.name)}">${link(b.name)}</h3>
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
${trash.map((i) => `          <tr><td>${link(i.name, 'q-' + (i.quality || 'common'))}</td><td>${val(i.slot)}</td><td>${val(i.type)}</td><td>${i.source ? esc(i.source) : unknown}</td>${rateCell(i.drop_rate_display)}</tr>`).join('\n')}
        </tbody>
      </table>
    </div>` : '';
  const quests = d.quest_rewards.map((q) => `        <li><b>${esc(q.quest)}</b>${q.faction ? ` (${esc(q.faction)})` : ''}${q.items.length ? ': ' + q.items.map((i) => esc(i.name)).join(', ') : ' &ndash; no item reward listed'}</li>`).join('\n');
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
    <p>${esc(d.location)}</p>

    <h2 id="Bosses">Bosses</h2>
    <ol>
${bossList}
    </ol>

    <h2 id="Loot">Loot</h2>
${rateNote}
${loot}${trashLoot ? '\n' + trashLoot : ''}
${rarityKey}

    <h2 id="Quests">Quests</h2>
    <p>Quest reward names are listed from community sources and have not been checked against item data.</p>
    <ul>
${quests}
    </ul>`;
  return page({ title: d.dungeon, tabLabel: 'Dungeon', body });
}

const written = [];
function write(title, html) {
  fs.writeFileSync(path.join(OUT, slug(title) + '.html'), html);
  written.push(title);
}
write(data.dungeon, dungeonPage());
data.bosses.forEach((b) => write(b.name, bossPage(b)));
data.items.forEach((i) => write(i.name, itemPage(i)));
console.log(`Wrote ${written.length} pages:\n  ` + written.join('\n  '));
