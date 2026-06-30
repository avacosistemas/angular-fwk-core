const fs = require('fs');
const path = require('path');

const DIST_DIR = path.resolve(__dirname, 'dist/packages/core');
const FESM_FILE = path.join(DIST_DIR, 'fesm2022/fwk-core.mjs');
const ESM_LIB_DIR = path.join(DIST_DIR, 'esm2022/lib');

const aliasMap = [
  { prefix: '@fwk-layout/', base: 'layout/infrastructure/' },
  { prefix: '@fwk/', base: '' },
];

function replaceAliases(content, relativeFrom, filePath) {
  for (const { prefix, base } of aliasMap) {
    const regex = new RegExp(`from\\s+['"]${escapeRegex(prefix)}([^'"]+)['"]`, 'g');
    content = content.replace(regex, (match, subpath) => {
      const target = base + subpath;
      let relPath = path.relative(relativeFrom, path.join(DIST_DIR, 'esm2022/lib', target));
      relPath = relPath.replace(/\\/g, '/');
      if (!relPath.startsWith('.')) relPath = './' + relPath;
      return `from '${relPath}'`;
    });
  }
  return content;
}

function escapeRegex(str) {
  return str.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

// Patch fesm2022/fwk-core.mjs
if (fs.existsSync(FESM_FILE)) {
  let content = fs.readFileSync(FESM_FILE, 'utf8');
  const original = content;
  content = replaceAliases(content, path.join(DIST_DIR, 'fesm2022'), 'fesm2022/fwk-core.mjs');
  if (content !== original) {
    fs.writeFileSync(FESM_FILE, content, 'utf8');
    console.log('✅ Patched fesm2022/fwk-core.mjs');
  } else {
    console.log('⚠️  No changes needed in fesm2022/fwk-core.mjs');
  }
}

// Patch esm2022/lib/**/*.mjs files
let patchedCount = 0;
function walkAndPatch(dir, relativeFrom) {
  const items = fs.readdirSync(dir);
  for (const item of items) {
    const fullPath = path.join(dir, item);
    const stat = fs.statSync(fullPath);
    if (stat.isDirectory()) {
      walkAndPatch(fullPath, relativeFrom);
    } else if (item.endsWith('.mjs') || item.endsWith('.js')) {
      let content = fs.readFileSync(fullPath, 'utf8');
      const original = content;
      content = replaceAliases(content, path.dirname(fullPath), path.relative(DIST_DIR, fullPath));
      if (content !== original) {
        fs.writeFileSync(fullPath, content, 'utf8');
        patchedCount++;
      }
    }
  }
}
walkAndPatch(ESM_LIB_DIR, ESM_LIB_DIR);
console.log(`✅ Patched ${patchedCount} esm2022/lib/ files`);
