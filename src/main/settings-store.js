// @ts-check

/** @type {any} */
const processRef = typeof process === 'undefined' ? { env: {} } : process;
const DEFAULT_MODEL = processRef.env.HERMES_MODEL || 'hermes-agent';

/**
 * @typedef {Object} DeskBuddySettings
 * @property {string} model
 * @property {string} petImage
 * @property {string} listeningImage
 * @property {string} thinkingImage
 * @property {string} happyImage
 * @property {number} petScale
 * @property {string} petName
 * @property {string} locale
 * @property {string} hermesPath
 * @property {string} cronDeliver
 * @property {string} sessionId
 * @property {string} conversationMode
 * @property {string} apiBaseUrl
 * @property {string} apiConversationId
 * @property {Array<{ role: string, content: string | Array<{ type: string, text?: string, image_url?: { url: string } }> }>} apiMessages
 * @property {boolean} alwaysOnTop
 * @property {{ x: number, y: number, width: number, height: number } | null} windowBounds
 */

/**
 * @typedef {Object} SettingsStoreDeps
 * @property {{ getPath(name: string): string }} app
 * @property {{ readFileSync(filePath: string, encoding: string): string, mkdirSync(dirPath: string, options: { recursive: boolean }): void, writeFileSync(filePath: string, data: string): void }} fs
 * @property {{ join(...parts: string[]): string, dirname(filePath: string): string }} path
 */

/**
 * @typedef {Object} SettingsStore
 * @property {() => string} getSettingsPath
 * @property {(settings?: Record<string, any>) => DeskBuddySettings} normalizeSettings
 * @property {() => DeskBuddySettings} readSettingsFromDisk
 * @property {() => DeskBuddySettings} getSettings
 * @property {(partialSettings?: Record<string, any>) => DeskBuddySettings} saveSettings
 * @property {() => void} resetCache
 */

/** @type {DeskBuddySettings} */
const DEFAULT_SETTINGS = {
  model: DEFAULT_MODEL,
  petImage: '',
  listeningImage: '',
  thinkingImage: '',
  happyImage: '',
  petScale: 100,
  petName: 'Hermes',
  locale: 'zh',
  hermesPath: '',
  cronDeliver: 'local',
  sessionId: '',
  conversationMode: 'cli',
  apiBaseUrl: 'http://127.0.0.1:8642',
  apiConversationId: '',
  apiMessages: [],
  alwaysOnTop: true,
  windowBounds: null,
};

function normalizeWindowBounds(bounds) {
  if (!bounds || typeof bounds !== 'object') return null;
  const x = Number(bounds.x);
  const y = Number(bounds.y);
  const width = Number(bounds.width);
  const height = Number(bounds.height);
  if (![x, y, width, height].every(Number.isFinite) || width <= 0 || height <= 0) return null;
  return {
    x: Math.round(x),
    y: Math.round(y),
    width: Math.round(width),
    height: Math.round(height),
  };
}

function normalizeApiMessageContent(content) {
  if (Array.isArray(content)) {
    const parts = content
      .map((part) => {
        if (part?.type === 'text') {
          const text = String(part.text || '').trim();
          return text ? { type: 'text', text } : null;
        }
        if (part?.type === 'image_url') {
          const url = String(part.image_url?.url || '').trim();
          return url.startsWith('data:image/') ? { type: 'image_url', image_url: { url } } : null;
        }
        return null;
      })
      .filter(Boolean);
    return parts.length > 0 ? parts : '';
  }
  return String(content || '').trim();
}

/**
 * Creates a cached settings store backed by Electron's userData directory.
 *
 * @param {SettingsStoreDeps} deps
 * @returns {SettingsStore}
 */
function createSettingsStore({ app, fs, path }) {
  /** @type {DeskBuddySettings | null} */
  let cachedSettings = null;

  function getSettingsPath() {
    return path.join(app.getPath('userData'), 'pet-settings.json');
  }

  /**
   * @param {Record<string, any>} [settings]
   * @returns {DeskBuddySettings}
   */
  function normalizeSettings(settings = {}) {
    const rawApiMessages = Array.isArray(settings.apiMessages) ? settings.apiMessages : [];
    const apiMessages = rawApiMessages
      .map((message) => ({
        role: message?.role === 'assistant' ? 'assistant' : 'user',
        content: normalizeApiMessageContent(message?.content),
      }))
      .filter((message) => Array.isArray(message.content) ? message.content.length > 0 : Boolean(message.content))
      .slice(-40);

    return {
      model: String(settings.model || DEFAULT_SETTINGS.model).trim() || DEFAULT_SETTINGS.model,
      petImage: String(settings.petImage || '').trim(),
      listeningImage: String(settings.listeningImage || '').trim(),
      thinkingImage: String(settings.thinkingImage || '').trim(),
      happyImage: String(settings.happyImage || '').trim(),
      petScale: Math.min(300, Math.max(50, Number(settings.petScale) || DEFAULT_SETTINGS.petScale)),
      petName: String(settings.petName || DEFAULT_SETTINGS.petName).trim() || DEFAULT_SETTINGS.petName,
      locale: ['zh', 'en', 'ja', 'ko'].includes(settings.locale) ? settings.locale : DEFAULT_SETTINGS.locale,
      hermesPath: String(settings.hermesPath || '').trim(),
      cronDeliver: String(settings.cronDeliver || DEFAULT_SETTINGS.cronDeliver).trim() || DEFAULT_SETTINGS.cronDeliver,
      sessionId: String(settings.sessionId || '').trim(),
      conversationMode: settings.conversationMode === 'api' ? 'api' : DEFAULT_SETTINGS.conversationMode,
      apiBaseUrl: String(settings.apiBaseUrl || DEFAULT_SETTINGS.apiBaseUrl).trim() || DEFAULT_SETTINGS.apiBaseUrl,
      apiConversationId: String(settings.apiConversationId || '').trim(),
      apiMessages,
      alwaysOnTop: settings.alwaysOnTop !== undefined ? Boolean(settings.alwaysOnTop) : DEFAULT_SETTINGS.alwaysOnTop,
      windowBounds: normalizeWindowBounds(settings.windowBounds),
    };
  }

  function readSettingsFromDisk() {
    try {
      const raw = fs.readFileSync(getSettingsPath(), 'utf8');
      return normalizeSettings({ ...DEFAULT_SETTINGS, ...JSON.parse(raw) });
    } catch (_error) {
      return { ...DEFAULT_SETTINGS };
    }
  }

  function getSettings() {
    if (!cachedSettings) cachedSettings = readSettingsFromDisk();
    return { ...cachedSettings };
  }

  /**
   * @param {Record<string, any>} [partialSettings]
   * @returns {DeskBuddySettings}
   */
  function saveSettings(partialSettings = {}) {
    cachedSettings = normalizeSettings({ ...getSettings(), ...partialSettings });
    fs.mkdirSync(path.dirname(getSettingsPath()), { recursive: true });
    fs.writeFileSync(getSettingsPath(), `${JSON.stringify(cachedSettings, null, 2)}\n`);
    return getSettings();
  }

  function resetCache() {
    cachedSettings = null;
  }

  return {
    getSettingsPath,
    normalizeSettings,
    readSettingsFromDisk,
    getSettings,
    saveSettings,
    resetCache,
  };
}

module.exports = {
  DEFAULT_MODEL,
  DEFAULT_SETTINGS,
  createSettingsStore,
};
