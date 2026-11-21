#!/usr/bin/env node
// Rewrite the file list in sw.js from what is on disk, and raise the cache version.
//   node tools/build-sw.mjs
// Run it before every push: a device only fetches the app again when sw.js changed.

import fs from 'fs';
import path from 'path';

const root = path.resolve(path.dirname(new URL(import.meta.url).pathname), '..');
const walk = d => fs.readdirSync(d, { withFileTypes: true }).flatMap(e => (e.isDirectory() ? walk(path.join(d, e.name)) : [path.join(d, e.name)]));
const files = [
  'index.html', 'manifest.json', 'icon.svg',
  ...walk(path.join(root, 'styles')).filter(f => f.endsWith('.css')).map(f => path.relative(root, f)).sort(),
  ...walk(path.join(root, 'src')).filter(f => f.endsWith('.js')).map(f => path.relative(root, f)).sort(),
];

const p = path.join(root, 'sw.js');
let sw = fs.readFileSync(p, 'utf8');
const version = Number(sw.match(/const CACHE = PREFIX \+ 'v(\d+)'/)[1]) + 1;
sw = sw.replace(/const CACHE = PREFIX \+ 'v\d+'/, `const CACHE = PREFIX + 'v${version}'`)
       .replace(/const SHELL = \[[\s\S]*?\n\];/, `const SHELL = [\n${files.map(f => `  './${f}',`).join('\n')}\n];`);
fs.writeFileSync(p, sw);
console.log(`sw.js: version v${version}, ${files.length} files`);
