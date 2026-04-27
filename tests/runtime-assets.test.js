const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');

const { prepareStaticAssets } = require('../server/runtime-assets');

test('prepareStaticAssets copies browser assets and socket.io client files in packaged mode', () => {
  const tempRoot = fs.mkdtempSync(path.join(os.tmpdir(), 'dcmmo-runtime-'));
  const sourceDir = path.join(tempRoot, 'snapshot-public');
  const socketIoSourceDir = path.join(tempRoot, 'snapshot-socketio');
  const targetDir = path.join(tempRoot, 'runtime-public');

  fs.mkdirSync(sourceDir, { recursive: true });
  fs.mkdirSync(socketIoSourceDir, { recursive: true });
  fs.writeFileSync(path.join(sourceDir, 'index.html'), '<h1>Dungeon Crawler MMO</h1>');
  fs.writeFileSync(path.join(sourceDir, 'game.js'), 'console.log("ok")');
  fs.writeFileSync(path.join(socketIoSourceDir, 'socket.io.js'), 'window.io = function() {};');

  const staticDir = prepareStaticAssets({
    isPackaged: true,
    sourceDir,
    socketIoSourceDir,
    targetDir,
  });

  assert.equal(staticDir, targetDir);
  assert.equal(fs.readFileSync(path.join(staticDir, 'index.html'), 'utf8'), '<h1>Dungeon Crawler MMO</h1>');
  assert.equal(fs.readFileSync(path.join(staticDir, 'game.js'), 'utf8'), 'console.log("ok")');
  assert.equal(
    fs.readFileSync(path.join(staticDir, 'socket.io', 'socket.io.js'), 'utf8'),
    'window.io = function() {};'
  );
});
