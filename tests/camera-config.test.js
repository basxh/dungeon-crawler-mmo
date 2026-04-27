const test = require('node:test');
const assert = require('node:assert/strict');
const path = require('node:path');
const { pathToFileURL } = require('node:url');

async function loadModule(relativePath) {
  const moduleUrl = pathToFileURL(path.join(__dirname, '..', relativePath)).href;
  return import(moduleUrl);
}

test('follow camera config keeps the player readable instead of a tiny distant dot', async () => {
  const { DEFAULT_CAMERA_CONFIG } = await loadModule('public/src/render/three/camera-config.mjs');

  const horizontalDistance = Math.hypot(DEFAULT_CAMERA_CONFIG.offset.x, DEFAULT_CAMERA_CONFIG.offset.z);

  assert.ok(
    DEFAULT_CAMERA_CONFIG.offset.y <= 4.5,
    `Expected follow camera height <= 4.5, got ${DEFAULT_CAMERA_CONFIG.offset.y}`
  );
  assert.ok(
    horizontalDistance <= 4.5,
    `Expected horizontal camera distance <= 4.5, got ${horizontalDistance}`
  );
  assert.ok(
    DEFAULT_CAMERA_CONFIG.lookAheadDistance >= 0.4,
    `Expected some forward look-ahead for better depth perception, got ${DEFAULT_CAMERA_CONFIG.lookAheadDistance}`
  );
});
