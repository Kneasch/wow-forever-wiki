#!/usr/bin/env node
// Snapshot Auction House prices into static JSON, one file per region x ruleset x faction:
//   site/data/ah/<region>-<ruleset>-<faction>.json   e.g. us-rppvp-horde.json
// The browser widget (site/assets/ah-price.js) fetches the file for the reader's chosen segment
// when a tradable item page loads. Static hosts (GitHub Pages) get fresh files from the scheduled
// deploy in .github/workflows/pages.yml; `npm start` can serve them live instead (see server.js).
//
// Usage: BLIZZARD_CLIENT_ID=... BLIZZARD_CLIENT_SECRET=... node scripts/fetch-ah-prices.js
// Set AH_OUT to write somewhere else. Behind a proxy add NODE_USE_ENV_PROXY=1 (Node >= 22.21).
// The output folder is git-ignored: prices are build output, not research.
const fs = require('fs');
const path = require('path');
const { hasCredentials, fetchRegion, regions } = require('./ah/blizzard');

const OUT = process.env.AH_OUT || path.join(__dirname, '..', 'site', 'data', 'ah');

(async () => {
  if (!hasCredentials()) {
    console.error('Set BLIZZARD_CLIENT_ID and BLIZZARD_CLIENT_SECRET (https://develop.battle.net/access/clients).');
    process.exit(1);
  }
  fs.mkdirSync(OUT, { recursive: true });
  let files = 0;
  for (const region of regions()) {
    console.log(`Fetching ${region} auction houses...`);
    const segments = await fetchRegion(region);
    for (const [key, seg] of Object.entries(segments)) {
      fs.writeFileSync(path.join(OUT, key + '.json'), JSON.stringify(seg));
      console.log(`  ${key}: ${Object.keys(seg.items).length} items from ${seg.realms.join(', ')}`);
      files++;
    }
  }
  console.log(`Wrote ${files} segment files to ${path.relative(process.cwd(), OUT) || OUT}`);
  if (!files) process.exit(1); // no data at all usually means a wrong AH_NAMESPACE
})().catch((e) => { console.error(e.message); process.exit(1); });
