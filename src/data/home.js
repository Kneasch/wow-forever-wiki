// The main page and the 404 page.
// The main page is laid out like the OSRS Wiki's: a welcome banner with site statistics, a row of portal tiles, then
// two columns of boxed sections (dungeons by level bracket, a featured dungeon, what's new in Forever, professions,
// zones and how far the wiki has got). Everything on it is counted from the research JSON, so it never goes stale.
const fs = require('fs');
const path = require('path');
const { ROOT, json, dungeonFiles } = require('./research');
const { MAPS } = require('../lib/maps');
const { plural } = require('../lib/wiki');

const NUMBERS = ['No', 'One', 'Two', 'Three', 'Four', 'Five', 'Six', 'Seven', 'Eight', 'Nine', 'Ten', 'Eleven', 'Twelve'];
const word = (n) => NUMBERS[n] || String(n);
const dash = (s) => s.replace(/-/g, '–');
const iconSrc = (name) => (name && fs.existsSync(path.join(ROOT, 'site', 'assets', 'icons', name + '.jpg')) ? `/assets/icons/${name}.jpg` : null);
const KIND_LABEL = { gathering: 'Gathering', production: 'Production', secondary: 'Secondary' };

// Level brackets for the dungeon box, by a dungeon's minimum recommended level
const BRACKETS = [
  { id: 'Levels_10-29', label: 'Levels 10–29', max: 29 },
  { id: 'Levels_30-49', label: 'Levels 30–49', max: 49 },
  { id: 'Levels_50-60', label: 'Levels 50–60', max: Infinity },
];

// The featured dungeon is picked by the week of the year (UTC) the site is built in, so it changes with the first
// deploy of a new week (pages.yml deploys on every push to main)
function weekOfYear(d) {
  const start = Date.UTC(d.getUTCFullYear(), 0, 1);
  return Math.floor((d.getTime() - start) / (7 * 864e5));
}

