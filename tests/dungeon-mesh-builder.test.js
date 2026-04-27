const test = require('node:test');
const assert = require('node:assert/strict');
const path = require('node:path');
const { pathToFileURL } = require('node:url');

async function loadModule(relativePath) {
  const moduleUrl = pathToFileURL(path.join(__dirname, '..', relativePath)).href;
  return import(moduleUrl);
}

test('dungeon mesh builder classifies floors walls start and exit tiles for 3d rendering', async () => {
  const { buildDungeonRenderData } = await loadModule('public/src/render/three/dungeon-mesh-builder.mjs');
  const dungeon = {
    width: 3,
    height: 3,
    map: [
      [1, 1, 1],
      [2, 0, 3],
      [1, 0, 1],
    ],
  };

  const renderData = buildDungeonRenderData(dungeon);

  assert.equal(renderData.floors.length, 4);
  assert.equal(renderData.walls.length, 5);
  assert.deepEqual(renderData.start, { x: 0, z: 1 });
  assert.deepEqual(renderData.exit, { x: 2, z: 1 });
  assert.deepEqual(renderData.bounds, { width: 3, depth: 3 });
});
