const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

test('vendored three.js build remains compatible with WebGL 1 fallback browsers', () => {
  const threeModulePath = path.join(__dirname, '..', 'public', 'vendor', 'three.module.js');
  const source = fs.readFileSync(threeModulePath, 'utf8');

  assert.equal(
    source.includes('THREE.WebGLRenderer: WebGL 1 is not supported since r163.'),
    false,
    'The packaged browser client should not vendor a Three.js build that hard-fails on WebGL 1 browsers.'
  );
});
