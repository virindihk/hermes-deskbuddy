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
      apiConversationId: '  api-conv-123  ',
      apiBaseUrl: '  http://127.0.0.1:8642/v1/  ',
      petScale: 999,
    }),
    {
      ...DEFAULT_SETTINGS,
      model: 'custom-model',
      hermesPath: '/opt/hermes/bin/hermes',
      sessionId: 'session-123',
      apiConversationId: 'api-conv-123',
      apiBaseUrl: 'http://127.0.0.1:8642/v1/',
      petScale: 300,
    },
  );

  assert.equal(store.normalizeSettings({ petScale: 10 }).petScale, 50);
});

test('normalizeSettings supports CLI and independent API conversation modes', () => {
  const { store } = createTempStore();

  assert.equal(DEFAULT_SETTINGS.conversationMode, 'cli');
  assert.equal(DEFAULT_SETTINGS.apiBaseUrl, 'http://127.0.0.1:8642');
  assert.equal(DEFAULT_SETTINGS.apiConversationId, '');
  assert.deepEqual(DEFAULT_SETTINGS.apiMessages, []);
  assert.equal(store.normalizeSettings({ conversationMode: 'api' }).conversationMode, 'api');
  assert.equal(store.normalizeSettings({ conversationMode: 'cli' }).conversationMode, 'cli');
  assert.equal(store.normalizeSettings({ conversationMode: 'unknown' }).conversationMode, 'cli');
  assert.deepEqual(store.normalizeSettings({
    apiMessages: [
      { role: 'user', content: '  hi  ' },
      { role: 'assistant', content: '  hello  ' },
      { role: 'system', content: 'ignored role becomes user' },
      { role: 'user', content: '   ' },
      { role: 'user', content: [
        { type: 'text', text: '  看一下屏幕  ' },
        { type: 'image_url', image_url: { url: 'data:image/png;base64,abc123' } },
        { type: 'image_url', image_url: { url: 'file:///tmp/not-allowed.png' } },
        { type: 'unknown', text: 'skip me' },
      ] },
    ],
  }).apiMessages, [
    { role: 'user', content: 'hi' },
    { role: 'assistant', content: 'hello' },
    { role: 'user', content: 'ignored role becomes user' },
    { role: 'user', content: [
      { type: 'text', text: '看一下屏幕' },
      { type: 'image_url', image_url: { url: 'data:image/png;base64,abc123' } },
    ] },
  ]);
});

test('normalizeSettings keeps custom pet image fields, pet name, cron delivery, and always-on-top preference', () => {
  const { store } = createTempStore();

  assert.deepEqual(store.normalizeSettings({
    petImage: '  /pets/default.png  ',
    listeningImage: '  /pets/listening.png  ',
    thinkingImage: '  /pets/thinking.webp  ',
    happyImage: '  /pets/happy.gif  ',
    petName: '  格格  ',
    locale: 'ja',
    cronDeliver: '  origin  ',
    alwaysOnTop: false,
  }), {
    ...DEFAULT_SETTINGS,
    petImage: '/pets/default.png',
    listeningImage: '/pets/listening.png',
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

test('normalizeSettings persists valid window bounds and drops invalid bounds', () => {
  const { store } = createTempStore();

  assert.deepEqual(store.normalizeSettings({
    windowBounds: { x: '120.4', y: '-30.6', width: '420.8', height: '620.2' },
  }).windowBounds, {
    x: 120,
    y: -31,
    width: 421,
    height: 620,
  });

  assert.equal(store.normalizeSettings({ windowBounds: null }).windowBounds, null);
  assert.equal(store.normalizeSettings({ windowBounds: { x: 1, y: 2, width: 0, height: 620 } }).windowBounds, null);
  assert.equal(store.normalizeSettings({ windowBounds: { x: 1, y: Number.NaN, width: 420, height: 620 } }).windowBounds, null);
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
