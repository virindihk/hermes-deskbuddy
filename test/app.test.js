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
    'src/main/deskbuddy-conversation-store.js',
    'src/preload.js',
    'src/renderer/index.html',
    'src/renderer/renderer.js',
    'src/renderer/modules/i18n.js',
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

  assert.deepEqual(scripts.slice(-4), [
    'modules/i18n.js',
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

test('renderer exposes four avatar states with the running thinking asset', () => {
  const html = readText('src/renderer/index.html');
  const renderer = readText('src/renderer/renderer.js');

  assert.match(html, /id="listeningImage"/);
  assert.match(html, /id="chooseListeningImage"/);
  assert.match(renderer, /LISTEN:\s*'listen'/);
  assert.match(renderer, /DONE:\s*'done'/);
  assert.match(renderer, /pet_running\.png/);
  assert.match(renderer, /state === PET_STATES\.DONE[\s\S]*3000/);
  assert.equal(fs.existsSync(path.join(root, 'src/renderer/assets/pet_running.png')), true);
});

test('done avatar state keeps the configured pet scale after bounce animation', () => {
  const css = readText('src/renderer/styles.css');

  assert.match(css, /\.pet\.done\s*{[^}]*transform:\s*scale\(var\(--pet-scale\)\)/);
});

test('thinking avatar uses a subtle horizontal shake instead of float', () => {
  const css = readText('src/renderer/styles.css');

  assert.match(css, /\.pet\.thinking\s*{[^}]*animation:\s*thinkingShake\s+700ms\s+ease-in-out\s+infinite/);
  assert.match(css, /@keyframes thinkingShake\s*{[\s\S]*transform:\s*translateX\(-3px\)\s+scale\(var\(--pet-scale\)\)[\s\S]*transform:\s*translateX\(3px\)\s+scale\(var\(--pet-scale\)\)/);
  assert.doesNotMatch(css, /\.pet\.thinking\s*{[^}]*animation:\s*float\b/);
  assert.doesNotMatch(css, /@keyframes float\s*{/);
});

test('settings panel refreshes the existing Hermes model when opened', () => {
  const renderer = readText('src/renderer/renderer.js');
  const start = renderer.indexOf('function setSettingsVisible(visible)');
  const end = renderer.indexOf('function setCronVisible', start);
  const setSettingsVisibleBody = renderer.slice(start, end);

  assert.notEqual(start, -1);
  assert.notEqual(end, -1);
  assert.match(setSettingsVisibleBody, /if \(visible\) \{[\s\S]*void loadModelConfig\(\)/);
});

test('settings model picker uses provider and model dropdowns from Hermes options', () => {
  const html = readText('src/renderer/index.html');
  const preload = readText('src/preload.js');
  const renderer = readText('src/renderer/renderer.js');

  assert.match(html, /<select[^>]+id="modelSelect"/);
  assert.match(preload, /listHermesModelOptions:\s*\(\)\s*=>\s*ipcRenderer\.invoke\('hermes:list-model-options'\)/);
  assert.match(renderer, /const modelSelect = document\.getElementById\('modelSelect'\)/);
  assert.match(renderer, /window\.desktopPet\.listHermesModelOptions\(\)/);
  assert.match(renderer, /providerSelect\.addEventListener\('change',[\s\S]*refreshModelSelectOptions\(\)/);
  assert.match(renderer, /modelSelect\.addEventListener\('change',[\s\S]*modelInput\.value\s*=\s*modelSelect\.value/);
});

test('settings exposes CLI session and independent API server conversation modes', () => {
  const html = readText('src/renderer/index.html');
  const renderer = readText('src/renderer/renderer.js');

  assert.match(html, /id="conversationMode"/);
  assert.match(html, /value="cli"[^>]*>[^<]*Hermes CLI/);
  assert.match(html, /value="api"[^>]*>[^<]*API Server/);
  assert.match(html, /id="apiBaseUrl"/);
  assert.match(html, /id="apiConversationIdDisplay"/);
  assert.match(renderer, /const conversationModeSelect = document\.getElementById\('conversationMode'\)/);
  assert.match(renderer, /apiBaseUrlInput\.value = currentSettings\.apiBaseUrl/);
  assert.match(renderer, /apiConversationIdDisplay\.textContent = currentSettings\.apiConversationId \|\| '—'/);
  assert.match(renderer, /conversationMode:\s*conversationModeSelect\.value/);
  assert.match(renderer, /apiBaseUrl:\s*String\(apiBaseUrlInput\?\.value/);
  assert.match(renderer, /startNewSession[\s\S]*apiConversationId:\s*''/);
  assert.match(renderer, /startNewSession[\s\S]*apiMessages:\s*\[\]/);
});

test('API server mode uses DeskBuddy-local conversations instead of shared Hermes API Server sessions', () => {
  const main = readText('src/main.js');
  const renderer = readText('src/renderer/renderer.js');
  const client = readText('src/main/hermes-cli-client.js');

  assert.match(main, /createDeskBuddyConversationStore/);
  assert.match(main, /conversationStore\.listConversations\(\)/);
  assert.match(main, /conversationStore\.getMessages\(cleanId\)/);
  assert.match(main, /conversationStore\.appendTurn/);
  assert.match(main, /WHERE source = 'cli'/);
  assert.doesNotMatch(main, /source = '\$\{sessionSource\}'/);
  assert.doesNotMatch(main, /source = 'api_server'/);
  assert.doesNotMatch(client, /headers\['X-Hermes-Session-Id'\]/);
  assert.match(renderer, /async function renderApiHistoryFromSettings\(/);
  assert.match(renderer, /if \(currentSettings\.conversationMode === 'api'\) \{[\s\S]*window\.desktopPet\.saveSettings\(\{ apiConversationId: sessionId/);
  assert.match(renderer, /await loadSessionHistory\(sessionId\)/);
  assert.match(renderer, /apiMessages: history\.slice\(-40\)\.map/);
  assert.match(renderer, /onStreamDone\(requestId,\s*async \(data = \{\}\)/);
  assert.match(renderer, /await loadSessions\(\);[\s\S]*sessionSelect\.value = data\.sessionId/);
  assert.doesNotMatch(renderer, /sessionSelect\.disabled = true/);
});

test('main process dispatches chat through CLI or API server mode separately', () => {
  const main = readText('src/main.js');

  assert.match(main, /getSettings\(\)\.conversationMode === 'api'/);
  assert.match(main, /hermesCliClient\.runApiChat\(messages\)/);
  assert.match(main, /saveSettings\(\{[\s\S]*apiConversationId: savedConversation\.id/);
  assert.match(main, /sender\.send\(channel\('done'\), \{ sessionId: result\.sessionId \|\| '' \}\)/);
  assert.match(main, /hermesCliClient\.runHermesChat\(prompt, currentSessionId\)/);
  assert.match(main, /saveSettings\(\{ sessionId \}\)/);
});

test('settings image and action controls stay compact', () => {
  const css = readText('src/renderer/styles.css');

  assert.match(css, /\.image-row\s*{[^}]*align-items:\s*center/);
  assert.match(css, /\.image-row input\s*{[^}]*min-height:\s*30px[^}]*padding:\s*5px 8px[^}]*font-size:\s*12px/);
  assert.match(css, /\.image-row button\s*{[^}]*min-width:\s*48px[^}]*padding:\s*5px 8px[^}]*font-size:\s*12px/);
  assert.match(css, /#resetAllImages\s*{[^}]*justify-self:\s*start[^}]*padding:\s*6px 12px[^}]*font-size:\s*12px/);
  assert.match(css, /#newSession\s*{[^}]*padding:\s*6px 10px[^}]*font-size:\s*12px/);
  assert.match(css, /#saveSettings\s*{[^}]*justify-self:\s*end[^}]*padding:\s*7px 14px[^}]*font-size:\s*12px/);
});

test('chat panel has a screen capture button next to close and attachment control next to send', () => {
  const html = readText('src/renderer/index.html');
  const renderer = readText('src/renderer/renderer.js');
  const css = readText('src/renderer/styles.css');

  assert.match(html, /<div[^>]+class="chat-actions"[\s\S]*id="screenCapture"[\s\S]*id="closeChat"/);
  assert.match(html, /<button[^>]+id="attachFile"[\s\S]*<input[^>]+id="attachmentInput"[^>]+type="file"/);
  assert.match(html, /<button[^>]+id="send"/);
  assert.match(renderer, /const screenCaptureButton = document\.getElementById\('screenCapture'\)/);
  assert.match(renderer, /window\.desktopPet\.captureScreen\(\)/);
  assert.match(renderer, /const attachFileButton = document\.getElementById\('attachFile'\)/);
  assert.match(renderer, /window\.desktopPet\.chooseAttachment\(\)/);
  assert.match(renderer, /pendingAttachments/);
  assert.match(css, /\.chat-actions\s*{/);
  assert.match(css, /\.composer-actions\s*{/);
  assert.match(css, /\.attachment-preview\s*{/);
});

test('screen capture uses the localized default prompt instead of hardcoded Chinese', () => {
  const renderer = readText('src/renderer/renderer.js');
  const start = renderer.indexOf('screenCaptureButton.addEventListener');
  const end = renderer.indexOf('if (attachFileButton)', start);
  const screenCaptureHandler = renderer.slice(start, end);

  assert.notEqual(start, -1);
  assert.notEqual(end, -1);
  assert.match(screenCaptureHandler, /defaultPrompt:\s*t\('screenCaptureDefaultPrompt'\)/);
  assert.doesNotMatch(screenCaptureHandler, /请简要说明屏幕内容/);
});

test('preload exposes screen capture and file dialog bridge methods', () => {
  const { desktopPet, calls } = loadPreloadBridge();

  assert.equal(typeof desktopPet.captureScreen, 'function');
  assert.equal(typeof desktopPet.chooseAttachment, 'function');
  assertInvoke(desktopPet, calls, 'captureScreen', [], 'pet:capture-screen');
  assertInvoke(desktopPet, calls, 'chooseAttachment', [], 'pet:choose-attachment');
});

test('main process exposes macOS screencapture and attachment IPC plumbing', () => {
  const main = readText('src/main.js');

  assert.match(main, /function captureScreen\(\)/);
  assert.match(main, /spawn\('screencapture',\s*\['-i',\s*'-s',\s*'-x',\s*filePath\]/);
  assert.match(main, /canceled:\s*true/);
  assert.match(main, /ipcMain\.handle\('pet:capture-screen'/);
  assert.match(main, /function chooseAttachment\(\)/);
  assert.match(main, /ipcMain\.handle\('pet:choose-attachment'/);
  assert.match(main, /properties:\s*\['openFile'\]/);
  assert.match(main, /mimeType:/);
});

test('main process uses canonical pet userData and migrates legacy deskbuddy settings', () => {
  const main = readText('src/main.js');

  assert.match(main, /const CANONICAL_APP_NAME = 'pet'/);
  assert.match(main, /const LEGACY_USER_DATA_NAMES = \['hermes-deskbuddy', 'hermes-pet'\]/);
  assert.match(main, /app\.setName\(CANONICAL_APP_NAME\)/);
  assert.match(main, /app\.setPath\('userData', canonicalUserDataPath\)/);
  assert.match(main, /migrateLegacySettingsToUserData\(canonicalUserDataPath\)/);
});

test('main process restores and persists deskbuddy window bounds', () => {
  const main = readText('src/main.js');

  assert.match(main, /const initialBounds = getInitialWindowBounds\(settings, display\)/);
  assert.match(main, /\.\.\.initialBounds/);
  assert.match(main, /function saveCurrentWindowBounds\(\)/);
  assert.match(main, /saveSettings\(\{ windowBounds:/);
  assert.match(main, /mainWindow\.on\('moved', saveCurrentWindowBounds\)/);
  assert.match(main, /mainWindow\.on\('resized', saveCurrentWindowBounds\)/);
  assert.match(main, /mainWindow\.once\('close', saveCurrentWindowBounds\)/);
  assert.match(main, /ipcMain\.handle\('pet:move-window-by'[\s\S]*saveCurrentWindowBounds\(\)/);
  assert.match(main, /ipcMain\.on\('pet:set-window-bounds'[\s\S]*saveCurrentWindowBounds\(\)/);
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
    'captureScreen',
    'chooseAttachment',
    'chooseImageField',
    'choosePetImage',
    'createCron',
    'detectHermesPath',
    'getHermesModelConfig',
    'getSessionMessages',
    'getSettings',
    'getWindowBounds',
    'listCrons',
    'listHermesModelOptions',
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
    ['captureScreen', [], 'pet:capture-screen'],
    ['chooseAttachment', [], 'pet:choose-attachment'],
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
    ['listHermesModelOptions', [], 'hermes:list-model-options'],
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
