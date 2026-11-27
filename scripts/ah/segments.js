// Auction House price segments: region x ruleset x faction.
// WoW Forever has no named realms: each region runs one realm per ruleset, and Alliance and Horde
// keep separate auction houses. So a price is only meaningful for one region + ruleset + faction.
// The same keys are used by the fetcher (scripts/fetch-ah-prices.js), the live route in server.js
// and the browser widget (site/assets/ah-price.js keeps its own copy, it cannot require this file).
const REGIONS = { us: 'NA', eu: 'EU' };
const RULESETS = { pve: 'Normal (PvE)', pvp: 'PvP', rp: 'RP', rppvp: 'RP-PvP' };
const FACTIONS = { alliance: 'Alliance', horde: 'Horde' };

// Blizzard realm type ("NORMAL", "PVP", "RP", "RPPVP"; some feeds spell it "PVP_RP") -> ruleset key
function rulesetOf(type) {
  const t = String(type || '').toUpperCase().replace(/[^A-Z]/g, '');
  if (t === 'NORMAL' || t === 'PVE') return 'pve';
  if (t === 'PVP') return 'pvp';
  if (t === 'RP' || t === 'RPPVE') return 'rp';
  if (t === 'RPPVP' || t === 'PVPRP') return 'rppvp';
  return null; // e.g. HARDCORE: not a segment yet
}

// Classic-style auction house ids: 2 Alliance, 6 Horde, 7 neutral (Blackwater, Booty Bay etc.).
// The neutral house is shared by both factions and is left out of the faction prices.
function factionOf(house) {
  if (house.id === 2 || /alliance/i.test(house.name || '')) return 'alliance';
  if (house.id === 6 || /horde/i.test(house.name || '')) return 'horde';
  return null;
}

const segmentKey = (region, ruleset, faction) => `${region}-${ruleset}-${faction}`;
const allSegments = () =>
  Object.keys(REGIONS).flatMap((r) => Object.keys(RULESETS).flatMap((s) => Object.keys(FACTIONS).map((f) => ({ region: r, ruleset: s, faction: f, key: segmentKey(r, s, f) }))));

module.exports = { REGIONS, RULESETS, FACTIONS, rulesetOf, factionOf, segmentKey, allSegments };
