const { app, BrowserWindow, ipcMain, screen, shell, Menu, dialog } = require('electron');
const fs = require('fs');
const path = require('path');
const os = require('os');
const { spawn } = require('child_process');

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

let mainWindow;
let chatVisible = false;
let cachedSettings = null;
let hermesBinaryPath = '';
let lastHermesPath = '';

function findHermesBinary() {
  const settings = getSettings();
  if (settings.hermesPath !== lastHermesPath) {
    hermesBinaryPath = '';
    lastHermesPath = settings.hermesPath;
  }
  if (hermesBinaryPath) return hermesBinaryPath;

  // User override takes highest priority
  if (settings.hermesPath) {
    try {
      fs.accessSync(settings.hermesPath, fs.constants.X_OK);
      hermesBinaryPath = settings.hermesPath;
      return hermesBinaryPath;
    } catch (_e) {}
  }

  const candidates = [
    path.join(process.env.HOME || os.homedir(), '.local', 'bin', 'hermes'),
    '/opt/homebrew/bin/hermes',
    '/usr/local/bin/hermes',
    '/usr/local/lib/hermes-agent/venv/bin/hermes',
    path.join(process.env.HOME || os.homedir(), 'bin', 'hermes'),
    '/usr/bin/hermes',
    'hermes',
  ];
  for (const p of candidates) {
    if (p === 'hermes') {
      hermesBinaryPath = 'hermes';
      return hermesBinaryPath;
    }
    try {
      fs.accessSync(p, fs.constants.X_OK);
      hermesBinaryPath = p;
      return hermesBinaryPath;
    } catch (_e) {}
  }
  hermesBinaryPath = 'hermes';
  return hermesBinaryPath;
}

function getHermesEnv() {
  const env = { ...process.env };
  const extraPaths = [
    path.join(process.env.HOME || os.homedir(), '.local', 'bin'),
    '/opt/homebrew/bin',
    '/usr/local/bin',
    '/usr/bin',
    '/bin',
  ];
  const currentPath = env.PATH || '';
  const missing = extraPaths.filter((p) => !currentPath.includes(p)).join(':');
  if (missing) {
    env.PATH = missing + ':' + currentPath;
  }
  return env;
}

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

function sendSettingsChanged() {
  if (mainWindow && !mainWindow.isDestroyed()) {
    mainWindow.webContents.send('settings:changed', getSettings());
  }
}

async function choosePetImage() {
  if (!mainWindow) return { ok: false, error: '窗口还没有准备好。' };

  const settings = getSettings();
  const locale = settings.locale || 'zh';
  const titles = { zh: '选择 pet 图片', en: 'Choose Pet Image', ja: '画像を選択', ko: '이미지 선택' };
  const result = await dialog.showOpenDialog(mainWindow, {
    title: titles[locale] || titles.zh,
    properties: ['openFile'],
    filters: [
      { name: 'Images', extensions: ['png', 'jpg', 'jpeg', 'gif', 'webp', 'svg'] },
    ],
  });

  if (result.canceled || !result.filePaths?.[0]) {
    return { ok: false, canceled: true, settings: getSettings() };
  }

  const savedSettings = saveSettings({ petImage: result.filePaths[0] });
  sendSettingsChanged();
  return { ok: true, path: result.filePaths[0], settings: savedSettings };
}

const MENU_I18N = {
  zh: {
    openSettings: '打开设定',
    customImage: '自定义图片...',
    resetImage: '恢复默认图片',
    cronManager: 'Cron 管理',
    alwaysOnTop: '总在最前端',
    language: '语言',
    quit: '退出',
  },
  en: {
    openSettings: 'Open Settings',
    customImage: 'Custom Image...',
    resetImage: 'Reset Image',
    cronManager: 'Cron Manager',
    alwaysOnTop: 'Always on Top',
    language: 'Language',
    quit: 'Quit',
  },
  ja: {
    openSettings: '設定を開く',
    customImage: '画像を変更...',
    resetImage: 'デフォルトに戻す',
    cronManager: 'Cron管理',
    alwaysOnTop: '常に前面に表示',
    language: '言語',
    quit: '終了',
  },
  ko: {
    openSettings: '설정 열기',
    customImage: '이미지 변경...',
    resetImage: '기본 이미지로',
    cronManager: 'Cron 관리',
    alwaysOnTop: '항상 위에 표시',
    language: '언어',
    quit: '종료',
  },
};

