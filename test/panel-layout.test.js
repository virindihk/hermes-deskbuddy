const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');

const root = path.resolve(__dirname, '..');
const modulePath = path.join(root, 'src/renderer/modules/panel-layout.js');

function loadLayout() {
  delete require.cache[require.resolve(modulePath)];
  return require(modulePath);
}

test('scaled pet layout computes desired bottom and required height', () => {
  const layout = loadLayout();

  assert.equal(layout.PET_BASE_SIZE, 138);
  assert.equal(layout.PET_RIGHT_OFFSET, 34);
  assert.equal(layout.PET_BOTTOM_OFFSET, 32);
  assert.equal(layout.PANEL_LEFT_MARGIN, 18);
  assert.equal(layout.PANEL_TOP_MARGIN, 18);
  assert.equal(layout.PANEL_GAP, 20);
  assert.equal(layout.MIN_PANEL_BOTTOM, 190);

  assert.equal(layout.getPetVisualSize(2), 276);
  assert.equal(layout.getDesiredPanelBottom(2), 328);
  assert.deepEqual(layout.getPanelLayout({ scale: 2, panelWidth: 320, panelHeight: 390 }), {
    desiredBottom: 328,
    petVisualSize: 276,
    requiredWidth: 372,
    requiredHeight: 736,
  });
});

test('window resize plan expands upward and leftward while preserving bottom and right anchors', () => {
  const layout = loadLayout();
  const bounds = { x: 900, y: 500, width: 300, height: 260 };

  const plan = layout.getWindowResizePlan({
    bounds,
    requiredWidth: 500,
    requiredHeight: 620,
    screen: { availLeft: 0, availTop: 0 },
  });

  assert.deepEqual(plan, {
    x: 700,
    y: 140,
    width: 500,
    height: 620,
    deltaWidth: 200,
    deltaHeight: 360,
    shouldResize: true,
  });
  assert.equal(plan.x + plan.width, bounds.x + bounds.width);
  assert.equal(plan.y + plan.height, bounds.y + bounds.height);
});

test('window resize plan clamps growth to available top-left screen space', () => {
  const layout = loadLayout();
  const bounds = { x: 80, y: 40, width: 300, height: 260 };

  const plan = layout.getWindowResizePlan({
    bounds,
    requiredWidth: 500,
    requiredHeight: 620,
    screen: { availLeft: 50, availTop: 20 },
  });

  assert.deepEqual(plan, {
    x: 50,
    y: 20,
    width: 330,
    height: 280,
    deltaWidth: 30,
    deltaHeight: 20,
    shouldResize: true,
  });
  assert.equal(plan.x + plan.width, bounds.x + bounds.width);
  assert.equal(plan.y + plan.height, bounds.y + bounds.height);
});

test('window resize plan does not shrink when the current bounds already satisfy the required size', () => {
  const layout = loadLayout();
  const bounds = { x: 900, y: 500, width: 500, height: 620 };

  assert.deepEqual(layout.getWindowResizePlan({
    bounds,
    requiredWidth: 300,
    requiredHeight: 400,
    screen: { availLeft: 0, availTop: 0 },
  }), {
    x: 900,
    y: 500,
    width: 500,
    height: 620,
    deltaWidth: 0,
    deltaHeight: 0,
    shouldResize: false,
  });
});

test('panel size clamp respects minimum panel size and available screen space', () => {
  const layout = loadLayout();

  assert.deepEqual(layout.clampPanelSize({
    panelWidth: 900,
    panelHeight: 700,
    targetWidth: 500,
    targetHeight: 620,
    desiredBottom: 328,
  }), {
    panelWidth: 448,
    panelHeight: 274,
    availablePanelWidth: 448,
    availablePanelHeight: 274,
  });

  assert.deepEqual(layout.clampPanelSize({
    panelWidth: 100,
    panelHeight: 100,
    targetWidth: 200,
    targetHeight: 220,
    desiredBottom: 328,
  }), {
    panelWidth: 260,
    panelHeight: 200,
    availablePanelWidth: 260,
    availablePanelHeight: 200,
  });
});

test('panel layout module is exposed as a browser global', () => {
  const source = fs.readFileSync(modulePath, 'utf8');
  const sandbox = { window: {} };

  vm.runInNewContext(source, sandbox, { filename: modulePath });

  assert.equal(sandbox.window.DeskBuddyPanelLayout.getDesiredPanelBottom(2), 328);
  assert.equal(sandbox.window.DeskBuddyPanelLayout.getPanelLayout({ scale: 1, panelWidth: 260, panelHeight: 200 }).requiredHeight, 408);
});
