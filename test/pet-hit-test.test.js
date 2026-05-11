const test = require('node:test');
const assert = require('node:assert/strict');

const hitTest = require('../src/renderer/modules/pet-hit-test');

const rect = { left: 10, top: 20, width: 200, height: 200 };

test('transparent alpha below threshold returns false', () => {
  assert.equal(hitTest.PET_HIT_ALPHA_THRESHOLD, 24);
  assert.equal(hitTest.isAlphaHit(hitTest.PET_HIT_ALPHA_THRESHOLD - 1), false);
  assert.equal(hitTest.isAlphaHit(hitTest.PET_HIT_ALPHA_THRESHOLD), true);
});

test('pointInRect treats rectangle edges as hits', () => {
  assert.equal(hitTest.pointInRect(rect.left, rect.top, rect), true);
  assert.equal(hitTest.pointInRect(rect.left + rect.width, rect.top + rect.height, rect), true);
  assert.equal(hitTest.pointInRect(rect.left - 1, rect.top, rect), false);
});

test('contained-image mapping handles letterboxing', () => {
  const imageSize = { width: 200, height: 100 };

  assert.equal(hitTest.mapPointToContainedImage(110, 30, rect, imageSize), null);
  assert.deepEqual(hitTest.mapPointToContainedImage(110, 120, rect, imageSize), { x: 100, y: 50 });
});

test('contained-image mapping handles pillarboxing', () => {
  const imageSize = { width: 100, height: 200 };

  assert.equal(hitTest.mapPointToContainedImage(30, 120, rect, imageSize), null);
  assert.deepEqual(hitTest.mapPointToContainedImage(110, 120, rect, imageSize), { x: 50, y: 100 });
});

test('fallback ellipse rejects obvious corner transparency and accepts center', () => {
  assert.equal(hitTest.isFallbackShapeHit(rect.left, rect.top, rect), false);
  assert.equal(hitTest.isFallbackShapeHit(rect.left + rect.width, rect.top + rect.height, rect), false);
  assert.equal(hitTest.isFallbackShapeHit(rect.left + rect.width / 2, rect.top + rect.height / 2, rect), true);
});
