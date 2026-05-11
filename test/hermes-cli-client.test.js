const test = require('node:test');
const assert = require('node:assert/strict');
const { EventEmitter } = require('node:events');
const path = require('node:path');

const { createHermesCliClient } = require('../src/main/hermes-cli-client');

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
