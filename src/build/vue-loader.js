// Lets Node require() .vue single-file components, with no bundler.
//
//   const Infobox = require('../components/Infobox.vue');
//
// Supported: a <template> and an optional plain <script> whose `export default { ... }` is an Options API
// component (props, computed, methods, components). Inside <script>, load other files with require().
// Not supported, and rejected with an error: <script setup>, <style> (styles belong in site/assets/wiki.css),
// TypeScript and `import` statements.
//
// The template stays a string and Vue's server renderer compiles it the first time the component renders.
const fs = require('fs');
const path = require('path');
const Module = require('module');
const { parse } = require('vue/compiler-sfc');

function loadVue(file) {
  const { descriptor, errors } = parse(fs.readFileSync(file, 'utf8'), { filename: file });
  const fail = (why) => { throw new Error(`${path.relative(process.cwd(), file)}: ${why}`); };
  if (errors.length) fail(errors.map((e) => e.message).join('; '));
  if (descriptor.scriptSetup) fail('<script setup> is not supported; use a plain <script> with export default {}');
  if (descriptor.styles.length) fail('<style> is not supported; put styles in site/assets/wiki.css');
  if (!descriptor.template) fail('has no <template>');
  if (descriptor.template.lang) fail('templates must be plain HTML');

  let component = {};
  if (descriptor.script) {
    if (descriptor.script.lang) fail('scripts must be plain JavaScript');
    const code = descriptor.script.content;
    if (/^\s*import\s/m.test(code)) fail('use require() instead of import');
    if (!/^\s*export default\b/m.test(code)) fail('<script> must have `export default { ... }`');
    // Compile the script as a CommonJS module next to the .vue file, so require() paths are relative to it
    const m = new Module(file, module);
    m.filename = file;
    m.paths = Module._nodeModulePaths(path.dirname(file));
    m._compile(code.replace(/^(\s*)export default\b/m, '$1module.exports ='), file);
    component = m.exports;
  }
  return { name: path.basename(file, '.vue'), ...component, template: descriptor.template.content, __file: file };
}

require.extensions['.vue'] = (module, file) => { module.exports = loadVue(file); };

module.exports = { loadVue };
