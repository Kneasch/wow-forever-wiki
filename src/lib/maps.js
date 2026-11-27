// Zone maps and pins: the data side. src/components/ZoneMap.vue draws what zoneMap() returns.
//
//   zoneMap({ zoneId: 12, pins: [{ x: 45.3, y: 65.6, type: 'mining', label: 'Copper Vein', href: '/w/Copper_Vein' }] })
//
// zoneId is the area ID that Wowhead object tooltips give as map.zone (zone_id in the profession research).
// x and y are Wowhead's map coordinates: percentages (0-100) of the zone map, x right, y down.
// Map images and sizes come from research/maps/zones.json, written by scripts/fetch-maps.py.
// Zones without a map image (dungeons, or zones not fetched yet) get a plain 0-100 grid instead.
const fs = require('fs');
const path = require('path');
const { plural } = require('./wiki');

const ROOT = path.join(__dirname, '..', '..');
const MAPS = JSON.parse(fs.readFileSync(path.join(ROOT, 'research', 'maps', 'zones.json'), 'utf8'));
const byArea = new Map(MAPS.zones.filter((z) => z.area_id != null).map((z) => [z.area_id, z]));

// Pin types. The icon is the symbol of the same name in site/assets/map-pins.svg, and the colour is the
// --pin-<type> variable in site/assets/wiki.css.
const PIN_TYPES = {
  mining: { label: 'Mining node' },
  herbalism: { label: 'Herb' },
  fishing: { label: 'Fishing pool' },
  skinning: { label: 'Skinnable creature' },
  treasure: { label: 'Treasure chest' },
  other: { label: 'Other' },
};
const SPRITE = '/assets/map-pins.svg';
// Above this many pins a map switches from pin icons to small dots, so dense zones stay readable.
const DENSE = 60;
const GRID = { width: 1002, height: 668 }; // same 3:2 shape as the game's zone maps
const num = (n) => +n.toFixed(1);

const zoneInfo = (zoneId) => byArea.get(Number(zoneId)) || null;
const hasImage = (z) => !!z && fs.existsSync(path.join(ROOT, 'site', z.image));
// Every map with an image has a page (src/data/zones.js), titled with the map's name
const zonePageTitle = (z) => z.name;
// The zone page for an area ID, for linking from other pages; null when there is none
const zonePageFor = (zoneId) => { const z = zoneInfo(zoneId); return hasImage(z) ? zonePageTitle(z) : null; };
const pinTypeFor = (profession) => (PIN_TYPES[profession.toLowerCase()] ? profession.toLowerCase() : 'other');

/**
 * Everything ZoneMap.vue needs to draw one map, or null when there is nothing to draw.
 * @param {number}  [o.zoneId]   area ID (Wowhead's zone ID)
 * @param {object}  [o.zone]     a zones.json entry, instead of zoneId (continents have no area ID)
 * @param {string}  [o.zoneName] shown when the zone is not in zones.json
 * @param {Array<{x,y,type,label?,href?}>} [o.pins]  with none, the map is drawn on its own, if it has an image
 * @param {string}  [o.caption]  replaces the default "N spawn points in Zone." sentence
 * @param {boolean} [o.dense]    force dots (true) or pins (false); default: more than DENSE pins
 */
function zoneMap({ zoneId, zone: given, zoneName, pins = [], caption, dense }) {
  for (const p of pins) {
    if (!PIN_TYPES[p.type]) throw new Error(`unknown map pin type "${p.type}" (known: ${Object.keys(PIN_TYPES).join(', ')})`);
  }
  const zone = given || zoneInfo(zoneId);
  const name = zone?.name || zoneName || 'an unknown zone';
  const image = hasImage(zone);
  if (!pins.length && !image) return null;
  const { width: W, height: H } = image ? zone : GRID;
  const asDots = dense ?? pins.length > DENSE;
  // Pins are sized in map pixels (30 px wide on a 1002 px map) so they scale with the image: about 19 px
  // on screen at the usual 40rem width. Dots for dense maps are 4.5 px in radius.
  const pw = W * 0.03, ph = pw * (32 / 24), r = W * 0.0045;

  const counts = new Map();
  for (const p of pins) counts.set(p.type, (counts.get(p.type) || 0) + 1);
  return {
    W, H, name, asDots,
    image: image ? zone.image : null,
    sprite: SPRITE,
    label: `${plural(pins.length, 'point')} on the map of ${name}`,
    pins: pins.map((p) => {
      const x = (p.x / 100) * W, y = (p.y / 100) * H;
      return {
        type: p.type, href: p.href || null,
        title: `${p.label ? `${p.label} ` : ''}(${num(p.x)}, ${num(p.y)})`,
        dot: { cx: num(x), cy: num(y), r: num(r) },
        icon: { x: num(x - pw / 2), y: num(y - ph), width: num(pw), height: num(ph) },
      };
    }),
    grid: image ? [] : [10, 20, 30, 40, 50, 60, 70, 80, 90].map((g) => ({ x: num(g * W / 100), y: num(g * H / 100) })),
    // One legend entry per type on this map. With more than one type, each gets a checkbox that hides its pins.
    legend: [...counts].map(([type, n]) => ({ type, label: PIN_TYPES[type].label, n })),
    toggles: counts.size > 1,
    caption: caption ?? `${plural(pins.length, 'spawn point')} in ${name}.`,
    hover: pins.length > 0,
    source: image
      ? `Map from the WoW Forever game client${zone.new_in_forever ? ' (a zone new in Forever)' : ''}.`
      : `${name} has no map image yet, so the points are on the zone's 0–100 coordinate grid (lines every 10).`,
  };
}

module.exports = { MAPS, PIN_TYPES, zoneInfo, hasImage, zonePageTitle, zonePageFor, pinTypeFor, zoneMap };
