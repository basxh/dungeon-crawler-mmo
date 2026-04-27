const test = require('node:test');
const assert = require('node:assert/strict');
const path = require('node:path');
const { pathToFileURL } = require('node:url');

async function loadModule(relativePath) {
  const moduleUrl = pathToFileURL(path.join(__dirname, '..', relativePath)).href;
  return import(moduleUrl);
}

test('creates a dungeon minimap model with walls floors start exit player and enemies', async () => {
  const { buildMinimapModel } = await loadModule('public/src/ui/minimap-model.mjs');

  const state = {
    player: { x: 1, y: 1 },
    enemies: [
      { id: 'enemy-1', x: 2, y: 1, alive: true },
      { id: 'enemy-2', x: 0, y: 0, alive: false },
    ],
    dungeon: {
      width: 3,
      height: 2,
      map: [
        [1, 2, 0],
        [0, 0, 3],
      ],
    },
  };

  const model = buildMinimapModel(state);

  assert.equal(model.tiles.length, 6);
  assert.equal(model.player.x, 1);
  assert.equal(model.player.y, 1);
  assert.deepEqual(model.exit, { x: 2, y: 1 });
  assert.deepEqual(model.start, { x: 1, y: 0 });
  assert.deepEqual(model.enemies, [{ id: 'enemy-1', x: 2, y: 1 }]);
});
