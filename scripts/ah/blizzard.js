// Pull auction house snapshots from the Blizzard Game Data API and reduce them to per-item prices
// for every region x ruleset x faction segment (see segments.js).
// Used by scripts/fetch-ah-prices.js (writes static JSON) and server.js (serves it live).
//
// Needs a Battle.net API client: https://develop.battle.net/access/clients
//   BLIZZARD_CLIENT_ID, BLIZZARD_CLIENT_SECRET
// Optional:
//   AH_NAMESPACE  dynamic namespace template, {region} is replaced (default dynamic-classic-{region}).
//                 Set it to Forever's namespace once Blizzard documents one.
//   AH_REGIONS    comma list, default "us,eu"
const { REGIONS, rulesetOf, factionOf, segmentKey } = require('./segments');

const NAMESPACE = (region) => (process.env.AH_NAMESPACE || 'dynamic-classic-{region}').replace('{region}', region);
const hasCredentials = () => Boolean(process.env.BLIZZARD_CLIENT_ID && process.env.BLIZZARD_CLIENT_SECRET);

let token = null; // { value, expires }
async function getToken() {
  if (token && token.expires > Date.now() + 60_000) return token.value;
  const auth = Buffer.from(`${process.env.BLIZZARD_CLIENT_ID}:${process.env.BLIZZARD_CLIENT_SECRET}`).toString('base64');
  const res = await fetch('https://oauth.battle.net/token', {
    method: 'POST',
    headers: { Authorization: `Basic ${auth}`, 'Content-Type': 'application/x-www-form-urlencoded' },
    body: 'grant_type=client_credentials',
  });
  if (!res.ok) throw new Error(`Battle.net token: HTTP ${res.status}`);
  const j = await res.json();
  token = { value: j.access_token, expires: Date.now() + j.expires_in * 1000 };
  return token.value;
}

// GET a Game Data path (or a full href from a previous response) in the region's dynamic namespace.
async function api(region, pathOrHref) {
  const url = new URL(pathOrHref, `https://${region}.api.blizzard.com`);
  url.searchParams.set('namespace', NAMESPACE(region));
  url.searchParams.set('locale', 'en_US');
  for (let attempt = 1; ; attempt++) {
    const res = await fetch(url, { headers: { Authorization: `Bearer ${await getToken()}` } });
    if (res.ok) return { body: await res.json(), modified: res.headers.get('last-modified') };
    if (res.status === 404) return null; // realm without an auction house, or an empty snapshot
    if (attempt === 3 || (res.status < 500 && res.status !== 429)) throw new Error(`${url.pathname}: HTTP ${res.status}`);
    await new Promise((r) => setTimeout(r, 1000 * attempt));
  }
}

// Every connected realm in the region with the rulesets of its realms.
async function connectedRealms(region) {
  const index = await api(region, '/data/wow/connected-realm/index');
  const out = [];
  for (const { href } of index?.body.connected_realms || []) {
    const cr = await api(region, href);
    if (!cr) continue;
    const rulesets = [...new Set(cr.body.realms.map((r) => rulesetOf(r.type?.type)).filter(Boolean))];
    if (rulesets.length !== 1) {
      if (rulesets.length > 1) console.warn(`  ${region} connected realm ${cr.body.id} mixes rulesets ${rulesets}; skipped`);
      continue;
    }
    out.push({ id: cr.body.id, ruleset: rulesets[0], realms: cr.body.realms.map((r) => r.name?.en_US || r.name).filter(Boolean) });
  }
  return out;
}

// Raw auctions -> { itemId: [minBuyout, medianBuyout, quantity, auctions] } in copper per unit.
// Bid-only auctions (no buyout) are left out. The median is weighted by quantity, so one cheap
// single item does not stand in for a stack of 200.
function aggregate(auctions) {
  const byItem = new Map();
  for (const a of auctions) {
    const id = a.item?.id;
    const qty = a.quantity || 1;
    const buyout = a.buyout ?? a.unit_price * qty; // classic: stack buyout; retail commodities: unit_price
    if (!id || !buyout) continue;
    if (!byItem.has(id)) byItem.set(id, []);
    byItem.get(id).push([buyout / qty, qty]);
  }
  const items = {};
  for (const [id, list] of byItem) {
    list.sort((a, b) => a[0] - b[0]);
    const total = list.reduce((n, [, q]) => n + q, 0);
    let seen = 0, median = list[0][0];
    for (const [p, q] of list) { seen += q; if (seen * 2 >= total) { median = p; break; } }
    items[id] = [Math.round(list[0][0]), Math.round(median), total, list.length];
  }
  return items;
}

// One region -> { segmentKey: { region, ruleset, faction, realms, updated, snapshot, items } }
async function fetchRegion(region) {
  const pools = new Map(); // segment key -> { auctions, realms, snapshot }
  for (const cr of await connectedRealms(region)) {
    const houses = await api(region, `/data/wow/connected-realm/${cr.id}/auctions/index`);
    for (const house of houses?.body.auctions || []) {
      const faction = factionOf(house);
      if (!faction) continue;
      const snap = await api(region, `/data/wow/connected-realm/${cr.id}/auctions/${house.id}`);
      if (!snap) continue;
      const key = segmentKey(region, cr.ruleset, faction);
      if (!pools.has(key)) pools.set(key, { region, ruleset: cr.ruleset, faction, auctions: [], realms: [], snapshot: null });
      const pool = pools.get(key);
      pool.auctions.push(...(snap.body.auctions || []));
      pool.realms.push(...cr.realms);
      // a segment is only as fresh as its oldest realm snapshot
      const t = snap.modified ? new Date(snap.modified).toISOString() : null;
      if (t && (!pool.snapshot || t < pool.snapshot)) pool.snapshot = t;
    }
  }
  const updated = new Date().toISOString();
  const out = {};
  for (const [key, p] of pools) {
    out[key] = { region: p.region, ruleset: p.ruleset, faction: p.faction, realms: p.realms, updated, snapshot: p.snapshot, source: 'Blizzard Game Data API', items: aggregate(p.auctions) };
  }
  return out;
}

const regions = () => (process.env.AH_REGIONS || Object.keys(REGIONS).join(',')).split(',').map((s) => s.trim()).filter((r) => REGIONS[r]);

module.exports = { hasCredentials, fetchRegion, aggregate, regions };
