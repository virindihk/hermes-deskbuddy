const test = require('node:test');
const assert = require('node:assert/strict');
const { EventEmitter } = require('node:events');
const path = require('node:path');

const {
  createHermesCliClient,
  parseHermesModelOptionsFromConfig,
} = require('../src/main/hermes-cli-client');

function createFakeFs(executablePaths = []) {
  const accessCalls = [];
  const executableSet = new Set(executablePaths);
  return {
    constants: { X_OK: 1 },
    accessCalls,
    accessSync(filePath, mode) {
      accessCalls.push({ filePath, mode });
      if (!executableSet.has(filePath)) {
        throw new Error(`${filePath} is not executable`);
      }
    },
  };
}

function createSpawnMock(results = []) {
  const calls = [];
  const spawn = (command, args, options) => {
    calls.push({ command, args, options });
    const result = results.shift() || {};
    const child = new EventEmitter();
    child.stdout = new EventEmitter();
    child.stderr = new EventEmitter();

    queueMicrotask(() => {
      if (result.error) {
        child.emit('error', result.error);
        return;
      }
      if (result.stdout) child.stdout.emit('data', Buffer.from(result.stdout));
      if (result.stderr) child.stderr.emit('data', Buffer.from(result.stderr));
      child.emit('close', result.code || 0);
    });

    return child;
  };
  spawn.calls = calls;
  return spawn;
}

function createClient(overrides = {}) {
  return createHermesCliClient({
    fs: overrides.fs || createFakeFs(),
    path,
    os: overrides.os || { homedir: () => '/Users/tester' },
    spawn: overrides.spawn || createSpawnMock(),
    getSettings: overrides.getSettings || (() => ({ hermesPath: '', model: 'hermes-agent' })),
    fetchImpl: overrides.fetchImpl,
    env: overrides.env || { HOME: '/Users/tester', PATH: '/usr/bin' },
  });
}

test('findHermesBinary honors settings.hermesPath first when executable', () => {
  const fakeFs = createFakeFs(['/custom/bin/hermes']);
  const client = createClient({
    fs: fakeFs,
    getSettings: () => ({ hermesPath: '/custom/bin/hermes', model: 'hermes-agent' }),
  });

  assert.equal(client.findHermesBinary(), '/custom/bin/hermes');
  assert.deepEqual(fakeFs.accessCalls, [
    { filePath: '/custom/bin/hermes', mode: fakeFs.constants.X_OK },
  ]);
});

test('getHermesEnv prepends common bin paths without dropping existing PATH', () => {
  const client = createClient({
    env: { HOME: '/Users/leo', PATH: '/custom/bin:/usr/bin', KEEP_ME: 'yes' },
  });

  const hermesEnv = client.getHermesEnv();

  assert.equal(hermesEnv.KEEP_ME, 'yes');
  assert.equal(
    hermesEnv.PATH,
    '/Users/leo/.local/bin:/opt/homebrew/bin:/usr/local/bin:/bin:/custom/bin:/usr/bin',
  );
});

test('runHermesChat builds chat args with model and resumed session', async () => {
  const fakeFs = createFakeFs(['/custom/bin/hermes']);
  const spawn = createSpawnMock([{ stdout: 'session_id: s2\nhello', code: 0 }]);
  const client = createClient({
    fs: fakeFs,
    spawn,
    env: { HOME: '/Users/leo', PATH: '/custom/path' },
    getSettings: () => ({ hermesPath: '/custom/bin/hermes', model: 'openrouter/claude-sonnet-4' }),
  });

  const result = await client.runHermesChat('hello Hermes', 'session-1');

  assert.equal(result.ok, true);
  assert.equal(result.code, 0);
  assert.equal(result.stdout, 'session_id: s2\nhello');
  assert.equal(spawn.calls.length, 1);
  assert.equal(spawn.calls[0].command, '/custom/bin/hermes');
  assert.deepEqual(spawn.calls[0].args, [
    'chat',
    '-q',
    'hello Hermes',
    '-Q',
    '-m',
    'openrouter/claude-sonnet-4',
    '--resume',
    'session-1',
  ]);
  assert.deepEqual(spawn.calls[0].options.stdio, ['ignore', 'pipe', 'pipe']);
  assert.match(spawn.calls[0].options.env.PATH, /^\/Users\/leo\/\.local\/bin:/);
  assert.match(spawn.calls[0].options.env.PATH, /\/custom\/path$/);
});

test('runApiChat posts DeskBuddy-managed OpenAI-style history without shared session header', async () => {
  const calls = [];
  const client = createClient({
    env: { HOME: '/Users/tester', PATH: '/usr/bin', API_SERVER_KEY: 'secret-key' },
    getSettings: () => ({
      model: 'custom-api-model',
      apiBaseUrl: 'http://127.0.0.1:8642/v1/',
    }),
    fetchImpl: async (url, options) => {
      calls.push({ url, options });
      return {
        ok: true,
        status: 200,
        headers: { get: () => '' },
        text: async () => JSON.stringify({ choices: [{ message: { content: 'api reply' } }] }),
      };
    },
  });

  const result = await client.runApiChat([
    { role: 'user', content: 'hi' },
    { role: 'assistant', content: 'hello' },
    { role: 'user', content: 'next' },
  ]);

  assert.deepEqual(result, { ok: true, reply: 'api reply' });
  assert.equal(calls.length, 1);
  assert.equal(calls[0].url, 'http://127.0.0.1:8642/v1/chat/completions');
  assert.equal(calls[0].options.method, 'POST');
  assert.equal(calls[0].options.headers['Content-Type'], 'application/json');
  assert.equal(calls[0].options.headers.Authorization, 'Bearer secret-key');
  assert.equal(calls[0].options.headers['X-Hermes-Session-Id'], undefined);
  assert.deepEqual(JSON.parse(calls[0].options.body), {
    model: 'custom-api-model',
    stream: false,
    messages: [
      { role: 'user', content: 'hi' },
      { role: 'assistant', content: 'hello' },
      { role: 'user', content: 'next' },
    ],
  });
});