function openSettingsMenu(point = {}) {
  if (!mainWindow) return false;
  const settings = getSettings();
  const locale = settings.locale || 'zh';
  const t = MENU_I18N[locale] || MENU_I18N.zh;

  const menu = Menu.buildFromTemplate([
    {
      label: t.openSettings,
      click: () => mainWindow.webContents.send('settings:open'),
    },
    { type: 'separator' },
    {
      label: t.cronManager,
      click: () => mainWindow.webContents.send('cron:open'),
    },
    { type: 'separator' },
    {
      label: t.alwaysOnTop,
      type: 'checkbox',
      checked: settings.alwaysOnTop !== false,
      click: (menuItem) => {
        const onTop = menuItem.checked;
        saveSettings({ alwaysOnTop: onTop });
        if (mainWindow && !mainWindow.isDestroyed()) {
          mainWindow.setAlwaysOnTop(onTop);
        }
      },
    },
    { type: 'separator' },
    {
      label: t.language,
      submenu: [
        { label: '中文', type: 'checkbox', checked: locale === 'zh', click: () => setLocale('zh') },
        { label: 'English', type: 'checkbox', checked: locale === 'en', click: () => setLocale('en') },
        { label: '日本語', type: 'checkbox', checked: locale === 'ja', click: () => setLocale('ja') },
        { label: '한국어', type: 'checkbox', checked: locale === 'ko', click: () => setLocale('ko') },
      ],
    },
    { type: 'separator' },
    {
      label: t.quit,
      click: () => app.quit(),
    },
  ]);

  menu.popup({
    window: mainWindow,
    x: Math.round(Number(point.x) || 0),
    y: Math.round(Number(point.y) || 0),
  });
  return true;
}

function setLocale(locale) {
  saveSettings({ locale });
  sendSettingsChanged();
  if (mainWindow && !mainWindow.isDestroyed()) {
    mainWindow.webContents.send('locale:changed', locale);
  }
}

ipcMain.handle('hermes:detect-path', async () => {
  const bin = findHermesBinary();
  return { ok: bin !== 'hermes', path: bin };
});

function createWindow() {
  const display = screen.getPrimaryDisplay();
  const { width, height } = display.workAreaSize;
  const settings = getSettings();

  mainWindow = new BrowserWindow({
    width: 420,
    height: 620,
    x: Math.max(40, width - 480),
    y: Math.max(40, height - 700),
    frame: false,
    transparent: true,
    resizable: false,
    hasShadow: false,
    alwaysOnTop: settings.alwaysOnTop !== false,
    skipTaskbar: false,
    title: 'DeskBuddy',
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: false,
    },
  });

  mainWindow.setVisibleOnAllWorkspaces(true, { visibleOnFullScreen: true });
  mainWindow.setIgnoreMouseEvents(true, { forward: true });
  mainWindow.loadFile(path.join(__dirname, 'renderer', 'index.html'));

  mainWindow.webContents.setWindowOpenHandler(({ url }) => {
    shell.openExternal(url);
    return { action: 'deny' };
  });
}

app.whenReady().then(() => {
  createWindow();

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) createWindow();
  });
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') app.quit();
});

ipcMain.handle('pet:toggle-chat', () => {
  chatVisible = !chatVisible;
  mainWindow.webContents.send('chat:visibility', chatVisible);
  return chatVisible;
});

