const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');

const root = path.resolve(__dirname, '..');

function readText(relPath) {
  return fs.readFileSync(path.join(root, relPath), 'utf8');
}

test('Electron app files exist', () => {
  for (const rel of [
    'package.json',
    'src/main.js',
    'src/main/settings-store.js',
    'src/main/hermes-cli-client.js',
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

test('renderer index loads browser modules before renderer entrypoint', () => {
  const html = readText('src/renderer/index.html');
  const scripts = [...html.matchAll(/<script\s+[^>]*src="([^"]+)"/g)].map((match) => match[1]);

  assert.deepEqual(scripts.slice(-3), [
    'modules/pet-hit-test.js',
    'modules/panel-layout.js',
    'renderer.js',
  ]);
});

test('package.json points Electron at the main process and exposes expected scripts', () => {
  const pkg = JSON.parse(readText('package.json'));

  assert.equal(pkg.main, 'src/main.js');
  assert.equal(pkg.scripts.start, 'electron .');
  assert.equal(pkg.scripts.smoke, 'node scripts/smoke-hermes.js');
});

function loadPreloadBridge() {
  const exposed = [];
  const listeners = new Map();
  const calls = [];
  const ipcRenderer = {
    invoke(channel, ...args) {
      calls.push({ kind: 'invoke', channel, args });
      return { channel, args };
    },
    send(channel, ...args) {
      calls.push({ kind: 'send', channel, args });
    },
    on(channel, listener) {
      calls.push({ kind: 'on', channel });
      listeners.set(channel, listener);
    },
    removeListener(channel, listener) {
      calls.push({
        kind: 'removeListener',
        channel,
        sameListener: listeners.get(channel) === listener,
      });
      listeners.delete(channel);
    },
    removeAllListeners(channel) {
      calls.push({ kind: 'removeAllListeners', channel });
      listeners.delete(channel);
    },
  };
  const contextBridge = {
    exposeInMainWorld(name, api) {
      exposed.push({ name, api });
    },
  };
  const sandbox = {
    require(specifier) {
      if (specifier === 'electron') return { contextBridge, ipcRenderer };
      throw new Error(`Unexpected preload dependency: ${specifier}`);
    },
  };

  vm.runInNewContext(readText('src/preload.js'), sandbox, {
    filename: path.join(root, 'src/preload.js'),
  });

  return { exposed, desktopPet: exposed.find((entry) => entry.name === 'desktopPet')?.api, calls };
}

test('preload exposes the desktopPet bridge with stable API names', () => {
  const { exposed, desktopPet } = loadPreloadBridge();

  assert.deepEqual(exposed.map((entry) => entry.name), ['desktopPet']);
  assert.deepEqual(Object.keys(desktopPet).sort(), [
    'checkHermesHealth',
    'chooseImageField',
    'choosePetImage',
    'createCron',
    'detectHermesPath',
    'getHermesModelConfig',
    'getSessionMessages',
    'getSettings',
    'getWindowBounds',
    'listCrons',
    'listHermesProviders',
    'listSessions',
    'moveWindowBy',
    'offStream',
    'onChatVisibility',
    'onCronOpen',
    'onLocaleChanged',
    'onSettingsChanged',
    'onSettingsOpen',
    'onStreamChunk',
    'onStreamDone',
    'onStreamError',
    'onStreamTool',
    'openSettingsMenu',
    'quit',
    'resumeSession',
    'saveSettings',
    'sendMessage',
    'sendMessageStream',
    'setChatVisible',
    'setHermesModel',
    'setIgnoreMouseEvents',
    'setWindowBounds',
    'startHermesGateway',
    'toggleChat',
  ].sort());
});

function assertInvoke(desktopPet, calls, method, args, channel, expectedArgs = args) {
  calls.length = 0;

  const result = desktopPet[method](...args);

  assert.deepEqual(calls, [{ kind: 'invoke', channel, args: expectedArgs }]);
  assert.deepEqual(result, { channel, args: expectedArgs });
}

function normalizeJson(value) {
  return JSON.parse(JSON.stringify(value));
}

function assertSend(desktopPet, calls, method, args, channel, expectedArgs = args) {
  calls.length = 0;

  desktopPet[method](...args);

  assert.deepEqual(normalizeJson(calls), [{ kind: 'send', channel, args: expectedArgs }]);
}

test('preload bridge invokes the expected IPC channels', () => {
  const { desktopPet, calls } = loadPreloadBridge();

  for (const [method, args, channel] of [
    ['toggleChat', [], 'pet:toggle-chat'],
    ['setChatVisible', [true], 'pet:set-chat-visible'],
    ['moveWindowBy', [4, -2], 'pet:move-window-by'],
    ['openSettingsMenu', [{ x: 10, y: 20 }], 'pet:open-settings-menu'],
    ['getSettings', [], 'pet:get-settings'],
    ['saveSettings', [{ model: 'custom-model' }], 'pet:save-settings'],
    ['choosePetImage', [], 'pet:choose-image'],
    ['chooseImageField', ['happyImage'], 'pet:choose-image-field'],
    ['createCron', [{ schedule: '30m', prompt: 'ping' }], 'pet:create-cron'],
    ['listCrons', [], 'hermes:list-crons'],
    ['detectHermesPath', [], 'hermes:detect-path'],
    ['quit', [], 'pet:quit'],
    ['checkHermesHealth', [], 'hermes:health'],
    ['startHermesGateway', [], 'hermes:start-gateway'],
    ['sendMessage', [{ text: 'hi' }], 'hermes:send-message'],
    ['getWindowBounds', [], 'pet:get-window-bounds'],
    ['listSessions', [], 'hermes:list-sessions'],
    ['getSessionMessages', ['session-1'], 'hermes:get-session-messages'],
    ['resumeSession', ['session-1'], 'hermes:resume-session'],
    ['listHermesProviders', [], 'hermes:list-providers'],
    ['getHermesModelConfig', [], 'hermes:get-model-config'],
    ['setHermesModel', ['openrouter/claude-sonnet-4'], 'hermes:set-model'],
  ]) {
    assertInvoke(desktopPet, calls, method, args, channel);
  }
});

test('preload bridge sends stream, mouse, and window IPC messages', () => {
  const { desktopPet, calls } = loadPreloadBridge();

  assertSend(
    desktopPet,
    calls,
    'sendMessageStream',
    ['request-1', { text: 'hello' }],
    'hermes:send-message-stream',
    [{ text: 'hello', requestId: 'request-1' }],
  );
  assertSend(desktopPet, calls, 'setIgnoreMouseEvents', [true], 'pet:set-ignore-mouse-events');
  assertSend(desktopPet, calls, 'setWindowBounds', [1, 2, 300, 400], 'pet:set-window-bounds');
});

test('preload bridge subscribes and unsubscribes from expected IPC event channels', () => {
  const { desktopPet, calls } = loadPreloadBridge();

  for (const [method, args, channel] of [
    ['onStreamChunk', ['request-1', () => {}], 'stream:chunk:request-1'],
    ['onStreamTool', ['request-1', () => {}], 'stream:tool:request-1'],
    ['onStreamDone', ['request-1', () => {}], 'stream:done:request-1'],
    ['onStreamError', ['request-1', () => {}], 'stream:error:request-1'],
    ['onChatVisibility', [() => {}], 'chat:visibility'],
    ['onSettingsOpen', [() => {}], 'settings:open'],
    ['onCronOpen', [() => {}], 'cron:open'],
    ['onSettingsChanged', [() => {}], 'settings:changed'],
    ['onLocaleChanged', [() => {}], 'locale:changed'],
  ]) {
    calls.length = 0;
    const unsubscribe = desktopPet[method](...args);

    assert.deepEqual(calls, [{ kind: 'on', channel }]);
    unsubscribe();
    assert.deepEqual(calls[1], { kind: 'removeListener', channel, sameListener: true });
  }

  calls.length = 0;
  desktopPet.offStream('request-1');
  assert.deepEqual(calls, [
    { kind: 'removeAllListeners', channel: 'stream:chunk:request-1' },
    { kind: 'removeAllListeners', channel: 'stream:tool:request-1' },
    { kind: 'removeAllListeners', channel: 'stream:done:request-1' },
    { kind: 'removeAllListeners', channel: 'stream:error:request-1' },
  ]);
});
