// Page title -> file name / URL slug that is safe on Windows, macOS and Linux file systems
// and in URLs. The same slug names the file (site/w/<slug>.html) and the link (/w/<slug>),
// so the two can never disagree.
//
//   "Grand Crusader Dathrohan / Balnazzar" -> Grand_Crusader_Dathrohan_Balnazzar
//   "Pattern: Ghostweave Pants"            -> Pattern_Ghostweave_Pants
//   'Eric "The Swift"'                     -> Eric_The_Swift
//
// Rules, and the file system each one is for:
// - Unicode NFC: macOS file systems may return NFD names; NFC keeps git paths and links identical.
// - Drop / \ : * ? " < > | and control characters: not allowed on Windows (/ and NUL nowhere).
//   Also # and %, which would break or change the URL.
// - Trim trailing dots and spaces: Windows silently strips them.
// - Suffix reserved device names (CON, NUL, COM1, LPT1, ...): Windows cannot create them.
// - Cap at 200 UTF-8 bytes: most file systems allow 255 per name, leaving room for ".html".
// Two titles that differ only in letter case would share a file on Windows and macOS
// (case-insensitive by default); checkSlugs() reports that.
const FORBIDDEN = /[\\/:*?"<>|#%\u0000-\u001f\u007f]/g;
const RESERVED = /^(con|prn|aux|nul|com[0-9¹²³]|lpt[0-9¹²³])(\.|$)/i;
const MAX_BYTES = 200;

function slug(title) {
  let s = String(title)
    .normalize('NFC')
    .replace(FORBIDDEN, ' ')
    .trim()
    .replace(/\s+/g, '_')
    .replace(/_+/g, '_')
    .replace(/^[_.]+|[_. ]+$/g, '');
  while (Buffer.byteLength(s) > MAX_BYTES) s = [...s].slice(0, -1).join('');
  s = s.replace(/[_. ]+$/, '');
  if (!s) throw new Error(`Title ${JSON.stringify(title)} has no characters usable in a file name`);
  if (RESERVED.test(s)) s = s.replace(/^[^.]*/, '$&_'); // CON -> CON_, Nul.Ring -> Nul_.Ring (last: trims above would undo it)
  return s;
}

// Why a file name is not portable, or null when it is fine. Used by check-filenames.js for files
// that were not named by slug() (hand-written pages, assets).
function portabilityProblem(name) {
  if (/[\\/:*?"<>|\u0000-\u001f\u007f]/.test(name)) return 'contains a character Windows does not allow (\\ / : * ? " < > |)';
  if (/[. ]$/.test(name)) return 'ends in a dot or space, which Windows strips';
  if (RESERVED.test(name)) return 'is a reserved device name on Windows';
  if (name !== name.normalize('NFC')) return 'is not Unicode NFC, so macOS and git may see different names';
  if (Buffer.byteLength(name) > 255) return 'is longer than 255 bytes';
  return null;
}

// Map of lowercased slug -> first title; throws when two different titles collide
// (identical slugs everywhere, or case-only differences on Windows and macOS).
function slugRegistry() {
  const seen = new Map();
  return (title) => {
    const s = slug(title);
    const key = s.toLowerCase();
    const prev = seen.get(key);
    if (prev && prev.title !== title) {
      throw new Error(`"${title}" and "${prev.title}" would both be written to ${prev.slug === s ? s : `${prev.slug} / ${s}`}.html (file names are case-insensitive on Windows and macOS)`);
    }
    if (!prev) seen.set(key, { title, slug: s });
    return s;
  };
}

module.exports = { slug, portabilityProblem, slugRegistry };
