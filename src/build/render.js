// Renders the wiki: every page source in src/data -> full HTML documents, with Vue's server renderer.
//
//   const { collectPages, renderPage } = require('./render');
//   const pages = collectPages();            // [{ title, file, url, component, props, docTitle }]
//   const html = await renderPage(pages[0]); // one complete HTML document
//
// A page source (src/data/<name>.js) exports pages(): a list of
//   { title, component, props }           an article at /w/<slug of title>
//   { file, url, component, props, docTitle }   anything else (the main page, 404.html)
// Props are plain data built from the research JSON; the component (src/pages/*.vue) turns them into HTML.
// No JavaScript is sent to readers: the output is static HTML.
require('./vue-loader');
const path = require('path');
const { createSSRApp } = require('vue');
const { renderToString } = require('vue/server-renderer');
const { slug } = require('../lib/wiki');

// Order matters only for dungeons, where a later file's page of the same title replaces an earlier one
// (an item shared by the Scarlet Monastery wings has the same page from every wing).
const SOURCES = ['home', 'zones', 'professions', 'dungeons', 'quests'];

// Components every template can use without importing them
const GLOBALS = {
  Article: require('../layout/Article.vue'),
  WikiLink: require('../components/WikiLink.vue'),
  Unknown: require('../components/Unknown.vue'),
  Val: require('../components/Val.vue'),
  Toc: require('../components/Toc.vue'),
};

const esc = (s) => String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');

/** Every page of the wiki. Throws when two different titles would be written to the same file. */
function collectPages({ sources = SOURCES } = {}) {
  const byFile = new Map(); // lower-cased file -> page (Windows and macOS file names ignore case)
  for (const source of sources) {
    for (const p of require(path.join(__dirname, '..', 'data', source)).pages()) {
      const page = p.file
        ? { ...p, source }
        : { ...p, source, file: `w/${slug(p.title)}.html`, url: `/w/${encodeURI(slug(p.title))}`, docTitle: `${p.title} - WoW Forever Wiki` };
      const key = page.file.toLowerCase();
      const prev = byFile.get(key);
      if (prev && (prev.title !== page.title || prev.source !== page.source)) {
        throw new Error(`"${page.title}" (${source}) and "${prev.title}" (${prev.source}) would both be written to ${page.file}`);
      }
      byFile.set(key, page); // same title from the same source: the later one wins
    }
  }
  return [...byFile.values()];
}

function shell(page, body) {
  return `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<link rel="stylesheet" href="/assets/wiki.css">
<script src="/assets/theme.js"></script>
<title>${esc(page.docTitle)}</title>
</head>
<body>
${body}
</body>
</html>
`;
}

/** One complete HTML document for a page from collectPages(). */
async function renderPage(page) {
  const app = createSSRApp(page.component, page.props);
  // Keep whitespace as written: a line break between two inline elements is a visible space, like in plain HTML
  app.config.compilerOptions.whitespace = 'preserve';
  app.config.warnHandler = (msg, _vm, trace) => { throw new Error(`${page.file}: ${msg}${trace}`); };
  for (const [name, c] of Object.entries(GLOBALS)) app.component(name, c);
  const html = await renderToString(app);
  // Vue marks fragments and empty v-ifs with comments for client-side hydration; the wiki has none, so drop them.
  return shell(page, html.replace(/<!--\[-->|<!--\]-->|<!---->/g, ''));
}

module.exports = { collectPages, renderPage, SOURCES };
