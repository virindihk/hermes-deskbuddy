'use strict';
// @ts-check

/**
 * @typedef {Object} HermesSettings
 * @property {string} [hermesPath]
 * @property {string} [model]
 * @property {string} [apiBaseUrl]
 */

/**
 * @typedef {Object} HermesCommandResult
 * @property {boolean} ok
 * @property {number | null} [code]
 * @property {string} [stdout]
 * @property {string} [stderr]
 * @property {string} [combined]
 * @property {string} [error]
 */

/**
 * @typedef {Object} ApiChatMessage
 * @property {string} role
 * @property {string | Array<Record<string, any>>} content
 */

/**
 * @typedef {Object} ApiChatResult
 * @property {boolean} ok
 * @property {string} [reply]
 * @property {string} [sessionId]
 * @property {number} [status]
 * @property {string} [error]
 * @property {string} [raw]
 */

/**
 * @typedef {Object} FileSystemLike
 * @property {(filePath: string, mode?: number) => void} accessSync
 * @property {(filePath: string, encoding: string) => string} [readFileSync]
 * @property {{ X_OK: number }} constants
 */

/**
 * @typedef {Object} PathLike
 * @property {(...parts: string[]) => string} join
 */

/**
 * @typedef {Object} OsLike
 * @property {() => string} homedir
 */

/**
 * @typedef {Object} ChildProcessLike
 * @property {{ on(event: 'data', listener: (chunk: { toString(): string }) => void): void }} stdout
 * @property {{ on(event: 'data', listener: (chunk: { toString(): string }) => void): void }} stderr
 * @property {{
 *   (event: 'error', listener: (error: Error) => void): void,
 *   (event: 'close', listener: (code: number | null) => void): void
 * }} on
 */

/**
 * @callback SpawnLike
 * @param {string} command
 * @param {string[]} args
 * @param {{ env: Record<string, string | undefined>, stdio: string[] }} options
 * @returns {ChildProcessLike}
 */

/**
 * @typedef {Object} HermesCliClientDeps
 * @property {FileSystemLike} [fs]
 * @property {PathLike} [path]
 * @property {OsLike} [os]
 * @property {SpawnLike} [spawn]
 * @property {() => HermesSettings} [getSettings]
 * @property {(url: string, options: Record<string, any>) => Promise<any>} [fetchImpl]
 * @property {Record<string, string | undefined>} [env]
 */

/**
 * @typedef {Object} HermesCliClient
 * @property {() => string} findHermesBinary
 * @property {() => Record<string, string | undefined>} getHermesEnv
 * @property {(text: string, sessionId?: string) => Promise<HermesCommandResult>} runHermesChat
 * @property {(messages: ApiChatMessage[]) => Promise<ApiChatResult>} runApiChat
 * @property {() => Promise<{ ok: true, version: string } | { ok: false, error: string }>} checkApiHealth
 * @property {(output?: string) => { sessionId: string, reply: string }} parseHermesChatOutput
 * @property {() => Promise<{ ok: true, version: string } | { ok: false, error: string }>} checkHealth
 * @property {() => { ok: true, provider: string, model: string, providers: Array<{ slug: string, name: string, models: string[] }> } | { ok: false, error: string } } listModelOptions
 */

function stripInlineComment(value) {
  const text = String(value || '');
  let quote = '';
  for (let i = 0; i < text.length; i += 1) {
    const ch = text[i];
    if ((ch === '"' || ch === "'") && text[i - 1] !== '\\') {
      quote = quote === ch ? '' : quote || ch;
    }
    if (ch === '#' && !quote && (i === 0 || /\s/.test(text[i - 1]))) {
      return text.slice(0, i).trim();
    }
  }
  return text.trim();
}

function unquoteYamlScalar(value) {
  const clean = stripInlineComment(value);
  if (
    (clean.startsWith('"') && clean.endsWith('"')) ||
    (clean.startsWith("'") && clean.endsWith("'"))
  ) {
    return clean.slice(1, -1);
  }
  return clean;
}

function splitYamlPair(trimmedLine) {
  const clean = stripInlineComment(trimmedLine);
  if (!clean) return null;
  const colonIndex = clean.indexOf(':');
  if (colonIndex < 0) return null;
  const key = unquoteYamlScalar(clean.slice(0, colonIndex));
  const value = unquoteYamlScalar(clean.slice(colonIndex + 1));
  return { key, value };
}