ipcMain.handle('pet:set-chat-visible', (_event, visible) => {
  chatVisible = Boolean(visible);
  mainWindow.webContents.send('chat:visibility', chatVisible);
  return chatVisible;
});

ipcMain.handle('pet:move-window-by', (_event, deltaX, deltaY) => {
  if (!mainWindow) return false;
  const [x, y] = mainWindow.getPosition();
  mainWindow.setPosition(Math.round(x + Number(deltaX || 0)), Math.round(y + Number(deltaY || 0)), false);
  return true;
});

ipcMain.handle('pet:open-settings-menu', (_event, point) => openSettingsMenu(point));

ipcMain.handle('pet:get-settings', () => getSettings());

ipcMain.handle('pet:save-settings', (_event, settings) => {
  const saved = saveSettings(settings || {});
  sendSettingsChanged();
  return saved;
});

ipcMain.handle('pet:choose-image', () => choosePetImage());

async function chooseImageField(field) {
  if (!mainWindow) return { ok: false, error: '窗口还没有准备好。' };
  const validFields = ['petImage', 'thinkingImage', 'happyImage'];
  if (!validFields.includes(field)) return { ok: false, error: '无效的图片字段。' };

  const result = await dialog.showOpenDialog(mainWindow, {
    title: '选择图片',
    properties: ['openFile'],
    filters: [
      { name: 'Images', extensions: ['png', 'jpg', 'jpeg', 'gif', 'webp', 'svg'] },
    ],
  });

  if (result.canceled || !result.filePaths?.[0]) {
    return { ok: false, canceled: true, settings: getSettings() };
  }

  const settings = saveSettings({ [field]: result.filePaths[0] });
  sendSettingsChanged();
  return { ok: true, path: result.filePaths[0], settings };
}

ipcMain.handle('pet:choose-image-field', (_event, field) => chooseImageField(field));

ipcMain.handle('pet:create-cron', async (_event, payload = {}) => {
  const schedule = String(payload.schedule || '').trim();
  const prompt = String(payload.prompt || '').trim();
  const name = String(payload.name || '').trim();
  const deliver = String(payload.deliver || getSettings().cronDeliver || 'local').trim() || 'local';

  if (!schedule) return { ok: false, error: 'cron 时间不能为空。' };
  if (!prompt) return { ok: false, error: 'cron 任务内容不能为空。' };

  if (deliver !== getSettings().cronDeliver) {
    saveSettings({ cronDeliver: deliver });
    sendSettingsChanged();
  }

  return new Promise((resolve) => {
    const args = ['cron', 'create', '--deliver', deliver];
    if (name) args.push('--name', name);
    args.push(schedule, prompt);

    const child = spawn(findHermesBinary(), args, {
      env: getHermesEnv(),
      stdio: ['ignore', 'pipe', 'pipe'],
    });

    let stdout = '';
    let stderr = '';
    child.stdout.on('data', (chunk) => { stdout += chunk.toString(); });
    child.stderr.on('data', (chunk) => { stderr += chunk.toString(); });
    child.on('error', (error) => resolve({ ok: false, error: error.message }));
    child.on('close', (code) => resolve({ ok: code === 0, code, stdout, stderr, combined: stdout + '\n' + stderr }));
  });
});

ipcMain.handle('pet:quit', () => {
  app.quit();
});

ipcMain.on('pet:set-ignore-mouse-events', (_event, ignore) => {
  if (!mainWindow || mainWindow.isDestroyed()) return;
  mainWindow.setIgnoreMouseEvents(Boolean(ignore), { forward: true });
});

