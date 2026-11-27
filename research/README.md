# Dungeon loot research: all 35 WoW Forever dungeons

Raw research data for building item and dungeon pages. The site does not serve these files directly.
`src/data/dungeons.js` turns them into pages (see [Generating pages](#generating-pages)).

## Which game, and which dungeons

The wiki targets **WoW Forever**, Blizzard's "Classic+" game. It was announced at BlizzCon 2026 and launched on 4-5 Nov 2026.
Forever rebuilds loot, adds new dungeons and changes item stats. Classic data is therefore **not** reliable, and every item here
was checked against Wowhead's Forever data.

The dungeon list and order come from [Warcraft Tavern](https://www.warcrafttavern.com/forever/guides/dungeons/) (pcgames.de
2026-11-04 agrees). Forever has 35 dungeons, 9 of them new. `order` in each file is the position in that list.

| # | File | Dungeon | Level | Zone | New |
|---|------|---------|-------|------|-----|
| 1 | `ragefire-chasm.json` | Ragefire Chasm | 13-18 | Orgrimmar | |
| 2 | `hall-of-thanes.json` | Hall of Thanes | 13-20 | beneath Ironforge | **yes** |
| 3 | `ruins-of-lordaeron.json` | Ruins of Lordaeron | 15-22 | Tirisfal Glades | **yes** |
| 4 | `wailing-caverns.json` | Wailing Caverns | 15-24 | The Barrens | |
| 5 | `the-deadmines.json` | The Deadmines | 17-26 | Westfall | |
| 6 | `shadowfang-keep.json` | Shadowfang Keep | 20-30 | Silverpine Forest | |
| 7 | `blackfathom-deeps.json` | Blackfathom Deeps | 24-32 | Ashenvale | |
| 8 | `the-stockade.json` | The Stockade | 25-29 | Stormwind City | |
| 9 | `excavation-site-wetlands.json` | Excavation Site: Wetlands | 26-33 | Wetlands | **yes** |
| 10 | `city-of-dalaran.json` | City of Dalaran | 28-35 | Alterac Mountains | **yes** |
| 11 | `razorfen-kraul.json` | Razorfen Kraul | 29-38 | The Barrens | |
| 12 | `gnomeregan.json` | Gnomeregan | 29-38 | Dun Morogh | |
| 13 | `scarlet-monastery-graveyard.json` | Scarlet Monastery Graveyard | 30-38 | Tirisfal Glades | |
| 14 | `scarlet-monastery-library.json` | Scarlet Monastery Library | 33-41 | Tirisfal Glades | |
| 15 | `the-drowned-city.json` | The Drowned City | 35-42 | Stranglethorn Vale | **yes** |
| 16 | `scarlet-monastery-armory.json` | Scarlet Monastery Armory | 36-44 | Tirisfal Glades | |
| 17 | `razorfen-downs.json` | Razorfen Downs | 37-46 | The Barrens | |
| 18 | `scarlet-monastery-cathedral.json` | Scarlet Monastery Cathedral | 38-46 | Tirisfal Glades | |
| 19 | `krol-dok-stronghold.json` | Krol'Dok Stronghold | 40-47 | Riverglades | **yes** |
| 20 | `uldaman.json` | Uldaman | 41-51 | Badlands | |
| 21 | `zul-farrak.json` | Zul'Farrak | 44-54 | Tanaris | |
| 22 | `maraudon.json` | Maraudon | 46-55 | Desolace | |
| 23 | `alcaz-island-prison.json` | Alcaz Island Prison | 48-55 | Dustwallow Marsh | **yes** |
| 24 | `sunken-temple.json` | Sunken Temple | 50-60 | Swamp of Sorrows | |
| 25 | `blackrock-depths.json` | Blackrock Depths | 52-60 | Blackrock Mountain | |
| 26 | `dire-maul-east.json` | Dire Maul (East) | 54-60 | Feralas | |
| 27 | `lower-blackrock-spire.json` | Lower Blackrock Spire | 55-60 | Blackrock Mountain | |
| 28 | `blackmaw-hold.json` | Blackmaw Hold | 55-60 | Azshara | **yes** |
| 29 | `dire-maul-west.json` | Dire Maul (West) | 56-60 | Feralas | |
| 30 | `dire-maul-north.json` | Dire Maul (North) | 56-60 | Feralas | |
| 31 | `shapers-terrace.json` | Shaper's Terrace | 58-60 | Un'Goro Crater | **yes** |
| 32 | `stratholme-main-gate.json` | Stratholme (Main Gate) | 58-60 | Eastern Plaguelands | |
| 33 | `stratholme-service-gate.json` | Stratholme (Service Gate) | 58-60 | Eastern Plaguelands | |
| 34 | `scholomance.json` | Scholomance | 58-60 | Western Plaguelands | |
| 35 | `upper-blackrock-spire.json` | Upper Blackrock Spire | 59-60 | Blackrock Mountain | |

## Counts

"Bosses" includes rares. "No ID" items are `item_id: null` stubs. "No name" items are IDs that Wowhead does not recognise;
the generator skips them. "No drop %" means `drop_chance_pct` is null, usually trash or world-drop BoEs.

| Dungeon | Bosses | Items | No ID | No name | No drop % | Quest rewards |
|---|---|---|---|---|---|---|
| Ragefire Chasm | 4 | 13 | 0 | 0 | 0 | 10 |
| Hall of Thanes | 4 | 12 | 0 | 0 | 0 | 5 |
| Ruins of Lordaeron | 7 | 26 | 0 | 0 | 5 | 10 |
| Wailing Caverns | 11 | 31 | 0 | 0 | 0 | 11 |
| The Deadmines | 8 | 47 | 1 | 0 | 4 | 17 |
| Shadowfang Keep | 10 | 50 | 0 | 2 | 26 | 10 |
| Blackfathom Deeps | 7 | 33 | 0 | 0 | 12 | 18 |
| The Stockade | 6 | 21 | 0 | 0 | 2 | 9 |
| Excavation Site: Wetlands | 3 | 9 | 0 | 0 | 0 | 16 |
| City of Dalaran | 8 | 24 | 0 | 0 | 0 | 18 |
| Razorfen Kraul | 8 | 35 | 0 | 0 | 10 | 19 |
| Gnomeregan | 6 | 42 | 0 | 0 | 23 | 14 |
| SM Graveyard | 6 | 45 | 0 | 2 | 27 | 6 |
| SM Library | 2 | 37 | 0 | 0 | 25 | 4 |
| The Drowned City | 9 | 23 | 0 | 0 | 1 | 10 |
| SM Armory | 1 | 31 | 2 | 0 | 25 | 4 |
| Razorfen Downs | 8 | 32 | 0 | 0 | 11 | 8 |
| SM Cathedral | 3 | 39 | 2 | 0 | 28 | 4 |
| Krol'Dok Stronghold | 6 | 29 | 1 | 0 | 10 | 0 |
| Uldaman | 10 | 63 | 1 | 0 | 31 | 15 |
| Zul'Farrak | 13 | 64 | 2 | 0 | 25 | 6 |
| Maraudon | 9 | 48 | 0 | 0 | 13 | 13 |
| Alcaz Island Prison | 5 | 24 | 0 | 0 | 8 | 9 |
| Sunken Temple | 7 | 65 | 1 | 0 | 46 | 8 |
| Blackrock Depths | 27 | 149 | 0 | 0 | 44 | 36 |
| Dire Maul (East) | 7 | 45 | 3 | 0 | 10 | 7 |
| Lower Blackrock Spire | 17 | 95 | 3 | 0 | 22 | 15 |
| Blackmaw Hold | 9 | 29 | 0 | 0 | 4 | 18 |
| Dire Maul (West) | 8 | 48 | 3 | 0 | 7 | 12 |
| Dire Maul (North) | 8 | 45 | 4 | 0 | 28 | 6 |
| Shaper's Terrace | 11 | 24 | 0 | 0 | 5 | 11 |
| Stratholme (Main Gate) | 12 | 91 | 2 | 0 | 29 | 4 |
| Stratholme (Service Gate) | 9 | 83 | 2 | 0 | 7 | 5 |
| Scholomance | 16 | 125 | 6 | 0 | 48 | 9 |
| Upper Blackrock Spire | 9 | 74 | 2 | 0 | 3 | 3 |

## Sources

- **Authoritative for stats, sources and drop %:** the Wowhead Forever tooltip endpoint
  `https://nether.wowhead.com/forever/tooltip/item/<id>`. Dungeons 1-5 also used `https://www.wowhead.com/forever/item=<id>?xml`,
  but that endpoint returned 403 by the time dungeons 6-35 were researched, so they rely on the tooltip only.
  Normal Wowhead pages render client-side, and their loot tables could not be read.
- **Loot lists, used to find items and cross-check:**
  [wowtbc.gg loot tables](https://wowtbc.gg/warcraftforever/loot-tables/dungeons/) and
  [timesaver.gg dungeon loot](https://timesaver.gg/tools/wow-forever/dungeon-loot/), which links Wowhead IDs.
- **Dungeon info:** [Warcraft Tavern](https://www.warcrafttavern.com/forever/guides/dungeons/), method.gg, kami-labs.fr,
  warcraft.wiki.gg, [pcgames.de](https://www.pcgames.de/World-of-Warcraft-Spiel-42971/Tipps/wow-forever-dungeons-1557420/).
- Each JSON file has its own `sources` and per-item `wowhead_url` / `other_sources`.

**Unverified IDs (dungeons 16-25):** where timesaver.gg had no link, item IDs were found by matching the wowtbc.gg name
exactly against tooltips (ids 5000-23000 and 270000-290500). Those matches were not cross-checked against a second site.
Krol'Dok Stronghold is not on timesaver.gg, so all of its IDs came this way.

## Drop rates (important)

The wiki's rule is `~1/N` with N to at most two decimal places: `N = kills / drops` when the counts are known, otherwise
`N = 100 / drop_chance_pct`. Pages work the rate out from those fields (`rateOf` in `src/data/dungeons.js`), so
`drop_rate_display` is only used when an item has neither, and older entries may still hold a rounded value there.

Counts are rare: the tooltip only gives a percentage, and the Wowhead pages that hold the counts are rendered client-side.
10 items have `kills`/`drops` from Wowhead's dropped-by tables (commit e82433f); everywhere else they are `null`. Each item
records how its rate was found in `drop_rate_basis`. Pull the real counts from the Wowhead item page in a browser if needed. Forever launched recently, so
sample sizes are small and the percentages will move.

Most items carried over from classic have no "Drop Chance" on the Forever tooltip. Their drop % is left null, not guessed.

## Conflicts and how they were resolved

Every file lists its own conflicts in `conflicts[]`. The ones that affect how pages read:

### Dungeons 1-5

- **Wailing Caverns:** wowtbc.gg lists 14 extra items (Searing Blade, Lead Band, Volcanic Rock Ring, Prospector's Woolies, etc.).
  timesaver.gg does not list them, and no Wowhead Forever tooltip ties them to WC. Most are classic world-drop BoE names, so
  they were **excluded**. All 28 boss/rare items we do list match timesaver.gg exactly.
- **Deadmines:** Viridian Band (Cookie) appears on wowtbc.gg only. Wowhead has two items with that name (6589, 11982), but
  neither shows a drop source, so it is kept as an `item_id: null` stub. Everything else matches timesaver.gg.
- **Ruins of Lordaeron:**
  - wowtbc.gg lists Haunting Blade and Phantom Armor under this dungeon. Haunting Blade is the classic Shadowfang Keep
    item (6641, req 22), so both were excluded.
  - Kami-Labs drop % differ from Wowhead's; Wowhead was used.
  - The level range is 15-22 in most sources and 15-20 in Icy Veins and Kami-Labs.
  - The entrance coordinates differ between sources.
- **Hall of Thanes:**
  - The level range is 13-20 per Warcraft Tavern and pcgames, and 13-18 per the Wowhead guide and the wiki.
  - The last boss is spelled Dirgehammer or Direhammer. Item tooltips use "Durgen Dirgehammer", but the loot is named "Direhammer Leggings".
- **Ragefire Chasm:** some classic-era sources say Bazzalan drops nothing; Forever gives him 3 drops.

### Dungeons 6-35

- **Shared trash lists.** wowtbc.gg repeats one trash list across several wings:
  - Scarlet Monastery: Graveyard and Library share one list, Armory and Cathedral another. The items are listed in every wing
    they appear under, so which wing drops them is unconfirmed.
  - Dire Maul: one identical 21-item "Trash" list under all three wings. It was **left out**; only trash tied to a named mob
    by timesaver.gg or the tooltip is placed in a wing.
  - Blackrock Spire: trash shared by Lower and Upper is kept under Lower only.
- **Wing assignments are judgment calls** in places: Dire Maul trash mobs, and Balzaphon, who is placed in Stratholme
  (Service Gate) with a flag. Stratholme Main Gate is the Living side and Service Gate the Undead side, per Warcraft Tavern.
- **Same item, different sources:** Ironhide Greaves (Alcaz Island Prison and Maraudon), Wildheart Gloves (Lower Blackrock
  Spire and Stratholme), Plague Defiled Buckler and Sacred Cloth Leggings (both Stratholme wings). Item pages list every source.
- **Shaper's Terrace:** the two loot sites put five items under different bosses (Bolt's Charged Eyeball, Crownroar
  Chestplate, Albinofur Grips, Heartflame Gauntlets, Sparklance Wand). timesaver.gg was kept where the tooltip has no source.
- **Shadowfang Keep:** Warcraft Tavern lists 9 bosses including a rare; wowtbc.gg lists 8 plus Sever and Deathsworn Captain.
  The level range is 22-30 on wowtbc.gg and 20-30 on Warcraft Tavern (Tavern used).
- **City of Dalaran:** Warcraft Tavern's text puts the sewer entrance in Silverpine Forest; its dungeon list says Alterac Mountains.
- **Names:** timesaver.gg calls Alcaz Island Prison "Alcaz Prison" and Sunken Temple "The Temple of Atal'Hakkar". Warcraft
  Tavern's Stratholme rare "Stonespire" is the loot sites' "Stonespine".
- **Sunken Temple:** no loot was found for Hazzas & Morphaz or the Avatar of Hakkar; timesaver.gg's "Shade of Hakkar" section
  is probably the Avatar.

## Gaps

- **Bosses:** levels come from guides only and are mostly null for dungeons 6-35. NPC IDs are null almost everywhere,
  because Wowhead NPC pages could not be read.
- **`min_level`** is null in 21 files. **The Stockade** has no `location` (the Warcraft Tavern guide URL returned 404).
- **Quest rewards** are secondary data: names and quest mapping only, mostly not checked against tooltips. The quest name is
  null for many rewards in dungeons 16-35; for Dire Maul and Stratholme, rewards were split between wings by best guess.
  Krol'Dok Stronghold quest rewards were not researched.
- **Trash coverage** is limited to what the loot sites list. Blackrock Depths trash is known to be incomplete. Forever-only
  trash drops that neither site lists may still be missing.
- **Set bonuses** are captured for Tier 0 and other set pieces in dungeons 26-35 (the item `set` object), not for dungeons 6-25.
- **Known data errors to fix:** "Pattern: Big Bag of Enchantment" is marked `source_type: quest_item`. Swampchill Fetish and Mark
  of Kern are empty stubs in the Armory and Cathedral files (the Graveyard and Library files have their IDs).
- Dungeons 1-5:
  - Ruins of Lordaeron: the Rotmender's Raiment trash pieces (Garb, Gloves, Sash), Sword of the Fallen and Death Bindings are
    verified items (IDs 286977-286981, BoE) but have **no drop source or %** on Wowhead yet. Timesaver says the Garb drops from
    Witherfang (unconfirmed). Blueprint: Fermenter and Blueprint: Arcane Salvager (Rath'mael, per Kami-Labs) were not found.
  - Deadmines: 3 trash BoEs (Silk-threaded Trousers, Blackened Defias Leggings, Blackened Defias Gloves) have no drop source
    or % on Wowhead. Blackwater Cutlass uses ForeverChanges' 6% (any enemy) instead.
  - Deadmines: First Mate Band is half of the "Partners in Crime" set. The other ring, Band of the Better Half, was not researched.
  - Wailing Caverns: In Nightmares rewards (Talbar Mantle, Quagmire Galoshes) have no IDs. A Forever-only Druid serpent
    set bonus is mentioned by Warcraft Tavern but was not researched.
- Sell prices are written as `Xg Ys Zc` strings; some quest items have none.

## JSON shape

Top level: `dungeon, order, game_version, level_range, recommended_level_range, min_level, zone, location, new_in_forever,
bosses[], items[], quest_rewards[], conflicts[], gaps[], sources[]`, plus an optional `notes_orchestrator`.

Each item has: `name, item_id, quality` (lowercase), `slot, type, item_level, required_level, binding, weapon{damage_min,
damage_max,speed,dps}|null, armor, stats[], sell_price, source, source_type` (boss|rare|trash|quest_item), `drop_chance_pct,
kills, drops, drop_rate_display, drop_rate_basis, wowhead_url, other_sources[], notes`. Some items also have a `set` object.
Trash items may also have `source_npc_id` and `source_level` (a number, or a range string such as `"17-18"`) from the NPC
tooltip, `https://nether.wowhead.com/forever/tooltip/npc/<id>`.
Unknown values are `null`.

`quest_rewards[]` comes in four shapes across the files (`{quest, items[]}`, `{quest, item}`, `{quest, name, item_id}`,
`{quest, rewards[], item_ids{}}`). The generator flattens them, and groups rewards with no known quest into one list.

## Generating pages

```bash
node scripts/fetch-icons.js   # icon names -> research/icons.json, images -> site/assets/icons/
npm run dev                   # see the pages live at http://localhost:8080 while editing research files
npm run build                 # every page of the wiki into dist/
```

Every `research/*.json` file except `icons.json` is a dungeon; adding a file adds its pages, and the main page's dungeon table
lists it by `order`.

Item icons come from the same Wowhead tooltip endpoint as the stats (its `icon` field). The images are downloaded from
Wowhead's icon CDN (56x56 JPG) and served locally. `fetch-icons.js` only fetches what is missing, so run it again after adding
a dungeon. Items with no `item_id` keep the placeholder icon.

The generator reads every research file on each run, so an item that drops in several dungeons gets one page listing all of
its sources, whichever dungeon is generated last.
