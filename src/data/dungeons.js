// Dungeon, boss and item pages from the dungeon research (research/*.json), as JSON page models for
// src/pages/Doc.vue. Files are read in name order; when two dungeons produce a page with the same title
// (an item shared by the Scarlet Monastery wings), the later file's page is the one written.
const { json, dungeonFiles } = require('./research');
const { cap, article, slug } = require('../lib/wiki');
const D = require('../lib/doc');

// Research JSON is hand-collected and inconsistent. Clean it up before rendering:
// - strip "(rare, optional)" style suffixes from boss names, keep them as flags
// - match item sources to bosses case-insensitively ("Rhahk'Zor" vs "Rhahk'zor")
// - promote boss/rare item sources missing from bosses[] (e.g. Sneed) to bosses
// - drop research remarks from item sources: "Trash (unspecified mob)", "Defias trash (per wowtbc.gg)"
// - flatten the several quest_rewards shapes into [{quest, faction, items:[{name,id}]}];
//   rewards whose quest is not known share one entry with quest: null
// - drop items with no name (IDs Wowhead does not know); there is nothing to title a page with
function normalize(raw) {
  const d = structuredClone(raw); // the research cache is shared; never change it in place
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
  return d;
}

// Drop rates are shown as ~1/N with N to at most two decimal places (~1/4.83, ~1/3.1, ~1/5).
// N comes from counted kills and drops when Wowhead's dropped-by table gave them, else from its drop %.
// drop_rate_display in the research is only a fallback for items that have neither.
const rateOf = (it) => {
  if (it.kills > 0 && it.drops > 0) return it.kills / it.drops;
  if (it.drop_chance_pct > 0) return 100 / it.drop_chance_pct;
  const m = String(it.drop_rate_display ?? '').match(/~1\/([\d.]+)/);
  return m ? Number(m[1]) : null;
};
const rateText = (n) => `~1/${+n.toFixed(2)}`;
const rarityClass = (n) => (n == null ? '' : n <= 1 ? 'r-always' : n < 10 ? 'r-common' : n < 100 ? 'r-uncommon' : n < 1000 ? 'r-rare' : 'r-veryrare');
const rateCell = (it) => {
  const n = rateOf(it);
  const counted = it.kills > 0 && it.drops > 0 ? `${it.drops} drop${it.drops === 1 ? '' : 's'} in ${it.kills} kills` : null;
  return D.cell(n == null ? [D.unknown()] : [rateText(n)], `rarity ${rarityClass(n)}`.trim(), counted);
};
const RATE_NOTE = { p: ["Drop rates are ~1/N to two decimal places. Most come from Wowhead's drop percentage (for example 32.25% is shown as ~1/3.1); where Wowhead listed counted kills and drops, N is kills divided by drops, and hovering the rate shows the counts."] };
const RARITY_KEY = { key: 'rarity' };
const META_NOTE = /npc id|warcraft ?tavern|timesaver|wowtbc|verified|^level /i; // research notes, not lore
const qBorder = (q) => (q === 'poor' || q === 'common' ? '' : ` q-border-${q}`);

