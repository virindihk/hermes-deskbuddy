const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const root = path.resolve(__dirname, '..');

test('Electron app files exist', () => {
  for (const rel of [
    'src/main.js',
    'src/preload.js',
    'src/renderer/index.html',
    'src/renderer/renderer.js',
    'src/renderer/modules/pet-hit-test.js',
    'src/renderer/modules/panel-layout.js',
    'src/renderer/styles.css',
  ]) {
    assert.equal(fs.existsSync(path.join(root, rel)), true, `${rel} should exist`);
  }
});

test('renderer index loads hit-test and panel-layout modules before renderer entrypoint', () => {
  const html = fs.readFileSync(path.join(root, 'src/renderer/index.html'), 'utf8');

  const petModuleIndex = html.indexOf('modules/pet-hit-test.js');
  const panelModuleIndex = html.indexOf('modules/panel-layout.js');
  const rendererIndex = html.indexOf('renderer.js');

  assert.notEqual(petModuleIndex, -1);
  assert.notEqual(panelModuleIndex, -1);
  assert.notEqual(rendererIndex, -1);
  assert.ok(petModuleIndex < rendererIndex, 'pet-hit-test module should load before renderer.js');
  assert.ok(panelModuleIndex < rendererIndex, 'panel-layout module should load before renderer.js');
});

test('package.json exposes start and smoke scripts', () => {
  const pkg = JSON.parse(fs.readFileSync(path.join(root, 'package.json'), 'utf8'));
  assert.equal(pkg.main, 'src/main.js');
  assert.equal(pkg.scripts.start, 'electron .');
  assert.equal(pkg.scripts.smoke, 'node scripts/smoke-hermes.js');
});

