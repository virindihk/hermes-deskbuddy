const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');

const {
  DEFAULT_SETTINGS,
  createSettingsStore,
} = require('../src/main/settings-store');

function createTempStore() {
  const userData = fs.mkdtempSync(path.join(os.tmpdir(), 'deskbuddy-settings-'));
  const app = {
    getPath(name) {
      assert.equal(name, 'userData');
      return userData;
    },
  };
  const store = createSettingsStore({ app, fs, path });
  return { userData, store };
}

test('normalizeSettings trims string fields and clamps petScale', () => {
  const { store } = createTempStore();

  assert.deepEqual(
    store.normalizeSettings({
      model: '  custom-model  ',
      hermesPath: '  /opt/hermes/bin/hermes  ',
      sessionId: '  session-123  ',
      petScale: 999,
    }),
    {
      ...DEFAULT_SETTINGS,
      model: 'custom-model',
      hermesPath: '/opt/hermes/bin/hermes',
      sessionId: 'session-123',
      petScale: 300,
    },
  );

  assert.equal(store.normalizeSettings({ petScale: 10 }).petScale, 50);
});

test('normalizeSettings keeps custom pet image fields, pet name, cron delivery, and always-on-top preference', () => {
  const { store } = createTempStore();

  assert.deepEqual(store.normalizeSettings({
    petImage: '  /pets/default.png  ',
    thinkingImage: '  /pets/thinking.webp  ',
    happyImage: '  /pets/happy.gif  ',
    petName: '  格格  ',
    locale: 'ja',
    cronDeliver: '  origin  ',
    alwaysOnTop: false,
  }), {
    ...DEFAULT_SETTINGS,
    petImage: '/pets/default.png',
    thinkingImage: '/pets/thinking.webp',
    happyImage: '/pets/happy.gif',
    petName: '格格',
    locale: 'ja',
    cronDeliver: 'origin',
    alwaysOnTop: false,
  });

  assert.equal(store.normalizeSettings({ petName: '   ' }).petName, DEFAULT_SETTINGS.petName);
  assert.equal(store.normalizeSettings({ locale: 'invalid' }).locale, DEFAULT_SETTINGS.locale);
  assert.equal(store.normalizeSettings({ alwaysOnTop: undefined }).alwaysOnTop, true);
});

test('readSettingsFromDisk returns default settings when settings file is missing or invalid JSON', () => {
  const { userData, store } = createTempStore();

  assert.deepEqual(store.readSettingsFromDisk(), DEFAULT_SETTINGS);

  fs.writeFileSync(path.join(userData, 'pet-settings.json'), '{not valid json', 'utf8');

  assert.deepEqual(store.readSettingsFromDisk(), DEFAULT_SETTINGS);
});

test('saveSettings writes pet-settings.json under userData and returns normalized settings', () => {
  const { userData, store } = createTempStore();

  const saved = store.saveSettings({
    model: '  saved-model  ',
    hermesPath: '  /usr/local/bin/hermes  ',
    sessionId: '  abc  ',
    petScale: 500,
  });

  const expectedPath = path.join(userData, 'pet-settings.json');
  assert.equal(store.getSettingsPath(), expectedPath);
  assert.deepEqual(saved, {
    ...DEFAULT_SETTINGS,
    model: 'saved-model',
    hermesPath: '/usr/local/bin/hermes',
    sessionId: 'abc',
    petScale: 300,
  });
  assert.deepEqual(JSON.parse(fs.readFileSync(expectedPath, 'utf8')), saved);
});
