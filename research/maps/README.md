# Zone maps

World map images for every WoW Forever zone, continent and battleground, and the pin system that marks spawn points on them.

| File | What it is |
|---|---|
| `zones.json` | One entry per map: `area_id`, `ui_map_id`, `name`, `kind` (zone, city, battleground or continent: a battleground is a map whose `Map.InstanceType` is 3, and a city is an area with the capital flag 0x100), `parent`, `map_id`, `width`, `height`, `image`, `new_in_forever`, `has_image`, `thumb`. |
| `../../site/assets/maps/thumb/<area id>.webp` | A 334px-wide thumbnail of each map, for the Zones page. `--data-only` remakes them from the full images. |
| `../../scripts/gen-zones.js` | Writes the [Zones](../../site/w/Zones.html) page: every map, grouped by continent, then cities, battlegrounds and continents. |
| `../../site/assets/maps/<area id>.webp` | The map, fully explored, 1002&times;668. Continents use `map-<ui map id>.webp`, since they have no area ID. |
| `../../scripts/fetch-maps.py` | Fetches both of the above. |
| `../../scripts/map.js` | `zoneMap({ zoneId, pins })`: the map with pins, as static HTML. |
| `../../site/assets/map-pins.svg` | The pin icons, one `<symbol>` per type. |

## Source

The images and sizes come from the **WoW Forever game client** (product `wowf`), read through
[wago.tools](https://wago.tools), which publishes the client's database tables and textures for every build. `zones.json`
records the build it came from.

Wowhead was the first choice but is not used for the images. Its map images (`wow.zamimg.com/images/wow/classic/maps/...`) are
the Classic Era art. Forever redraws some zones and adds new ones, and Wowhead has no images for those. The client is the
primary source for what players see in game.

How a map is put together (all tables at `https://wago.tools/db2/<table>?build=<build>`):

1. `UiMap` lists every map, with its name, parent and type. `UiMapAssignment` gives the area ID each map shows.
2. `UiMapXMapArt` → `UiMapArt` → `UiMapArtStyleLayer` give the art, its size (1002&times;668 for zones) and tile size (256).
3. `UiMapArtTile` gives the grid of BLP textures (FileDataIDs) for the base art. They are downloaded from
   `https://wago.tools/api/casc/<id>?download&version=<build>`, decoded with Pillow and stitched together.
4. The base art looks like an unexplored map, so the "explored" overlays from `WorldMapOverlay` / `WorldMapOverlayTile`
   (towns, roads, forests) are drawn on top. Overlays behind a player condition (phased content) are left off.

`new_in_forever` means the map ID is not in the latest Classic Era client. These are Mount Hyjal, Zephras Isle, Darkspear
Islands, Riverglades and Shen'dralas.

## Coordinates

The area ID is the zone ID that Wowhead object tooltips give (`map.zone`), stored as `zone_id` in the profession research.
Wowhead's coordinates are percentages (0-100, x to the right, y down) of these same zone maps. A pin goes at
`x / 100 * width, y / 100 * height`, with no other conversion. Checked against Goldshire in Elwynn Forest: Wowhead gives about
(42.1, 65.9), and the Goldshire label on the stitched map is at about (42%, 67%).

Dungeons and raids have no world map in the Forever client yet. `zoneMap()` falls back to a 0-100 grid for them, and for any
zone without an image.

## Pins

`zoneMap({ zoneId, zoneName?, pins: [{ x, y, type, label?, href? }], caption?, dense? })` returns a `<figure>`:

- The map `<img>` with an SVG layer of pins on top. Pins scale with the image, and each has a hover title with its label and
  coordinates. A pin with an `href` is a link.
- Above 60 pins it draws small dots instead of pin icons, so dense zones stay readable. `dense` overrides this.
- A legend lists each pin type on the map with its count. With more than one type, each entry has a checkbox that hides that
  type. The checkboxes work in CSS (`:has()`), with no JavaScript.

Pin types, which are the same names as the professions:

| Type | Icon | Colour (`wiki.css`) | For |
|---|---|---|---|
| `mining` | pickaxe | `--pin-mining` orange | mining nodes |
| `herbalism` | leaf | `--pin-herbalism` green | herbs |
| `fishing` | fish | `--pin-fishing` blue | fishing pools and schools |
| `skinning` | paw | `--pin-skinning` rose | skinnable creature spawns |
| `treasure` | chest | `--pin-treasure` gold | chests and other lootable objects |
| `other` | dot | `--pin-other` purple | anything else |

To add a type, add a `<symbol id="pin-<type>">` to `map-pins.svg`, a colour, a class and a legend rule to `wiki.css`, and an
entry to `PIN_TYPES` in `map.js`. `gen-profession.js` picks the type from the profession name, so Herbalism and Fishing
research files get the right pins with no changes.

The sprite is loaded by URL (`<use href="/assets/map-pins.svg#pin-mining">`). Keep it valid XML: a `--` inside an XML comment
breaks the whole file, and then every pin disappears.

## Commands

```bash
pip install Pillow                                  # once; decodes the client's BLP textures
python3 scripts/fetch-maps.py                       # latest Forever build, every map (a minute or two)
python3 scripts/fetch-maps.py --only 12,map-1414    # just these maps (area ID, or map-<id> for a continent)
python3 scripts/fetch-maps.py --data-only           # rewrite zones.json, keep the images
python3 scripts/fetch-maps.py --build 1.60.1.71139  # a specific build
```

The session environment must allow `wago.tools`. The images add about 9 MB to the repo, about 160 KB per map.
