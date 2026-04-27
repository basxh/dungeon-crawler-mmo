const test = require('node:test');
const assert = require('node:assert/strict');
const path = require('node:path');
const { pathToFileURL } = require('node:url');

async function loadModule(relativePath) {
  const moduleUrl = pathToFileURL(path.join(__dirname, '..', relativePath)).href;
  return import(moduleUrl);
}

test('game state store merges partial updates and notifies subscribers', async () => {
  const { createGameStateStore } = await loadModule('public/src/state/game-state.mjs');
  const store = createGameStateStore();
  const snapshots = [];

  const unsubscribe = store.subscribe((state) => {
    snapshots.push({
      playerName: state.player?.name ?? null,
      enemyCount: state.enemies.length,
      connected: state.connected,
    });
  });

  store.setState({ connected: true });
  store.setState({ player: { name: 'Adventurer' } });
  store.setState({ enemies: [{ id: 'enemy-1' }] });
  unsubscribe();
  store.setState({ connected: false });

  assert.deepEqual(snapshots, [
    { playerName: null, enemyCount: 0, connected: true },
    { playerName: 'Adventurer', enemyCount: 0, connected: true },
    { playerName: 'Adventurer', enemyCount: 1, connected: true },
  ]);

  assert.equal(store.getState().player.name, 'Adventurer');
  assert.equal(store.getState().enemies.length, 1);
  assert.equal(store.getState().connected, false);
});
