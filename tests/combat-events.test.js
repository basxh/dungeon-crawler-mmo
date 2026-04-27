const test = require('node:test');
const assert = require('node:assert/strict');
const path = require('node:path');
const { pathToFileURL } = require('node:url');

async function loadModule(relativePath) {
  const moduleUrl = pathToFileURL(path.join(__dirname, '..', relativePath)).href;
  return import(moduleUrl);
}

test('detects combat hits and deaths between enemy snapshots', async () => {
  const { buildEnemyCombatEvents } = await loadModule('public/src/render/three/combat-events.mjs');

  const previousEnemies = [
    { id: 'enemy-1', hp: 30, alive: true },
    { id: 'enemy-2', hp: 10, alive: true },
  ];
  const nextEnemies = [
    { id: 'enemy-1', hp: 18, alive: true, x: 3, y: 4 },
    { id: 'enemy-2', hp: 0, alive: false, x: 5, y: 6 },
  ];

  const events = buildEnemyCombatEvents(previousEnemies, nextEnemies);

  assert.deepEqual(events, [
    { id: 'enemy-1', type: 'hit', damage: 12, x: 3, y: 4 },
    { id: 'enemy-2', type: 'hit', damage: 10, x: 5, y: 6 },
    { id: 'enemy-2', type: 'death', damage: 0, x: 5, y: 6 },
  ]);
});
