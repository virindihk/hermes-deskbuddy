const pet = document.getElementById('pet');
const petAvatar = document.getElementById('petAvatar');
const defaultPet = document.querySelector('.default-pet');
const chatPanel = document.getElementById('chatPanel');
const closeChat = document.getElementById('closeChat');
const screenCaptureButton = document.getElementById('screenCapture');
const attachFileButton = document.getElementById('attachFile');
const attachmentInput = document.getElementById('attachmentInput');
const attachmentPreview = document.getElementById('attachmentPreview');
const settingsPanel = document.getElementById('settingsPanel');
const closeSettings = document.getElementById('closeSettings');
const cronPanel = document.getElementById('cronPanel');
const closeCron = document.getElementById('closeCron');
const cronList = document.getElementById('cronList');
const cronMessageEl = document.getElementById('cronMessage');
const petImage = document.getElementById('petImage');
const listeningImageInput = document.getElementById('listeningImage');
const thinkingImageInput = document.getElementById('thinkingImage');
const happyImageInput = document.getElementById('happyImage');
const chooseImage = document.getElementById('chooseImage');
const chooseListeningImage = document.getElementById('chooseListeningImage');
const chooseThinkingImage = document.getElementById('chooseThinkingImage');
const chooseHappyImage = document.getElementById('chooseHappyImage');
const resetAllImages = document.getElementById('resetAllImages');
const petScaleInput = document.getElementById('petScale');
const petScaleValue = document.getElementById('petScaleValue');
const petNameInput = document.getElementById('petName');
const hermesPathInput = document.getElementById('hermesPath');
const chatTitle = document.getElementById('chatTitle');
const settingsTitle = document.getElementById('settingsTitle');
const providerSelect = document.getElementById('providerSelect');
const modelSelect = document.getElementById('modelSelect');
const modelInput = document.getElementById('modelInput');
const conversationModeSelect = document.getElementById('conversationMode');
const apiBaseUrlInput = document.getElementById('apiBaseUrl');
const apiConversationIdDisplay = document.getElementById('apiConversationIdDisplay');
const saveSettings = document.getElementById('saveSettings');
const cronForm = document.getElementById('cronForm');
const cronSchedule = document.getElementById('cronSchedule');
const cronPrompt = document.getElementById('cronPrompt');
const cronDeliver = document.getElementById('cronDeliver');
const cronName = document.getElementById('cronName');
const createCron = document.getElementById('createCron');
const settingsMessage = document.getElementById('settingsMessage');
const sessionIdDisplay = document.getElementById('sessionIdDisplay');
const newSessionBtn = document.getElementById('newSession');
const statusEl = document.getElementById('status');
const sessionSelect = document.getElementById('sessionSelect');
const bubble = document.getElementById('bubble');

const PET_STATES = {
  IDLE: 'idle',
  LISTEN: 'listen',
  THINKING: 'thinking',
  DONE: 'done',
};
let petState = PET_STATES.IDLE;
let petStateTimer = null;

const DeskBuddyPetHitTest = window.DeskBuddyPetHitTest;
const {
  mapPointToContainedImage,
  isAlphaHit,
  isFallbackShapeHit,
} = DeskBuddyPetHitTest;
const DeskBuddyPanelLayout = window.DeskBuddyPanelLayout;
const {
  PET_RIGHT_OFFSET,
  PANEL_LEFT_MARGIN,
  PANEL_TOP_MARGIN,
  clampPanelSize,
  getWindowResizePlan,
} = DeskBuddyPanelLayout;
let petHitMask = null;
let petHitMaskUrl = '';

/* ===== i18n ===== */
const DeskBuddyI18n = window.DeskBuddyI18n;

let currentLocale = 'zh';
function t(key, vars = {}) {
  return DeskBuddyI18n.t(currentLocale, key, vars);
}

function setLocale(locale) {
  currentLocale = DeskBuddyI18n.normalizeLocale(locale);
  updateAllTexts();
  // 根据当前 pet 状态刷新气泡文字
  if (petState === PET_STATES.IDLE) {
    bubble.textContent = `${currentSettings.petName || 'Hermes'} ${t('online')}`;
  } else if (petState === PET_STATES.LISTEN) {
    bubble.textContent = `${currentSettings.petName || 'Hermes'} ${t('listening')}`;
  } else if (petState === PET_STATES.THINKING) {
    bubble.textContent = `${currentSettings.petName || 'Hermes'} ${t('thinking')}`;
  } else if (petState === PET_STATES.DONE) {
    bubble.textContent = `${currentSettings.petName || 'Hermes'} ${t('gotIt')}`;
  }
}

function updateAllTexts() {
  if (sendButton) sendButton.textContent = t('send');
  if (screenCaptureButton) screenCaptureButton.title = t('screenCapture');
  if (attachFileButton) attachFileButton.title = t('attachFile');
  if (saveSettings) saveSettings.textContent = t('saveSettings');
  if (chooseImage) chooseImage.textContent = t('choose');
  if (chooseListeningImage) chooseListeningImage.textContent = t('choose');
  if (chooseThinkingImage) chooseThinkingImage.textContent = t('choose');
  if (chooseHappyImage) chooseHappyImage.textContent = t('choose');
  if (resetAllImages) resetAllImages.textContent = t('resetAll');
  if (createCron) createCron.textContent = t('addCron');
  if (newSessionBtn) newSessionBtn.textContent = t('newSession');
  const labelPetName = document.querySelector('label[for="petName"]');
  if (labelPetName) labelPetName.textContent = t('name');
  if (petNameInput) petNameInput.placeholder = t('petNamePlaceholder') || 'Name your pet';
  const labelPetScale = document.querySelector('label[for="petScale"]');
  if (labelPetScale) labelPetScale.textContent = t('size');
  const labelStateImages = document.querySelector('#settingsPanel .settings-card:nth-child(2) > label');
  if (labelStateImages) labelStateImages.textContent = t('stateImages');
  if (petImage) petImage.placeholder = t('idleImagePlaceholder');
  if (listeningImageInput) listeningImageInput.placeholder = t('listeningImagePlaceholder');
  if (thinkingImageInput) thinkingImageInput.placeholder = t('thinkingImagePlaceholder');
  if (happyImageInput) happyImageInput.placeholder = t('happyImagePlaceholder');
  const labelProvider = document.querySelector('label[for="providerSelect"]');
  if (labelProvider) labelProvider.textContent = t('provider');
  if (providerSelect && providerSelect.options[0]) providerSelect.options[0].textContent = t('customProvider');
  const labelModel = document.querySelector('label[for="modelInput"]');
  if (labelModel) labelModel.textContent = t('model');
  if (modelSelect && modelSelect.options[0]) modelSelect.options[0].textContent = t('customModel');
  if (modelInput) modelInput.placeholder = t('modelPlaceholder');
  const labelConversationMode = document.querySelector('label[for="conversationMode"]');
  if (labelConversationMode) labelConversationMode.textContent = t('conversationMode');
  if (conversationModeSelect?.options?.[0]) conversationModeSelect.options[0].textContent = t('cliConversationMode');
  if (conversationModeSelect?.options?.[1]) conversationModeSelect.options[1].textContent = t('apiConversationMode');
  const labelApiBaseUrl = document.querySelector('label[for="apiBaseUrl"]');
  if (labelApiBaseUrl) labelApiBaseUrl.textContent = t('apiBaseUrl');
  if (apiBaseUrlInput) apiBaseUrlInput.placeholder = t('apiBaseUrlPlaceholder');
  const apiSessionLabel = document.querySelector('.api-session-label');
  if (apiSessionLabel) apiSessionLabel.textContent = t('apiConversation');
  const labelHermesPath = document.querySelector('label[for="hermesPath"]');
  if (labelHermesPath) labelHermesPath.textContent = t('hermesPath');
  if (hermesPathInput) hermesPathInput.placeholder = t('hermesPathPlaceholder') || 'Leave empty to auto-detect';
  const labelSession = document.querySelector('.session-label');
  if (labelSession) labelSession.textContent = t('currentSession');
  const labelCronSchedule = document.querySelector('label[for="cronSchedule"]');
  if (labelCronSchedule) labelCronSchedule.textContent = t('cronSchedule');
  if (cronSchedule) cronSchedule.placeholder = t('cronSchedulePlaceholder');
  const labelCronPrompt = document.querySelector('label[for="cronPrompt"]');
  if (labelCronPrompt) labelCronPrompt.textContent = t('cronPrompt');
  if (cronPrompt) cronPrompt.placeholder = t('cronPromptPlaceholder');
  const labelCronDeliver = document.querySelector('label[for="cronDeliver"]');
  if (labelCronDeliver) labelCronDeliver.textContent = t('cronDeliver');
  if (cronDeliver) cronDeliver.placeholder = t('cronDeliverPlaceholder');
  const labelCronName = document.querySelector('label[for="cronName"]');
  if (labelCronName) labelCronName.textContent = t('cronName');
  if (cronName) cronName.placeholder = t('cronNamePlaceholder');
  if (sessionSelect && sessionSelect.options[0]) {
    sessionSelect.options[0].textContent = t('sessionLabel');
  }
  if (input) input.placeholder = t('inputPlaceholder') || 'Enter to send, Shift+Enter for newline';
  if (pet) pet.title = t('petTitle') || 'Left-click to chat, right-click for settings, drag to move';
  if (closeChat) closeChat.title = t('closeChat') || 'Close';
  if (closeSettings) closeSettings.title = t('closeSettings') || 'Close Settings';
  if (closeCron) closeCron.title = t('closeCron') || 'Close';
  if (sessionSelect) sessionSelect.title = t('switchSession') || 'Switch Session';
  const resizeHandles = document.querySelectorAll('.resize-handle');
  resizeHandles.forEach((h) => (h.title = t('resize') || 'Drag to resize'));
  updatePetName(currentSettings.petName);
}
const messagesEl = document.getElementById('messages');
const composer = document.getElementById('composer');
const input = document.getElementById('input');
const sendButton = document.getElementById('send');
const resizeTL = document.getElementById('resizeTL');
const resizeTR = document.getElementById('resizeTR');
const resizeBL = document.getElementById('resizeBL');

