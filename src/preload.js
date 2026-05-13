const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('desktopPet', {
  toggleChat: () => ipcRenderer.invoke('pet:toggle-chat'),
  setChatVisible: (visible) => ipcRenderer.invoke('pet:set-chat-visible', visible),
  moveWindowBy: (deltaX, deltaY) => ipcRenderer.invoke('pet:move-window-by', deltaX, deltaY),
  openSettingsMenu: (point) => ipcRenderer.invoke('pet:open-settings-menu', point),
  getSettings: () => ipcRenderer.invoke('pet:get-settings'),
  saveSettings: (settings) => ipcRenderer.invoke('pet:save-settings', settings),
  choosePetImage: () => ipcRenderer.invoke('pet:choose-image'),
  chooseImageField: (field) => ipcRenderer.invoke('pet:choose-image-field', field),
  captureScreen: () => ipcRenderer.invoke('pet:capture-screen'),
  chooseAttachment: () => ipcRenderer.invoke('pet:choose-attachment'),
  createCron: (payload) => ipcRenderer.invoke('pet:create-cron', payload),
  listCrons: () => ipcRenderer.invoke('hermes:list-crons'),
  detectHermesPath: () => ipcRenderer.invoke('hermes:detect-path'),
  quit: () => ipcRenderer.invoke('pet:quit'),
  checkHermesHealth: () => ipcRenderer.invoke('hermes:health'),
  startHermesGateway: () => ipcRenderer.invoke('hermes:start-gateway'),
  sendMessage: (payload) => ipcRenderer.invoke('hermes:send-message', payload),
  sendMessageStream: (requestId, payload) => ipcRenderer.send('hermes:send-message-stream', { ...payload, requestId }),
  onStreamChunk: (requestId, callback) => {
    const listener = (_event, data) => callback(data);
    const channel = `stream:chunk:${requestId}`;
    ipcRenderer.on(channel, listener);
    return () => ipcRenderer.removeListener(channel, listener);
  },
  onStreamTool: (requestId, callback) => {
    const listener = (_event, data) => callback(data);
    const channel = `stream:tool:${requestId}`;
    ipcRenderer.on(channel, listener);
    return () => ipcRenderer.removeListener(channel, listener);
  },
  onStreamDone: (requestId, callback) => {
    const listener = (_event, data) => callback(data);
    const channel = `stream:done:${requestId}`;
    ipcRenderer.on(channel, listener);
    return () => ipcRenderer.removeListener(channel, listener);
  },
  onStreamError: (requestId, callback) => {
    const listener = (_event, data) => callback(data);
    const channel = `stream:error:${requestId}`;
    ipcRenderer.on(channel, listener);
    return () => ipcRenderer.removeListener(channel, listener);
  },
  offStream: (requestId) => {
    ipcRenderer.removeAllListeners(`stream:chunk:${requestId}`);
    ipcRenderer.removeAllListeners(`stream:tool:${requestId}`);
    ipcRenderer.removeAllListeners(`stream:done:${requestId}`);
    ipcRenderer.removeAllListeners(`stream:error:${requestId}`);
  },
  setIgnoreMouseEvents: (ignore) => ipcRenderer.send('pet:set-ignore-mouse-events', ignore),
  setWindowBounds: (x, y, width, height) => ipcRenderer.send('pet:set-window-bounds', x, y, width, height),
  getWindowBounds: () => ipcRenderer.invoke('pet:get-window-bounds'),
  listSessions: () => ipcRenderer.invoke('hermes:list-sessions'),
  getSessionMessages: (sessionId) => ipcRenderer.invoke('hermes:get-session-messages', sessionId),
  resumeSession: (sessionId) => ipcRenderer.invoke('hermes:resume-session', sessionId),
  listHermesProviders: () => ipcRenderer.invoke('hermes:list-providers'),
  listHermesModelOptions: () => ipcRenderer.invoke('hermes:list-model-options'),
  getHermesModelConfig: () => ipcRenderer.invoke('hermes:get-model-config'),
  setHermesModel: (model) => ipcRenderer.invoke('hermes:set-model', model),
  onChatVisibility: (callback) => {
    const listener = (_event, visible) => callback(Boolean(visible));
    ipcRenderer.on('chat:visibility', listener);
    return () => ipcRenderer.removeListener('chat:visibility', listener);
  },
  onSettingsOpen: (callback) => {
    const listener = () => callback();
    ipcRenderer.on('settings:open', listener);
    return () => ipcRenderer.removeListener('settings:open', listener);
  },
  onCronOpen: (callback) => {
    const listener = () => callback();
    ipcRenderer.on('cron:open', listener);
    return () => ipcRenderer.removeListener('cron:open', listener);
  },
  onSettingsChanged: (callback) => {
    const listener = (_event, settings) => callback(settings);
    ipcRenderer.on('settings:changed', listener);
    return () => ipcRenderer.removeListener('settings:changed', listener);
  },
  onLocaleChanged: (callback) => {
    const listener = (_event, locale) => callback(locale);
    ipcRenderer.on('locale:changed', listener);
    return () => ipcRenderer.removeListener('locale:changed', listener);
  },
});