ipcMain.on('pet:set-window-bounds', (_event, x, y, width, height) => {
  if (!mainWindow || mainWindow.isDestroyed()) return;
  const { workArea } = screen.getPrimaryDisplay();
  // Keep window inside the actual work area (accounts for menu bar / dock)
  // Min window size = min panel (260×200) + CSS margins: left 18 + right 34 = 52 width, top 18 + bottom 220 = 238 height
  const MIN_WIN_W = 260 + 52; // 312
  const MIN_WIN_H = 200 + 238; // 438
  x = Math.max(workArea.x, Math.min(x, workArea.x + workArea.width - MIN_WIN_W));
  y = Math.max(workArea.y, Math.min(y, workArea.y + workArea.height - MIN_WIN_H));
  const newW = Math.max(MIN_WIN_W, Math.min(workArea.x + workArea.width - x, Math.round(width)));
  const newH = Math.max(MIN_WIN_H, Math.min(workArea.y + workArea.height - y, Math.round(height)));
  mainWindow.setBounds({ x: Math.round(x), y: Math.round(y), width: newW, height: newH });
});

ipcMain.handle('pet:get-window-bounds', () => {
  if (!mainWindow || mainWindow.isDestroyed()) return { x: 0, y: 0, width: 420, height: 560 };
  const [x, y] = mainWindow.getPosition();
  const [width, height] = mainWindow.getSize();
  return { x, y, width, height };
});

ipcMain.handle('hermes:health', async () => {
  try {
    const result = await new Promise((resolve) => {
      const child = spawn(findHermesBinary(), ['--version'], {
        env: getHermesEnv(),
        stdio: ['ignore', 'pipe', 'pipe'],
      });
      let stdout = '';
      let stderr = '';
      child.stdout.on('data', (chunk) => { stdout += chunk.toString(); });
      child.stderr.on('data', (chunk) => { stderr += chunk.toString(); });
      child.on('error', (error) => resolve({ ok: false, error: error.message }));
      child.on('close', (code) => resolve({ ok: code === 0, stdout, stderr }));
    });
    if (!result.ok) {
      return { ok: false, error: result.error || 'hermes CLI 不可用，请确认已安装。' };
    }
    // Extract just the first line (e.g. "Hermes Agent v0.13.0 (2026.5.7)")
    const firstLine = result.stdout.trim().split('\n')[0].trim();
    return { ok: true, version: firstLine };
  } catch (error) {
    return { ok: false, error: error.message };
  }
});

function runHermesChat(text, sessionId = '') {
  return new Promise((resolve) => {
    const args = ['chat', '-q', text, '-Q'];
    const model = getSettings().model;
    if (model && model !== 'hermes-agent') {
      args.push('-m', model);
    }
    if (sessionId) {
      args.push('--resume', sessionId);
    }

    const child = spawn(findHermesBinary(), args, {
      env: getHermesEnv(),
      stdio: ['ignore', 'pipe', 'pipe'],
    });

    let stdout = '';
    let stderr = '';
    child.stdout.on('data', (chunk) => { stdout += chunk.toString(); });
    child.stderr.on('data', (chunk) => { stderr += chunk.toString(); });
    child.on('error', (error) => resolve({ ok: false, error: error.message }));
    child.on('close', (code) => resolve({ ok: code === 0, code, stdout, stderr }));
  });
}