const history = [];
let isBusy = false;
let suppressClickAfterDrag = false;
let pointerDown = null;
let lastPointer = null;
let isDraggingPet = false;
let currentSettings = {};
let modelOptions = { providers: [], provider: '', model: '' };
let activeStreamRequestId = null;
let activeStreamCleanups = [];
let pendingAttachments = [];

/* ===== Markdown & highlight config ===== */
if (typeof marked !== 'undefined') {
  marked.setOptions({
    breaks: true,
    gfm: true,
    headerIds: false,
    mangle: false,
  });
}

function renderMarkdown(text) {
  if (!text) return '';
  if (typeof marked === 'undefined') return escapeHtml(text).replace(/\n/g, '<br>');
  try {
    const raw = marked.parse(text);
    // Sanitize very basic tags to prevent script injection
    const safe = raw.replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '');
    return safe;
  } catch (_error) {
    return escapeHtml(text).replace(/\n/g, '<br>');
  }
}

function escapeHtml(text) {
  const div = document.createElement('div');
  div.textContent = text;
  return div.innerHTML;
}

function highlightCodeBlocks(root) {
  if (typeof hljs === 'undefined') return;
  root.querySelectorAll('pre code').forEach((block) => {
    try {
      hljs.highlightElement(block);
    } catch (_error) {}
  });
}

function addCopyButtons(root) {
  root.querySelectorAll('pre').forEach((pre) => {
    if (pre.querySelector('.code-copy')) return;
    const btn = document.createElement('button');
    btn.className = 'code-copy';
    btn.textContent = t('copy') || 'Copy';
    btn.title = t('copyCode') || 'Copy code';
    btn.addEventListener('click', () => {
      const code = pre.querySelector('code');
      const text = code ? code.textContent : pre.textContent;
      navigator.clipboard.writeText(text).then(() => {
        btn.textContent = t('copied') || 'Copied';
        setTimeout(() => (btn.textContent = t('copy') || 'Copy'), 1500);
      });
    });
    pre.appendChild(btn);
  });
}

/* ===== UI helpers ===== */
function setStatus(text, mode = 'normal') {
  statusEl.textContent = text;
  statusEl.dataset.mode = mode;
}

function setSettingsMessage(text, mode = 'normal') {
  settingsMessage.textContent = text;
  settingsMessage.dataset.mode = mode;
}

function createMessageElement(role, htmlContent = '') {
  const el = document.createElement('div');
  el.className = `message ${role}`;

  const body = document.createElement('div');
  body.className = 'message-body';
  if (htmlContent) body.innerHTML = htmlContent;
  el.appendChild(body);

  if (role === 'assistant' || role === 'system') {
    const actions = document.createElement('div');
    actions.className = 'message-actions';

    const copyBtn = document.createElement('button');
    copyBtn.className = 'msg-action';
    copyBtn.title = t('copyContent') || 'Copy content';
    copyBtn.innerHTML = '<svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="9" y="9" width="13" height="13" rx="2"/><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"/></svg>';
    copyBtn.addEventListener('click', () => {
      const text = body.textContent || '';
      navigator.clipboard.writeText(text).then(() => {
        copyBtn.classList.add('copied');
        setTimeout(() => copyBtn.classList.remove('copied'), 1500);
      });
    });
    actions.appendChild(copyBtn);
    el.appendChild(actions);
  }

  return el;
}

function appendMessage(role, text) {
  const html = renderMarkdown(text);
  const el = createMessageElement(role, html);
  messagesEl.appendChild(el);
  highlightCodeBlocks(el);
  addCopyButtons(el);
  messagesEl.scrollTop = messagesEl.scrollHeight;
  return el;
}

function formatFileSize(bytes = 0) {
  const value = Number(bytes) || 0;
  if (value < 1024) return `${value} B`;
  if (value < 1024 * 1024) return `${Math.round(value / 102.4) / 10} KB`;
  return `${Math.round(value / 1024 / 102.4) / 10} MB`;
}

function summarizeAttachment(attachment) {
  const kind = attachment.kind === 'screen' ? '屏幕截图' : (attachment.mimeType?.startsWith('image/') ? '图片' : '文件');
  return `${kind}: ${attachment.name || 'attachment'} (${formatFileSize(attachment.size)})`;
}

function renderAttachmentPreview() {
  if (!attachmentPreview) return;
  attachmentPreview.innerHTML = '';
  attachmentPreview.classList.toggle('hidden', pendingAttachments.length === 0);
  for (const [index, attachment] of pendingAttachments.entries()) {
    const chip = document.createElement('div');
    chip.className = 'attachment-chip';
    if (attachment.dataUrl && attachment.mimeType?.startsWith('image/')) {
      const thumb = document.createElement('img');
      thumb.src = attachment.dataUrl;
      thumb.alt = attachment.name || 'attachment';
      chip.appendChild(thumb);
    }
    const label = document.createElement('span');
    label.textContent = summarizeAttachment(attachment);
    chip.appendChild(label);
    const remove = document.createElement('button');
    remove.type = 'button';
    remove.title = t('removeAttachment') || 'Remove';
    remove.textContent = '×';
    remove.addEventListener('click', () => {
      pendingAttachments.splice(index, 1);
      renderAttachmentPreview();
    });
    chip.appendChild(remove);
    attachmentPreview.appendChild(chip);
  }
}

function addPendingAttachment(attachment, { defaultPrompt = '' } = {}) {
  if (!attachment || !attachment.ok) return false;
  pendingAttachments = [...pendingAttachments, attachment].slice(-4);
  renderAttachmentPreview();
  if (!input.value.trim() && defaultPrompt) {
    input.value = defaultPrompt;
  }
  input.focus();
  return true;
}

function getSendPrompt(text, attachments) {
  const cleanText = String(text || '').trim();
  if (cleanText) return cleanText;
  if (attachments.length > 0) return '请分析我发来的附件。';
  return '';
}

function buildUserBubbleText(cleanText, attachments) {
  const lines = [cleanText || '请分析我发来的附件。'];
  for (const attachment of attachments) {
    lines.push(`📎 ${summarizeAttachment(attachment)}`);
  }
  return lines.join('\n');
}

function clearPendingAttachments() {
  pendingAttachments = [];
  if (attachmentInput) attachmentInput.value = '';
  renderAttachmentPreview();
}

