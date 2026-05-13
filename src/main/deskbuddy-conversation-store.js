'use strict';
// @ts-check

const STORE_FILE_NAME = 'deskbuddy-api-conversations.json';
const STORE_VERSION = 1;
const LOCAL_ID_PREFIX = 'deskbuddy-api-';
const MAX_CONVERSATIONS = 200;
const MAX_MESSAGES_PER_CONVERSATION = 80;
const MAX_TITLE_LENGTH = 60;

/**
 * @typedef {Object} DeskBuddyConversationMessage
 * @property {'user' | 'assistant'} role
 * @property {string | Array<Record<string, any>>} content
 * @property {number} timestamp
 */

/**
 * @typedef {Object} DeskBuddyConversation
 * @property {string} id
 * @property {string} title
 * @property {number} createdAt
 * @property {number} updatedAt
 * @property {DeskBuddyConversationMessage[]} messages
 */

/**
 * @typedef {Object} ConversationStoreDeps
 * @property {{ getPath(name: string): string }} app
 * @property {{ readFileSync(filePath: string, encoding: string): string, mkdirSync(dirPath: string, options: { recursive: boolean }): void, writeFileSync(filePath: string, data: string): void }} fs
 * @property {{ join(...parts: string[]): string, dirname(filePath: string): string }} path
 * @property {{ randomUUID?: () => string }} [crypto]
 * @property {() => number} [now]
 */

function cleanId(value) {
  return String(value || '').trim().replace(/[^a-z0-9_-]/gi, '').slice(0, 128);
}

function isLocalConversationId(value) {
  return cleanId(value).startsWith(LOCAL_ID_PREFIX);
}

function normalizeTimestamp(value, fallback) {
  const timestamp = Number(value);
  return Number.isFinite(timestamp) && timestamp > 0 ? timestamp : fallback;
}