function parseHermesChatOutput(output) {
  const lines = output.split('\n');
  let sessionId = '';
  let replyLines = [];
  let foundSession = false;
  for (const line of lines) {
    const trimmed = line.trim();
    // Skip system info lines
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
  // If no session_id line found, treat non-system lines as reply
  if (!foundSession) {
    replyLines = lines.filter((line) => {
      const t = line.trim();
      return t && !t.startsWith('↻ Resumed session');
    });
  }
  return { sessionId, reply: replyLines.join('\n').trim() };
}

ipcMain.handle('hermes:send-message', async (_event, { text }) => {
  const cleanText = String(text || '').trim();
  if (!cleanText) {
    return { ok: false, error: '消息是空的喵。' };
  }

  const currentSessionId = getSettings().sessionId;
  const result = await runHermesChat(cleanText, currentSessionId);

  if (!result.ok) {
    return {
      ok: false,
      error: result.error || result.stderr || `hermes 退出码 ${result.code}`,
    };
  }

  const { sessionId, reply } = parseHermesChatOutput(result.combined || result.stdout);
  if (sessionId && sessionId !== currentSessionId) {
    saveSettings({ sessionId });
    sendSettingsChanged();
  }

  return { ok: true, reply: reply || 'Hermes 没有返回文本。', sessionId };
});

ipcMain.on('hermes:send-message-stream', async (event, { text, requestId }) => {
  const sender = event.sender;
  const channel = (type) => `stream:${type}:${requestId}`;

  const cleanText = String(text || '').trim();
  if (!cleanText) {
    sender.send(channel('error'), { error: '消息是空的喵。' });
    return;
  }

  const currentSessionId = getSettings().sessionId;
  const result = await runHermesChat(cleanText, currentSessionId);

  if (!result.ok) {
    sender.send(channel('error'), { error: result.error || result.stderr || `hermes 退出码 ${result.code}` });
    return;
  }

  const { sessionId, reply } = parseHermesChatOutput(result.combined || result.stdout);
  if (sessionId && sessionId !== currentSessionId) {
    saveSettings({ sessionId });
    sendSettingsChanged();
  }

  // Simulate streaming: send reply word-by-word with tiny delays for UI smoothness
  const words = reply.split(/(?=[\s\n])|(?<=[\s\n])/);
  const chunkSize = Math.max(1, Math.ceil(words.length / 30));
  for (let i = 0; i < words.length; i += chunkSize) {
    const chunk = words.slice(i, i + chunkSize).join('');
    sender.send(channel('chunk'), { content: chunk });
    // Small yield to let renderer process chunks
    await new Promise((r) => setTimeout(r, 15));
  }

  sender.send(channel('done'), {});
});

function querySqlite(dbPath, sql) {
  return new Promise((resolve) => {
    const child = spawn('sqlite3', [dbPath, '-json', sql], {
      env: process.env,
      stdio: ['ignore', 'pipe', 'pipe'],
    });
    let stdout = '';
    let stderr = '';
    child.stdout.on('data', (chunk) => { stdout += chunk.toString(); });
    child.stderr.on('data', (chunk) => { stderr += chunk.toString(); });
    child.on('error', (error) => resolve({ ok: false, error: error.message }));
    child.on('close', (code) => resolve({ ok: code === 0, stdout, stderr }));
  });
}

const HERMES_DB_PATH = path.join(process.env.HOME || app.getPath('home'), '.hermes', 'state.db');

function parseCronList(output) {
  const jobs = [];
  const lines = output.split('\n');
  let current = null;
  for (const line of lines) {
    const trimmed = line.trim();
    if (!trimmed) continue;
    // Match job header: "34527b05d571 [active]"
    const headerMatch = trimmed.match(/^([a-f0-9]+)\s+\[(\w+)\]/);
    if (headerMatch) {
      if (current) jobs.push(current);
      current = { id: headerMatch[1], status: headerMatch[2] };
      continue;
    }
    // Match key-value pairs
    const kvMatch = trimmed.match(/^([A-Za-z\s]+):\s+(.*)$/);
    if (kvMatch && current) {
      const key = kvMatch[1].trim().toLowerCase().replace(/\s+/g, '_');
      const value = kvMatch[2].trim();
      current[key] = value;
    }
  }
  if (current) jobs.push(current);
  return jobs;
}

ipcMain.handle('hermes:list-crons', async () => {
  try {
    const result = await new Promise((resolve) => {
      const child = spawn(findHermesBinary(), ['cron', 'list'], {
        env: getHermesEnv(),
        stdio: ['ignore', 'pipe', 'pipe'],
      });
      let stdout = '';
      let stderr = '';
      child.stdout.on('data', (chunk) => { stdout += chunk.toString(); });
      child.stderr.on('data', (chunk) => { stderr += chunk.toString(); });
      child.on('error', (error) => resolve({ ok: false, error: error.message }));
      child.on('close', (code) => resolve({ ok: code === 0, stdout, stderr }));
    });
    if (!result.ok) {
      return { ok: false, error: result.stderr || '获取 cron 列表失败' };
    }
    const jobs = parseCronList(result.stdout);
    return { ok: true, jobs };
  } catch (error) {
    return { ok: false, error: error.message };
  }
});

ipcMain.handle('hermes:list-sessions', async () => {
  const sql = `SELECT id, title, datetime(started_at, 'unixepoch', 'localtime') as started_at, message_count FROM sessions WHERE source = 'cli' ORDER BY started_at DESC LIMIT 50`;
  const result = await querySqlite(HERMES_DB_PATH, sql);
  if (!result.ok) {
    return { ok: false, error: result.error || result.stderr };
  }
  try {
    const rows = JSON.parse(result.stdout || '[]');
    return { ok: true, sessions: rows };
  } catch (_error) {
    return { ok: false, error: '解析会话列表失败' };
  }
});

ipcMain.handle('hermes:get-session-messages', async (_event, sessionId) => {
  const cleanId = String(sessionId || '').trim().replace(/[^a-z0-9_-]/gi, '');
  if (!cleanId) return { ok: false, error: 'sessionId 无效' };
  const sql = `SELECT role, content, timestamp FROM messages WHERE session_id = '${cleanId}' AND role IN ('user', 'assistant') ORDER BY timestamp`;
  const result = await querySqlite(HERMES_DB_PATH, sql);
  if (!result.ok) {
    return { ok: false, error: result.error || result.stderr };
  }
  try {
    const rows = JSON.parse(result.stdout || '[]');
    return { ok: true, messages: rows };
  } catch (_error) {
    return { ok: false, error: '解析消息失败' };
  }
});

ipcMain.handle('hermes:resume-session', async (_event, sessionId) => {
  const cleanId = String(sessionId || '').trim();
  if (!cleanId) return { ok: false, error: 'sessionId 无效' };
  saveSettings({ sessionId: cleanId });
  sendSettingsChanged();
  return { ok: true, sessionId: cleanId };
});

function extractProvidersFromEnv() {
  const providers = new Set();
  try {
    const envPath = path.join(process.env.HOME || process.env.USERPROFILE || '', '.hermes', '.env');
    if (!fs.existsSync(envPath)) return [];
    const content = fs.readFileSync(envPath, 'utf8');
    const lines = content.split('\n');
    for (const line of lines) {
      const trimmed = line.trim();
      if (!trimmed || trimmed.startsWith('#')) continue;
      const match = trimmed.match(/^([A-Z_]+)_API_KEY=/);
      if (match) {
        let name = match[1].toLowerCase().replace(/_/g, '-');
        providers.add(name);
      }
    }
  } catch (_e) {}
  return Array.from(providers);
}

function getCurrentProviderFromConfig() {
  try {
    const configPath = path.join(process.env.HOME || process.env.USERPROFILE || '', '.hermes', 'config.yaml');
    if (!fs.existsSync(configPath)) return '';
    const content = fs.readFileSync(configPath, 'utf8');
    const match = content.match(/provider:\s*(\S+)/);
    if (match) return match[1].trim();
  } catch (_e) {}
  return '';
}

ipcMain.handle('hermes:list-providers', async () => {
  try {
    const envProviders = extractProvidersFromEnv();
    const currentProvider = getCurrentProviderFromConfig();
    if (currentProvider && !envProviders.includes(currentProvider)) {
      envProviders.unshift(currentProvider);
    }
    return { ok: true, providers: envProviders };
  } catch (error) {
    return { ok: false, error: error.message };
  }
});

ipcMain.handle('hermes:get-model-config', async () => {
  try {
    const result = await new Promise((resolve) => {
      const child = spawn(findHermesBinary(), ['config', 'show'], {
        env: getHermesEnv(),
        stdio: ['ignore', 'pipe', 'pipe'],
      });
      let stdout = '';
      let stderr = '';
      child.stdout.on('data', (chunk) => { stdout += chunk.toString(); });
      child.stderr.on('data', (chunk) => { stderr += chunk.toString(); });
      child.on('error', (error) => resolve({ ok: false, error: error.message }));
      child.on('close', (code) => resolve({ ok: code === 0, stdout, stderr }));
    });
    if (!result.ok) {
      return { ok: false, error: result.stderr || '获取 model 配置失败' };
    }
    // Parse model config from stdout
    const lines = result.stdout.split('\n');
    let provider = '';
    let model = '';
    for (const line of lines) {
      const trimmed = line.trim();
      if (trimmed.startsWith('Model:')) {
        const jsonStr = trimmed.slice(6).trim();
        try {
          const modelObj = JSON.parse(jsonStr.replace(/'/g, '"'));
          provider = modelObj.provider || '';
          model = modelObj.default || '';
        } catch (_e) {
          // Fallback: try to extract from string
          const match = jsonStr.match(/provider['"]?:\s*['"]?([^'"},\s]+)/);
          if (match) provider = match[1];
          const match2 = jsonStr.match(/default['"]?:\s*['"]?([^'"},\s]+)/);
          if (match2) model = match2[1];
        }
        break;
      }
    }
    return { ok: true, provider, model };
  } catch (error) {
    return { ok: false, error: error.message };
  }
});