function getVisiblePanel() {
  if (!chatPanel.classList.contains('hidden')) return chatPanel;
  if (!settingsPanel.classList.contains('hidden')) return settingsPanel;
  if (!cronPanel.classList.contains('hidden')) return cronPanel;
  return null;
}

function getPetScale() {
  return parseFloat(getComputedStyle(pet).getPropertyValue('--pet-scale')) || 1;
}

function getPetVisualSize() {
  return DeskBuddyPanelLayout.getPetVisualSize(getPetScale());
}

function getDesiredPanelBottom() {
  return DeskBuddyPanelLayout.getDesiredPanelBottom(getPetScale());
}

function getPanelLayout({ panelWidth = 0, panelHeight = 0 } = {}) {
  return DeskBuddyPanelLayout.getPanelLayout({ scale: getPetScale(), panelWidth, panelHeight });
}

function setPanelBottom(bottomOffset) {
  chatPanel.style.bottom = `${bottomOffset}px`;
  settingsPanel.style.bottom = `${bottomOffset}px`;
  cronPanel.style.bottom = `${bottomOffset}px`;
}

function fitPanelToTarget(panel, targetWidth, targetHeight, desiredBottom) {
  const {
    panelWidth,
    panelHeight,
    availablePanelWidth,
    availablePanelHeight,
  } = clampPanelSize({
    panelWidth: panel.offsetWidth,
    panelHeight: panel.offsetHeight,
    targetWidth,
    targetHeight,
    desiredBottom,
  });

  if (panel.offsetWidth > availablePanelWidth) {
    panel.style.width = `${availablePanelWidth}px`;
  }
  if (panel.offsetHeight > availablePanelHeight) {
    panel.style.height = `${availablePanelHeight}px`;
  }

  return {
    panelWidth,
    panelHeight,
  };
}

async function updatePanelOffsets() {
  const panel = getVisiblePanel();
  let panelWidth = panel?.offsetWidth || 0;
  let panelHeight = panel?.offsetHeight || 0;
  const { desiredBottom, requiredWidth, requiredHeight } = getPanelLayout({ panelWidth, panelHeight });
  let targetWidth = Math.max(window.innerWidth, requiredWidth);
  let targetHeight = Math.max(window.innerHeight, requiredHeight);

  if (window.innerWidth < requiredWidth || window.innerHeight < requiredHeight) {
    try {
      const bounds = await window.desktopPet.getWindowBounds();
      const resizePlan = getWindowResizePlan({
        bounds,
        requiredWidth,
        requiredHeight,
        screen: window.screen || {},
      });
      targetWidth = resizePlan.width;
      targetHeight = resizePlan.height;
      if (resizePlan.shouldResize) {
        window.desktopPet.setWindowBounds(
          resizePlan.x,
          resizePlan.y,
          resizePlan.width,
          resizePlan.height,
        );
      }
    } catch (_error) {
      targetWidth = window.innerWidth;
      targetHeight = window.innerHeight;
    }
  }

  if (panel) {
    ({ panelWidth, panelHeight } = fitPanelToTarget(panel, targetWidth, targetHeight, desiredBottom));
    const maxBottom = Math.max(0, targetHeight - panelHeight - PANEL_TOP_MARGIN);
    setPanelBottom(Math.min(desiredBottom, maxBottom));
  } else {
    setPanelBottom(desiredBottom);
  }
}

function setChatVisible(visible) {
  chatPanel.classList.toggle('hidden', !visible);
  chatPanel.classList.toggle('near-pet', visible);
  if (visible) {
    setSettingsVisible(false);
    setCronVisible(false);
    if (!isBusy) setPetState(PET_STATES.LISTEN);
    void updatePanelOffsets();
    setTimeout(() => input.focus(), 50);
    lastMouseCapture = true;
    window.desktopPet.setIgnoreMouseEvents(false);
  } else {
    closePanelCleanup();
    lastMouseCapture = false;
    window.desktopPet.setIgnoreMouseEvents(true);
  }
}

function setSettingsVisible(visible) {
  settingsPanel.classList.toggle('hidden', !visible);
  settingsPanel.classList.toggle('near-pet', visible);
  if (visible) {
    chatPanel.classList.add('hidden');
    setCronVisible(false);
    if (!isBusy) setPetState(PET_STATES.LISTEN);
    void updatePanelOffsets();
    void loadModelConfig();
    setTimeout(() => modelInput.focus(), 50);
    lastMouseCapture = true;
    window.desktopPet.setIgnoreMouseEvents(false);
  } else {
    closePanelCleanup();
    lastMouseCapture = false;
    window.desktopPet.setIgnoreMouseEvents(true);
  }
}

function setCronVisible(visible) {
  cronPanel.classList.toggle('hidden', !visible);
  cronPanel.classList.toggle('near-pet', visible);
  if (visible) {
    chatPanel.classList.add('hidden');
    settingsPanel.classList.add('hidden');
    if (!isBusy) setPetState(PET_STATES.LISTEN);
    void updatePanelOffsets();
    loadCrons();
    lastMouseCapture = true;
    window.desktopPet.setIgnoreMouseEvents(false);
  } else {
    closePanelCleanup();
    lastMouseCapture = false;
    window.desktopPet.setIgnoreMouseEvents(true);
  }
}

function closePanelCleanup() {
  if (
    chatPanel.classList.contains('hidden') &&
    settingsPanel.classList.contains('hidden') &&
    cronPanel.classList.contains('hidden')
  ) {
    if (!isBusy) setPetState(PET_STATES.IDLE);
  }
}

function toImageUrl(value) {
  const clean = String(value || '').trim();
  if (!clean) return '';
  if (/^(file|https?|data):/i.test(clean)) return clean;
  return `file://${encodeURI(clean.replace(/\\/g, '/'))}`;
}

function setPetHitMask(imageUrl) {
  if (petHitMaskUrl === imageUrl) return;
  petHitMaskUrl = imageUrl;
  petHitMask = null;
  if (!imageUrl) return;

  const image = new Image();
  if (/^https?:/i.test(imageUrl)) image.crossOrigin = 'anonymous';
  image.onload = () => {
    try {
      const canvas = document.createElement('canvas');
      const width = image.naturalWidth || image.width;
      const height = image.naturalHeight || image.height;
      if (!width || !height) return;
      canvas.width = width;
      canvas.height = height;
      const ctx = canvas.getContext('2d', { willReadFrequently: true });
      ctx.drawImage(image, 0, 0, width, height);
      ctx.getImageData(0, 0, 1, 1);
      petHitMask = { ctx, width, height };
    } catch (_error) {
      petHitMask = null;
    }
  };
  image.onerror = () => {
    petHitMask = null;
  };
  image.src = imageUrl;
}

function isPetVisualHit(x, y) {
  const rect = pet.getBoundingClientRect();
  if (!DeskBuddyPetHitTest.pointInRect(x, y, rect)) return false;

  if (petHitMask) {
    const imagePoint = mapPointToContainedImage(x, y, rect, petHitMask);
    if (!imagePoint) return false;

    try {
      const imageX = imagePoint.x;
      const imageY = imagePoint.y;
      const pixel = petHitMask.ctx.getImageData(imageX, imageY, 1, 1).data;
      return isAlphaHit(pixel[3]);
    } catch (_error) {
      petHitMask = null;
    }
  }

  return isFallbackShapeHit(x, y, rect);
}

function isPetPointerEvent(event) {
  return isPetVisualHit(event.clientX, event.clientY);
}

