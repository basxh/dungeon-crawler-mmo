const test = require('node:test');
const assert = require('node:assert/strict');

const { createGameServer } = require('../server/app');

test('createGameServer serves the browser client over HTTP', async () => {
  const gameServer = createGameServer({ port: 0 });
  await gameServer.start();

  try {
    const address = gameServer.httpServer.address();
    const response = await fetch(`http://127.0.0.1:${address.port}`);
    const html = await response.text();

    assert.equal(response.status, 200);
    assert.match(html, /Dungeon Crawler MMO/);
    assert.match(html, /socket\.io/);
  } finally {
    await gameServer.stop();
  }
});