function countIndent(line) {
  const match = String(line || '').match(/^ */);
  return match ? match[0].length : 0;
}

function customProviderSlug(displayName) {
  return `custom:${String(displayName || '').trim().toLowerCase().replace(/\s+/g, '-')}`;
}

function pushUnique(list, value) {
  const clean = String(value || '').trim();
  if (clean && !list.includes(clean)) list.push(clean);
}

function parseInlineModelList(value) {
  const clean = String(value || '').trim();
  if (!clean.startsWith('[') || !clean.endsWith(']')) return [];
  return clean
    .slice(1, -1)
    .split(',')
    .map((item) => unquoteYamlScalar(item))
    .filter(Boolean);
}

function parseCurrentModelConfig(configText = '') {
  const lines = String(configText || '').replace(/\r/g, '').split('\n');
  let provider = '';
  let model = '';
  let inModel = false;
  let modelIndent = 0;

  for (const line of lines) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith('#')) continue;
    const indent = countIndent(line);

    if (indent === 0 && trimmed.startsWith('model:')) {
      const pair = splitYamlPair(trimmed);
      const value = pair?.value || '';
      if (value && value !== '{}' && !value.startsWith('{')) model = value;
      inModel = true;
      modelIndent = indent;
      continue;
    }

    if (inModel) {
      if (indent <= modelIndent) {
        inModel = false;
      } else {
        const pair = splitYamlPair(trimmed);
        if (!pair) continue;
        if (pair.key === 'provider') provider = pair.value;
        if (pair.key === 'default' || pair.key === 'model' || pair.key === 'name') model = pair.value;
      }
    }
  }

  return { provider, model };
}

function parseCustomProviders(configText = '') {
  const lines = String(configText || '').replace(/\r/g, '').split('\n');
  const providers = [];
  let inCustomProviders = false;
  let current = null;
  let inModels = false;
  let modelsIndent = 0;

  function finishCurrent() {
    if (!current || !current.name) return;
    providers.push({
      slug: customProviderSlug(current.name),
      name: current.name,
      models: current.models,
    });
  }

  for (const line of lines) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith('#')) continue;
    const indent = countIndent(line);

    if (indent === 0 && trimmed === 'custom_providers:') {
      inCustomProviders = true;
      continue;
    }
    if (!inCustomProviders) continue;
    if (indent === 0 && /^[A-Za-z_][\w-]*:/.test(trimmed)) break;

    if (indent === 2 && trimmed.startsWith('-')) {
      finishCurrent();
      current = { name: '', models: [] };
      inModels = false;
      const rest = trimmed.slice(1).trim();
      if (rest) {
        const pair = splitYamlPair(rest);
        if (pair?.key === 'name') current.name = pair.value;
        if (pair?.key === 'model') pushUnique(current.models, pair.value);
      }
      continue;
    }

    if (!current) continue;

    if (inModels && indent === modelsIndent + 2) {
      if (trimmed.startsWith('-')) {
        pushUnique(current.models, trimmed.slice(1).trim());
        continue;
      }
      const modelKey = unquoteYamlScalar(stripInlineComment(trimmed).replace(/:\s*.*$/, ''));
      pushUnique(current.models, modelKey);
      continue;
    }

    if (indent <= 4) {
      const pair = splitYamlPair(trimmed);
      if (!pair) continue;
      if (pair.key === 'name') current.name = pair.value;
      if (pair.key === 'model') pushUnique(current.models, pair.value);
      if (pair.key === 'models') {
        inModels = true;
        modelsIndent = indent;
        for (const modelId of parseInlineModelList(pair.value)) pushUnique(current.models, modelId);
      } else {
        inModels = false;
      }
    }
  }
  finishCurrent();

  return providers;
}

function ensureCurrentProviderOption(options, provider, model) {
  const providerValue = String(provider || '').trim();
  const modelValue = String(model || '').trim();
  if (!providerValue) return;
  let entry = options.find((item) => item.slug === providerValue || item.name === providerValue);
  if (!entry) {
    entry = { slug: providerValue, name: providerValue, models: [] };
    options.unshift(entry);
  }
  pushUnique(entry.models, modelValue);
}

