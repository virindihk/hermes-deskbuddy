const { app, BrowserWindow, ipcMain, screen, shell, Menu, dialog } = require('electron');
const fs = require('fs');
const path = require('path');
const os = require('os');
const { spawn } = require('child_process');

const { createSettingsStore } = require('./main/settings-store');
const { createHermesCliClient } = require('./main/hermes-cli-client');
const {
  LOCAL_ID_PREFIX: DESKBUDDY_API_CONVERSATION_PREFIX,
  createDeskBuddyConversationStore,
} = require('./main/deskbuddy-conversation-store');

const CANONICAL_APP_NAME = 'pet';
const LEGACY_USER_DATA_NAMES = ['hermes-deskbuddy', 'hermes-pet'];
const SETTINGS_FILE_NAME = 'pet-settings.json';

function getSettingsFilePath(userDataPath) {
  return path.join(userDataPath, SETTINGS_FILE_NAME);
}

function getMtimeMs(filePath) {
  try {
    return fs.statSync(filePath).mtimeMs;
  } catch (_error) {
    return 0;
  }
}

function migrateLegacySettingsToUserData(canonicalUserDataPath) {
  const appDataPath = path.dirname(canonicalUserDataPath);
  const canonicalSettingsPath = getSettingsFilePath(canonicalUserDataPath);
  const candidates = [
    canonicalSettingsPath,
    ...LEGACY_USER_DATA_NAMES.map((name) => getSettingsFilePath(path.join(appDataPath, name))),
  ]
    .map((filePath) => ({ filePath, mtimeMs: getMtimeMs(filePath) }))
    .filter((candidate) => candidate.mtimeMs > 0)
    .sort((a, b) => b.mtimeMs - a.mtimeMs);

  const newest = candidates[0];
  if (!newest || newest.filePath === canonicalSettingsPath) return;

  fs.mkdirSync(canonicalUserDataPath, { recursive: true });
  fs.copyFileSync(newest.filePath, canonicalSettingsPath);
}

app.setName(CANONICAL_APP_NAME);
const canonicalUserDataPath = path.join(app.getPath('appData'), CANONICAL_APP_NAME);
migrateLegacySettingsToUserData(canonicalUserDataPath);
app.setPath('userData', canonicalUserDataPath);

const settingsStore = createSettingsStore({ app, fs, path });
const { getSettings, saveSettings } = settingsStore;
const conversationStore = createDeskBuddyConversationStore({ app, fs, path });
const DEFAULT_WINDOW_WIDTH = 420;
const DEFAULT_WINDOW_HEIGHT = 620;
const MIN_WINDOW_WIDTH = 312;
const MIN_WINDOW_HEIGHT = 408;
const hermesCliClient = createHermesCliClient({
  fs,
  path,
  os,
  spawn,
  getSettings,
  env: process.env,
});

let mainWindow;
let chatVisible = false;

function sendSettingsChanged() {
  if (mainWindow && !mainWindow.isDestroyed()) {
    mainWindow.webContents.send('settings:changed', getIsolatedSettings());
  }
}

function isDeskBuddyApiConversationId(sessionId) {
  return String(sessionId || '').trim().startsWith(DESKBUDDY_API_CONVERSATION_PREFIX);
}

function getIsolatedSettings() {
  const settings = getSettings();
  if (settings.apiConversationId && !isDeskBuddyApiConversationId(settings.apiConversationId)) {
    return {
      ...settings,
      apiConversationId: '',
      apiMessages: [],
    };
  }
  return settings;
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
  const bin = hermesCliClient.findHermesBinary();
  return { ok: bin !== 'hermes', path: bin };
});

function getDisplayWorkArea(display) {
  if (display?.workArea) return display.workArea;
  return {
    x: 0,
    y: 0,
    width: display?.workAreaSize?.width || DEFAULT_WINDOW_WIDTH,
    height: display?.workAreaSize?.height || DEFAULT_WINDOW_HEIGHT,
  };
}

function toFiniteNumber(value, fallback) {
  const number = Number(value);
  return Number.isFinite(number) ? number : fallback;
}

function clampWindowBounds(bounds, display) {
  const workArea = getDisplayWorkArea(display);
  const width = Math.max(MIN_WINDOW_WIDTH, Math.min(Math.round(toFiniteNumber(bounds.width, DEFAULT_WINDOW_WIDTH)), workArea.width));
  const height = Math.max(MIN_WINDOW_HEIGHT, Math.min(Math.round(toFiniteNumber(bounds.height, DEFAULT_WINDOW_HEIGHT)), workArea.height));
  const x = Math.max(workArea.x, Math.min(Math.round(toFiniteNumber(bounds.x, workArea.x)), workArea.x + Math.max(0, workArea.width - width)));
  const y = Math.max(workArea.y, Math.min(Math.round(toFiniteNumber(bounds.y, workArea.y)), workArea.y + Math.max(0, workArea.height - height)));
  return { x, y, width, height };
}

