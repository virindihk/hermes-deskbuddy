const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');

const {
  LOCAL_ID_PREFIX,
  STORE_FILE_NAME,
  createDeskBuddyConversationStore,
} = require('../src/main/deskbuddy-conversation-store');

function createTempStore() {
  const userData = fs.mkdtempSync(path.join(os.tmpdir(), 'deskbuddy-conversations-'));
  let tick = 1700000000000;
  const app = {
    getPath(name) {
      assert.equal(name, 'userData');
      return userData;
    },
  };
  const store = createDeskBuddyConversationStore({
    app,
    fs,
    path,
    crypto: { randomUUID: () => 'fixed-local-id' },
    now: () => {
      tick += 10;
      return tick;
    },
  });
  return { userData, store };
}

test('deskbuddy conversation store writes API conversations under userData only', () => {
  const { userData, store } = createTempStore();

  const conversation = store.createConversation([
    { role: 'user', content: '  hello from deskbuddy  ' },
    { role: 'assistant', content: 'hi' },
  ]);

  assert.equal(conversation.id, `${LOCAL_ID_PREFIX}fixed-local-id`);
  assert.equal(store.getStorePath(), path.join(userData, STORE_FILE_NAME));
  assert.equal(fs.existsSync(store.getStorePath()), true);
  assert.deepEqual(store.listConversations().map((item) => ({
    id: item.id,
    title: item.title,
    message_count: item.message_count,
  })), [
    {
      id: `${LOCAL_ID_PREFIX}fixed-local-id`,
      title: 'hello from deskbuddy',
      message_count: 2,
    },
  ]);
});

test('deskbuddy conversation store appends turns and preserves vision-safe content', () => {
  const { store } = createTempStore();
  const conversation = store.createConversation();

  const saved = store.appendTurn(
    conversation.id,
    [
      { type: 'text', text: '  look  ' },
      { type: 'image_url', image_url: { url: 'data:image/png;base64,abc' } },
      { type: 'image_url', image_url: { url: 'file:///tmp/nope.png' } },
    ],
    'done',
  );

  assert.equal(saved.messages.length, 2);
  assert.deepEqual(store.getMessages(conversation.id).map((message) => ({
    role: message.role,
    content: message.content,
  })), [
    {
      role: 'user',
      content: [
        { type: 'text', text: 'look' },
        { type: 'image_url', image_url: { url: 'data:image/png;base64,abc' } },
      ],
    },
    { role: 'assistant', content: 'done' },
  ]);
});

test('deskbuddy conversation store renames a new empty conversation after first turn', () => {
  const { store } = createTempStore();
  const conversation = store.createConversation();

  assert.equal(conversation.title, conversation.id);

  const saved = store.appendTurn(conversation.id, '  name this session from user text  ', 'done');

  assert.equal(saved.title, 'name this session from user text');
  assert.equal(store.listConversations()[0].title, 'name this session from user text');
});

test('deskbuddy conversation store ignores malformed conversation ids and storage', () => {
  const { userData, store } = createTempStore();

  fs.mkdirSync(userData, { recursive: true });
  fs.writeFileSync(path.join(userData, STORE_FILE_NAME), '{ nope', 'utf8');

  assert.deepEqual(store.readStore(), { version: 1, conversations: [] });
  assert.equal(store.getConversation('../bad'), null);
  assert.equal(store.getMessages('missing'), null);
});
