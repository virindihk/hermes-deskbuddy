const DEFAULT_MODEL = process.env.HERMES_MODEL || 'hermes-agent';

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

function createSettingsStore({ app, fs, path }) {
  let cachedSettings = null;

  function getSettingsPath() {
    return path.join(app.getPath('userData'), 'pet-settings.json');
  }

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