function parseHermesModelOptionsFromConfig(configText = '') {
  const { provider, model } = parseCurrentModelConfig(configText);
  const providers = parseCustomProviders(configText);
  ensureCurrentProviderOption(providers, provider, model);
  return { provider, model, providers };
}

/**
 * Creates a thin wrapper around the Hermes CLI used by the Electron main process.
 *
 * @param {HermesCliClientDeps} [deps]
 * @returns {HermesCliClient}
 */
function createHermesCliClient(deps = {}) {
  /** @type {FileSystemLike} */
  const injectedFs = deps.fs || require(/** @type {string} */ ('fs'));
  /** @type {PathLike} */
  const injectedPath = deps.path || require(/** @type {string} */ ('path'));
  /** @type {OsLike} */
  const injectedOs = deps.os || require(/** @type {string} */ ('os'));
  /** @type {SpawnLike} */
  const injectedSpawn = deps.spawn || require(/** @type {string} */ ('child_process')).spawn;
  const injectedEnv = deps.env || process.env;
  const injectedGetSettings = deps.getSettings || (() => ({}));
  const injectedFetch = deps.fetchImpl || globalThis.fetch;

  let hermesBinaryPath = '';
  let lastHermesPath = '';

  function homeDir() {
    return injectedEnv.HOME || injectedEnv.USERPROFILE || injectedOs.homedir();
  }

  /** @returns {HermesSettings} */
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
    /** @type {Record<string, string | undefined>} */
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

  /**
   * @param {string[]} args
   * @returns {Promise<HermesCommandResult>}
   */
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

  /**
   * @param {string} text
   * @param {string} [sessionId]
   * @returns {Promise<HermesCommandResult>}
   */
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

  function getApiRootUrl() {
    const settings = getSettings();
    const rawBaseUrl = String(settings.apiBaseUrl || 'http://127.0.0.1:8642').trim() || 'http://127.0.0.1:8642';
    return rawBaseUrl.replace(/\/+$/, '').replace(/\/v1$/i, '');
  }

  function getApiBaseUrl() {
    return `${getApiRootUrl()}/v1`;
  }

  function getApiKey() {
    return String(injectedEnv.API_SERVER_KEY || injectedEnv.HERMES_API_SERVER_KEY || '').trim();
  }

  function normalizeApiContent(content) {
    if (Array.isArray(content)) {
      const parts = [];
      for (const part of content) {
        if (part?.type === 'text') {
          const text = String(part.text || '').trim();
          if (text) parts.push({ type: 'text', text });
        } else if (part?.type === 'image_url') {
          const url = String(part.image_url?.url || '').trim();
          if (url) parts.push({ type: 'image_url', image_url: { url } });
        }
      }
      return parts;
    }
    return String(content || '').trim();
  }

  function hasApiContent(content) {
    return Array.isArray(content) ? content.length > 0 : Boolean(content);
  }

  /**
   * @param {ApiChatMessage[]} messages
   * @returns {Promise<ApiChatResult>}
   */
  async function runApiChat(messages) {
    const cleanMessages = (Array.isArray(messages) ? messages : [])
      .map((message) => ({
        role: message?.role === 'assistant' ? 'assistant' : 'user',
        content: normalizeApiContent(message?.content),
      }))
      .filter((message) => hasApiContent(message.content))
      .slice(-40);

    if (cleanMessages.length === 0) {
      return { ok: false, error: '消息是空的喵。' };
    }
    if (typeof injectedFetch !== 'function') {
      return { ok: false, error: '当前运行环境不支持 fetch，无法连接 API Server。' };
    }

    const settings = getSettings();
    const apiKey = getApiKey();
    /** @type {Record<string, string>} */
    const headers = { 'Content-Type': 'application/json' };
    if (apiKey) {
      headers.Authorization = `Bearer ${apiKey}`;
    }

    try {
      const response = await injectedFetch(`${getApiBaseUrl()}/chat/completions`, {
        method: 'POST',
        headers,
        body: JSON.stringify({
          model: String(settings.model || 'hermes-agent').trim() || 'hermes-agent',
          stream: false,
          messages: cleanMessages,
        }),
      });
      const raw = await response.text();
      let data = {};
      try {
        data = raw ? JSON.parse(raw) : {};
      } catch (_error) {
        data = { raw };
      }
      if (!response.ok) {
        const errorMessage = data?.error?.message || raw || `API Server HTTP ${response.status}`;
        return { ok: false, status: response.status, error: errorMessage, raw };
      }
      const reply = String(data?.choices?.[0]?.message?.content || data?.output_text || '').trim();
      return { ok: true, reply };
    } catch (error) {
      return { ok: false, error: error instanceof Error ? error.message : String(error) };
    }
  }

  /**
   * @param {string} [line]
   * @returns {string}
   */
  function stripAnsi(line) {
    return String(line || '').replace(/\x1B\[[0-?]*[ -/]*[@-~]/g, '');
  }

  function isHermesResumeStatusLine(line) {
    const trimmed = stripAnsi(line).trim();
    return (
      trimmed.startsWith('↻ Resumed session') ||
      /^Session\s+\S+\s+was compressed into\b/.test(trimmed) ||
      /^Session\s+\S+\s+found but has no messages\. Starting fresh\.?$/.test(trimmed) ||
      /^(?:\(?\d+\s+)?user messages?,\s+\d+\s+total messages?\)?$/.test(trimmed)
    );
  }

  /**
   * @param {string} [output]
   * @returns {{ sessionId: string, reply: string }}
   */
  function parseHermesChatOutput(output = '') {
    const lines = String(output || '').split('\n');
    let sessionId = '';
    let foundSession = false;
    let replyLines = [];

    for (const line of lines) {
      const trimmed = stripAnsi(line).trim();
      if (isHermesResumeStatusLine(line)) continue;
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
        const trimmed = stripAnsi(line).trim();
        return trimmed && !isHermesResumeStatusLine(line);
      });
    }

    return { sessionId, reply: replyLines.join('\n').trim() };
  }

  /** @returns {Promise<{ ok: true, version: string } | { ok: false, error: string }>} */
  async function checkHealth() {
    try {
      const result = await runCommand(['--version']);
      if (!result.ok) {
        return { ok: false, error: result.error || 'hermes CLI 不可用，请确认已安装。' };
      }
      const firstLine = (result.stdout || '').trim().split('\n')[0].trim();
      return { ok: true, version: firstLine };
    } catch (error) {
      return { ok: false, error: error instanceof Error ? error.message : String(error) };
    }
  }

  /** @returns {Promise<{ ok: true, version: string } | { ok: false, error: string }>} */
  async function checkApiHealth() {
    if (typeof injectedFetch !== 'function') {
      return { ok: false, error: '当前运行环境不支持 fetch，无法检查 API Server。' };
    }
    try {
      const response = await injectedFetch(`${getApiRootUrl()}/health`, { method: 'GET' });
      const raw = await response.text();
      let data = {};
      try {
        data = raw ? JSON.parse(raw) : {};
      } catch (_error) {}
      if (!response.ok) {
        return { ok: false, error: raw || `API Server HTTP ${response.status}` };
      }
      return { ok: true, version: String(data?.platform || data?.status || 'API Server') };
    } catch (error) {
      return { ok: false, error: error instanceof Error ? error.message : String(error) };
    }
  }

  function getConfigPath() {
    return injectedPath.join(injectedEnv.HERMES_HOME || injectedPath.join(homeDir(), '.hermes'), 'config.yaml');
  }

  /** @returns {{ ok: true, provider: string, model: string, providers: Array<{ slug: string, name: string, models: string[] }> } | { ok: false, error: string }} */
  function listModelOptions() {
    try {
      if (typeof injectedFs.readFileSync !== 'function') {
        return { ok: false, error: '当前文件系统接口不支持读取 Hermes 配置。' };
      }
      const configText = injectedFs.readFileSync(getConfigPath(), 'utf8');
      const parsed = parseHermesModelOptionsFromConfig(configText);
      return {
        ok: true,
        provider: parsed.provider,
        model: parsed.model,
        providers: parsed.providers,
      };
    } catch (error) {
      return { ok: false, error: error instanceof Error ? error.message : String(error) };
    }
  }

  return {
    findHermesBinary,
    getHermesEnv,
    runHermesChat,
    runApiChat,
    parseHermesChatOutput,
    checkHealth,
    checkApiHealth,
    listModelOptions,
  };
}

module.exports = {
  createHermesCliClient,
  parseHermesModelOptionsFromConfig,
};
