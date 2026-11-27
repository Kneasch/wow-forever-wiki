#!/usr/bin/env python3
"""Fetch WoW Forever zone maps from the game client data on wago.tools.

Usage:  python3 scripts/fetch-maps.py                 (latest Forever build, every zone)
        python3 scripts/fetch-maps.py --build 1.60.1.71139
        python3 scripts/fetch-maps.py --only 12,16593 (area IDs)
        python3 scripts/fetch-maps.py --data-only     (rewrite zones.json, keep the images)
Needs Python 3.9+ and Pillow (pip install Pillow), which decodes the client's BLP textures.

Writes
  research/maps/zones.json        every zone, continent and battleground map: area ID, UiMap ID, name,
                                  parent, size, image path, and whether it is new in Forever
  site/assets/maps/<area>.webp    the zone's world map, stitched from its 256px tiles

Why wago.tools and not Wowhead: Wowhead's map images (wow.zamimg.com/images/wow/classic/maps/...) are the
Classic Era art, and Forever has redrawn some zones and added new ones (Zephras Isle, Riverglades, ...).
wago.tools serves the Forever client's own tables and textures (product "wowf"). Wowhead's object
tooltips give node coordinates as percentages of these same maps, keyed by the same area ID
(tooltip `map.zone`), so the two line up without any conversion.

Tables used (https://wago.tools/db2/<table>?build=<build>):
  UiMap               map ID, name, parent map, type (2 continent, 3 zone, 6 battleground)
  UiMapAssignment     which area ID a map shows (AreaID), and the map's bounds
  UiMapXMapArt        map -> art
  UiMapArt            art -> art style
  UiMapArtStyleLayer  art style -> full size (e.g. 1002x668) and tile size (256)
  UiMapArtTile        art -> tile grid of BLP FileDataIDs
  WorldMapOverlay     the "explored area" pieces drawn over the base art (towns, roads, forests), and where
  WorldMapOverlayTile overlay -> tile grid of BLP FileDataIDs
The base art alone looks like an unexplored map, so every overlay without a player condition is drawn on
top, giving the fully explored map that players (and Wowhead) see.
"""
import argparse
import csv
import io
import json
import os
import sys
import time
import urllib.request
from concurrent.futures import ThreadPoolExecutor

try:
    from PIL import Image
except ImportError:
    sys.exit('Pillow is needed to decode BLP textures: pip install Pillow')

ROOT = os.path.join(os.path.dirname(os.path.abspath(__file__)), '..')
DATA = os.path.join(ROOT, 'research', 'maps', 'zones.json')
IMG_DIR = os.path.join(ROOT, 'site', 'assets', 'maps')
WAGO = 'https://wago.tools'
# wago.tools refuses Python's default User-Agent
HEADERS = {'User-Agent': 'wow-forever-wiki-map-fetcher/1.0'}
# Map types to keep: continents, zones and battlegrounds. Dungeons have no UiMap in the Forever client yet.
KEEP_TYPES = {2: 'continent', 3: 'zone', 6: 'battleground'}
WEBP_QUALITY = 82


def get(url, binary=False):
    for attempt in range(1, 4):
        try:
            with urllib.request.urlopen(urllib.request.Request(url, headers=HEADERS), timeout=60) as r:
                body = r.read()
                return body if binary else body.decode('utf-8')
        except Exception as e:  # network errors and 5xx: retry, then give up loudly
            if attempt == 3:
                raise RuntimeError(f'{url}: {e}') from e
            time.sleep(attempt)


def table(name, build):
    return list(csv.DictReader(io.StringIO(get(f'{WAGO}/db2/{name}/csv?build={build}'))))


def latest_build(product):
    builds = json.loads(get(f'{WAGO}/api/builds'))[product]
    return builds[0]['version']


OVERLAY_TILE = 256  # overlay textures are always cut into 256px tiles


def tile_image(fdid, build):
    blp = get(f'{WAGO}/api/casc/{fdid}?download&version={build}', binary=True)
    return Image.open(io.BytesIO(blp)).convert('RGBA')


def stitch(tiles, size, tile_size, build):
    """tiles: [(row, col, fdid)] -> one RGBA image cropped to size (tiles past the edge are padding)."""
    rows = max(t[0] for t in tiles) + 1
    cols = max(t[1] for t in tiles) + 1
    canvas = Image.new('RGBA', (cols * tile_size[0], rows * tile_size[1]), (0, 0, 0, 0))
    with ThreadPoolExecutor(6) as pool:
        for (row, col, _), img in pool.map(lambda t: (t, tile_image(t[2], build)), tiles):
            canvas.paste(img, (col * tile_size[0], row * tile_size[1]))
    return canvas.crop((0, 0, size[0], size[1]))


def render(zone, build):
    base = stitch(zone['_tiles'], (zone['width'], zone['height']), zone['_tile_size'], build)
    for o in zone['_overlays']:
        piece = stitch(o['tiles'], (o['w'], o['h']), (OVERLAY_TILE, OVERLAY_TILE), build)
        base.alpha_composite(piece, (o['x'], o['y']))
    return base.convert('RGB')


