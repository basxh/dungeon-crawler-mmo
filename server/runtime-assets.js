const fs = require('node:fs');
const path = require('node:path');

function copyDirectoryRecursive(sourceDir, targetDir) {
  fs.mkdirSync(targetDir, { recursive: true });

  for (const entry of fs.readdirSync(sourceDir, { withFileTypes: true })) {
    const sourcePath = path.join(sourceDir, entry.name);
    const targetPath = path.join(targetDir, entry.name);

    if (entry.isDirectory()) {
      copyDirectoryRecursive(sourcePath, targetPath);
    } else {
      fs.copyFileSync(sourcePath, targetPath);
    }
  }
}

function prepareStaticAssets(options = {}) {
  const sourceDir = options.sourceDir ?? path.join(__dirname, '../public');
  const isPackaged = options.isPackaged ?? Boolean(process.pkg);

  if (!isPackaged) {
    return sourceDir;
  }

  const targetDir = options.targetDir ?? path.join(path.dirname(process.execPath), 'runtime-public');
  copyDirectoryRecursive(sourceDir, targetDir);
  return targetDir;
}

module.exports = {
  prepareStaticAssets,
};