function getInitialWindowBounds(settings, display) {
  const primaryWorkArea = getDisplayWorkArea(display);
  const fallback = clampWindowBounds({
    width: DEFAULT_WINDOW_WIDTH,
    height: DEFAULT_WINDOW_HEIGHT,
    x: primaryWorkArea.x + Math.max(40, primaryWorkArea.width - 480),
    y: primaryWorkArea.y + Math.max(40, primaryWorkArea.height - 700),
  }, display);

  if (!settings.windowBounds) return fallback;
  const savedDisplay = screen.getDisplayMatching(settings.windowBounds) || display;
  return clampWindowBounds(settings.windowBounds, savedDisplay);
}

function getCurrentWindowBounds() {
  if (!mainWindow || mainWindow.isDestroyed()) return null;
  const [x, y] = mainWindow.getPosition();
  const [width, height] = mainWindow.getSize();
  return { x, y, width, height };
}

function saveCurrentWindowBounds() {
  const windowBounds = getCurrentWindowBounds();
  if (!windowBounds) return;
  saveSettings({ windowBounds: windowBounds });
}

function createWindow() {
  const display = screen.getPrimaryDisplay();
  const settings = getSettings();
  const initialBounds = getInitialWindowBounds(settings, display);

  mainWindow = new BrowserWindow({
    ...initialBounds,
    frame: false,
    transparent: true,
    resizable: false,
    hasShadow: false,
    alwaysOnTop: settings.alwaysOnTop !== false,
    skipTaskbar: false,
    title: 'Hermes DeskBuddy',
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: false,
    },
  });

  mainWindow.on('moved', saveCurrentWindowBounds);
  mainWindow.on('resized', saveCurrentWindowBounds);
  mainWindow.once('close', saveCurrentWindowBounds);

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
  saveCurrentWindowBounds();
  return true;
});

ipcMain.handle('pet:open-settings-menu', (_event, point) => openSettingsMenu(point));

ipcMain.handle('pet:get-settings', () => getIsolatedSettings());

ipcMain.handle('pet:save-settings', (_event, settings) => {
  const currentSettings = getSettings();
  if (
    (settings?.apiConversationId && !isDeskBuddyApiConversationId(settings.apiConversationId)) ||
    (!Object.hasOwn(settings || {}, 'apiConversationId') && currentSettings.apiConversationId && !isDeskBuddyApiConversationId(currentSettings.apiConversationId))
  ) {
    settings = { ...settings, apiConversationId: '', apiMessages: [] };
  }
  const saved = saveSettings(settings || {});
  sendSettingsChanged();
  return saved;
});

ipcMain.handle('pet:choose-image', () => choosePetImage());