function applySettings(settings = {}) {
  currentSettings = {
    model: settings.model || 'hermes-agent',
    petImage: settings.petImage || '',
    listeningImage: settings.listeningImage || '',
    thinkingImage: settings.thinkingImage || '',
    happyImage: settings.happyImage || '',
    petScale: settings.petScale || 100,
    petName: settings.petName || 'Hermes',
    locale: settings.locale || 'zh',
    hermesPath: settings.hermesPath || '',
    cronDeliver: settings.cronDeliver || 'local',
    sessionId: settings.sessionId || '',
    conversationMode: settings.conversationMode === 'api' ? 'api' : 'cli',
    apiBaseUrl: settings.apiBaseUrl || 'http://127.0.0.1:8642',
    apiConversationId: settings.apiConversationId || '',
    apiMessages: Array.isArray(settings.apiMessages) ? settings.apiMessages : [],
  };

  petImage.value = currentSettings.petImage;
  if (listeningImageInput) listeningImageInput.value = currentSettings.listeningImage;
  if (thinkingImageInput) thinkingImageInput.value = currentSettings.thinkingImage;
  if (happyImageInput) happyImageInput.value = currentSettings.happyImage;
  if (petScaleInput) petScaleInput.value = currentSettings.petScale;
  if (petScaleValue) petScaleValue.textContent = `${currentSettings.petScale}%`;
  if (petNameInput) petNameInput.value = currentSettings.petName;
  if (hermesPathInput) hermesPathInput.value = currentSettings.hermesPath;
  if (conversationModeSelect) conversationModeSelect.value = currentSettings.conversationMode;
  if (apiBaseUrlInput) apiBaseUrlInput.value = currentSettings.apiBaseUrl;
  if (apiConversationIdDisplay) apiConversationIdDisplay.textContent = currentSettings.apiConversationId || '—';
  modelInput.value = currentSettings.model;
  cronDeliver.value = currentSettings.cronDeliver;
  sessionIdDisplay.textContent = currentSettings.sessionId || '—';
  updatePetVisuals();
  applyPetScale(currentSettings.petScale);
  updatePetName(currentSettings.petName);
  setLocale(currentSettings.locale);

  // Show detected hermes path in placeholder when field is empty
  if (!currentSettings.hermesPath && hermesPathInput) {
    window.desktopPet.detectHermesPath().then((result) => {
      if (result.ok && result.path) {
        hermesPathInput.placeholder = `${t('autoDetected')}: ${result.path}`;
      } else {
        hermesPathInput.placeholder = t('notFound');
      }
    }).catch(() => {
      hermesPathInput.placeholder = t('hermesPathPlaceholder');
    });
  }
}

function getStateImage(state) {
  if (state === PET_STATES.LISTEN) {
    if (currentSettings.listeningImage) {
      return toImageUrl(currentSettings.listeningImage);
    }
    return new URL('./assets/pet_thinking.png', location.href).href;
  }
  if (state === PET_STATES.THINKING) {
    if (currentSettings.thinkingImage) {
      return toImageUrl(currentSettings.thinkingImage);
    }
    return new URL('./assets/pet_running.png', location.href).href;
  }
  if (state === PET_STATES.DONE) {
    if (currentSettings.happyImage) {
      return toImageUrl(currentSettings.happyImage);
    }
    return new URL('./assets/pet_done.png', location.href).href;
  }
  if (currentSettings.petImage) {
    return toImageUrl(currentSettings.petImage);
  }
  return new URL('./assets/pet_normal.png', location.href).href;
}

function updatePetVisuals() {
  pet.classList.remove('idle', 'listen', 'thinking', 'done');
  pet.classList.add(petState);

  const imageUrl = getStateImage(petState);
  setPetHitMask(imageUrl);
  if (imageUrl) {
    petAvatar.style.backgroundImage = `url("${imageUrl.replace(/"/g, '\\"')}")`;
    petAvatar.classList.remove('hidden');
    defaultPet.classList.add('hidden');
  } else {
    petAvatar.style.backgroundImage = '';
    petAvatar.classList.add('hidden');
    defaultPet.classList.remove('hidden');
  }
}

function setPetState(state) {
  if (petState === state) return;
  petState = state;
  updatePetVisuals();

  if (petStateTimer) {
    clearTimeout(petStateTimer);
    petStateTimer = null;
  }

  if (state === PET_STATES.DONE) {
    bubble.textContent = `${currentSettings.petName || 'Hermes'} ${t('gotIt')}`;
    petStateTimer = setTimeout(() => {
      if (
        chatPanel.classList.contains('hidden') &&
        settingsPanel.classList.contains('hidden') &&
        cronPanel.classList.contains('hidden')
      ) {
        setPetState(PET_STATES.IDLE);
      } else {
        setPetState(PET_STATES.LISTEN);
      }
    }, 3000);
  } else if (state === PET_STATES.THINKING) {
    bubble.textContent = `${currentSettings.petName || 'Hermes'} ${t('thinking')}`;
  } else if (state === PET_STATES.LISTEN) {
    bubble.textContent = `${currentSettings.petName || 'Hermes'} ${t('listening')}`;
  } else {
    bubble.textContent = `${currentSettings.petName || 'Hermes'} ${t('online')}`;
  }
}

function setSelectOptions(select, options, customLabel = '自定义...') {
  if (!select) return;
  select.innerHTML = '';
  const customOption = document.createElement('option');
  customOption.value = '';
  customOption.textContent = customLabel;
  select.appendChild(customOption);
  for (const item of options) {
    const option = document.createElement('option');
    option.value = item.value;
    option.textContent = item.label || item.value;
    select.appendChild(option);
  }
}

function getSelectedProviderModels() {
  const provider = providerSelect?.value || modelOptions.provider || '';
  const providerEntry = (modelOptions.providers || []).find(
    (item) => item.slug === provider || item.name === provider,
  );
  return providerEntry?.models || [];
}

function refreshModelSelectOptions(selectedModel = modelInput?.value || '') {
  const models = getSelectedProviderModels();
  const modelItems = models.map((model) => ({ value: model, label: model }));
  setSelectOptions(modelSelect, modelItems, t('customModel') || '自定义...');

  const cleanModel = String(selectedModel || '').trim();
  if (!modelSelect) return;
  if (cleanModel && models.includes(cleanModel)) {
    modelSelect.value = cleanModel;
  } else {
    modelSelect.value = '';
  }
}

function refreshProviderSelectOptions(selectedProvider = '') {
  const providerItems = (modelOptions.providers || []).map((provider) => ({
    value: provider.slug || provider.name,
    label: provider.name && provider.slug && provider.name !== provider.slug
      ? `${provider.name} (${provider.slug})`
      : provider.slug || provider.name,
  }));
  setSelectOptions(providerSelect, providerItems, t('customProvider') || '自定义...');

  const cleanProvider = String(selectedProvider || '').trim();
  if (!providerSelect) return;
  if (cleanProvider && providerItems.some((item) => item.value === cleanProvider)) {
    providerSelect.value = cleanProvider;
  } else {
    providerSelect.value = '';
  }
}

async function loadProviders() {
  try {
    const result = await window.desktopPet.listHermesProviders();
    if (!result.ok || !result.providers) return;
    const existing = modelOptions.providers || [];
    for (const p of result.providers) {
      const slug = String(p || '').trim();
      if (!slug) continue;
      if (!existing.some((item) => item.slug === slug || item.name === slug)) {
        existing.push({ slug, name: slug, models: [] });
      }
    }
    modelOptions.providers = existing;
    refreshProviderSelectOptions(providerSelect?.value || modelOptions.provider);
    refreshModelSelectOptions(modelInput?.value || modelOptions.model);
  } catch (_error) {}
}

async function loadModelConfig() {
  try {
    const optionsResult = await window.desktopPet.listHermesModelOptions();
    if (optionsResult.ok) {
      modelOptions = {
        providers: Array.isArray(optionsResult.providers) ? optionsResult.providers : [],
        provider: optionsResult.provider || '',
        model: optionsResult.model || '',
      };
    }

    await loadProviders();

    let provider = modelOptions.provider || '';
    let model = modelOptions.model || '';

    if (!provider || !model) {
      const configResult = await window.desktopPet.getHermesModelConfig();
      if (configResult.ok) {
        provider = provider || configResult.provider || '';
        model = model || configResult.model || '';
      }
    }

    refreshProviderSelectOptions(provider);
    if (modelInput && model) modelInput.value = model;
    refreshModelSelectOptions(model);
  } catch (_error) {}
}

async function loadSettings() {
  try {
    applySettings(await window.desktopPet.getSettings());
    await loadModelConfig();
    if (currentSettings.conversationMode === 'api') {
      if (currentSettings.apiConversationId && currentSettings.apiConversationId.startsWith('deskbuddy-api-')) {
        await loadSessionHistory(currentSettings.apiConversationId);
      } else {
        await renderApiHistoryFromSettings();
      }
    }
  } catch (error) {
    setSettingsMessage(`${t('loadSettingsFailed')}：${error.message}`, 'error');
  }
}

