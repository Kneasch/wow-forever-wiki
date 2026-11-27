# Professions: research and implementation plan

How the wiki will cover every WoW Forever profession: the three gathering, six production and three secondary professions.
Mining is built in the same PR as this plan, as the worked example. Everything below about Mining describes what exists now.
Everything about the other professions is the plan.

Research was done in November 2026, about three weeks after launch, mostly against the Wowhead Forever tooltip API.
Claims taken only from fan guides are marked *(guides)*. They should be confirmed on Wowhead before they go on a page.

## 1. What Forever changes about professions

Forever keeps the Classic structure. There are four ranks (Apprentice 75, Journeyman 150, Expert 225, Artisan 300), and the
Forever spell tooltips still give 300 as the cap. It adds five systems on top. All of them were confirmed on Wowhead unless marked.

| System | What it is | Evidence |
|---|---|---|
| **Camp features** | Placeable objects for a campsite, one or more per profession. Each needs a Campfire nearby, and all of them share a 1 hour cooldown. Most are learned from blueprints that drop from dungeon bosses. | 26 `Blueprint:` items, 273085-273141, plus the placed items (e.g. Rock Garden 279948, Lodestone 279960). Table below. |
| **Scarce materials** | One rare material per gathering profession at item levels 25, 45 and 60, flagged "Scarce" on the tooltip. | Mining: Pyrite 249391, Bauxite 249425, Pitchblende 249426. Herbalism: Frilled Lichen 249399, Rosecap 249424, Stranglevine 249274. Skinning: Pristine Leather 249427, Pristine Hide 249428, Pristine Scale 249429. Which profession each belongs to is inferred from the name. |
| **New level 60 materials and recipes** | Heavy Thorium Ore/Bar, Azerothium Bar, Legionite Bar (alchemy transmute), Fel Crystal, Torbernite, Demonsage, Death Lotus, Marefoil, Fel Hide, Fel Leather, Thick Logs, Malleable Essence of Nature, six boss-dropped catalysts (Golem Heart, Maker's Spark, and others). There are new recipe items for every crafting profession. | Items 248815-252948 and 272941-274030. The 248000-290500 scan found these recipe items: Leatherworking 280, Blacksmithing 199, Tailoring 186, Engineering 76, Enchanting 69, Alchemy 57, Cooking 36, First Aid 9. |
| **Crafting and delivery orders** | *Craftsman's Writ* items start a crafting order quest (45 Journeyman, 60 Expert and 45 Artisan writs found). *Waylaid Crate* items are filled with bundles of gathered materials, e.g. "20 Copper Ore or 20 Tin Ore" (31 crates). | Items 248682-248697 and 264040-264157. |
| **Herb seeds** | Commonplace, Uncommon, Unusual and Scarce Herb Seeds (268415-268418). They are grown in the Greenhouse and combined in the Seed Hybridizer. | Items on Wowhead; how growing works is *(guides)*. |

Also seen, still to be explained: gathering-skill glove enchants marked "PTR Only" (Enchant Gloves - Mining 273493,
Advanced Mining 273524); an enchant that gives a chance of Death Lotus when gathering (Lotus Claw 274426); "Level N Mining Supplies"
and "Level N Herbalism Supplies" boxes (274684-274692, probably boost-character kits); new starter-zone nodes in Teldrassil,
Mulgore and Mount Hyjal. *(guides)*: a Legacy perk, Bountiful Harvest, raises gathering yields.

### Camp features (from the blueprint tooltips)

| Profession | Feature (skill) | Blueprint dropped by |
|---|---|---|
| Mining | Lodestone (20, not a blueprint); Rock Garden (140); Molten Foundry (300) | Relic Guardian (Excavation Site: Wetlands); Ambassador Flamelash (BRD) |
| Herbalism | Greenhouse (140); Seed Hybridizer (300) | Shadetooth; Tendris Warpwood |
| Skinning | Field Guide (140); Trapper's Workbench (300) | Lady Anacondra; not listed |
| Alchemy | Fermenter (140); Alchemy Laboratory (300) | Rath'mael; Ras Frostwhisper |
| Blacksmithing | Anvil (140); Master Forge (300) | Gilnid; Golem Lord Argelmach |
| Enchanting | Arcane Salvager (140); Arcane Forge (300) | not listed; Nanaya |
| Engineering | Repair Bot (140); Anarchist's Workbench (300) | Sneed; Ezra Grimm |
| Leatherworking | Tanning Rack (125); Sewing Machine (300) | Razorclaw the Butcher; Vectus |
| Tailoring | Spinning Wheel (140); Loom (300) | Unstable Sentinel; Baroness Anastari |
| Cooking | Journeyman Campfire (90); Cookie's Feast (140); Expert Campfire (200); Iron Oven (300) | Lord Serpentis; Cookie; Slavecrusher Grox; Quartermaster Zigris |
| First Aid | Toxin Study (140); Plague Doctor's Laboratory (300) | Commander Springvale; Doctor Theolen Krastinov |
| Fishing | Fishing Rack (140); Fishing Hut (300) | Gelihast; Jammal'an the Prophet |

Each level 300 feature is paired with a boss-dropped catalyst of the same boss (e.g. Golem Heart from Golem Lord Argelmach,
Bottled Screams from Baroness Anastari), which suggests the top recipes need both. Confirm when researching each profession.

## 2. Sources and method

**Primary: the Wowhead Forever tooltip API** (`https://nether.wowhead.com/forever/tooltip/<item|object|spell|zone>/<id>`).
The dungeon research already uses it. It is the only Wowhead endpoint that can be read without a browser. What it gives:

| Type | Gives | Does not give |
|---|---|---|
| `object` (node, fishing pool, chest) | name, "Mining Node"/"Herb", required skill, **one** zone and its spawn coordinates | other zones, contents |
| `item` | name, quality, icon, item level, sell price, stack, "Scarce", "Requires <Profession> (N)", one "Dropped by" + %, embedded recipe output and reagents for recipe items | vendors, quest sources, full drop lists |
| `spell` | reagents with counts, created item and count, tool or forge note | skill required, trainer, skill-up colours |
| `zone` | name, level range | |

**There is no search,** so new things are found by reading ranges of IDs. Done so far: items 248000-290500 (all of them);
objects sampled every 40 IDs over 600000-720000, then read in full over 650000-662000. Forever objects look to sit between
about 610000 and 705000. `scripts/fetch-professions.js` handles refreshing; range scans are a one-off research step.
Be polite: at most 6 requests at a time.

**Secondary: fan guides,** only for what Wowhead cannot give (routes, trainer names, skill levels of new recipes). From this
environment they were readable only as search snippets. Guides seen: Wowhead's Forever profession guides, Warcraft Tavern,
Icy Veins, wow-professions.com, timesaver.gg, kami-labs.fr, method.gg. They disagree in places, e.g. the spelling of the
Zephras Isle mining trainer's name, and many were written during the beta.

**Needs a browser (or a person):** full zone lists and node contents (Wowhead object pages); trainer locations and costs;
vendor-sold recipes; which nodes drop which gems; skill levels for recipes. Plan a manual pass for these per profession,
recorded in each file's `gaps[]`.

**Network:** the session environment must allow `nether.wowhead.com` (data) and `wow.zamimg.com` (icons). Node's built-in
`fetch` needs `NODE_USE_ENV_PROXY=1` behind the proxy.

## 3. Architecture

Profession data and pages are kept apart from the dungeon pipeline. The two only share `research/icons.json`,
`site/assets/icons/` and the slug rules.

```
research/professions/index.json        hub: all 12 professions, kind, summary, camp features, which have a file
research/professions/<profession>.json one per profession (see research/professions/README.md for the shape)
scripts/fetch-professions.js           refreshes tooltip-backed fields, downloads icons
src/data/professions.js                Professions hub + every profession's pages, as page models for Vue
```

Page types (all titles go through `slug()`, so file names are portable):

| Page | Example | Used by |
|---|---|---|
| Hub | Professions | all |
| Profession | Mining | all |
| Node or source | Copper Vein, Peacebloom, Firefin Snapper School | Mining, Herbalism, Fishing |
| Material item | Copper Ore, Copper Bar, Light Leather | gathering professions, plus Tailoring cloth, Enchanting dust and the like |
| Recipe list section | Smelting on the Mining page | every profession |
| Camp feature section | on each profession page | every profession |

Shared rendering already in `src/data/professions.js` and the Vue components: infobox, TOC, tables, skill-up colour bar (orange/yellow/green/grey), spawn
maps (the zone's Forever map with a pin per spawn point, from `src/lib/maps.js`; see [research/maps](../research/maps/README.md)), material item pages with "gathered from / created by / used in" sections,
and the camp features table.

### Decision needed before the production professions: one item registry

Recipe items (`Plans:`, `Pattern:` and so on) and crafted gear will often already have pages from the dungeon generator. For
example, "Pattern: Big Bag of Enchantment" is a dungeon drop, and many new Forever plans drop from dungeon bosses. Today
the build refuses to write a page whose title is also a dungeon item. That is fine for Mining, which has no overlaps, but
production professions will overlap constantly.

Recommendation: before Phase 3, add a single item index (`research/items/` or a build step) that both generators read. An
item page would then render every source it has: dungeon drops, recipe sources, "created by" and "used in". `src/data/dungeons.js`
already merges sources across dungeon files the same way, and that pattern extends naturally.

## 4. Per-profession plan

Each profession follows the Mining pattern: a research file, a fetch pass, hand-written fields with a `basis`, then
generation. "Data in hand" means it was already pulled from the tooltip API during this research.

### Gathering

#### Mining (done in this PR, see §6)

#### Herbalism

- **Pages:** Herbalism; one per herb node (most share their name with the herb item, so a single page covers both: "Peacebloom"
  is the node and the item); Greenhouse and Seed Hybridizer; seed items; scarce herbs.
- **Data in hand:** every Classic herb node's object ID, skill and main zone on Forever. Forever moves several herbs to new
  zones (Zephras Isle, Riverglades):

  | Skill | Herb (object ID, main zone with spawn points) |
  |---|---|
  | 1 | Peacebloom (1618, Zephras Isle 304), Silverleaf (1617, Zephras Isle 267), **Wilted Peacebloom** (656160, Mulgore 81, new), **Stunted Silverleaf** (656161, Mulgore 82, new), **Hyjal Silphium** (654624, Mount Hyjal 18, new) |
  | 15-125 | Earthroot 15 (1619, Zephras Isle), Mageroyal 50 (1620, Redridge), Briarthorn 70 (1621, Redridge), Stranglekelp 85 (2045, Wetlands), Bruiseweed 100 (1622, Redridge), Wild Steelbloom 115 (1623, STV), Grave Moss 120 (1628, Desolace), Kingsblood 125 (1624, STV) |
  | 150-205 | Liferoot 150 (2041, Dustwallow), Fadeleaf 160 (2042, Dustwallow), Goldthorn 170 (2046, STV), Khadgar's Whisker 185 (2043, STV), Wintersbite 195 (2044, Alterac), Firebloom 205 (2866, Searing Gorge) |
  | 210-300 | Purple Lotus 210 (142140, Azshara), Arthas' Tears 220 (142141, EPL), Sungrass 230 (142142, Feralas), Blindweed 235 (142143, Swamp of Sorrows), Ghost Mushroom 245 (142144, Hinterlands), Gromsblood 250 (142145, Blasted Lands), Golden Sansam 260 (176583, Azshara), Dreamfoil 270 (176584, Azshara), Mountain Silversage 280 (176586, Winterspring), Plaguebloom 285 (176587, EPL), Icecap 290 (176588, Winterspring), Black Lotus 300 (176589, Burning Steppes) |

- **To find:** nodes for the level 60 herbs Demonsage (248821), Death Lotus (248822) and Marefoil (248823), and for Cleansed
  Felbloom (252948). Scan the rest of objects 610000-705000. Also needed: seed drop rules, Greenhouse growth (*(guides)*:
  grows herbs between sessions), the Seed Hybridizer tiers, and scarce herb sources.

#### Skinning

- **Pages:** Skinning; leather, hide and scale items (Light Leather to Rugged Leather; Fel Hide 248824 and Fel Leather 248825
  are new); scarce Pristine Leather, Hide and Scale; Field Guide and Trapper's Workbench.
- **Different from Mining:** there are no nodes. The source is skinnable creatures, with the skill needed set by creature
  level, as in Classic. There is no "skinned from" data on the tooltip API. Plan a table of skill brackets with
  recommended zones and beast families from guides, rather than per-mob pages.
- **To find:** which mobs give Fel Hide, how Pristine materials drop, and what the Trapper's Workbench does.

### Production

Shared shape: a profession page with training and specialisations; recipe tables by skill bracket, with reagents and result;
a recipe source column (trainer, vendor, drop, reputation, quest); camp features; and Forever's new recipes highlighted.
Recipe items get pages through the item registry (see the decision in §3).

Recipe skill levels are the hard part: neither the spell tooltip nor the result item gives them, but **recipe items do**
("Requires Blacksmithing (300)"). So for every recipe taught by an item, the item gives the skill. Trainer recipes need a
guide or a manual pass.

| Profession | Forever specifics found | Main research tasks |
|---|---|---|
| **Alchemy** | 57 new recipe items, including the Flasks of Natural Accuracy/Aggression/Precision/Swiftness (300) and Transmute Legionite (275: Heavy Thorium Bar + Fel Crystal). Fermenter, Alchemy Laboratory. | Transmute cooldowns; flask reagents (likely Marefoil, Demonsage, Death Lotus); Fermenter output |
| **Blacksmithing** | 199 recipe items: early chain/plate sets (Veteran's/Guard's/Protector's/Acolyte's/Crusader's, 45-125); Sterling Silver and Hard Gold sets; level 300 Heavy Thorium and Azerothium plate (Heavy Thorium Bar ×14-18, Legionite Bar, Malleable Essence of Nature); Guardians of Hyjal reputation plans. Anvil, Master Forge. | Whether Armorsmith/Weaponsmith specialisations still exist; Master Forge recipes; what Golem Heart is for |
| **Enchanting** | 69 formulas, including off-hand enchants and Guardians of Hyjal reputation formulas; gathering glove enchants (PTR only). Arcane Salvager, Arcane Forge. | Disenchant tables for new items (not on the tooltip API); what the Arcane Salvager does |
| **Engineering** | 76 schematics, including a new SAF-T / EZ-Thro component line (5-57) and the Swiftfeather Arrow / Swiftstrike Shot ammo (300). Repair Bot, Anarchist's Workbench. | Whether Gnomish/Goblin specialisations still exist; what the new components are used for |
| **Leatherworking** | 280 patterns, the most of any profession: reputation sets (Grovekeeper, Wildstalker, Spiritcaller, Grimstitch) and centaur patterns. Tanning Rack, Sewing Machine. | Elemental/Dragonscale/Tribal specialisations; Sewing Machine recipes |
| **Tailoring** | 186 patterns (Manaflare, Conviction, Demonheart sets; Eternity Cloth 274165). Spinning Wheel, Loom. | Cloth specialisations (Mooncloth and so on); the new dyes (Cerulean, Magenta, Viridian) |

### Secondary

| Profession | Pages | Forever specifics / tasks |
|---|---|---|
| **Cooking** | Cooking; recipe tables by skill; ingredients | 36 new recipes (e.g. Sweetpaw Jam, Barkskin Burrow reputation); new fruits (Shiny Green Apple to Hyjal Berries, item levels 5-55) and fruit pulps; four camp features, the most of any profession |
| **First Aid** | First Aid; bandage table | 9 new recipes; Toxin Study and Plague Doctor's Laboratory; check whether anti-venoms changed |
| **Fishing** | Fishing; fish items; pools as nodes (object tooltips give pool zones and coordinates like ore nodes) | New fish (e.g. Whimsyfin 251524, Seasonal Fish Steaks 273295); Fishing Rack and Fishing Hut; zone fishing skill requirements need a guide |

## 5. Phases

1. **This PR:** the plan; Professions hub (all 12 listed, Mining linked); Mining end to end (profession, 24 node pages,
   54 material pages); sidebar and main-page links; CI generates profession pages on every OS.
2. **Herbalism, then Skinning.** Herbalism reuses the Mining code almost unchanged. Skinning needs the "skill bracket by
   creature level" table instead of nodes. Finish the object scan of 610000-705000 first, to catch every new node.
3. **Item registry** (the decision in §3), then **Alchemy and Blacksmithing**. They consume the Phase 2 materials and have
   the clearest Forever additions.
4. **Remaining production professions:** Tailoring, Leatherworking, Engineering, Enchanting.
5. **Secondary professions:** Fishing (pools reuse the node code), Cooking, First Aid.
6. **Cross-cutting:** a Camp features page; crafting orders (Craftsman's Writs) and Waylaid Crates; leveling routes per
   profession. (Zone map images are done: every zone, including Forever's new ones, comes from the Forever client data. Pin
   types for herbs, fishing pools, skinnable creatures and treasure are ready for those professions' node data.)

Each phase updates `index.json` (`file` set) so the hub links the new profession, and records its `sources`, `conflicts` and
`gaps` in its file.

## 6. The Mining example in this PR

- `research/professions/mining.json`: 34 node objects (24 distinct nodes, including the new Chunk of Amber and Large Chunk of
  Amber in Teldrassil); 54 materials (ores, stones, gems, bars and the pick, including new Heavy Thorium Ore and Bar,
  Azerothium Bar, Legionite Bar and the scarce Pyrite, Bauxite and Pitchblende); 12 smelting recipes with reagents from Wowhead;
  2 Forever smelting recipes from guides that are not on Wowhead yet; 3 camp features with costs and blueprint drops; sources,
  conflicts and gaps.
- Pages: Mining, one per node (skill colours, zones, spawn maps), one per material (gathered from, created by, used in), and the
  Professions hub.
- Known weak points, all also listed on the Mining page under "Research notes":
  - node contents are Classic and gems are missing;
  - smelting skill levels are Classic;
  - zones are each object's main zone only;
  - trainers and training costs are not covered;
  - the Smelt Azerothium and Smelt Heavy Thorium skill levels are from guides.