async function chooseImageField(field) {
  if (!mainWindow) return { ok: false, error: '窗口还没有准备好。' };
  const validFields = ['petImage', 'listeningImage', 'thinkingImage', 'happyImage'];
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

const MIME_BY_EXT = {
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.gif': 'image/gif',
  '.webp': 'image/webp',
  '.svg': 'image/svg+xml',
  '.txt': 'text/plain',
  '.md': 'text/markdown',
  '.markdown': 'text/markdown',
  '.csv': 'text/csv',
  '.json': 'application/json',
  '.yaml': 'application/yaml',
  '.yml': 'application/yaml',
  '.xml': 'application/xml',
  '.html': 'text/html',
  '.htm': 'text/html',
  '.js': 'text/javascript',
  '.ts': 'text/typescript',
  '.css': 'text/css',
  '.py': 'text/x-python',
  '.pdf': 'application/pdf',
};

function guessMimeType(filePath) {
  return MIME_BY_EXT[path.extname(filePath).toLowerCase()] || 'application/octet-stream';
}

function isTextMime(mimeType) {
  return /^text\//i.test(mimeType) || /\b(json|xml|yaml|javascript|typescript)\b/i.test(mimeType);
}

function attachmentFromFilePath(filePath, extra = {}) {
  const stat = fs.statSync(filePath);
  const mimeType = extra.mimeType || guessMimeType(filePath);
  const buffer = fs.readFileSync(filePath);
  const maxImageInlineBytes = extra.kind === 'screen' ? 20 * 1024 * 1024 : 8 * 1024 * 1024;
  const shouldInlineImage = mimeType.startsWith('image/') && stat.size <= maxImageInlineBytes;
  const shouldInlineText = isTextMime(mimeType) && stat.size <= 512 * 1024;
  const attachment = {
    ok: true,
    path: filePath,
    name: extra.name || path.basename(filePath),
    mimeType,
    size: stat.size,
    kind: extra.kind || (mimeType.startsWith('image/') ? 'image' : 'file'),
  };
  if (shouldInlineImage || shouldInlineText) {
    attachment.dataUrl = `data:${mimeType};base64,${buffer.toString('base64')}`;
  }
  if (shouldInlineText) {
    attachment.textContent = buffer.toString('utf8');
  }
  return attachment;
}

function captureScreen() {
  if (process.platform !== 'darwin') {
    return Promise.resolve({ ok: false, error: '当前只支持 macOS screencapture。' });
  }
  const filePath = path.join(os.tmpdir(), `pet-screen-${Date.now()}.png`);
  return new Promise((resolve) => {
    const restoreWindow = mainWindow && !mainWindow.isDestroyed() && mainWindow.isVisible();
    if (restoreWindow) mainWindow.hide();
    const finish = (result) => {
      if (restoreWindow && mainWindow && !mainWindow.isDestroyed()) mainWindow.showInactive();
      resolve(result);
    };
    setTimeout(() => {
      const child = spawn('screencapture', ['-i', '-s', '-x', filePath], {
        env: process.env,
        stdio: ['ignore', 'pipe', 'pipe'],
      });
      let stderr = '';
      child.stderr.on('data', (chunk) => { stderr += chunk.toString(); });
      child.on('error', (error) => finish({ ok: false, error: error.message }));
      child.on('close', (code) => {
        const errorText = stderr.trim();
        const hasCapture = fs.existsSync(filePath);
        try {
          if (code !== 0) {
            if (!hasCapture && !errorText) {
              finish({ ok: false, canceled: true });
              return;
            }
            finish({ ok: false, code, error: errorText || '框选截图失败，请检查屏幕录制权限。' });
            return;
          }
          if (!hasCapture || fs.statSync(filePath).size <= 0) {
            finish({ ok: false, canceled: true });
            return;
          }
          finish(attachmentFromFilePath(filePath, { name: 'screen.png', mimeType: 'image/png', kind: 'screen' }));
        } catch (error) {
          finish({ ok: false, error: error.message });
        }
      });
    }, 120);
  });
}

async function chooseAttachment() {
  if (!mainWindow) return { ok: false, error: '窗口还没有准备好。' };
  const result = await dialog.showOpenDialog(mainWindow, {
    title: '选择附件',
    properties: ['openFile'],
    filters: [
      { name: 'Images and Text', extensions: ['png', 'jpg', 'jpeg', 'gif', 'webp', 'svg', 'txt', 'md', 'csv', 'json', 'yaml', 'yml', 'xml', 'html', 'js', 'ts', 'css', 'py', 'pdf'] },
      { name: 'All Files', extensions: ['*'] },
    ],
  });
  if (result.canceled || !result.filePaths?.[0]) {
    return { ok: false, canceled: true };
  }
  try {
    return attachmentFromFilePath(result.filePaths[0]);
  } catch (error) {
    return { ok: false, error: error.message };
  }
}

ipcMain.handle('pet:capture-screen', () => captureScreen());
ipcMain.handle('pet:choose-attachment', () => chooseAttachment());

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

    const child = spawn(hermesCliClient.findHermesBinary(), args, {
      env: hermesCliClient.getHermesEnv(),
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
  // Min window size = min panel (260×200) + CSS margins: left 18 + right 34 = 52 width, top 18 + bottom 190 = 208 height
  const MIN_WIN_W = 260 + 52; // 312
  const MIN_WIN_H = 200 + 190 + 18; // 408
  x = Math.max(workArea.x, Math.min(x, workArea.x + workArea.width - MIN_WIN_W));
  y = Math.max(workArea.y, Math.min(y, workArea.y + workArea.height - MIN_WIN_H));
  const newW = Math.max(MIN_WIN_W, Math.min(workArea.x + workArea.width - x, Math.round(width)));
  const newH = Math.max(MIN_WIN_H, Math.min(workArea.y + workArea.height - y, Math.round(height)));
  mainWindow.setBounds({ x: Math.round(x), y: Math.round(y), width: newW, height: newH });
  saveCurrentWindowBounds();
});

ipcMain.handle('pet:get-window-bounds', () => {
  if (!mainWindow || mainWindow.isDestroyed()) return { x: 0, y: 0, width: 420, height: 560 };
  const [x, y] = mainWindow.getPosition();
  const [width, height] = mainWindow.getSize();
  return { x, y, width, height };
});

ipcMain.handle('hermes:health', async () => {
  if (getSettings().conversationMode === 'api') {
    return hermesCliClient.checkApiHealth();
  }
  return hermesCliClient.checkHealth();
});

function normalizeAttachment(attachment = {}) {
  const name = String(attachment.name || path.basename(String(attachment.path || 'attachment'))).trim() || 'attachment';
  const filePath = String(attachment.path || '').trim();
  const mimeType = String(attachment.mimeType || '').trim();
  const dataUrl = String(attachment.dataUrl || '').trim();
  const textContent = String(attachment.textContent || '').trim();
  return {
    name,
    path: filePath,
    mimeType,
    dataUrl,
    textContent,
    isImage: mimeType.startsWith('image/') && dataUrl.startsWith('data:'),
  };
}

function normalizeAttachments(attachments = []) {
  return (Array.isArray(attachments) ? attachments : [])
    .map(normalizeAttachment)
    .filter((attachment) => attachment.path || attachment.dataUrl || attachment.textContent)
    .slice(0, 4);
}

function buildAttachmentText(attachments, { imagePartsSent = false } = {}) {
  if (!attachments.length) return '';
  const blocks = attachments.map((attachment, index) => {
    const lines = [`附件 ${index + 1}: ${attachment.name}`];
    if (attachment.mimeType) lines.push(`类型: ${attachment.mimeType}`);
    if (attachment.path) lines.push(`本地路径: ${attachment.path}`);
    if (attachment.textContent) lines.push(`内容:\n${attachment.textContent.slice(0, 12000)}`);
    if (attachment.isImage && !attachment.textContent) {
      lines.push(imagePartsSent ? '图片内容已作为 image_url 随本条消息发送。' : '图片文件见本地路径，请直接读取或分析该路径。');
    }
    return lines.join('\n');
  });
  return blocks.join('\n\n');
}

function buildUserTextWithAttachments(cleanText, attachments, options = {}) {
  const base = cleanText || '请分析我发来的附件。';
  const attachmentText = buildAttachmentText(attachments, options);
  return attachmentText ? `${base}\n\n${attachmentText}` : base;
}

function buildApiUserContent(cleanText, attachments) {
  const textWithAttachments = buildUserTextWithAttachments(cleanText, attachments, { imagePartsSent: true });
  const parts = [{ type: 'text', text: textWithAttachments }];
  for (const attachment of attachments) {
    if (attachment.isImage) {
      parts.push({ type: 'image_url', image_url: { url: attachment.dataUrl } });
    }
  }
  return parts.length > 1 ? parts : textWithAttachments;
}

async function runCliConversation(cleanText, attachments = []) {
  const currentSessionId = getSettings().sessionId;
  const cleanAttachments = normalizeAttachments(attachments);
  const prompt = buildUserTextWithAttachments(cleanText, cleanAttachments);
  const result = await hermesCliClient.runHermesChat(prompt, currentSessionId);

  if (!result.ok) {
    return {
      ok: false,
      error: result.error || result.stderr || `hermes 退出码 ${result.code}`,
    };
  }

  const { sessionId, reply } = hermesCliClient.parseHermesChatOutput(result.stdout);
  if (sessionId && sessionId !== currentSessionId) {
    saveSettings({ sessionId });
    sendSettingsChanged();
  }

  return { ok: true, reply: reply || 'Hermes 没有返回文本。', sessionId };
}

async function runApiConversation(cleanText, attachments = []) {
  const settings = getSettings();
  const cleanAttachments = normalizeAttachments(attachments);
  const userContent = buildApiUserContent(cleanText, cleanAttachments);
  const userHistoryContent = buildUserTextWithAttachments(cleanText, cleanAttachments, { imagePartsSent: true });
  const existingConversation = isDeskBuddyApiConversationId(settings.apiConversationId)
    ? conversationStore.getConversation(settings.apiConversationId)
    : null;
  const currentConversation = existingConversation || conversationStore.createConversation();
  if (!existingConversation || currentConversation.id !== settings.apiConversationId) {
    saveSettings({
      apiConversationId: currentConversation.id,
      apiMessages: currentConversation.messages,
    });
    sendSettingsChanged();
  }
  const messages = [
    ...currentConversation.messages.map((message) => ({ role: message.role, content: message.content })),
    { role: 'user', content: userContent },
  ].slice(-40);
  const result = await hermesCliClient.runApiChat(messages);

  if (!result.ok) {
    return { ok: false, error: result.error || `API Server HTTP ${result.status || 'error'}` };
  }

  const reply = result.reply || 'Hermes 没有返回文本。';
  const savedConversation = conversationStore.appendTurn(currentConversation.id, userHistoryContent, reply);
  saveSettings({
    apiConversationId: savedConversation.id,
    apiMessages: savedConversation.messages.slice(-40).map((message) => ({ role: message.role, content: message.content })),
  });
  sendSettingsChanged();

  return { ok: true, reply, sessionId: savedConversation.id };
}

async function runCurrentConversation(cleanText, attachments = []) {
  if (getSettings().conversationMode === 'api') {
    return runApiConversation(cleanText, attachments);
  }
  return runCliConversation(cleanText, attachments);
}

ipcMain.handle('hermes:send-message', async (_event, { text, attachments } = {}) => {
  const cleanText = String(text || '').trim();
  const cleanAttachments = normalizeAttachments(attachments);
  if (!cleanText && cleanAttachments.length === 0) {
    return { ok: false, error: '消息是空的喵。' };
  }

  return runCurrentConversation(cleanText, cleanAttachments);
});

ipcMain.on('hermes:send-message-stream', async (event, { text, attachments, requestId } = {}) => {
  const sender = event.sender;
  const channel = (type) => `stream:${type}:${requestId}`;

  const cleanText = String(text || '').trim();
  const cleanAttachments = normalizeAttachments(attachments);
  if (!cleanText && cleanAttachments.length === 0) {
    sender.send(channel('error'), { error: '消息是空的喵。' });
    return;
  }

  const result = await runCurrentConversation(cleanText, cleanAttachments);

  if (!result.ok) {
    sender.send(channel('error'), { error: result.error || '发送失败' });
    return;
  }

  const reply = result.reply || 'Hermes 没有返回文本。';

  // Simulate streaming: send reply word-by-word with tiny delays for UI smoothness
  const words = reply.split(/(?=[\s\n])|(?<=[\s\n])/);
  const chunkSize = Math.max(1, Math.ceil(words.length / 30));
  for (let i = 0; i < words.length; i += chunkSize) {
    const chunk = words.slice(i, i + chunkSize).join('');
    sender.send(channel('chunk'), { content: chunk });
    // Small yield to let renderer process chunks
    await new Promise((r) => setTimeout(r, 15));
  }

  sender.send(channel('done'), { sessionId: result.sessionId || '' });
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
      const child = spawn(hermesCliClient.findHermesBinary(), ['cron', 'list'], {
        env: hermesCliClient.getHermesEnv(),
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
  if (getSettings().conversationMode === 'api') {
    return { ok: true, sessions: conversationStore.listConversations() };
  }

  const sql = `
    SELECT
      s.id,
      COALESCE(
        NULLIF(s.title, ''),
        NULLIF((
          SELECT substr(replace(replace(m.content, char(10), ' '), char(13), ' '), 1, 60)
          FROM messages m
          WHERE m.session_id = s.id AND m.role = 'user' AND trim(m.content) <> ''
          ORDER BY m.timestamp
          LIMIT 1
        ), ''),
        s.id
      ) as title,
      datetime(s.started_at, 'unixepoch', 'localtime') as started_at,
      s.message_count
    FROM sessions s
    WHERE source = 'cli'
    ORDER BY s.started_at DESC
    LIMIT 50
  `;
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
  if (getSettings().conversationMode === 'api') {
    const messages = conversationStore.getMessages(cleanId);
    if (!messages) return { ok: false, error: '找不到 DeskBuddy API 会话' };
    return { ok: true, messages };
  }
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
  if (getSettings().conversationMode === 'api') {
    const conversation = conversationStore.getConversation(cleanId);
    if (!conversation) return { ok: false, error: '找不到 DeskBuddy API 会话' };
    saveSettings({
      apiConversationId: conversation.id,
      apiMessages: conversation.messages.slice(-40).map((message) => ({ role: message.role, content: message.content })),
    });
    sendSettingsChanged();
    return { ok: true, sessionId: conversation.id };
  }
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

ipcMain.handle('hermes:list-model-options', async () => hermesCliClient.listModelOptions());

ipcMain.handle('hermes:get-model-config', async () => {
  try {
    const result = await new Promise((resolve) => {
      const child = spawn(hermesCliClient.findHermesBinary(), ['config', 'show'], {
        env: hermesCliClient.getHermesEnv(),
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
        const child = spawn(hermesCliClient.findHermesBinary(), ['config', 'set', 'model.provider', provider], {
          env: hermesCliClient.getHermesEnv(),
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
      const child = spawn(hermesCliClient.findHermesBinary(), ['config', 'set', 'model.default', modelName], {
        env: hermesCliClient.getHermesEnv(),
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
