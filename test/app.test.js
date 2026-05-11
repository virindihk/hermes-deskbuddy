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
    'src/renderer/styles.css',
  ]) {
    assert.equal(fs.existsSync(path.join(root, rel)), true, `${rel} should exist`);
  }
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

test('main process talks to Hermes through the CLI module', () => {
  const main = fs.readFileSync(path.join(root, 'src/main.js'), 'utf8');
  const client = fs.readFileSync(path.join(root, 'src/main/hermes-cli-client.js'), 'utf8');

  assert.match(main, /const \{ spawn \} = require\('child_process'\)/);
  assert.match(main, /const \{ createHermesCliClient \} = require\('\.\/main\/hermes-cli-client'\)/);
  assert.match(main, /const hermesCliClient = createHermesCliClient\(/);
  assert.match(main, /hermesCliClient\.checkHealth\(\)/);
  assert.match(main, /hermesCliClient\.runHermesChat\(cleanText, currentSessionId\)/);
  assert.match(main, /hermesCliClient\.parseHermesChatOutput\(result\.stdout\)/);
  assert.doesNotMatch(main, /result\.combined \|\| result\.stdout/);
  assert.doesNotMatch(main, /function findHermesBinary\(\)/);
  assert.doesNotMatch(main, /function runHermesChat\(text, sessionId = ''\)/);
  assert.match(client, /const args = \['chat', '-q', text, '-Q'\]/);
  assert.match(client, /args\.push\('-m', model\)/);
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

  assert.match(renderer, /const PET_HIT_ALPHA_THRESHOLD = 24/);
  assert.match(renderer, /function setPetHitMask\(/);
  assert.match(renderer, /function isPetVisualHit\(/);
  assert.match(renderer, /getImageData\(imageX, imageY, 1, 1\)/);
  assert.match(renderer, /return pixel\[3\] >= PET_HIT_ALPHA_THRESHOLD/);
  assert.match(renderer, /function isPetPointerEvent\(/);
  assert.match(renderer, /if \(petEl\) return isPetVisualHit\(x, y\)/);
  assert.match(renderer, /if \(!isPetPointerEvent\(event\)\) return/);
});

test('scaled pet panels expand the transparent window instead of clipping', () => {
  const renderer = fs.readFileSync(path.join(root, 'src/renderer/renderer.js'), 'utf8');

  assert.match(renderer, /const PET_BASE_SIZE = 138/);
  assert.match(renderer, /const PANEL_TOP_MARGIN = 18/);
  assert.match(renderer, /function getVisiblePanel\(\)/);
  assert.match(renderer, /async function updatePanelOffsets\(\)/);
  assert.match(renderer, /requiredHeight:\s*Math\.ceil\(panelHeight \+ desiredBottom \+ PANEL_TOP_MARGIN\)/);
  assert.match(renderer, /window\.desktopPet\.getWindowBounds\(\)/);
  assert.match(renderer, /bounds\.y - deltaHeight/);
  assert.match(renderer, /bounds\.x - deltaWidth/);
  assert.match(renderer, /window\.desktopPet\.setWindowBounds/);
  assert.match(renderer, /Math\.min\(desiredBottom, maxBottom\)/);
});

test('scaled pet stays anchored and panels stay close while resizing', () => {
  const styles = fs.readFileSync(path.join(root, 'src/renderer/styles.css'), 'utf8');
  const renderer = fs.readFileSync(path.join(root, 'src/renderer/renderer.js'), 'utf8');
  const main = fs.readFileSync(path.join(root, 'src/main.js'), 'utf8');

  assert.match(styles, /\.pet\s*\{[\s\S]*?transform-origin:\s*bottom right/);
  assert.match(styles, /\.chat-panel\.near-pet\s*\{[\s\S]*?bottom:\s*190px/);
  assert.match(renderer, /const PANEL_GAP = 20/);
  assert.match(renderer, /function getDesiredPanelBottom\(\)/);
  assert.match(renderer, /Math\.round\(getPetVisualSize\(\) \+ PET_BOTTOM_OFFSET \+ PANEL_GAP\)/);
  assert.match(renderer, /function getPanelLayout\(/);
  assert.match(renderer, /Math\.max\(panelWidth, petVisualSize\)/);
  assert.match(renderer, /getPanelLayout\(\{ panelWidth: newW, panelHeight: newH \}\)/);
  assert.match(renderer, /const maxTargetH = corner\.includes\('top'\)/);
  assert.match(renderer, /const maxTargetW = corner\.includes\('left'\)/);
  assert.match(renderer, /const availablePanelHeight = Math\.max\(200, targetHeight - desiredBottom - PANEL_TOP_MARGIN\)/);
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

test('pet settings support custom image and model persistence through settings store module', () => {
  const html = fs.readFileSync(path.join(root, 'src/renderer/index.html'), 'utf8');
  const renderer = fs.readFileSync(path.join(root, 'src/renderer/renderer.js'), 'utf8');
  const preload = fs.readFileSync(path.join(root, 'src/preload.js'), 'utf8');
  const main = fs.readFileSync(path.join(root, 'src/main.js'), 'utf8');
  const settingsStore = fs.readFileSync(path.join(root, 'src/main/settings-store.js'), 'utf8');

  assert.match(html, /id="petImage"/);
  assert.match(html, /id="modelInput"/);
  assert.match(main, /const \{ createSettingsStore \} = require\('\.\/main\/settings-store'\)/);
  assert.match(main, /const settingsStore = createSettingsStore\(\{ app, fs, path \}\)/);
  assert.match(settingsStore, /pet-settings\.json/);
  assert.match(settingsStore, /app\.getPath\('userData'\)/);
  assert.match(main, /ipcMain\.handle\('pet:get-settings'/);
  assert.match(main, /ipcMain\.handle\('pet:save-settings'/);
  assert.match(main, /ipcMain\.handle\('pet:choose-image'/);
  assert.doesNotMatch(main, /function normalizeSettings\(settings = \{\}\)/);
  assert.doesNotMatch(main, /let cachedSettings = null/);
  assert.match(settingsStore, /model:\s*String\(settings\.model \|\| DEFAULT_SETTINGS\.model\)\.trim\(\) \|\| DEFAULT_SETTINGS\.model/);
  assert.match(main, /hermesCliClient\.runHermesChat\(cleanText, currentSessionId\)/);
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
