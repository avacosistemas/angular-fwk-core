const fs = require('fs');
const path = require('path');

const LIB_DIR = path.resolve(__dirname, 'packages/core/src/lib');

const aliasMaps = {
  '@fwk/': { base: LIB_DIR, prefix: '' },
  '@fwk-layout/': { base: path.join(LIB_DIR, 'layout/infrastructure'), prefix: '' },
};

function walkDir(dir) {
  const results = [];
  const list = fs.readdirSync(dir);
  for (const file of list) {
    const filePath = path.join(dir, file);
    const stat = fs.statSync(filePath);
    if (stat.isDirectory()) {
      results.push(...walkDir(filePath));
    } else if (file.endsWith('.ts') && !file.endsWith('.spec.ts') && !file.endsWith('.mock.ts')) {
      results.push(filePath);
    }
  }
  return results;
}

const files = walkDir(LIB_DIR);
let modifiedCount = 0;

for (const filePath of files) {
  let content = fs.readFileSync(filePath, 'utf8');
  const originalContent = content;
  const fileDir = path.dirname(filePath);

  for (const [alias, config] of Object.entries(aliasMaps)) {
    const regex = new RegExp(`from\\s+['"]${alias}([^'"]+)['"]`, 'g');
    content = content.replace(regex, (match, subpath) => {
      const targetFile = path.join(config.base, subpath);
      let relativePath = path.relative(fileDir, targetFile).replace(/\\/g, '/');
      if (!relativePath.startsWith('.')) {
        relativePath = './' + relativePath;
      }
      return `from '${relativePath}'`;
    });
  }

  if (content !== originalContent) {
    fs.writeFileSync(filePath, content, 'utf8');
    modifiedCount++;
    console.log(`  Fixed: ${path.relative(LIB_DIR, filePath)}`);
  }
}

console.log(`\n✅ Fixed ${modifiedCount} files`);
