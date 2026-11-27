// Auction House prices on tradable item pages.
// On load, every [data-item-id] placeholder (.ah-price section, .ah-summary infobox cell) is filled
// with the price for the reader's region (NA/EU), ruleset (PvE/PvP/RP/RP-PvP) and faction.
// Prices come from <base>/data/ah/<region>-<ruleset>-<faction>.json, written by
// scripts/fetch-ah-prices.js or served live by server.js. The choice is saved in localStorage.
(function () {
  var REGIONS = { us: 'NA', eu: 'EU' };
  var RULESETS = { pve: 'Normal (PvE)', pvp: 'PvP', rp: 'RP', rppvp: 'RP-PvP' };
  var FACTIONS = { alliance: 'Alliance', horde: 'Horde' };
  var KEY = 'ah-segment';
  var DEFAULT = { region: 'us', ruleset: 'pve', faction: 'alliance' };

  // This script is at <base>/assets/ah-price.js; the build prefixes BASE_PATH on subpath hosts.
  var src = (document.currentScript && document.currentScript.src) || '';
  var base = src ? src.replace(/\/assets\/ah-price\.js(\?.*)?$/, '') : '';

  function load() {
    var s = {};
    try { s = JSON.parse(localStorage.getItem(KEY)) || {}; } catch (e) {}
    return {
      region: REGIONS[s.region] ? s.region : DEFAULT.region,
      ruleset: RULESETS[s.ruleset] ? s.ruleset : DEFAULT.ruleset,
      faction: FACTIONS[s.faction] ? s.faction : DEFAULT.faction,
    };
  }
  function save(s) { try { localStorage.setItem(KEY, JSON.stringify(s)); } catch (e) {} }

  var cache = {}; // segment key -> Promise<data|null>
  function fetchSegment(s) {
    var key = s.region + '-' + s.ruleset + '-' + s.faction;
    if (!cache[key]) {
      cache[key] = fetch(base + '/data/ah/' + key + '.json', { cache: 'no-cache' })
        .then(function (r) { return r.ok ? r.json() : null; })
        .catch(function () { return null; });
    }
    return cache[key];
  }

  // 68550 copper -> "6g 85s 50c", the same style as the sell price rows
  function money(c) {
    c = Math.round(c);
    var g = Math.floor(c / 10000), s = Math.floor((c % 10000) / 100), cu = c % 100;
    var parts = [];
    if (g) parts.push(g + 'g');
    if (s) parts.push(s + 's');
    if (cu || !parts.length) parts.push(cu + 'c');
    return parts.join(' ');
  }
  function ago(iso) {
    var mins = Math.round((Date.now() - new Date(iso).getTime()) / 60000);
    if (!isFinite(mins)) return '';
    if (mins < 1) return 'just now';
    if (mins < 60) return mins + ' min ago';
    var h = Math.round(mins / 60);
    return h < 48 ? h + ' h ago' : Math.round(h / 24) + ' days ago';
  }
  function label(s) { return REGIONS[s.region] + ' ' + RULESETS[s.ruleset] + ' ' + FACTIONS[s.faction]; }
  function el(tag, cls, text) {
    var e = document.createElement(tag);
    if (cls) e.className = cls;
    if (text != null) e.textContent = text;
    return e;
  }

  var state = load();
  var sections = [], summaries = [];

  function select(name, options, onChange) {
    var wrap = el('label', 'ah-field');
    wrap.appendChild(el('span', null, name));
    var sel = document.createElement('select');
    Object.keys(options).forEach(function (k) {
      var o = el('option', null, options[k]);
      o.value = k;
      sel.appendChild(o);
    });
    sel.addEventListener('change', function () { onChange(sel.value); });
    wrap.appendChild(sel);
    return { wrap: wrap, sel: sel };
  }

  function buildSection(box) {
    box.textContent = '';
    var controls = el('div', 'ah-controls');
    var fields = {};
    [['region', 'Region', REGIONS], ['ruleset', 'Ruleset', RULESETS], ['faction', 'Faction', FACTIONS]].forEach(function (f) {
      fields[f[0]] = select(f[1], f[2], function (v) {
        state[f[0]] = v;
        save(state);
        render();
      });
      controls.appendChild(fields[f[0]].wrap);
    });
    var out = el('div', 'ah-result');
    out.setAttribute('aria-live', 'polite');
    box.appendChild(controls);
    box.appendChild(out);
    sections.push({ id: box.getAttribute('data-item-id'), fields: fields, out: out });
  }

  function showSection(sec, data) {
    ['region', 'ruleset', 'faction'].forEach(function (k) { sec.fields[k].sel.value = state[k]; });
    sec.out.textContent = '';
    if (data === undefined) { sec.out.appendChild(el('p', 'ah-status', 'Looking up ' + label(state) + ' prices...')); return; }
    if (!data) { sec.out.appendChild(el('p', 'ah-status', 'Auction House prices for ' + label(state) + ' are not available right now.')); return; }
    var row = data.items && data.items[sec.id];
    if (!row) { sec.out.appendChild(el('p', 'ah-status', 'No ' + label(state) + ' auctions listed for this item.')); }
    else {
      var dl = el('dl', 'ah-stats');
      [['Lowest buyout', money(row[0]) + ' each'], ['Median buyout', money(row[1]) + ' each'], ['Quantity listed', row[2].toLocaleString()], ['Auctions', row[3].toLocaleString()]]
        .forEach(function (p) { dl.appendChild(el('dt', null, p[0])); dl.appendChild(el('dd', null, p[1])); });
      sec.out.appendChild(dl);
    }
    var when = data.snapshot || data.updated;
    sec.out.appendChild(el('p', 'ah-note', label(state) + ' auction house' + (when ? ', snapshot ' + ago(when) : '') + '. Prices change hourly; bid-only auctions are not counted.'));
  }

  function showSummary(td, data) {
    var row = data && data.items && data.items[td.getAttribute('data-item-id')];
    td.textContent = '';
    if (data === undefined) { td.appendChild(el('span', 'unknown', '...')); return; }
    td.appendChild(document.createTextNode(row ? money(row[0]) : data ? 'No listings' : 'Unavailable'));
    td.appendChild(el('span', 'ah-seg', label(state)));
  }

  function render() {
    var s = { region: state.region, ruleset: state.ruleset, faction: state.faction };
    sections.forEach(function (sec) { showSection(sec, undefined); });
    summaries.forEach(function (td) { showSummary(td, undefined); });
    fetchSegment(s).then(function (data) {
      if (s.region !== state.region || s.ruleset !== state.ruleset || s.faction !== state.faction) return; // changed meanwhile
      sections.forEach(function (sec) { showSection(sec, data); });
      summaries.forEach(function (td) { showSummary(td, data); });
    });
  }

  function init() {
    var boxes = document.querySelectorAll('.ah-price[data-item-id]');
    var tds = document.querySelectorAll('.ah-summary[data-item-id]');
    if (!boxes.length && !tds.length) return; // not a tradable item page
    Array.prototype.forEach.call(boxes, buildSection);
    summaries = Array.prototype.slice.call(tds);
    render();
  }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init); else init();
})();