function pages() {
  const Doc = require('../pages/Doc.vue');
  const icons = json('icons.json'); // item_id -> icon name, from scripts/fetch-icons.js
  const all = dungeonFiles().map((f) => normalize(json(f)));

  // Some items drop in several dungeons (the Scarlet Monastery wings share one trash list), so an item
  // page lists its sources from every file.
  const itemSources = new Map(); // item name -> [{ d, it }]
  for (const d of all) {
    for (const it of d.items) {
      if (!itemSources.has(it.name)) itemSources.set(it.name, []);
      itemSources.get(it.name).push({ d, it });
    }
  }
  // The same item can be more complete in another dungeon's file (an ID only one wing found)
  const best = (it) => itemSources.get(it.name).map((s) => s.it).find((x) => x.item_id) || it;
  const srcSegs = ({ d, it }) => (d.bosses.some((b) => b.name === it.source) ? [D.link(it.source)] : it.source ? [it.source] : [D.unknown()]);
  const lootRow = (i, extra = []) => {
    const b = best(i); // stats from the most complete record, drop rate from this dungeon's
    return [D.cell([D.link(i.name, 'q-' + (b.quality || 'common'))]), D.cell(D.val(b.slot)), D.cell(D.val(b.type)), ...extra, rateCell(i)];
  };
  const LOOT_HEAD = ['Item', 'Slot', 'Type', 'Rarity'];

  // ---------- Item page ----------
  function itemPage(orig) {
    let it = best(orig);
    const w = it.weapon;
    const knownQuality = it.quality; // null for stubs; still styled as common, but not claimed in text
    it = { ...it, quality: it.quality || 'common' };
    const icon = icons[it.item_id];
    const sources = itemSources.get(it.name);
    const dungeons = [...new Set(sources.map((s) => s.d.dungeon))];
    let where;
    if (dungeons.length > 1) where = ['It drops in ', ...D.andList(dungeons.map((n) => [D.link(n)])), '.'];
    else if (sources[0].it.source) {
      // "drops from any enemy": a plain-text source starting with Any or Trash is lower-cased
      const src = srcSegs(sources[0]).map((s) => (typeof s === 'string' ? s.replace(/^(Any|Trash)\b/, (m) => m.toLowerCase()) : s));
      where = ['It drops from ', ...src, ' in ', D.link(dungeons[0]), '.'];
    } else where = ['It drops in ', D.link(dungeons[0]), '; which enemies drop it is not known yet.'];
    // "an uncommon cloth wrist item that requires level 20"; unknown parts are left out
    const words = [...new Set([it.type, it.slot].filter(Boolean).map((s) => String(s).toLowerCase()))]
      .filter((x, i, a) => !(i === 1 && a[0].endsWith(' ' + x))); // "10 slot bag", not "10 slot bag bag"
    const noun = !/item$/.test(words.join(' ')); // no "quest item item"
    const descText = [...words, noun && 'item'].filter(Boolean).join(' ');
    const desc = D.join([...(knownQuality ? [[D.q(it.quality, it.quality)]] : []), ...[...words, ...(noun ? ['item'] : [])].map((x) => [x])], ' ');
    const isQuestItem = it.source_type === 'quest_item' && !/quest item$/.test(descText);

    const rows = [
      { th: 'Quality', segs: knownQuality ? [D.q(it.quality, cap(it.quality))] : [D.unknown()] },
      { th: 'Item level', segs: D.val(it.item_level) },
      { th: 'Requires level', segs: D.val(it.required_level) },
      { th: 'Slot', segs: D.val(it.slot) },
      { th: 'Type', segs: D.val(it.type) },
      { th: 'Binding', segs: D.val(it.binding) },
      { th: 'Sell price', segs: D.val(it.sell_price) },
      ...(it.armor != null ? [{ th: 'Armor', segs: [String(it.armor)] }] : []), // null or missing: no armor
      ...(w ? [
        { sub: 'Weapon' },
        { th: 'Damage', segs: [`${w.damage_min} – ${w.damage_max}`] },
        { th: 'Speed', segs: [w.speed.toFixed(2)] },
        { th: 'DPS', segs: [String(w.dps)] },
      ] : []),
      { sub: 'Database' },
      { th: 'Item ID', segs: D.val(it.item_id) },
      ...(it.wowhead_url ? [{ th: 'Source', segs: [D.ext(it.wowhead_url, 'Wowhead')] }] : []),
    ];
    const tooltip = [
      { cls: `tt-name q-${it.quality}`, segs: [it.name] },
      { cls: 'tt-dim', segs: ['Item Level ', ...D.val(it.item_level)] },
      it.binding && { segs: [it.binding] },
      { split: [D.val(it.slot), [it.type ? String(it.type) : '']] },
      w && { split: [[`${w.damage_min} - ${w.damage_max} Damage`], [`Speed ${w.speed.toFixed(2)}`]] },
      w && { segs: [`(${w.dps} damage per second)`] },
      it.armor != null && { segs: [`${it.armor} Armor`] },
      ...it.stats.map((s) => ({ ...(/^Equip:/.test(s) ? { cls: 'tt-green' } : {}), segs: [s] })),
      { segs: ['Requires Level ', ...D.val(it.required_level)] },
      it.sell_price && { segs: [`Sell Price: ${it.sell_price}`] },
    ].filter(Boolean);

    return {
      title: it.name,
      component: Doc,
      props: {
        title: it.name, tab: 'Item',
        infobox: {
          name: it.name,
          image: { cls: `item-icon${qBorder(it.quality)}`, label: icon ? `${it.name} icon` : 'Item icon placeholder', src: icon ? `/assets/icons/${icon}.jpg` : null, placeholder: !icon },
          rows,
        },
        intro: [{ p: [
          D.b(it.name), ` is ${article(knownQuality || words[0] || 'item')} `, ...desc,
          `${it.required_level != null ? ` that requires level ${it.required_level}` : ''}. `, ...where,
          ...(isQuestItem ? [' It is a quest item.'] : []),
        ] }],
        sections: [
          D.section('Tooltip', 'Tooltip', [{ tooltip }]),
          D.section('Item_sources', 'Item sources', [
            RATE_NOTE,
            D.table(['Source', 'Level', 'Location', 'Quantity', 'Rarity'], sources.map((s) => {
              const lvl = s.d.bosses.find((b) => b.name === s.it.source)?.level ?? s.it.source_level ?? null;
              return [D.cell(srcSegs(s)), D.cell(lvl == null ? [D.unknown()] : [String(lvl)], 'num'), D.cell([D.link(s.d.dungeon)]), D.cell(['1'], 'num'), rateCell(s.it)];
            }), 'wikitable item-drops'),
            RARITY_KEY,
          ]),
        ],
      },
    };
  }

  // ---------- Boss page ----------
  function bossPage(d, b) {
    const drops = d.items.filter((i) => i.source === b.name);
    const kind = b.rare ? 'rare' : 'boss';
    const note = b.notes && / /.test(b.notes) && !META_NOTE.test(b.notes) ? ' ' + b.notes.replace(/[.;]?$/, '.') : '';
    return {
      title: b.name,
      component: Doc,
      props: {
        title: b.name, tab: 'NPC',
        infobox: {
          name: b.name,
          rows: [
            { th: 'Level', segs: D.val(b.level) },
            { th: 'Location', segs: [D.link(d.dungeon)] },
            { th: 'Type', segs: [`${cap(kind)}${b.optional ? ' (optional)' : ''}`] },
            { sub: 'Database' },
            { th: 'NPC ID', segs: D.val(b.npc_id) },
          ],
        },
        intro: [{ p: [D.b(b.name), ` is ${b.optional ? 'an optional' : 'a'} ${kind} in `, D.link(d.dungeon), `.${note}`] }],
        sections: [D.section('Drops', 'Drops', drops.length
          ? [RATE_NOTE, D.table(LOOT_HEAD, drops.map((i) => lootRow(i))), RARITY_KEY]
          : [{ p: ['No drops are known yet.'] }])],
      },
    };
  }

  // ---------- Dungeon page ----------
  function dungeonPage(d) {
    const bossNames = new Set(d.bosses.map((b) => b.name));
    const levels = d.recommended_level_range || d.level_range;
    const trash = d.items.filter((i) => !bossNames.has(i.source));
    const quests = d.quest_rewards.filter((q) => q.quest);
    const unknownQuest = d.quest_rewards.find((q) => !q.quest)?.items || [];
    return {
      title: d.dungeon,
      component: Doc,
      props: {
        title: d.dungeon, tab: 'Dungeon',
        infobox: {
          name: d.dungeon,
          rows: [
            { th: 'Type', segs: ['Dungeon'] },
            { th: 'Level range', segs: [String(levels)] },
            { th: 'Minimum level', segs: D.val(d.min_level) },
            { th: 'Zone', segs: D.val(d.zone) },
            { th: 'Bosses', segs: [String(d.bosses.filter((b) => !b.rare).length)] },
            { th: 'New in Forever', segs: [d.new_in_forever ? 'Yes' : 'No'] },
          ],
        },
        intro: [{ p: [D.b(d.dungeon), ` is a ${d.new_in_forever ? 'new ' : ''}dungeon in WoW Forever for characters of level ${levels}.`] }],
        sections: [
          D.section('Location', 'Location', [{ p: [d.location || 'The entrance location is not known yet.'] }]),
          D.section('Bosses', 'Bosses', [{ ol: d.bosses.map((b) => [D.link(b.name), ...(b.rare ? [' (rare)'] : b.optional ? [' (optional)'] : [])]) }]),
          D.section('Loot', 'Loot', [
            RATE_NOTE,
            ...d.bosses.flatMap((b) => {
              const drops = d.items.filter((i) => i.source === b.name);
              return drops.length ? [{ h3: [D.link(b.name)], id: slug(b.name) }, D.table(LOOT_HEAD, drops.map((i) => lootRow(i)))] : [];
            }),
            ...(trash.length ? [
              { h3: ['Trash and other drops'], id: 'Trash' },
              D.table(['Item', 'Slot', 'Type', 'Source', 'Rarity'], trash.map((i) => lootRow(i, [D.cell(i.source ? [i.source] : [D.unknown()])]))),
            ] : []),
            RARITY_KEY,
          ]),
          D.section('Quests', 'Quests', [
            d.quest_rewards.length && { p: ['Quest reward names are listed from community sources and have not been checked against item data.'] },
            quests.length
              ? { ul: quests.map((q) => [D.b(q.quest), ...(q.faction ? [` (${q.faction})`] : []), q.items.length ? ': ' + q.items.map((i) => i.name).join(', ') : ' – no item reward listed']) }
              : { p: ['No quests are known yet.'] },
            unknownQuest.length && { p: ['These items are probably quest rewards, but their quests are not known yet:'] },
            unknownQuest.length && { ul: unknownQuest.map((i) => [i.name]) },
          ]),
        ],
      },
    };
  }

  return all.flatMap((d) => [dungeonPage(d), ...d.bosses.map((b) => bossPage(d, b)), ...d.items.map(itemPage)]);
}

module.exports = { pages };
