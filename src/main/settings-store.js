// @ts-check

/** @type {any} */
const processRef = typeof process === 'undefined' ? { env: {} } : process;
const DEFAULT_MODEL = processRef.env.HERMES_MODEL || 'hermes-agent';

/**
 * @typedef {Object} DeskBuddySettings
 * @property {string} model
 * @property {string} petImage
 * @property {string} thinkingImage
 * @property {string} happyImage
 * @property {number} petScale
 * @property {string} petName
 * @property {string} locale
 * @property {string} hermesPath
 * @property {string} cronDeliver
 * @property {string} sessionId
 * @property {boolean} alwaysOnTop
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
  thinkingImage: '',
  happyImage: '',
  petScale: 100,
  petName: 'Hermes',
  locale: 'zh',
  hermesPath: '',
  cronDeliver: 'local',
  sessionId: '',
  alwaysOnTop: true,
};

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
    return {
      model: String(settings.model || DEFAULT_SETTINGS.model).trim() || DEFAULT_SETTINGS.model,
      petImage: String(settings.petImage || '').trim(),
      thinkingImage: String(settings.thinkingImage || '').trim(),
      happyImage: String(settings.happyImage || '').trim(),
      petScale: Math.min(300, Math.max(50, Number(settings.petScale) || DEFAULT_SETTINGS.petScale)),
      petName: String(settings.petName || DEFAULT_SETTINGS.petName).trim() || DEFAULT_SETTINGS.petName,
      locale: ['zh', 'en', 'ja', 'ko'].includes(settings.locale) ? settings.locale : DEFAULT_SETTINGS.locale,
      hermesPath: String(settings.hermesPath || '').trim(),
      cronDeliver: String(settings.cronDeliver || DEFAULT_SETTINGS.cronDeliver).trim() || DEFAULT_SETTINGS.cronDeliver,
      sessionId: String(settings.sessionId || '').trim(),
      alwaysOnTop: settings.alwaysOnTop !== undefined ? Boolean(settings.alwaysOnTop) : DEFAULT_SETTINGS.alwaysOnTop,
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
