// Wiki search, in the browser. The build writes /search-index.json: every page as [title, url, kind, note?].
//   - the search box in the tab bar ([data-search]) suggests pages as you type; Enter goes straight to a page whose
//     title matches exactly, otherwise to the Search page
//   - the Search page (/w/Search?q=...) lists every match
//   - /w/Search?random goes to a random page (the sidebar's "Random page")
// Nothing typed here leaves the browser. Works under a base path (BASE_PATH builds): the base is read from this
// script's own URL.
(function () {
  var script = document.currentScript;
  var BASE = script ? script.src.replace(/\/assets\/search\.js(\?.*)?$/, '').replace(/^https?:\/\/[^/]+/, '') : '';
  var MAX_SUGGEST = 8;
  var MAX_RESULTS = 200;
  var entries = null;
  var loading = null;

  // Lower case, no accents or apostrophes, words separated by single spaces: "Rhahk'Zor" -> "rhahkzor"
  function norm(s) {
    return s.toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/['’`]/g, '')
      .replace(/[^a-z0-9]+/g, ' ').trim();
  }

  function load() {
    if (!loading) {
      loading = fetch(BASE + '/search-index.json').then(function (r) {
        if (!r.ok) throw new Error('HTTP ' + r.status);
        return r.json();
      }).then(function (rows) {
        entries = rows.map(function (r) {
          var n = norm(r[0]);
          return { title: r[0], url: BASE + r[1], kind: r[2], note: r[3] || '', n: n, words: n.split(' ') };
        });
        return entries;
      });
      loading.catch(function () { loading = null; });
    }
    return loading;
  }

  // Higher is better; 0 is no match. Every word typed has to match the start of a word in the title.
  function score(e, q, qwords) {
    if (e.n === q) return 1000;
    if (e.n.indexOf(q) === 0) return 800 - e.n.length;
    var at = 0, inOrder = true, all = true;
    for (var i = 0; i < qwords.length; i++) {
      var found = -1;
      for (var j = 0; j < e.words.length; j++) if (e.words[j].indexOf(qwords[i]) === 0) { found = j; break; }
      if (found === -1) { all = false; break; }
      if (found < at) inOrder = false;
      at = found;
    }
    if (all) return (inOrder ? 600 : 500) - e.n.length;
    if (e.n.indexOf(q) !== -1) return 300 - e.n.length;
    return 0;
  }

  function search(query, limit) {
    var q = norm(query);
    if (!q || !entries) return [];
    var qwords = q.split(' ');
    var hits = [];
    for (var i = 0; i < entries.length; i++) {
      var s = score(entries[i], q, qwords);
      if (s > 0) hits.push({ e: entries[i], s: s });
    }
    hits.sort(function (a, b) { return b.s - a.s || a.e.title.localeCompare(b.e.title); });
    return hits.slice(0, limit).map(function (h) { return h.e; });
  }

  function exact(query) {
    var q = norm(query);
    if (!entries || !q) return null;
    for (var i = 0; i < entries.length; i++) if (entries[i].n === q) return entries[i];
    return null;
  }

  function el(tag, cls, text) {
    var x = document.createElement(tag);
    if (cls) x.className = cls;
    if (text != null) x.textContent = text;
    return x;
  }

  // ---------- the search box in the tab bar ----------
  function suggestBox(form) {
    var input = form.querySelector('input[name=q]');
    var list = el('ul', 'search-suggest');
    var id = 'search-suggest-' + Math.random().toString(36).slice(2, 8);
    list.id = id;
    list.setAttribute('role', 'listbox');
    list.hidden = true;
    form.appendChild(list);
    input.setAttribute('role', 'combobox');
    input.setAttribute('aria-autocomplete', 'list');
    input.setAttribute('aria-controls', id);
    input.setAttribute('aria-expanded', 'false');
    var items = [], active = -1;

    function close() {
      list.hidden = true;
      input.setAttribute('aria-expanded', 'false');
      input.removeAttribute('aria-activedescendant');
      active = -1;
    }
    function highlight(i) {
      if (active >= 0 && list.children[active]) list.children[active].removeAttribute('aria-selected');
      active = i;
      if (i >= 0 && list.children[i]) {
        list.children[i].setAttribute('aria-selected', 'true');
        input.setAttribute('aria-activedescendant', list.children[i].id);
      } else input.removeAttribute('aria-activedescendant');
    }
    function render() {
      items = search(input.value, MAX_SUGGEST);
      list.textContent = '';
      active = -1;
      if (!input.value.trim()) return close();
      items.forEach(function (e, i) {
        var li = el('li');
        li.id = id + '-' + i;
        li.setAttribute('role', 'option');
        var a = el('a');
        a.href = e.url;
        a.tabIndex = -1;
        a.appendChild(el('span', 'search-suggest-title', e.title));
        a.appendChild(el('span', 'search-suggest-kind', e.note ? e.kind + ' · ' + e.note : e.kind));
        li.appendChild(a);
        list.appendChild(li);
      });
      var more = el('li', 'search-suggest-more');
      more.id = id + '-' + items.length;
      more.setAttribute('role', 'option');
      var all = el('a', null, items.length ? 'All results for “' + input.value.trim() + '”' : 'No page titles match. Search anyway');
      all.href = BASE + '/w/Search?q=' + encodeURIComponent(input.value.trim());
      all.tabIndex = -1;
      more.appendChild(all);
      list.appendChild(more);
      list.hidden = false;
      input.setAttribute('aria-expanded', 'true');
    }

    input.addEventListener('focus', function () { load().then(function () { if (input.value.trim()) render(); }); });
    input.addEventListener('input', function () { load().then(render); });
    input.addEventListener('keydown', function (ev) {
      var n = list.children.length;
      if (ev.key === 'ArrowDown' && !list.hidden) { ev.preventDefault(); highlight((active + 1) % n); }
      else if (ev.key === 'ArrowUp' && !list.hidden) { ev.preventDefault(); highlight(active <= 0 ? n - 1 : active - 1); }
      else if (ev.key === 'Escape') close();
      else if (ev.key === 'Enter' && active >= 0 && list.children[active]) {
        ev.preventDefault();
        location.href = list.children[active].querySelector('a').href;
      }
    });
    input.addEventListener('blur', function () { setTimeout(close, 150); });
    // Enter: an exact title match opens that page ("Go"); anything else opens the Search page
    form.addEventListener('submit', function (ev) {
      var hit = exact(input.value);
      if (hit) { ev.preventDefault(); location.href = hit.url; }
    });
  }

  // ---------- the Search page ----------
  function searchPage() {
    var params = new URLSearchParams(location.search);
    var input = document.querySelector('[data-search-page]');
    var status = document.querySelector('[data-search-status]');
    var out = document.querySelector('[data-search-results]');
    if (params.has('random')) {
      status.textContent = 'Picking a random page…';
      load().then(function (all) {
        var pages = all.filter(function (e) { return e.kind !== 'Special page'; });
        location.replace(pages[Math.floor(Math.random() * pages.length)].url);
      });
      return;
    }
    var query = (params.get('q') || '').trim();
    input.value = query;
    if (!query) { input.focus(); return; }
    document.title = query + ' - Search - WoW Forever Wiki';
    status.textContent = 'Searching…';
    load().then(function () {
      var hits = search(query, Infinity);
      status.textContent = hits.length
        ? hits.length.toLocaleString('en-GB') + ' page' + (hits.length === 1 ? '' : 's') + ' match “' + query + '”' + (hits.length > MAX_RESULTS ? '; the first ' + MAX_RESULTS + ' are shown.' : '.')
        : 'No page titles match “' + query + '”. Try fewer or shorter words.';
      hits.slice(0, MAX_RESULTS).forEach(function (e) {
        var li = el('li');
        var a = el('a', null, e.title);
        a.href = e.url;
        li.appendChild(a);
        li.appendChild(el('span', 'search-result-kind', e.note ? e.kind + ' · ' + e.note : e.kind));
        out.appendChild(li);
      });
    }, function () {
      status.textContent = 'The search index could not be loaded. Try again in a moment.';
    });
  }

  document.addEventListener('DOMContentLoaded', function () {
    var forms = document.querySelectorAll('form[data-search]');
    for (var i = 0; i < forms.length; i++) suggestBox(forms[i]);
    if (document.querySelector('[data-search-page]')) searchPage();
  });
})();
