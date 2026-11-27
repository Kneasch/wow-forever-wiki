// Loads research JSON once per process. Every page source reads the research through here.
const fs = require('fs');
const path = require('path');

const ROOT = path.join(__dirname, '..', '..');
const RESEARCH = path.join(ROOT, 'research');
const cache = new Map();
const json = (rel) => {
  if (!cache.has(rel)) cache.set(rel, JSON.parse(fs.readFileSync(path.join(RESEARCH, rel), 'utf8')));
  return cache.get(rel);
};

// Dungeon research files (research/*.json except icons.json), in file-name order
const dungeonFiles = () => fs.readdirSync(RESEARCH).filter((f) => f.endsWith('.json') && f !== 'icons.json').sort();

module.exports = { ROOT, RESEARCH, json, dungeonFiles };