def main():
    ap = argparse.ArgumentParser(description=__doc__.split('\n')[0])
    ap.add_argument('--build', help='Forever client build (default: latest on wago.tools)')
    ap.add_argument('--only', help='comma-separated area IDs to (re)fetch images for')
    ap.add_argument('--data-only', action='store_true', help='write zones.json without downloading images')
    args = ap.parse_args()

    build = args.build or latest_build('wowf')
    classic = latest_build('wow_classic_era')
    print(f'Forever build {build} (Classic Era {classic} for the "new in Forever" check)')

    ui_maps = {int(r['ID']): r for r in table('UiMap', build)}
    classic_ids = {int(r['ID']) for r in table('UiMap', classic)}
    assign = {}
    for r in table('UiMapAssignment', build):
        assign.setdefault(int(r['UiMapID']), []).append(r)
    map_art = {int(r['UiMapID']): int(r['UiMapArtID']) for r in table('UiMapXMapArt', build) if r['PhaseID'] == '0'}
    art_style = {int(r['ID']): int(r['UiMapArtStyleID']) for r in table('UiMapArt', build)}
    style = {}
    for r in table('UiMapArtStyleLayer', build):
        if r['LayerIndex'] == '0':
            style[int(r['UiMapArtStyleID'])] = r
    tiles = {}
    for r in table('UiMapArtTile', build):
        if r['LayerIndex'] == '0':
            tiles.setdefault(int(r['UiMapArtID']), []).append((int(r['RowIndex']), int(r['ColIndex']), int(r['FileDataID'])))

    overlays = {}
    skipped_conditional = 0
    for r in table('WorldMapOverlay', build):
        if r['PlayerConditionID'] != '0':
            skipped_conditional += 1
            continue
        overlays[int(r['ID'])] = {'art': int(r['UiMapArtID']), 'w': int(r['TextureWidth']), 'h': int(r['TextureHeight']),
                                  'x': int(r['OffsetX']), 'y': int(r['OffsetY']), 'tiles': []}
    for r in table('WorldMapOverlayTile', build):
        o = overlays.get(int(r['WorldMapOverlayID']))
        if o and r['LayerIndex'] == '0':
            o['tiles'].append((int(r['RowIndex']), int(r['ColIndex']), int(r['FileDataID'])))
    by_art = {}
    for o in overlays.values():
        if o['tiles']:
            by_art.setdefault(o['art'], []).append(o)
    if skipped_conditional:
        print(f'  {skipped_conditional} overlays need a player condition (phased content) and are left off')

    zones = []
    for mid, m in sorted(ui_maps.items()):
        kind = KEEP_TYPES.get(int(m['Type']))
        a = assign.get(mid, [])
        # Root-level duplicates (parent 0) are alternate copies of a continent or zone; the parented map is the real one.
        if not kind or not a or int(m['ParentUiMapID']) == 0:
            continue
        area = int(a[0]['AreaID'])
        if kind == 'continent':
            area = None
        art = map_art.get(mid)
        st = style.get(art_style.get(art))
        if not art or not st or art not in tiles:
            print(f'  {m["Name_lang"]} ({mid}): no map art, skipped')
            continue
        size = (int(st['LayerWidth']), int(st['LayerHeight']))
        key = str(area) if area is not None else f'map-{mid}'
        zones.append({
            'area_id': area,
            'ui_map_id': mid,
            'name': m['Name_lang'],
            'kind': kind,
            'parent_ui_map_id': int(m['ParentUiMapID']),
            'map_id': int(a[0]['MapID']),
            'width': size[0],
            'height': size[1],
            'image': f'/assets/maps/{key}.webp',
            'new_in_forever': mid not in classic_ids,
            '_tiles': tiles[art],
            '_tile_size': (int(st['TileWidth']), int(st['TileHeight'])),
            '_overlays': by_art.get(art, []),
        })

    names = {z['ui_map_id']: z['name'] for z in zones}
    for z in zones:
        z['parent'] = names.get(z['parent_ui_map_id'])

    if not args.data_only:
        os.makedirs(IMG_DIR, exist_ok=True)
        only = {int(x) for x in args.only.split(',')} if args.only else None
        for z in zones:
            if only and z['area_id'] not in only:
                continue
            out = os.path.join(ROOT, 'site', z['image'].lstrip('/'))
            img = render(z, build)
            img.save(out, 'WEBP', quality=WEBP_QUALITY, method=6)
            print(f'  {z["name"]}: {os.path.relpath(out, ROOT)} ({os.path.getsize(out) // 1024} KB)')

    for z in zones:
        del z['_tiles'], z['_tile_size'], z['_overlays']
        z['has_image'] = os.path.exists(os.path.join(ROOT, 'site', z['image'].lstrip('/')))
    os.makedirs(os.path.dirname(DATA), exist_ok=True)
    doc = {
        'source': 'WoW Forever client tables on wago.tools (UiMap, UiMapAssignment, UiMapXMapArt, UiMapArt, UiMapArtStyleLayer, UiMapArtTile)',
        'source_url': f'{WAGO}/db2/UiMap?build={build}',
        'build': build,
        'classic_era_build': classic,
        'coordinates': 'Zone maps cover their whole zone. Wowhead tooltip coordinates (0-100, x right, y down) are percentages of these images.',
        'fetched': time.strftime('%Y-%m-%d'),
        'zones': sorted(zones, key=lambda z: (z['kind'] != 'continent', z['name'])),
    }
    with open(DATA, 'w', encoding='utf-8', newline='\n') as f:
        json.dump(doc, f, indent=2, ensure_ascii=False)
        f.write('\n')
    print(f'Wrote {len(zones)} maps to {os.path.relpath(DATA, ROOT)}')


if __name__ == '__main__':
    main()