test('runApiChat preserves OpenAI vision message parts for image attachments', async () => {
  const calls = [];
  const imageContent = [
    { type: 'text', text: '请看这张图' },
    { type: 'image_url', image_url: { url: 'data:image/png;base64,iVBORw0KGgo=' } },
  ];
  const client = createClient({
    getSettings: () => ({ model: 'vision-model', apiBaseUrl: 'http://127.0.0.1:8642' }),
    fetchImpl: async (url, options) => {
      calls.push({ url, options });
      return {
        ok: true,
        status: 200,
        headers: { get: () => '' },
        text: async () => JSON.stringify({ choices: [{ message: { content: '看到了' } }] }),
      };
    },
  });

  const result = await client.runApiChat([
    { role: 'user', content: imageContent },
  ]);

  assert.equal(result.ok, true);
  assert.deepEqual(JSON.parse(calls[0].options.body).messages, [
    { role: 'user', content: imageContent },
  ]);
});

test('runApiChat omits session header when API conversation id is empty', async () => {
  const calls = [];
  const client = createClient({
    getSettings: () => ({ model: 'hermes-agent', apiBaseUrl: 'http://127.0.0.1:8642' }),
    fetchImpl: async (url, options) => {
      calls.push({ url, options });
      return {
        ok: true,
        status: 200,
        headers: { get: () => '' },
        text: async () => JSON.stringify({ choices: [{ message: { content: 'stateless reply' } }] }),
      };
    },
  });

  const result = await client.runApiChat([{ role: 'user', content: 'hi' }]);

  assert.equal(result.ok, true);
  assert.equal(result.reply, 'stateless reply');
  assert.equal(calls[0].options.headers['X-Hermes-Session-Id'], undefined);
});

test('parseHermesChatOutput extracts session id and skips resumed-session system lines', () => {
  const client = createClient();

  const parsed = client.parseHermesChatOutput([
    '↻ Resumed session session-1',
    'session_id: session-2',
    '第一行回复',
    'second reply line',
  ].join('\n'));

  assert.deepEqual(parsed, {
    sessionId: 'session-2',
    reply: '第一行回复\nsecond reply line',
  });
});

test('parseHermesChatOutput drops wrapped Hermes resume banner fragments', () => {
  const client = createClient();

  const parsed = client.parseHermesChatOutput([
    '↻ Resumed session session-1 "long title" (4',
    'user messages, 29 total messages)',
    '真正的回复',
  ].join('\n'));

  assert.deepEqual(parsed, {
    sessionId: '',
    reply: '真正的回复',
  });
});

test('checkHealth returns first version line from hermes --version', async () => {
  const fakeFs = createFakeFs(['/custom/bin/hermes']);
  const spawn = createSpawnMock([
    { stdout: 'Hermes Agent v0.13.0 (2026.5.7)\nextra details\n', code: 0 },
  ]);
  const client = createClient({
    fs: fakeFs,
    spawn,
    getSettings: () => ({ hermesPath: '/custom/bin/hermes', model: 'hermes-agent' }),
  });

  const health = await client.checkHealth();

  assert.deepEqual(health, { ok: true, version: 'Hermes Agent v0.13.0 (2026.5.7)' });
  assert.deepEqual(spawn.calls[0].args, ['--version']);
});

test('checkApiHealth checks the configured API server root', async () => {
  const calls = [];
  const client = createClient({
    getSettings: () => ({ apiBaseUrl: 'http://127.0.0.1:8642/v1/' }),
    fetchImpl: async (url, options) => {
      calls.push({ url, options });
      return {
        ok: true,
        status: 200,
        text: async () => JSON.stringify({ platform: 'hermes-agent' }),
      };
    },
  });

  const health = await client.checkApiHealth();

  assert.deepEqual(health, { ok: true, version: 'hermes-agent' });
  assert.equal(calls[0].url, 'http://127.0.0.1:8642/health');
  assert.deepEqual(calls[0].options, { method: 'GET' });
});

test('parseHermesModelOptionsFromConfig lists configured custom provider models', () => {
  const options = parseHermesModelOptionsFromConfig(`
model:
  default: "gpt-5.5"
  provider: "custom:openai-gptcodex"
custom_providers:
  - name: "openai-gptcodex"
    base_url: "https://gptcodex.top/v1"
    model: "gpt-5.5"
    models:
      gpt-5.5:
        context_length: 900000
      gpt-5.4:
        context_length: 800000
  - name: "LongCat"
    base_url: "https://api.longcat.chat/openai/v1"
    model: "LongCat-Flash-Lite"
    models:
      LongCat-Flash-Lite:
        context_length: 128000
`);

  assert.equal(options.provider, 'custom:openai-gptcodex');
  assert.equal(options.model, 'gpt-5.5');
  assert.deepEqual(options.providers, [
    {
      slug: 'custom:openai-gptcodex',
      name: 'openai-gptcodex',
      models: ['gpt-5.5', 'gpt-5.4'],
    },
    {
      slug: 'custom:longcat',
      name: 'LongCat',
      models: ['LongCat-Flash-Lite'],
    },
  ]);
});
