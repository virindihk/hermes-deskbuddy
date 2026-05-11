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

test('main process targets Hermes OpenAI-compatible API', () => {
  const main = fs.readFileSync(path.join(root, 'src/main.js'), 'utf8');
  assert.match(main, /127\.0\.0\.1:8642/);
  assert.match(main, /\/v1\/chat\/completions/);
  assert.match(main, /hermes-agent/);
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

test('app is branded as pet', () => {
  const html = fs.readFileSync(path.join(root, 'src/renderer/index.html'), 'utf8');
  const main = fs.readFileSync(path.join(root, 'src/main.js'), 'utf8');
  const pkg = JSON.parse(fs.readFileSync(path.join(root, 'package.json'), 'utf8'));

  assert.equal(pkg.name, 'pet');
  assert.match(html, /<title>pet<\/title>/);
  assert.match(html, /class="title">pet<\/div>/);
  assert.match(main, /title:\s*'pet'/);
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
  assert.match(main, /model:\s*getSettings\(\)\.model/);
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