test('renderer uses desktopPet bridge instead of Node integration', () => {
  const renderer = fs.readFileSync(path.join(root, 'src/renderer/renderer.js'), 'utf8');
  assert.match(renderer, /window\.desktopPet\.sendMessage/);
  assert.doesNotMatch(renderer, /require\(/);
});

test('main process talks to Hermes through the CLI', () => {
  const main = fs.readFileSync(path.join(root, 'src/main.js'), 'utf8');

  assert.match(main, /const \{ spawn \} = require\('child_process'\)/);
  assert.match(main, /function findHermesBinary\(\)/);
  assert.match(main, /ipcMain\.handle\('hermes:health'/);
  assert.match(main, /spawn\(findHermesBinary\(\), \['--version'\]/);
  assert.match(main, /function runHermesChat\(text, sessionId = ''\)/);
  assert.match(main, /const args = \['chat', '-q', text, '-Q'\]/);
  assert.match(main, /args\.push\('-m', model\)/);
  assert.match(main, /spawn\(findHermesBinary\(\), args/);
  assert.doesNotMatch(main, /127\.0\.0\.1:8642/);
  assert.doesNotMatch(main, /\/v1\/chat\/completions/);
});

test('pet is clickable and drag is handled manually', () => {
  const styles = fs.readFileSync(path.join(root, 'src/renderer/styles.css'), 'utf8');
  const renderer = fs.readFileSync(path.join(root, 'src/renderer/renderer.js'), 'utf8');
  const preload = fs.readFileSync(path.join(root, 'src/preload.js'), 'utf8');
  const main = fs.readFileSync(path.join(root, 'src/main.js'), 'utf8');

  assert.match(styles, /\.pet\s*\{[\s\S]*?-webkit-app-region:\s*no-drag/);
  assert.match(renderer, /window\.desktopPet\.moveWindowBy/);
  assert.match(preload, /moveWindowBy/);
  assert.match(main, /ipcMain\.handle\('pet:move-window-by'/);
});

test('pet transparent pixels do not capture clicks', () => {
  const renderer = fs.readFileSync(path.join(root, 'src/renderer/renderer.js'), 'utf8');
  const hitTestModule = fs.readFileSync(path.join(root, 'src/renderer/modules/pet-hit-test.js'), 'utf8');

  assert.match(hitTestModule, /PET_HIT_ALPHA_THRESHOLD = 24/);
  assert.match(hitTestModule, /function mapPointToContainedImage\(/);
  assert.match(hitTestModule, /function isAlphaHit\(/);
  assert.match(hitTestModule, /function isFallbackShapeHit\(/);
  assert.match(renderer, /DeskBuddyPetHitTest/);
  assert.match(renderer, /function setPetHitMask\(/);
  assert.match(renderer, /function isPetVisualHit\(/);
  assert.match(renderer, /mapPointToContainedImage\(x, y, rect, petHitMask\)/);
  assert.match(renderer, /getImageData\(imageX, imageY, 1, 1\)/);
  assert.match(renderer, /return isAlphaHit\(pixel\[3\]\)/);
  assert.match(renderer, /return isFallbackShapeHit\(x, y, rect\)/);
  assert.match(renderer, /function isPetPointerEvent\(/);
  assert.match(renderer, /if \(petEl\) return isPetVisualHit\(x, y\)/);
  assert.match(renderer, /if \(!isPetPointerEvent\(event\)\) return/);
  assert.doesNotMatch(renderer, /const PET_HIT_ALPHA_THRESHOLD = 24/);
});

test('scaled pet panels expand the transparent window instead of clipping', () => {
  const renderer = fs.readFileSync(path.join(root, 'src/renderer/renderer.js'), 'utf8');
  const layoutModule = fs.readFileSync(path.join(root, 'src/renderer/modules/panel-layout.js'), 'utf8');

  assert.match(layoutModule, /PET_BASE_SIZE = 138/);
  assert.match(layoutModule, /PANEL_TOP_MARGIN = 18/);
  assert.match(layoutModule, /function getWindowResizePlan\(/);
  assert.match(renderer, /DeskBuddyPanelLayout/);
  assert.match(renderer, /function getVisiblePanel\(\)/);
  assert.match(renderer, /async function updatePanelOffsets\(\)/);
  assert.match(renderer, /getPanelLayout\(\{ panelWidth, panelHeight \}\)/);
  assert.match(renderer, /window\.desktopPet\.getWindowBounds\(\)/);
  assert.match(renderer, /getWindowResizePlan\(/);
  assert.match(renderer, /resizePlan\.x/);
  assert.match(renderer, /resizePlan\.y/);
  assert.match(renderer, /window\.desktopPet\.setWindowBounds/);
  assert.match(renderer, /Math\.min\(desiredBottom, maxBottom\)/);
  assert.doesNotMatch(renderer, /const PET_BASE_SIZE = 138/);
});

test('scaled pet stays anchored and panels stay close while resizing', () => {
  const styles = fs.readFileSync(path.join(root, 'src/renderer/styles.css'), 'utf8');
  const renderer = fs.readFileSync(path.join(root, 'src/renderer/renderer.js'), 'utf8');
  const layoutModule = fs.readFileSync(path.join(root, 'src/renderer/modules/panel-layout.js'), 'utf8');
  const main = fs.readFileSync(path.join(root, 'src/main.js'), 'utf8');

  assert.match(styles, /\.pet\s*\{[\s\S]*?transform-origin:\s*bottom right/);
  assert.match(styles, /\.chat-panel\.near-pet\s*\{[\s\S]*?bottom:\s*190px/);
  assert.match(layoutModule, /PANEL_GAP = 20/);
  assert.match(layoutModule, /function clampPanelSize\(/);
  assert.match(renderer, /function getDesiredPanelBottom\(\)/);
  assert.match(renderer, /DeskBuddyPanelLayout\.getDesiredPanelBottom\(getPetScale\(\)\)/);
  assert.match(renderer, /function getPanelLayout\(/);
  assert.match(renderer, /DeskBuddyPanelLayout\.getPanelLayout\(\{ scale: getPetScale\(\), panelWidth, panelHeight \}\)/);
  assert.match(renderer, /getPanelLayout\(\{ panelWidth: newW, panelHeight: newH \}\)/);
  assert.match(renderer, /const maxTargetH = corner\.includes\('top'\)/);
  assert.match(renderer, /const maxTargetW = corner\.includes\('left'\)/);
  assert.match(renderer, /clampPanelSize\(\{/);
  assert.match(renderer, /panel\.style\.height = `\$\{availablePanelHeight\}px`/);
  assert.match(renderer, /window\.addEventListener\('resize'/);
  assert.doesNotMatch(renderer, /const PANEL_BOTTOM_OFFSET = 220/);
  assert.match(main, /MIN_WIN_H = 200 \+ 190/);
});

test('chat panel resize batches window bounds to avoid flicker', () => {
  const renderer = fs.readFileSync(path.join(root, 'src/renderer/renderer.js'), 'utf8');

  assert.match(renderer, /function scheduleResizeWindowBounds\(/);
  assert.match(renderer, /window\.requestAnimationFrame\(flushResizeWindowBounds\)/);
  assert.match(renderer, /window\.cancelAnimationFrame\(pendingResizeFrame\)/);
  assert.match(renderer, /function flushResizeWindowBounds\(\)/);
  assert.match(renderer, /if \(resizingChat\) return;/);
  assert.match(renderer, /scheduleResizeWindowBounds\(newX, newY, targetWidth, targetHeight\)/);
  assert.match(renderer, /flushResizeWindowBounds\(\)/);
});

test('app is branded as Hermes DeskBuddy', () => {
  const html = fs.readFileSync(path.join(root, 'src/renderer/index.html'), 'utf8');
  const main = fs.readFileSync(path.join(root, 'src/main.js'), 'utf8');
  const pkg = JSON.parse(fs.readFileSync(path.join(root, 'package.json'), 'utf8'));

  assert.equal(pkg.name, 'hermes-deskbuddy');
  assert.equal(pkg.build.appId, 'com.leo.hermes-deskbuddy');
  assert.equal(pkg.build.productName, 'Hermes DeskBuddy');
  assert.match(html, /<title>Hermes DeskBuddy<\/title>/);
  assert.match(main, /title:\s*'Hermes DeskBuddy'/);
});

test('right-click opens a pet settings menu through the preload bridge', () => {
  const html = fs.readFileSync(path.join(root, 'src/renderer/index.html'), 'utf8');
  const renderer = fs.readFileSync(path.join(root, 'src/renderer/renderer.js'), 'utf8');
  const preload = fs.readFileSync(path.join(root, 'src/preload.js'), 'utf8');
  const main = fs.readFileSync(path.join(root, 'src/main.js'), 'utf8');

  assert.match(html, /id="settingsPanel"/);
  assert.match(renderer, /addEventListener\('contextmenu'/);
  assert.match(renderer, /window\.desktopPet\.openSettingsMenu/);
  assert.match(preload, /openSettingsMenu:\s*\(point\)\s*=>\s*ipcRenderer\.invoke\('pet:open-settings-menu'/);
  assert.match(main, /const \{[\s\S]*Menu[\s\S]*\} = require\('electron'\)/);
  assert.match(main, /ipcMain\.handle\('pet:open-settings-menu'/);
  assert.match(main, /settings:open/);
});

test('pet settings support custom image and model persistence', () => {
  const html = fs.readFileSync(path.join(root, 'src/renderer/index.html'), 'utf8');
  const renderer = fs.readFileSync(path.join(root, 'src/renderer/renderer.js'), 'utf8');
  const preload = fs.readFileSync(path.join(root, 'src/preload.js'), 'utf8');
  const main = fs.readFileSync(path.join(root, 'src/main.js'), 'utf8');

  assert.match(html, /id="petImage"/);
  assert.match(html, /id="modelInput"/);
  assert.match(main, /pet-settings\.json/);
  assert.match(main, /app\.getPath\('userData'\)/);
  assert.match(main, /ipcMain\.handle\('pet:get-settings'/);
  assert.match(main, /ipcMain\.handle\('pet:save-settings'/);
  assert.match(main, /ipcMain\.handle\('pet:choose-image'/);
  assert.match(main, /model:\s*String\(settings\.model \|\| DEFAULT_SETTINGS\.model\)\.trim\(\) \|\| DEFAULT_SETTINGS\.model/);
  assert.match(main, /cachedSettings = normalizeSettings\(\{ \.\.\.getSettings\(\), \.\.\.partialSettings \}\)/);
  assert.match(main, /const model = getSettings\(\)\.model/);
  assert.match(preload, /getSettings/);
  assert.match(preload, /saveSettings/);
  assert.match(preload, /choosePetImage/);
  assert.match(renderer, /applySettings/);
});

test('pet settings can create Hermes cron jobs safely', () => {
  const html = fs.readFileSync(path.join(root, 'src/renderer/index.html'), 'utf8');
  const renderer = fs.readFileSync(path.join(root, 'src/renderer/renderer.js'), 'utf8');
  const preload = fs.readFileSync(path.join(root, 'src/preload.js'), 'utf8');
  const main = fs.readFileSync(path.join(root, 'src/main.js'), 'utf8');

  assert.match(html, /id="cronForm"/);
  assert.match(html, /id="cronSchedule"/);
  assert.match(html, /id="cronPrompt"/);
  assert.match(main, /ipcMain\.handle\('pet:create-cron'/);
  assert.match(main, /'cron',\s*'create'/);
  assert.match(main, /--deliver/);
  assert.doesNotMatch(main, /shell:\s*true/);
  assert.match(preload, /createCron/);
  assert.match(renderer, /createCron/);
});