function applyPetScale(scale) {
  const s = Math.min(300, Math.max(50, Number(scale) || 100));
  pet.style.setProperty('--pet-scale', (s / 100).toString());
  void updatePanelOffsets();
}

function updatePetName(name) {
  const n = String(name || 'Hermes').trim() || 'Hermes';
  if (chatTitle) chatTitle.textContent = n;
  if (settingsTitle) settingsTitle.textContent = `${n} ${t('settingsSuffix') || '设定'}`;
  document.title = n;
}

async function persistSettings(partial = {}) {
  const saved = await window.desktopPet.saveSettings({
    model: modelInput.value,
    petImage: petImage.value,
    listeningImage: listeningImageInput.value,
    thinkingImage: thinkingImageInput.value,
    happyImage: happyImageInput.value,
    petScale: Number(petScaleInput?.value) || 100,
    petName: String(petNameInput?.value || 'Hermes').trim() || 'Hermes',
    hermesPath: String(hermesPathInput?.value || '').trim(),
    conversationMode: conversationModeSelect.value,
    apiBaseUrl: String(apiBaseUrlInput?.value || '').trim(),
    cronDeliver: cronDeliver.value,
    ...partial,
  });
  applySettings(saved);
  return saved;
}

async function startNewSession() {
  const saved = await window.desktopPet.saveSettings({ sessionId: '', apiConversationId: '', apiMessages: [] });
  applySettings(saved);
  history.length = 0;
  messagesEl.innerHTML = `<div class="message assistant">${t('welcomeNewSession')}</div>`;
  setSettingsMessage(t('sessionCreated'), 'ok');
  await loadSessions();
}

function normalizeHistoryContent(content) {
  if (Array.isArray(content)) {
    return content
      .map((part) => {
        if (typeof part === 'string') return part;
        if (part?.type === 'text') return String(part.text || '');
        if (part?.type === 'image_url') return '📎 image';
        return '';
      })
      .filter(Boolean)
      .join('\n')
      .trim();
  }
  return String(content || '').trim();
}

async function renderApiHistoryFromSettings() {
  const messages = Array.isArray(currentSettings.apiMessages) ? currentSettings.apiMessages : [];
  history.length = 0;
  messagesEl.innerHTML = '';

  for (const msg of messages) {
    const role = msg.role === 'assistant' ? 'assistant' : 'user';
    const content = normalizeHistoryContent(msg.content);
    if (!content) continue;
    history.push({ role, content });
    appendMessage(role, content);
  }

  if (history.length === 0) {
    messagesEl.innerHTML = `<div class="message assistant">${t('welcomeHistory')}</div>`;
  }
}

async function loadSessions() {
  try {
    sessionSelect.disabled = false;
    const result = await window.desktopPet.listSessions();
    if (!result.ok) return;

    const currentId = currentSettings.conversationMode === 'api'
      ? currentSettings.apiConversationId || ''
      : currentSettings.sessionId || '';
    // Keep the first option (新建会话)
    sessionSelect.innerHTML = `<option value="">${t('sessionLabel')}</option>`;

    for (const s of result.sessions) {
      const option = document.createElement('option');
      option.value = s.id;
      const label = s.title || s.id;
      const time = s.started_at ? s.started_at.replace('T', ' ').slice(0, 16) : '';
      option.textContent = time ? `${label} · ${time}` : label;
      if (s.id === currentId) option.selected = true;
      sessionSelect.appendChild(option);
    }
  } catch (_error) {}
}

async function loadSessionHistory(sessionId) {
  if (!sessionId) {
    history.length = 0;
    messagesEl.innerHTML = `<div class="message assistant">${t('welcomeNewSession')}</div>`;
    return;
  }

  try {
    setStatus(t('loadingHistory'));
    const result = await window.desktopPet.getSessionMessages(sessionId);
    if (!result.ok) {
      setStatus(`${t('loadHistoryFailed')}：${result.error}`, 'error');
      return;
    }

    history.length = 0;
    messagesEl.innerHTML = '';

    for (const msg of result.messages) {
      const role = msg.role === 'user' ? 'user' : 'assistant';
      const content = normalizeHistoryContent(msg.content);
      if (!content) continue;
      history.push({ role, content });
      appendMessage(role, content);
    }

    if (currentSettings.conversationMode === 'api') {
      const saved = await window.desktopPet.saveSettings({
        apiConversationId: sessionId,
        apiMessages: history.slice(-40).map((item) => ({ role: item.role, content: item.content })),
      });
      applySettings(saved);
    }

    if (history.length === 0) {
      messagesEl.innerHTML = `<div class="message assistant">${t('welcomeHistory')}</div>`;
    }
    setStatus(t('historyLoaded'), 'ok');
  } catch (error) {
    setStatus(`${t('loadHistoryFailed')}：${error.message}`, 'error');
  }
}

async function checkHermes() {
  setStatus(t('checkingHermes'));
  const health = await window.desktopPet.checkHermesHealth();
  if (health.ok) {
    setStatus('', 'ok');
    bubble.textContent = `${currentSettings.petName || 'Hermes'} ${t('online')}`;
    await loadSessions();
    return true;
  }

  setStatus(`${t('hermesUnavailable')}：${health.error || t('installHermes')}`, 'error');
  bubble.textContent = `${currentSettings.petName || 'Hermes'} ${t('offline')}`;
  return false;
}

function buildHistoryForApi() {
  return history.slice(-20).map((item) => ({
    role: item.role,
    content: item.content,
  }));
}

function cleanupStream(requestId) {
  if (!requestId) return;
  window.desktopPet.offStream(requestId);
  activeStreamCleanups.forEach((fn) => {
    try { fn(); } catch (_e) {}
  });
  activeStreamCleanups = [];
  if (activeStreamRequestId === requestId) {
    activeStreamRequestId = null;
  }
}

