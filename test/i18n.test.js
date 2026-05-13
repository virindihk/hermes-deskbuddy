const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');

const root = path.resolve(__dirname, '..');
const modulePath = path.join(root, 'src/renderer/modules/i18n.js');

function loadI18n() {
  delete require.cache[require.resolve(modulePath)];
  return require(modulePath);
}

test('normalizeLocale accepts supported locales and falls back to zh', () => {
  const i18n = loadI18n();

  assert.equal(i18n.normalizeLocale('en'), 'en');
  assert.equal(i18n.normalizeLocale('ja'), 'ja');
  assert.equal(i18n.normalizeLocale('ko'), 'ko');
  assert.equal(i18n.normalizeLocale('fr'), 'zh');
  assert.equal(i18n.normalizeLocale(''), 'zh');
});

test('t returns localized strings with zh and key fallback plus interpolation', () => {
  const i18n = loadI18n();

  assert.equal(i18n.t('en', 'send'), 'Send');
  assert.equal(i18n.t('en', 'petNamePlaceholder'), '给你的 pet 起个名字');
  assert.equal(i18n.t('fr', 'send'), '发送');
  assert.equal(i18n.t('en', 'missingKey'), 'missingKey');
  assert.equal(i18n.t('zh', 'provider: {provider} · model: {model}', { provider: 'openrouter', model: 'claude' }), 'provider: openrouter · model: claude');
});

test('screen capture default prompt is localized for every supported locale', () => {
  const i18n = loadI18n();

  assert.equal(i18n.t('zh', 'screenCaptureDefaultPrompt'), '请简要说明屏幕内容，并指出我可能需要关注的重点。');
  assert.equal(i18n.t('en', 'screenCaptureDefaultPrompt'), 'Briefly describe what is on the screen and point out anything I may need to pay attention to.');
  assert.equal(i18n.t('ja', 'screenCaptureDefaultPrompt'), '画面の内容を簡潔に説明し、注意すべき点があれば指摘してください。');
  assert.equal(i18n.t('ko', 'screenCaptureDefaultPrompt'), '화면 내용을 간단히 설명하고 제가 주의해야 할 부분이 있으면 알려주세요.');
});

test('i18n module is exposed as a browser global', () => {
  const source = fs.readFileSync(modulePath, 'utf8');
  const sandbox = { window: {} };

  vm.runInNewContext(source, sandbox, { filename: modulePath });

  assert.equal(sandbox.window.DeskBuddyI18n.normalizeLocale('unknown'), 'zh');
  assert.equal(sandbox.window.DeskBuddyI18n.t('ko', 'send'), '전송');
});
