'use strict';

function createHermesCliClient(deps = {}) {
  const injectedFs = deps.fs || require('node:fs');
  const injectedPath = deps.path || require('node:path');
  const injectedOs = deps.os || require('node:os');
  const injectedSpawn = deps.spawn || require('node:child_process').spawn;
  const injectedEnv = deps.env || process.env;
  const injectedGetSettings = deps.getSettings || (() => ({}));

  let hermesBinaryPath = '';
  let lastHermesPath = '';

  function homeDir() {
    return injectedEnv.HOME || injectedEnv.USERPROFILE || injectedOs.homedir();
  }

  function getSettings() {
    return injectedGetSettings() || {};
  }

  function findHermesBinary() {
    const settings = getSettings();
    const settingsHermesPath = String(settings.hermesPath || '').trim();

    if (settingsHermesPath !== lastHermesPath) {
      hermesBinaryPath = '';
      lastHermesPath = settingsHermesPath;
    }
    if (hermesBinaryPath) return hermesBinaryPath;

    if (settingsHermesPath) {
      try {
        injectedFs.accessSync(settingsHermesPath, injectedFs.constants.X_OK);
        hermesBinaryPath = settingsHermesPath;
        return hermesBinaryPath;
      } catch (_error) {}
    }

    const candidates = [
      injectedPath.join(homeDir(), '.local', 'bin', 'hermes'),
      '/opt/homebrew/bin/hermes',
      '/usr/local/bin/hermes',
      '/usr/local/lib/hermes-agent/venv/bin/hermes',
      injectedPath.join(homeDir(), 'bin', 'hermes'),
      '/usr/bin/hermes',
      'hermes',
    ];

    for (const candidate of candidates) {
      if (candidate === 'hermes') {
        hermesBinaryPath = 'hermes';
        return hermesBinaryPath;
      }
      try {
        injectedFs.accessSync(candidate, injectedFs.constants.X_OK);
        hermesBinaryPath = candidate;
        return hermesBinaryPath;
      } catch (_error) {}
    }

    hermesBinaryPath = 'hermes';
    return hermesBinaryPath;
  }

  function getHermesEnv() {
    const hermesEnv = { ...injectedEnv };
    const extraPaths = [
      injectedPath.join(homeDir(), '.local', 'bin'),
      '/opt/homebrew/bin',
      '/usr/local/bin',
      '/usr/bin',
      '/bin',
    ];
    const currentPath = hermesEnv.PATH || '';
    const currentPathParts = currentPath.split(':').filter(Boolean);
    const missingPaths = extraPaths.filter((candidate) => !currentPathParts.includes(candidate));
    if (missingPaths.length > 0) {
      hermesEnv.PATH = currentPath ? `${missingPaths.join(':')}:${currentPath}` : missingPaths.join(':');
    }
    return hermesEnv;
  }

  function runCommand(args) {
    return new Promise((resolve) => {
      const child = injectedSpawn(findHermesBinary(), args, {
        env: getHermesEnv(),
        stdio: ['ignore', 'pipe', 'pipe'],
      });

      let stdout = '';
      let stderr = '';
      child.stdout.on('data', (chunk) => {
        stdout += chunk.toString();
      });
      child.stderr.on('data', (chunk) => {
        stderr += chunk.toString();
      });
      child.on('error', (error) => resolve({ ok: false, error: error.message }));
      child.on('close', (code) => resolve({
        ok: code === 0,
        code,
        stdout,
        stderr,
        combined: `${stdout}\n${stderr}`,
      }));
    });
  }

  function runHermesChat(text, sessionId = '') {
    const args = ['chat', '-q', text, '-Q'];
    const settings = getSettings();
    const model = String(settings.model || '').trim();
    if (model && model !== 'hermes-agent') {
      args.push('-m', model);
    }
    if (sessionId) {
      args.push('--resume', sessionId);
    }
    return runCommand(args);
  }

  function parseHermesChatOutput(output = '') {
    const lines = String(output || '').split('\n');
    let sessionId = '';
    let foundSession = false;
    let replyLines = [];

    for (const line of lines) {
      const trimmed = line.trim();
      if (trimmed.startsWith('↻ Resumed session')) continue;
      if (!foundSession && trimmed.startsWith('session_id:')) {
        sessionId = trimmed.slice(11).trim();
        foundSession = true;
        continue;
      }
      if (foundSession) {
        replyLines.push(line);
      }
    }

    if (!foundSession) {
      replyLines = lines.filter((line) => {
        const trimmed = line.trim();
        return trimmed && !trimmed.startsWith('↻ Resumed session');
      });
    }

    return { sessionId, reply: replyLines.join('\n').trim() };
  }

  async function checkHealth() {
    try {
      const result = await runCommand(['--version']);
      if (!result.ok) {
        return { ok: false, error: result.error || 'hermes CLI 不可用，请确认已安装。' };
      }
      const firstLine = result.stdout.trim().split('\n')[0].trim();
      return { ok: true, version: firstLine };
    } catch (error) {
      return { ok: false, error: error.message };
    }
  }

  return {
    findHermesBinary,
    getHermesEnv,
    runHermesChat,
    parseHermesChatOutput,
    checkHealth,
  };
}

module.exports = { createHermesCliClient };