async function sendMessage(text) {
  if (isBusy) return;
  const attachments = pendingAttachments.slice();
  const cleanText = getSendPrompt(text, attachments);
  if (!cleanText && attachments.length === 0) return;

  isBusy = true;
  setPetState(PET_STATES.THINKING);
  input.value = '';
  input.disabled = true;
  sendButton.disabled = true;
  if (attachFileButton) attachFileButton.disabled = true;
  if (screenCaptureButton) screenCaptureButton.disabled = true;

  const userBubbleText = buildUserBubbleText(cleanText, attachments);
  appendMessage('user', userBubbleText);
  history.push({ role: 'user', content: userBubbleText });

  // Create assistant message placeholder
  const assistantEl = createMessageElement('assistant');
  const body = assistantEl.querySelector('.message-body');

  // Tool progress area
  const toolArea = document.createElement('div');
  toolArea.className = 'tool-progress-area';
  assistantEl.insertBefore(toolArea, body);

  const typing = document.createElement('span');
  typing.className = 'typing-indicator';
  typing.textContent = `${currentSettings.petName || 'Hermes'} ${t('typing')}`;
  body.appendChild(typing);

  messagesEl.appendChild(assistantEl);
  messagesEl.scrollTop = messagesEl.scrollHeight;

  const requestId = `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
  activeStreamRequestId = requestId;

  let replyText = '';
  const toolCalls = new Map();

  const removeChunk = window.desktopPet.onStreamChunk(requestId, (data) => {
    typing.remove();
    if (data.content) {
      replyText += data.content;
      body.innerHTML = renderMarkdown(replyText);
      highlightCodeBlocks(body);
      addCopyButtons(body);
      messagesEl.scrollTop = messagesEl.scrollHeight;
    }
  });

  const removeTool = window.desktopPet.onStreamTool(requestId, (data) => {
    typing.remove();
    // Hermes custom tool progress event
    if (data.tool && data.status) {
      const key = data.toolCallId || data.tool;
      const existing = toolCalls.get(key);
      if (existing) {
        existing.textContent = `${data.emoji || '🔧'} ${data.label || data.tool} — ${data.status === 'running' ? (t('running') || 'Running') : (t('completed') || 'Completed')}`;
        existing.dataset.status = data.status;
      } else {
        const badge = document.createElement('div');
        badge.className = 'tool-badge';
        badge.dataset.status = data.status;
        badge.textContent = `${data.emoji || '🔧'} ${data.label || data.tool} — ${data.status === 'running' ? (t('running') || 'Running') : (t('completed') || 'Completed')}`;
        toolArea.appendChild(badge);
        toolCalls.set(key, badge);
      }
    }
    if (data.toolCalls) {
      // Standard OpenAI tool_calls delta (not used by Hermes in stream yet, but prepared)
      for (const tc of data.toolCalls) {
        const key = tc.id || tc.index;
        const existing = toolCalls.get(key);
        if (existing) {
          existing.textContent = `🔧 ${tc.function?.name || 'tool'} — ${t('calling') || 'Calling'}`;
        } else {
          const badge = document.createElement('div');
          badge.className = 'tool-badge';
          badge.dataset.status = 'running';
          badge.textContent = `🔧 ${tc.function?.name || 'tool'} — ${t('calling') || 'Calling'}`;
          toolArea.appendChild(badge);
          toolCalls.set(key, badge);
        }
      }
    }
  });

  const removeDone = window.desktopPet.onStreamDone(requestId, async (data = {}) => {
    cleanupStream(requestId);
    if (replyText) {
      history.push({ role: 'assistant', content: replyText });
    }
    if (data.sessionId) {
      const nextSettings = currentSettings.conversationMode === 'api'
        ? {
            ...currentSettings,
            apiConversationId: data.sessionId,
            apiMessages: history.slice(-40).map((item) => ({ role: item.role, content: item.content })),
          }
        : { ...currentSettings, sessionId: data.sessionId };
      applySettings(nextSettings);
      await loadSessions();
      if (sessionSelect) sessionSelect.value = data.sessionId;
    }
    setStatus(t('connected'), 'ok');
    clearPendingAttachments();
    isBusy = false;
    setPetState(PET_STATES.DONE);
    input.disabled = false;
    sendButton.disabled = false;
    if (attachFileButton) attachFileButton.disabled = false;
    if (screenCaptureButton) screenCaptureButton.disabled = false;
    input.focus();
  });

  const removeError = window.desktopPet.onStreamError(requestId, (data) => {
    cleanupStream(requestId);
    typing.remove();
    const errMsg = `${t('error')}：${data.error || t('error')}`;
    body.innerHTML = `<span class="error-text">${escapeHtml(errMsg)}</span>`;
    appendMessage('system', errMsg);
    setStatus(errMsg, 'error');
    setPetState(PET_STATES.IDLE);
    isBusy = false;
    input.disabled = false;
    sendButton.disabled = false;
    if (attachFileButton) attachFileButton.disabled = false;
    if (screenCaptureButton) screenCaptureButton.disabled = false;
    input.focus();
  });

  activeStreamCleanups.push(removeChunk, removeTool, removeDone, removeError);

  try {
    window.desktopPet.sendMessageStream(requestId, {
      text: cleanText,
      attachments,
    });
  } catch (error) {
    cleanupStream(requestId);
    typing.remove();
    const errMsg = `${t('error')}：${error.message}`;
    body.innerHTML = `<span class="error-text">${escapeHtml(errMsg)}</span>`;
    appendMessage('system', errMsg);
    setStatus(errMsg, 'error');
    setPetState(PET_STATES.IDLE);
    isBusy = false;
    input.disabled = false;
    sendButton.disabled = false;
    if (attachFileButton) attachFileButton.disabled = false;
    if (screenCaptureButton) screenCaptureButton.disabled = false;
    input.focus();
  }
}

/* ===== Pet interactions ===== */
pet.addEventListener('contextmenu', (event) => {
  if (!isPetPointerEvent(event)) return;
  event.preventDefault();
  suppressClickAfterDrag = true;
  window.desktopPet.openSettingsMenu({ x: event.clientX, y: event.clientY });
});

pet.addEventListener('pointerdown', (event) => {
  if (event.button !== 0 || !isPetPointerEvent(event)) return;
  pointerDown = { x: event.screenX, y: event.screenY, time: Date.now() };
  lastPointer = { x: event.screenX, y: event.screenY };
  isDraggingPet = false;
  suppressClickAfterDrag = false;
  pet.setPointerCapture?.(event.pointerId);
});

pet.addEventListener('pointermove', (event) => {
  if (!pointerDown || !lastPointer) return;
  const totalDistance = Math.hypot(event.screenX - pointerDown.x, event.screenY - pointerDown.y);
  const deltaX = event.screenX - lastPointer.x;
  const deltaY = event.screenY - lastPointer.y;
  lastPointer = { x: event.screenX, y: event.screenY };

  if (totalDistance > 12) {
    isDraggingPet = true;
    suppressClickAfterDrag = true;
  }

  if (isDraggingPet && (deltaX || deltaY)) {
    window.desktopPet.moveWindowBy(deltaX, deltaY);
  }
});

pet.addEventListener('pointerup', (event) => {
  const wasShortClick = pointerDown && (Date.now() - pointerDown.time < 250);
  if (!isDraggingPet || wasShortClick) {
    suppressClickAfterDrag = false;
  }
  pointerDown = null;
  lastPointer = null;
  isDraggingPet = false;
  pet.releasePointerCapture?.(event.pointerId);
});

pet.addEventListener('pointercancel', () => {
  pointerDown = null;
  lastPointer = null;
  isDraggingPet = false;
  suppressClickAfterDrag = false;
});

pet.addEventListener('click', async (event) => {
  if (suppressClickAfterDrag || !isPetPointerEvent(event)) return;
  const visible = await window.desktopPet.toggleChat();
  if (visible) checkHermes();
});

closeChat.addEventListener('click', () => {
  window.desktopPet.setChatVisible(false);
});

if (screenCaptureButton) {
  screenCaptureButton.addEventListener('click', async () => {
    if (isBusy) return;
    screenCaptureButton.disabled = true;
    setStatus(t('capturingScreen'));
    try {
      const result = await window.desktopPet.captureScreen();
      if (result.ok) {
        addPendingAttachment(result, { defaultPrompt: t('screenCaptureDefaultPrompt') });
        setStatus(t('screenCaptureReady'), 'ok');
      } else if (!result.canceled) {
        setStatus(`${t('screenCaptureFailed')}：${result.error || t('error')}`, 'error');
      }
    } catch (error) {
      setStatus(`${t('screenCaptureFailed')}：${error.message}`, 'error');
    } finally {
      screenCaptureButton.disabled = false;
    }
  });
}

if (attachFileButton) {
  attachFileButton.addEventListener('click', async () => {
    if (isBusy) return;
    attachFileButton.disabled = true;
    try {
      const result = await window.desktopPet.chooseAttachment();
      if (result.ok) {
        addPendingAttachment(result, { defaultPrompt: result.mimeType?.startsWith('image/') ? '请分析这张图片。' : '请分析这个附件。' });
        setStatus(t('attachmentReady'), 'ok');
      } else if (!result.canceled) {
        setStatus(`${t('attachmentFailed')}：${result.error || t('error')}`, 'error');
      }
    } catch (error) {
      setStatus(`${t('attachmentFailed')}：${error.message}`, 'error');
    } finally {
      attachFileButton.disabled = false;
    }
  });
}

if (attachmentInput) {
  attachmentInput.addEventListener('change', () => {
    // Native file input is present as an accessibility/fallback affordance; Electron dialog returns file data through chooseAttachment().
    attachmentInput.value = '';
  });
}

closeSettings.addEventListener('click', () => {
  setSettingsVisible(false);
});

closeCron.addEventListener('click', () => {
  setCronVisible(false);
});

chooseImage.addEventListener('click', async () => {
  setSettingsMessage(t('choosingImage'));
  const result = await window.desktopPet.choosePetImage();
  if (result.ok) {
    applySettings(result.settings);
    setSettingsMessage(t('imageUpdated'), 'ok');
  } else if (result.canceled) {
    setSettingsMessage(t('cancelled'));
  } else {
    setSettingsMessage(`${t('error')}：${result.error || t('error')}`, 'error');
  }
});

if (petScaleInput && petScaleValue) {
  petScaleInput.addEventListener('input', () => {
    const val = petScaleInput.value;
    petScaleValue.textContent = `${val}%`;
    applyPetScale(val);
  });
  petScaleInput.addEventListener('change', () => {
    const val = Number(petScaleInput.value) || 100;
    window.desktopPet.saveSettings({ petScale: val });
  });
}

if (resetAllImages) {
  resetAllImages.addEventListener('click', async () => {
    await persistSettings({ petImage: '', listeningImage: '', thinkingImage: '', happyImage: '', petScale: 100 });
    setSettingsMessage(t('imageReset'), 'ok');
  });
}

chooseListeningImage.addEventListener('click', async () => {
  setSettingsMessage(t('choosingImage'));
  const result = await window.desktopPet.chooseImageField('listeningImage');
  if (result.ok) {
    applySettings(result.settings);
    setSettingsMessage(t('imageUpdated'), 'ok');
  } else if (result.canceled) {
    setSettingsMessage(t('cancelled'));
  } else {
    setSettingsMessage(`${t('error')}：${result.error || t('error')}`, 'error');
  }
});

chooseThinkingImage.addEventListener('click', async () => {
  setSettingsMessage(t('choosingImage'));
  const result = await window.desktopPet.chooseImageField('thinkingImage');
  if (result.ok) {
    applySettings(result.settings);
    setSettingsMessage(t('imageUpdated'), 'ok');
  } else if (result.canceled) {
    setSettingsMessage(t('cancelled'));
  } else {
    setSettingsMessage(`${t('error')}：${result.error || t('error')}`, 'error');
  }
});

chooseHappyImage.addEventListener('click', async () => {
  setSettingsMessage(t('choosingImage'));
  const result = await window.desktopPet.chooseImageField('happyImage');
  if (result.ok) {
    applySettings(result.settings);
    setSettingsMessage(t('imageUpdated'), 'ok');
  } else if (result.canceled) {
      setSettingsMessage(t('cancelled'));
  } else {
    setSettingsMessage(`${t('error')}：${result.error || t('error')}`, 'error');
  }
});

providerSelect.addEventListener('change', () => {
  const models = getSelectedProviderModels();
  const nextModel = models[0] || '';
  if (nextModel && modelInput) modelInput.value = nextModel;
  refreshModelSelectOptions();
});

modelSelect.addEventListener('change', () => {
  if (modelSelect.value && modelInput) {
    modelInput.value = modelSelect.value;
  } else if (modelInput) {
    modelInput.focus();
  }
});

saveSettings.addEventListener('click', async () => {
  try {
    await persistSettings();
    await loadSessions();
    const provider = providerSelect.value.trim();
    const model = modelInput.value.trim();
    const fullModel = provider && provider !== 'custom' ? `${provider}/${model}` : model;

    if (model) {
      setSettingsMessage(t('switchingModel'));
      const result = await window.desktopPet.setHermesModel(fullModel);
      if (!result.ok) {
        setSettingsMessage(`${t('saveButSwitchFailed')}：${result.error}`, 'error');
        return;
      }
      const info = result.provider
        ? `provider: ${result.provider} · model: ${result.model}`
        : `model: ${result.model}`;
      setSettingsMessage(`${t('settingsSaved')} · ${info}`, 'ok');
    } else {
      setSettingsMessage(t('settingsSaved'), 'ok');
    }
  } catch (error) {
    setSettingsMessage(`${t('saveFailed')}：${error.message}`, 'error');
  }
});

newSessionBtn.addEventListener('click', async () => {
  try {
    await startNewSession();
  } catch (error) {
    setSettingsMessage(`${t('newSessionFailed')}：${error.message}`, 'error');
  }
});

function setCronMessage(text, mode = 'normal') {
  if (cronMessageEl) {
    cronMessageEl.textContent = text;
    cronMessageEl.dataset.mode = mode;
  }
}

async function loadCrons() {
  try {
    cronList.innerHTML = `<div class="cron-empty">${t('loading') || 'Loading...'}</div>`;
    const result = await window.desktopPet.listCrons();
    if (!result.ok) {
      cronList.innerHTML = `<div class="cron-empty">${t('loadFailed') || 'Load failed'}：${escapeHtml(result.error || t('error'))}</div>`;
      return;
    }
    if (!result.jobs || result.jobs.length === 0) {
      cronList.innerHTML = `<div class="cron-empty">${t('noCronJobs') || 'No cron jobs'}</div>`;
      return;
    }
    cronList.innerHTML = '';
    for (const job of result.jobs) {
      const el = document.createElement('div');
      el.className = 'cron-item';
      const name = escapeHtml(job.name || job.id.slice(0, 12));
      const schedule = escapeHtml(job.schedule || '—');
      const status = escapeHtml(job.status || 'unknown');
      const nextRun = escapeHtml(job.next_run || '—');
      const lastRun = escapeHtml(job.last_run || '—');
      const deliver = escapeHtml(job.deliver || 'local');
      const script = escapeHtml(job.script || '—');
      el.innerHTML = `
        <div class="cron-item-header">
          <span class="cron-item-name">${name}</span>
          <span class="cron-item-status" data-status="${status}">${status}</span>
        </div>
        <div class="cron-item-meta">
          <span>⏰ ${schedule}</span>
          <span>📤 ${deliver}</span>
        </div>
        <div class="cron-item-meta">
          <span>${t('nextRun') || 'Next'}: ${nextRun.replace('T', ' ').slice(0, 16)}</span>
          <span>${t('lastRun') || 'Last'}: ${lastRun.replace('T', ' ').slice(0, 16)}</span>
        </div>
        <div class="cron-item-script">${script}</div>
      `;
      cronList.appendChild(el);
    }
  } catch (error) {
    cronList.innerHTML = `<div class="cron-empty">${t('loadFailed') || 'Load failed'}：${escapeHtml(error.message)}</div>`;
  }
}

cronForm.addEventListener('submit', async (event) => {
  event.preventDefault();
  const schedule = cronSchedule.value.trim();
  const prompt = cronPrompt.value.trim();
  if (!schedule || !prompt) {
    setCronMessage(t('cronNeedFill'), 'error');
    return;
  }

  createCron.disabled = true;
  setCronMessage(t('addingCron'));
  try {
    const result = await window.desktopPet.createCron({
      schedule,
      prompt,
      name: cronName.value.trim(),
      deliver: cronDeliver.value.trim() || currentSettings.cronDeliver || 'local',
    });
    if (!result.ok) {
      setCronMessage(`${t('cronAddFailed')}：${result.error || result.stderr || `exit ${result.code}`}`, 'error');
      return;
    }
    await persistSettings({ cronDeliver: cronDeliver.value.trim() || 'local' });
    cronPrompt.value = '';
    setCronMessage((result.stdout || t('cronAdded')).trim(), 'ok');
    await loadCrons();
  } catch (error) {
    setCronMessage(`${t('cronAddFailed')}：${error.message}`, 'error');
  } finally {
    createCron.disabled = false;
  }
});

composer.addEventListener('submit', (event) => {
  event.preventDefault();
  sendMessage(input.value);
});

input.addEventListener('keydown', (event) => {
  if (event.key === 'Enter' && !event.shiftKey) {
    event.preventDefault();
    composer.requestSubmit();
  }
});

window.desktopPet.onChatVisibility(setChatVisible);
window.desktopPet.onSettingsOpen(() => setSettingsVisible(true));
window.desktopPet.onCronOpen(() => setCronVisible(true));
window.desktopPet.onSettingsChanged(applySettings);
loadSettings();
checkHermes();

/* ===== Mouse passthrough: only capture clicks on pet/panels ===== */
let lastMouseCapture = true;
let mouseX = 0;
let mouseY = 0;

function shouldCaptureAt(x, y) {
  const el = document.elementFromPoint(x, y);
  if (!el) return false;
  const petEl = el.closest('#pet');
  if (petEl) return isPetVisualHit(x, y);
  if (el.closest('#chatPanel, #settingsPanel, #cronPanel')) return true;
  const interactive = el.closest('button, input, textarea, a, [role="button"]');
  if (interactive && interactive.closest('#chatPanel, #settingsPanel')) return true;
  return false;
}

document.addEventListener('mousemove', (event) => {
  mouseX = event.clientX;
  mouseY = event.clientY;

  // Always capture while dragging so the window follows the cursor
  if (isDraggingPet || pointerDown) {
    if (!lastMouseCapture) {
      lastMouseCapture = true;
      window.desktopPet.setIgnoreMouseEvents(false);
    }
    return;
  }

  const needCapture = shouldCaptureAt(mouseX, mouseY);
  if (needCapture !== lastMouseCapture) {
    lastMouseCapture = needCapture;
    window.desktopPet.setIgnoreMouseEvents(!needCapture);
  }
});

window.addEventListener('resize', () => {
  if (resizingChat) return;
  if (!chatPanel.classList.contains('hidden') ||
      !settingsPanel.classList.contains('hidden') ||
      !cronPanel.classList.contains('hidden')) {
    void updatePanelOffsets();
  }
});

/* ===== Chat panel resize (TL, TR, BL) ===== */
let resizingChat = false;
let resizeReady = false;
let resizeCorner = '';
let resizeStart = { x: 0, y: 0, w: 0, h: 0, winX: 0, winY: 0, winW: 0, winH: 0 };
let pendingResizeFrame = 0;
let pendingWindowBounds = null;

function flushResizeWindowBounds() {
  if (pendingResizeFrame) {
    window.cancelAnimationFrame(pendingResizeFrame);
    pendingResizeFrame = 0;
  }
  const bounds = pendingWindowBounds;
  pendingWindowBounds = null;
  if (!bounds) return;
  window.desktopPet.setWindowBounds(bounds.x, bounds.y, bounds.width, bounds.height);
}

function scheduleResizeWindowBounds(x, y, width, height) {
  pendingWindowBounds = {
    x: Math.round(x),
    y: Math.round(y),
    width: Math.round(width),
    height: Math.round(height),
  };
  if (pendingResizeFrame) return;
  pendingResizeFrame = window.requestAnimationFrame(flushResizeWindowBounds);
}

function setupResizeHandle(handle, corner) {
  handle.addEventListener('pointerdown', (event) => {
    event.preventDefault();
    event.stopPropagation();
    resizingChat = true;
    resizeReady = false;
    resizeCorner = corner;
    resizeStart.x = event.screenX;
    resizeStart.y = event.screenY;
    resizeStart.w = chatPanel.offsetWidth;
    resizeStart.h = chatPanel.offsetHeight;
    handle.setPointerCapture(event.pointerId);

    window.desktopPet.getWindowBounds().then((bounds) => {
      if (!resizingChat) return;
      resizeStart.winX = bounds.x;
      resizeStart.winY = bounds.y;
      resizeStart.winW = bounds.width;
      resizeStart.winH = bounds.height;
      resizeReady = true;
    }).catch(() => {
      resizeStart.winX = 0;
      resizeStart.winY = 0;
      resizeStart.winW = window.innerWidth;
      resizeStart.winH = window.innerHeight;
      resizeReady = true;
    });
  });

  handle.addEventListener('pointermove', (event) => {
    if (!resizingChat || !resizeReady || resizeCorner !== corner) return;
    const deltaX = event.screenX - resizeStart.x;
    const deltaY = event.screenY - resizeStart.y;

    let newW = resizeStart.w;
    let newH = resizeStart.h;

    if (corner.includes('left')) {
      newW = resizeStart.w - deltaX;
    } else {
      newW = resizeStart.w + deltaX;
    }

    if (corner.includes('top')) {
      newH = resizeStart.h - deltaY;
    } else {
      newH = resizeStart.h + deltaY;
    }

    const screenLeft = Number(window.screen?.availLeft) || 0;
    const screenTop = Number(window.screen?.availTop) || 0;
    const screenRight = screenLeft + (window.screen?.availWidth || resizeStart.winW);
    const screenBottom = screenTop + (window.screen?.availHeight || resizeStart.winH);
    const windowRight = resizeStart.winX + resizeStart.winW;
    const windowBottom = resizeStart.winY + resizeStart.winH;
    const minTargetW = 260 + PET_RIGHT_OFFSET + PANEL_LEFT_MARGIN;
    const minTargetH = 200 + getDesiredPanelBottom() + PANEL_TOP_MARGIN;
    const maxTargetW = corner.includes('left')
      ? Math.max(minTargetW, windowRight - screenLeft)
      : Math.max(minTargetW, screenRight - resizeStart.winX);
    const maxTargetH = corner.includes('top')
      ? Math.max(minTargetH, windowBottom - screenTop)
      : Math.max(minTargetH, screenBottom - resizeStart.winY);
    const desiredBottom = getDesiredPanelBottom();
    const maxPanelSize = clampPanelSize({
      panelWidth: newW,
      panelHeight: newH,
      targetWidth: maxTargetW,
      targetHeight: maxTargetH,
      desiredBottom,
    });
    newW = Math.min(640, maxPanelSize.panelWidth);
    newH = maxPanelSize.panelHeight;

    let layout = getPanelLayout({ panelWidth: newW, panelHeight: newH });
    let targetWidth = Math.min(layout.requiredWidth, maxTargetW);
    let targetHeight = Math.min(layout.requiredHeight, maxTargetH);
    const availablePanelSize = clampPanelSize({
      panelWidth: newW,
      panelHeight: newH,
      targetWidth,
      targetHeight,
      desiredBottom,
    });
    const availablePanelWidth = Math.min(640, availablePanelSize.availablePanelWidth);
    const availablePanelHeight = availablePanelSize.availablePanelHeight;
    newW = Math.min(availablePanelSize.panelWidth, availablePanelWidth);
    newH = Math.min(availablePanelSize.panelHeight, availablePanelHeight);

    layout = getPanelLayout({ panelWidth: newW, panelHeight: newH });
    targetWidth = Math.min(layout.requiredWidth, maxTargetW);
    targetHeight = Math.min(layout.requiredHeight, maxTargetH);
    let newX = resizeStart.winX;
    let newY = resizeStart.winY;

    if (corner.includes('left')) {
      newX = resizeStart.winX + (resizeStart.winW - targetWidth);
    }
    if (corner.includes('top')) {
      newY = resizeStart.winY + (resizeStart.winH - targetHeight);
    }

    chatPanel.style.width = `${newW}px`;
    chatPanel.style.height = `${newH}px`;
    setPanelBottom(Math.min(layout.desiredBottom, Math.max(0, targetHeight - newH - PANEL_TOP_MARGIN)));
    scheduleResizeWindowBounds(newX, newY, targetWidth, targetHeight);

    // Incremental: update start state for next pointermove so reverse drag works immediately after hitting a limit
    resizeStart.x = event.screenX;
    resizeStart.y = event.screenY;
    resizeStart.w = newW;
    resizeStart.h = newH;
    resizeStart.winX = newX;
    resizeStart.winY = newY;
    resizeStart.winW = targetWidth;
    resizeStart.winH = targetHeight;
  });

  handle.addEventListener('pointerup', (event) => {
    flushResizeWindowBounds();
    resizingChat = false;
    resizeReady = false;
    resizeCorner = '';
    handle.releasePointerCapture(event.pointerId);
  });

  handle.addEventListener('pointercancel', (event) => {
    flushResizeWindowBounds();
    resizingChat = false;
    resizeReady = false;
    resizeCorner = '';
    handle.releasePointerCapture(event.pointerId);
  });
}

setupResizeHandle(resizeTL, 'top-left');
setupResizeHandle(resizeTR, 'top-right');
setupResizeHandle(resizeBL, 'bottom-left');

// Session switcher
sessionSelect.addEventListener('change', async () => {
  const sessionId = sessionSelect.value;
  try {
    if (!sessionId) {
      await startNewSession();
      return;
    }
    if (currentSettings.conversationMode === 'api') {
      await window.desktopPet.saveSettings({ apiConversationId: sessionId });
      await loadSessionHistory(sessionId);
      return;
    }
    const result = await window.desktopPet.resumeSession(sessionId);
    if (!result.ok) {
      setStatus(`${t('switchSessionFailed')}：${result.error}`, 'error');
      return;
    }
    applySettings({ ...currentSettings, sessionId: result.sessionId });
    await loadSessionHistory(result.sessionId);
  } catch (error) {
    setStatus(`${t('switchSessionFailed')}：${error.message}`, 'error');
  }
});

window.desktopPet.onLocaleChanged((locale) => {
  setLocale(locale);
});