function pages() {
  const research = dungeonFiles().map((f) => json(f)).sort((a, b) => a.order - b.order);
  const dungeons = research.map((d) => {
    const levels = d.recommended_level_range || d.level_range;
    return {
      order: d.order,
      name: d.dungeon,
      levels: dash(levels),
      min: parseInt(levels, 10),
      // "Orgrimmar (Durotar)" and "Ironforge / Dun Morogh" are shown by their first zone
      zone: d.zone.split(/ \(| \//)[0],
      new_in_forever: !!d.new_in_forever,
    };
  });
  const brackets = BRACKETS.map((b, i) => ({
    ...b,
    dungeons: dungeons.filter((d) => d.min <= b.max && (i === 0 || d.min > BRACKETS[i - 1].max)),
  }));

  // Unique bosses and items across all dungeons (a Scarlet Monastery item is shared by several wings)
  const bossNames = new Set(research.flatMap((d) => d.bosses.map((b) => b.name)));
  const itemNames = new Set(research.flatMap((d) => (d.items || []).map((it) => it.name)));

  const featuredSrc = research[weekOfYear(new Date()) % research.length];
  const bosses = featuredSrc.bosses;
  const featured = {
    name: featuredSrc.dungeon,
    levels: dash(featuredSrc.recommended_level_range || featuredSrc.level_range),
    zone: featuredSrc.zone,
    location: featuredSrc.location || null,
    new_in_forever: !!featuredSrc.new_in_forever,
    bossCount: plural(bosses.length, 'boss', 'bosses'),
    itemCount: plural((featuredSrc.items || []).length, 'item'),
    // the last boss is the dungeon's end boss; show a few on the way
    bosses: bosses.slice(0, 6).map((b) => b.name),
    moreBosses: Math.max(0, bosses.length - 6),
    finalBoss: bosses.length ? bosses[bosses.length - 1].name : null,
  };

  // Professions, grouped as on the Professions hub
  const profIndex = json('professions/index.json');
  const professions = profIndex.groups.map((g) => ({
    kind: g.kind,
    label: KIND_LABEL[g.kind] || g.title,
    professions: g.professions.map((p) => ({ name: p.name, icon: iconSrc(p.icon), written: !!p.file })),
  }));
  const allProfs = profIndex.groups.flatMap((g) => g.professions);
  const writtenProfs = allProfs.filter((p) => p.file);
  const campCount = allProfs.reduce((n, p) => n + (p.camp || []).length, 0);

  // Zones
  const maps = MAPS.zones.filter((z) => z.has_image);
  const continents = maps.filter((z) => z.kind === 'continent').sort((a, b) => a.name.localeCompare(b.name)).map((c) => ({
    name: c.name,
    thumb: c.thumb || c.image,
    zones: plural(maps.filter((z) => z.kind === 'zone' && z.parent === c.name).length, 'zone'),
  }));
  const newZones = maps.filter((z) => z.new_in_forever && z.kind !== 'continent').map((z) => z.name).sort();
  const count = (kind, one, many) => plural(maps.filter((z) => z.kind === kind).length, one, many);
  const zoneCounts = { zone: count('zone', 'zone'), city: count('city', 'city', 'cities'), battleground: count('battleground', 'battleground') };

  // Every article except the main page and 404 (required here, not at the top: render.js requires this file)
  const { collectPages } = require('../build/render');
  const pageCount = collectPages({ sources: ['zones', 'professions', 'classes', 'dungeons', 'quests', 'special'] }).length;

  const newDungeons = dungeons.filter((d) => d.new_in_forever);
  const stats = [
    { value: pageCount.toLocaleString('en-GB'), label: 'pages' },
    { value: String(dungeons.length), label: 'dungeons' },
    { value: bossNames.size.toLocaleString('en-GB'), label: 'bosses' },
    { value: itemNames.size.toLocaleString('en-GB'), label: 'dungeon items' },
    { value: String(maps.length), label: 'maps' },
  ];

  // Portal tiles under the banner. `href` for anchors on this page, `to` for wiki pages.
  const portals = [
    { label: 'Dungeons', href: '#Dungeons', icon: iconSrc('inv_banner_01'), note: `${dungeons.length} instances` },
    { label: 'Bosses', href: '#Dungeons', icon: iconSrc('spell_shadow_evileye'), note: `${bossNames.size} bosses` },
    { label: 'Professions', to: 'Professions', icon: iconSrc('trade_blacksmithing'), note: `${allProfs.length} professions` },
    { label: 'Zones', to: 'Zones', icon: iconSrc('ability_mount_whitedirewolf'), note: `${maps.length} maps` },
    { label: 'Mining', to: 'Mining', icon: iconSrc('trade_mining'), note: 'Veins & smelting' },
    { label: 'Herbalism', to: 'Herbalism', icon: iconSrc('spell_nature_naturetouchgrow'), note: 'Herbs & seeds' },
    { label: 'Fishing', to: 'Fishing', icon: iconSrc('trade_fishing'), note: 'Pools & catches' },
    { label: 'New in Forever', href: '#New_in_Forever', icon: iconSrc('spell_holy_innerfire'), note: `${newDungeons.length + newZones.length} additions` },
  ];

  // Coverage with a real denominator: dungeons with both bosses and loot researched, professions written,
  // and non-continent maps that have gathering nodes pinned on them
  const nodeZones = new Set(writtenProfs.flatMap((p) => json(`professions/${p.file}`).nodes || []).map((n) => n.zone_id));
  const questRegions = json('quests/index.json').regions.flatMap((r) => r.zones);
  const questZones = { done: questRegions.filter((z) => z.file).length, total: questRegions.length };
  const classIndex = json('classes/index.json').classes;
  const areaMaps = maps.filter((z) => z.kind !== 'continent');
  const progress = [
    { label: 'Dungeon loot', done: research.filter((d) => d.bosses.length && (d.items || []).length).length, total: research.length },
    { label: 'Professions', done: writtenProfs.length, total: allProfs.length },
    { label: 'Class abilities', done: classIndex.filter((c) => c.file).length, total: classIndex.length },
    { label: 'Zone quests', done: questZones.done, total: questZones.total },
    { label: 'Gathering maps', done: areaMaps.filter((z) => z.area_id != null && nodeZones.has(z.area_id)).length, total: areaMaps.length },
  ];

  return [
    {
      file: 'index.html', url: '/', title: 'Main page', docTitle: 'WoW Forever Wiki',
      component: require('../pages/Home.vue'),
      props: {
        stats, portals, brackets, featured, professions, continents, progress,
        dungeonCount: dungeons.length,
        newCount: word(newDungeons.length),
        newDungeons: newDungeons.map((d) => ({ name: d.name, levels: d.levels, zone: d.zone })),
        newDungeonsLabel: plural(newDungeons.length, 'new dungeon'),
        newZones,
        newZonesLabel: plural(newZones.length, 'new zone'),
        writtenProfs: writtenProfs.map((p) => p.name),
        campCount,
        zoneCounts,
      },
    },
    {
      file: '404.html', url: '/404.html', title: 'Page not found', docTitle: 'Page not found - WoW Forever Wiki',
      component: require('../pages/NotFound.vue'),
      props: {},
    },
  ];
}

module.exports = { pages };