function normalizeContent(content) {
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

function contentToTitleText(content) {
  if (Array.isArray(content)) {
    return content
      .map((part) => {
        if (part?.type === 'text') return String(part.text || '');
        if (part?.type === 'image_url') return '[image]';
        return '';
      })
      .filter(Boolean)
      .join(' ');
  }
  return String(content || '');
}

function createTitle(messages, fallbackId) {
  const firstUserMessage = messages.find((message) => message.role === 'user');
  const cleanTitle = contentToTitleText(firstUserMessage?.content || '')
    .replace(/\s+/g, ' ')
    .trim()
    .slice(0, MAX_TITLE_LENGTH);
  return cleanTitle || fallbackId || 'DeskBuddy API Conversation';
}

function isPlaceholderTitle(title, id) {
  const cleanTitle = String(title || '').trim();
  return !cleanTitle || cleanTitle === id || cleanTitle === 'DeskBuddy API Conversation';
}

/**
 * @param {Record<string, any>} raw
 * @param {number} fallbackNow
 * @returns {DeskBuddyConversation | null}
 */
function normalizeConversation(raw, fallbackNow) {
  const id = cleanId(raw?.id);
  if (!id) return null;
  const createdAt = normalizeTimestamp(raw?.createdAt, fallbackNow);
  const messages = (Array.isArray(raw?.messages) ? raw.messages : [])
    .map((message) => {
      const content = normalizeContent(message?.content);
      if (Array.isArray(content) ? content.length === 0 : !content) return null;
      return {
        role: message?.role === 'assistant' ? 'assistant' : 'user',
        content,
        timestamp: normalizeTimestamp(message?.timestamp, createdAt),
      };
    })
    .filter(Boolean)
    .slice(-MAX_MESSAGES_PER_CONVERSATION);
  const updatedAt = normalizeTimestamp(raw?.updatedAt, messages[messages.length - 1]?.timestamp || createdAt);
  const title = String(raw?.title || '').replace(/\s+/g, ' ').trim().slice(0, MAX_TITLE_LENGTH)
    || createTitle(messages, id);
  return { id, title, createdAt, updatedAt, messages };
}

/**
 * Creates a JSON-backed store for DeskBuddy-owned API conversations.
 *
 * @param {ConversationStoreDeps} deps
 */
function createDeskBuddyConversationStore({ app, fs, path, crypto, now }) {
  const nowMs = now || (() => Date.now());

  function getStorePath() {
    return path.join(app.getPath('userData'), STORE_FILE_NAME);
  }

  function createConversationId() {
    const random = crypto?.randomUUID?.() || `${nowMs().toString(36)}-${Math.random().toString(36).slice(2, 10)}`;
    return `${LOCAL_ID_PREFIX}${cleanId(random)}`;
  }

  /** @returns {{ version: number, conversations: DeskBuddyConversation[] }} */
  function readStore() {
    try {
      const raw = JSON.parse(fs.readFileSync(getStorePath(), 'utf8'));
      const fallbackNow = nowMs();
      const conversations = (Array.isArray(raw?.conversations) ? raw.conversations : [])
        .map((conversation) => normalizeConversation(conversation, fallbackNow))
        .filter(Boolean)
        .sort((a, b) => b.updatedAt - a.updatedAt)
        .slice(0, MAX_CONVERSATIONS);
      return { version: STORE_VERSION, conversations };
    } catch (_error) {
      return { version: STORE_VERSION, conversations: [] };
    }
  }

  /**
   * @param {{ version: number, conversations: DeskBuddyConversation[] }} store
   */
  function writeStore(store) {
    const normalized = {
      version: STORE_VERSION,
      conversations: store.conversations
        .map((conversation) => normalizeConversation(conversation, nowMs()))
        .filter(Boolean)
        .sort((a, b) => b.updatedAt - a.updatedAt)
        .slice(0, MAX_CONVERSATIONS),
    };
    fs.mkdirSync(path.dirname(getStorePath()), { recursive: true });
    fs.writeFileSync(getStorePath(), `${JSON.stringify(normalized, null, 2)}\n`);
    return normalized;
  }

  /**
   * @param {string} conversationId
   */
  function getConversation(conversationId) {
    const id = cleanId(conversationId);
    if (!id) return null;
    return readStore().conversations.find((conversation) => conversation.id === id) || null;
  }

  /**
   * @param {string | Array<Record<string, any>>} content
   * @param {'user' | 'assistant'} role
   * @param {number} timestamp
   * @returns {DeskBuddyConversationMessage | null}
   */
  function createMessage(content, role, timestamp) {
    const normalizedContent = normalizeContent(content);
    if (Array.isArray(normalizedContent) ? normalizedContent.length === 0 : !normalizedContent) return null;
    return {
      role: role === 'assistant' ? 'assistant' : 'user',
      content: normalizedContent,
      timestamp,
    };
  }

  /**
   * @param {DeskBuddyConversationMessage[]} messages
   * @param {{ id?: string }} [options]
   */
  function createConversation(messages = [], options = {}) {
    const timestamp = nowMs();
    const requestedId = cleanId(options.id);
    const id = requestedId && isLocalConversationId(requestedId) ? requestedId : createConversationId();
    const cleanMessages = messages
      .map((message) => createMessage(message.content, message.role, message.timestamp || timestamp))
      .filter(Boolean)
      .slice(-MAX_MESSAGES_PER_CONVERSATION);
    const conversation = {
      id,
      title: createTitle(cleanMessages, id),
      createdAt: cleanMessages[0]?.timestamp || timestamp,
      updatedAt: cleanMessages[cleanMessages.length - 1]?.timestamp || timestamp,
      messages: cleanMessages,
    };
    const store = readStore();
    writeStore({
      version: STORE_VERSION,
      conversations: [conversation, ...store.conversations.filter((item) => item.id !== id)],
    });
    return conversation;
  }

  /**
   * @param {string} conversationId
   * @param {string | Array<Record<string, any>>} userContent
   * @param {string | Array<Record<string, any>>} assistantContent
   */
  function appendTurn(conversationId, userContent, assistantContent) {
    const store = readStore();
    const id = cleanId(conversationId);
    let conversation = store.conversations.find((item) => item.id === id) || null;
    if (!conversation) {
      conversation = createConversation([], { id });
      store.conversations = readStore().conversations;
    }

    const timestamp = nowMs();
    const nextMessages = [
      ...conversation.messages,
      createMessage(userContent, 'user', timestamp),
      createMessage(assistantContent, 'assistant', timestamp + 1),
    ].filter(Boolean).slice(-MAX_MESSAGES_PER_CONVERSATION);

    const updatedConversation = {
      ...conversation,
      title: isPlaceholderTitle(conversation.title, conversation.id)
        ? createTitle(nextMessages, conversation.id)
        : conversation.title,
      updatedAt: timestamp + 1,
      messages: nextMessages,
    };
    const normalized = writeStore({
      version: STORE_VERSION,
      conversations: [
        updatedConversation,
        ...store.conversations.filter((item) => item.id !== updatedConversation.id),
      ],
    });
    return normalized.conversations.find((item) => item.id === updatedConversation.id) || updatedConversation;
  }

  function listConversations() {
    return readStore().conversations.map((conversation) => ({
      id: conversation.id,
      title: conversation.title || createTitle(conversation.messages, conversation.id),
      started_at: new Date(conversation.createdAt).toISOString(),
      updated_at: new Date(conversation.updatedAt).toISOString(),
      message_count: conversation.messages.length,
    }));
  }

  /**
   * @param {string} conversationId
   */
  function getMessages(conversationId) {
    const conversation = getConversation(conversationId);
    if (!conversation) return null;
    return conversation.messages.map((message) => ({ ...message }));
  }

  return {
    getStorePath,
    readStore,
    createConversation,
    getConversation,
    appendTurn,
    listConversations,
    getMessages,
  };
}

module.exports = {
  LOCAL_ID_PREFIX,
  STORE_FILE_NAME,
  createDeskBuddyConversationStore,
};