ipcMain.handle('hermes:set-model', async (_event, model) => {
  const cleanInput = String(model || '').trim();
  if (!cleanInput) return { ok: false, error: 'model 不能为空' };

  let provider = '';
  let modelName = cleanInput;

  // Support provider/model format, e.g. "anthropic/claude-sonnet-4"
  if (cleanInput.includes('/')) {
    const parts = cleanInput.split('/');
    provider = parts[0].trim();
    modelName = parts.slice(1).join('/').trim();
  }

  try {
    const results = [];

    // Set provider if specified
    if (provider) {
      const providerResult = await new Promise((resolve) => {
        const child = spawn(findHermesBinary(), ['config', 'set', 'model.provider', provider], {
          env: getHermesEnv(),
          stdio: ['ignore', 'pipe', 'pipe'],
        });
        let stdout = '';
        let stderr = '';
        child.stdout.on('data', (chunk) => { stdout += chunk.toString(); });
        child.stderr.on('data', (chunk) => { stderr += chunk.toString(); });
        child.on('error', (error) => resolve({ ok: false, error: error.message }));
        child.on('close', (code) => resolve({ ok: code === 0, stdout, stderr }));
      });
      if (!providerResult.ok) {
        return { ok: false, error: providerResult.stderr || `设置 provider 失败: ${provider}` };
      }
      results.push(providerResult.stdout.trim());
    }

    // Set model default
    const modelResult = await new Promise((resolve) => {
      const child = spawn(findHermesBinary(), ['config', 'set', 'model.default', modelName], {
        env: getHermesEnv(),
        stdio: ['ignore', 'pipe', 'pipe'],
      });
      let stdout = '';
      let stderr = '';
      child.stdout.on('data', (chunk) => { stdout += chunk.toString(); });
      child.stderr.on('data', (chunk) => { stderr += chunk.toString(); });
      child.on('error', (error) => resolve({ ok: false, error: error.message }));
      child.on('close', (code) => resolve({ ok: code === 0, stdout, stderr }));
    });
    if (!modelResult.ok) {
      return { ok: false, error: modelResult.stderr || `设置 model 失败: ${modelName}` };
    }
    results.push(modelResult.stdout.trim());

    return { ok: true, provider, model: modelName, message: results.join('\n') };
  } catch (error) {
    return { ok: false, error: error.message };
  }
});
