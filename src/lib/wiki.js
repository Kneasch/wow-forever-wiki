// Small helpers shared by the page data modules (src/data) and components.
const { slug } = require('./slug');

// Page title -> URL. The same slug names the output file (w/<slug>.html), so links and files always agree.
const pageHref = (title) => '/w/' + encodeURI(slug(title));
const cap = (s) => s.charAt(0).toUpperCase() + s.slice(1);
const plural = (n, word, many = word + 's') => `${n} ${n === 1 ? word : many}`;
// "a, b and c"
const list = (xs) => (xs.length < 2 ? xs.join('') : `${xs.slice(0, -1).join(', ')} and ${xs[xs.length - 1]}`);
const article = (w) => (/^[aeiou]/i.test(w) ? 'an' : 'a');
const wowhead = (type, id) => `https://www.wowhead.com/forever/${type}=${id}`;
const isBlank = (v) => v === null || v === undefined || v === '';

module.exports = { slug, pageHref, cap, plural, list, article, wowhead, isBlank };
