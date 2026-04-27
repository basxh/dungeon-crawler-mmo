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
  const socketIoSourceDir =
    options.socketIoSourceDir ?? path.join(path.dirname(require.resolve('socket.io/package.json')), 'client-dist');
  const isPackaged = options.isPackaged ?? Boolean(process.pkg);

  if (!isPackaged) {
    return sourceDir;
  }

  const targetDir = options.targetDir ?? path.join(path.dirname(process.execPath), 'runtime-public');
  const socketIoTargetDir = path.join(targetDir, 'socket.io');

  copyDirectoryRecursive(sourceDir, targetDir);
  copyDirectoryRecursive(socketIoSourceDir, socketIoTargetDir);
  return targetDir;
}

module.exports = {
  prepareStaticAssets,
};
