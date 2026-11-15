# Dungeon loot research: first 5 WoW Forever dungeons

Raw research data for building item and dungeon pages. Nothing here is rendered by the site.

## Which game, and which five dungeons

The wiki targets **WoW Forever**, Blizzard's "Classic+" game. It was announced at BlizzCon 2026 and launched on 4-5 Nov 2026. The repo points at it: `site/w/Hammer_of_Divine_Might.html` links to
`wowhead.com/forever/...`. Forever rebuilds loot, adds new dungeons and changes item stats. Classic data is therefore **not**
reliable, and every item here was checked against Wowhead's Forever database.

Forever's dungeon list (Warcraft Tavern; pcgames.de 2026-11-04 agrees) gives a different first five than the classic
RFC/WC/DM/SFK/BFD order. We followed Forever:

| # | File | Dungeon | Rec. level | Zone | New in Forever |
|---|------|---------|-----------|------|----------------|
| 1 | `ragefire-chasm.json` | Ragefire Chasm | 13-18 | Orgrimmar | no |
| 2 | `hall-of-thanes.json` | Hall of Thanes | 13-20 | beneath Ironforge | **yes** |
| 3 | `ruins-of-lordaeron.json` | Ruins of Lordaeron | 15-22 | Tirisfal Glades | **yes** |
| 4 | `wailing-caverns.json` | Wailing Caverns | 15-24 | The Barrens | no |
| 5 | `the-deadmines.json` | The Deadmines | 17-26 | Westfall | no |

Shadowfang Keep (20-30) and Blackfathom Deeps (24-32) come 6th and 7th, so they were **not** researched.

## Counts

| Dungeon | Bosses/rares | Items | Gear | Quest items | No ID | No drop rate | Quest rewards (separate) |
|---|---|---|---|---|---|---|---|
| Ragefire Chasm | 4 | 13 | 12 | 1 | 0 | 0 | 10 (names only) |
| Hall of Thanes | 4 | 12 | 12 | 0 | 0 | 0 | 5 entries (names only) |
| Ruins of Lordaeron | 7 | 26 | 23 | 3 | 0 | 5 | 10 (IDs from timesaver.gg, unverified) |
| Wailing Caverns | 11 | 31 | 31 | 0 | 0 | 0 | 11 |
| The Deadmines | 8 | 47 | 47 | 0 | 1 | 5 | 17 (IDs, unverified) |

## Sources

- **Authoritative for stats, sources and drop %:** the Wowhead Forever tooltip endpoint
  `https://nether.wowhead.com/forever/tooltip/item/<id>` and `https://www.wowhead.com/forever/item=<id>?xml`.
  Normal Wowhead pages render client-side, and their loot tables could not be read.
- **Loot lists, used to find items and cross-check:**
  [wowtbc.gg loot tables](https://wowtbc.gg/warcraftforever/loot-tables/dungeons/) and
  [timesaver.gg dungeon loot](https://timesaver.gg/tools/wow-forever/dungeon-loot/), which links Wowhead IDs.
- **Dungeon info:** [Warcraft Tavern](https://www.warcrafttavern.com/forever/guides/dungeons/), method.gg, kami-labs.fr,
  warcraft.wiki.gg, [pcgames.de](https://www.pcgames.de/World-of-Warcraft-Spiel-42971/Tipps/wow-forever-dungeons-1557420/).
- Each JSON file has its own `sources` and per-item `wowhead_url` / `other_sources`.

## Drop rates (important)

The wiki's rule is `~1/N` with `N = round(kills / drops)`. **No source gave kill or drop counts**: the tooltip only gives a
percentage, and the Wowhead pages that hold the counts are rendered client-side. So `kills`/`drops` are `null` everywhere, and
`drop_rate_display` is `round(100 / drop_chance_pct)`. Each item records how it was calculated in `drop_rate_basis`. Before
publishing, pull the real counts from the Wowhead item page in a browser if they are needed. Forever launched recently, so
sample sizes are small and the percentages will move.

## Conflicts and how they were resolved

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
- **Existing site page:** `site/w/Hammer_of_Divine_Might.html` shows 89-134 damage (53.1 DPS). The Forever tooltip
  for item 22333 says **66-99, 2.10 speed, 39.29 DPS**, plus +21 Stamina, +26 Intellect, +135 healing / +45 spell damage,
  BoP, and a 6g 85s 50c sell price. It drops from Kormok at 32.20% (~1/3). The page was not changed.

## Gaps

- Boss **levels** come from guides only. Hall of Thanes and Ruins of Lordaeron have **no levels and no NPC IDs** at all.
  Most NPC IDs are null or are unverified classic IDs, because Wowhead NPC pages could not be read.
- Ruins of Lordaeron: the Rotmender's Raiment trash pieces (Garb, Gloves, Sash), Sword of the Fallen and Death Bindings are
  verified items (IDs 286977-286981, BoE) but have **no drop source or %** on Wowhead yet. Timesaver says the Garb drops from
  Witherfang (unconfirmed). Blueprint: Fermenter and Blueprint: Arcane Salvager (Rath'mael, per Kami-Labs) were not found.
- Deadmines: 4 trash BoEs (Blackwater Cutlass, Silk-threaded Trousers, Blackened Defias Leggings, Blackened Defias Gloves)
  have no drop source or % on Wowhead.
- Deadmines: First Mate Band is half of the "Partners in Crime" set. The other ring, Band of the Better Half, was not researched.
- Wailing Caverns: In Nightmares rewards (Talbar Mantle, Quagmire Galoshes) have no IDs. A Forever-only Druid serpent
  set bonus is mentioned by Warcraft Tavern but was not researched.
- Quest rewards are secondary data: names and quest mapping only, and mostly not checked against tooltips.
- Trash coverage: the Deadmines and Wailing Caverns trash lists combine classic item IDs confirmed on Forever tooltips
  with the loot-site lists. Forever-only trash drops that neither site lists may still be missing.
- No sell price was given for some quest items. Sell prices are written as `Xg Ys Zc` strings.

## JSON shape

Top level: `dungeon, order, game_version, level_range, recommended_level_range, min_level, zone, location, new_in_forever,
bosses[], items[], quest_rewards[], conflicts[], gaps[], sources[]`, plus an optional `notes_orchestrator`.

Each item has: `name, item_id, quality` (lowercase), `slot, type, item_level, required_level, binding, weapon{damage_min,
damage_max,speed,dps}|null, armor, stats[], sell_price, source, source_type` (boss|rare|trash|quest_item), `drop_chance_pct,
kills, drops, drop_rate_display, drop_rate_basis, wowhead_url, other_sources[], notes`. Some items also have a `set` object.
Unknown values are `null`.
