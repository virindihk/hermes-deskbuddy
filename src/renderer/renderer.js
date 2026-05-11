const pet = document.getElementById('pet');
const petAvatar = document.getElementById('petAvatar');
const defaultPet = document.querySelector('.default-pet');
const chatPanel = document.getElementById('chatPanel');
const closeChat = document.getElementById('closeChat');
const settingsPanel = document.getElementById('settingsPanel');
const closeSettings = document.getElementById('closeSettings');
const cronPanel = document.getElementById('cronPanel');
const closeCron = document.getElementById('closeCron');
const cronList = document.getElementById('cronList');
const cronMessageEl = document.getElementById('cronMessage');
const petImage = document.getElementById('petImage');
const thinkingImageInput = document.getElementById('thinkingImage');
const happyImageInput = document.getElementById('happyImage');
const chooseImage = document.getElementById('chooseImage');
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
const modelInput = document.getElementById('modelInput');
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
  LISTENING: 'listening',
  THINKING: 'thinking',
  HAPPY: 'happy',
};
let petState = PET_STATES.IDLE;
let petStateTimer = null;

/* ===== i18n ===== */
const I18N = {
  zh: {
    send: '发送',
    saveSettings: '保存设定',
    choose: '选择',
    newSession: '新建会话',
    resetAll: '恢复默认',
    addCron: '添加 cron',
    name: '名字',
    petNamePlaceholder: '给你的 pet 起个名字',
    size: '大小',
    stateImages: 'Pet 状态图片',
    idleImagePlaceholder: '平常状态图片路径',
    thinkingImagePlaceholder: '思考时图片路径',
    happyImagePlaceholder: '回复完成时图片路径',
    provider: 'Provider',
    model: 'Model',
    modelPlaceholder: '如 gpt-4o、claude-sonnet-4',
    hermesPath: 'Hermes 路径',
    hermesPathPlaceholder: '留空则自动查找',
    autoDetected: '自动查找',
    notFound: '未找到，请手动填写',
    currentSession: '当前会话',
    cronSchedule: 'Cron 安排',
    cronSchedulePlaceholder: '30m / every 2h / 0 9 * * *',
    cronPrompt: '任务内容',
    cronPromptPlaceholder: '写一个自包含的定时任务说明',
    cronDeliver: '投递位置',
    cronDeliverPlaceholder: 'local / origin / telegram:...',
    cronName: '任务名，可选',
    cronNamePlaceholder: 'pet reminder',
    checkingHermes: '检查 Hermes 中...',
    connected: 'Hermes 已连接 · 回复完成',
    hermesUnavailable: 'Hermes CLI 不可用',
    installHermes: '请确认 hermes 已安装',
    loadingHistory: '加载历史消息中...',
    historyLoaded: '历史消息已加载',
    loadHistoryFailed: '加载历史失败',
    switchSessionFailed: '切换会话失败',
    createSessionFailed: '新建会话失败',
    error: '出错啦',
    loadSettingsFailed: '读取设定失败',
    settingsSaved: '设定已保存',
    saveFailed: '保存失败',
    sessionCreated: '已新建会话',
    choosingImage: '选择图片中...',
    imageUpdated: '图片已更新',
    cancelled: '已取消选择',
    imageReset: '已恢复默认图片',
    stateImagesReset: '已恢复默认状态图',
    switchingModel: '正在切换 model / provider...',
    saveButSwitchFailed: '设定已保存，但切换失败',
    newSessionFailed: '新建会话失败',
    cronNeedFill: 'cron 时间和任务内容都要填',
    addingCron: '正在添加 cron...',
    cronAddFailed: 'cron 添加失败',
    cronAdded: 'cron 已添加',
    sessionLabel: '新建会话...',
    welcome: '嗨 Leo，我在桌面上啦。左键聊天，右键打开设定。',
    welcomeNewSession: '嗨 Leo，新会话开始了。左键聊天，右键打开设定。',
    welcomeHistory: '嗨 Leo，左键聊天，右键打开设定。',
    online: '在线喵',
    listening: '在听...',
    thinking: '思考中...',
    gotIt: '收到喵',
    offline: '离线喵',
    typing: '思考中',
    petReminder: 'pet reminder',
    copy: '复制',
    copyCode: '复制代码',
    copied: '已复制',
    copyContent: '复制内容',
    running: '运行中',
    completed: '已完成',
    loadFailed: '加载失败',
    inputPlaceholder: '输入消息，Enter 发送，Shift+Enter 换行',
    petTitle: '左键聊天，右键打开设定，拖动我移动',
    closeChat: '收起',
    closeSettings: '关闭设定',
    closeCron: '关闭',
    switchSession: '切换会话',
    resize: '拖拽调整大小',
    settingsSuffix: '设定',
    calling: '调用中',
    loading: '加载中...',
    noCronJobs: '暂无定时任务',
    nextRun: '下次',
    lastRun: '上次',
  },
  en: {
    send: 'Send',
    saveSettings: 'Save Settings',
    choose: 'Choose',
    newSession: 'New Session',
    resetAll: 'Reset to Default',
    addCron: 'Add Cron',
    name: 'Name',
    size: 'Size',
    stateImages: 'State Images',
    idleImagePlaceholder: 'Idle image path',
    thinkingImagePlaceholder: 'Thinking image path',
    happyImagePlaceholder: 'Done image path',
    provider: 'Provider',
    model: 'Model',
    modelPlaceholder: 'e.g. gpt-4o, claude-sonnet-4',
    hermesPath: 'Hermes Path',
    hermesPathPlaceholder: 'Leave empty to auto-detect',
    autoDetected: 'Auto-detect',
    notFound: 'Not found, please enter manually',
    currentSession: 'Current Session',
    cronSchedule: 'Schedule',
    cronSchedulePlaceholder: '30m / every 2h / 0 9 * * *',
    cronPrompt: 'Task Content',
    cronPromptPlaceholder: 'Write a self-contained task description',
    cronDeliver: 'Deliver To',
    cronDeliverPlaceholder: 'local / origin / telegram:...',
    cronName: 'Task Name (optional)',
    cronNamePlaceholder: 'reminder',
    checkingHermes: 'Checking Hermes...',
    connected: 'Hermes Connected · Reply Complete',
    hermesUnavailable: 'Hermes CLI unavailable',
    installHermes: 'Please make sure hermes is installed',
    loadingHistory: 'Loading history...',
    historyLoaded: 'History loaded',
    loadHistoryFailed: 'Failed to load history',
    switchSessionFailed: 'Failed to switch session',
    createSessionFailed: 'Failed to create session',
    error: 'Error',
    loadSettingsFailed: 'Failed to load settings',
    settingsSaved: 'Settings saved',
    saveFailed: 'Save failed',
    sessionCreated: 'Session created',
    choosingImage: 'Choosing image...',
    imageUpdated: 'Image updated',
    cancelled: 'Cancelled',
    imageReset: 'Image reset',
    stateImagesReset: 'State images reset',
    switchingModel: 'Switching model / provider...',
    saveButSwitchFailed: 'Settings saved, but switch failed',
    newSessionFailed: 'New session failed',
    cronNeedFill: 'Schedule and task content are required',
    addingCron: 'Adding cron...',
    cronAddFailed: 'Failed to add cron',
    cronAdded: 'cron added',
    sessionLabel: 'New Session...',
    welcome: 'Hi Leo, I\'m on your desktop. Left-click to chat, right-click for settings.',
    welcomeNewSession: 'Hi Leo, a new session has started. Left-click to chat, right-click for settings.',
    welcomeHistory: 'Hi Leo, left-click to chat, right-click for settings.',
    online: 'is online',
    listening: 'is listening...',
    thinking: 'is thinking...',
    gotIt: 'got it!',
    offline: 'is offline',
    typing: 'thinking...',
    petReminder: 'reminder',
    copy: 'Copy',
    copyCode: 'Copy code',
    copied: 'Copied',
    copyContent: 'Copy content',
    running: 'Running',
    completed: 'Completed',
    loadFailed: 'Load failed',
    inputPlaceholder: 'Enter to send, Shift+Enter for newline',
    petTitle: 'Left-click to chat, right-click for settings, drag to move',
    closeChat: 'Close',
    closeSettings: 'Close Settings',
    closeCron: 'Close',
    switchSession: 'Switch Session',
    resize: 'Drag to resize',
    settingsSuffix: 'Settings',
    calling: 'Calling',
    loading: 'Loading...',
    noCronJobs: 'No cron jobs',
    nextRun: 'Next',
    lastRun: 'Last',
  },
  ja: {
    send: '送信',
    saveSettings: '設定を保存',
    choose: '選択',
    newSession: '新しいセッション',
    resetAll: 'デフォルトに戻す',
    addCron: 'Cronを追加',
    name: '名前',
    petNamePlaceholder: 'ペットの名前を入力',
    size: 'サイズ',
    stateImages: '状態画像',
    idleImagePlaceholder: '通常時画像のパス',
    thinkingImagePlaceholder: '思考時画像のパス',
    happyImagePlaceholder: '完了時画像のパス',
    provider: 'プロバイダ',
    model: 'モデル',
    modelPlaceholder: '例: gpt-4o, claude-sonnet-4',
    hermesPath: 'Hermes パス',
    hermesPathPlaceholder: '空白の場合は自動検出',
    autoDetected: '自動検出',
    notFound: '見つかりません、手動で入力してください',
    currentSession: '現在のセッション',
    cronSchedule: 'スケジュール',
    cronSchedulePlaceholder: '30m / every 2h / 0 9 * * *',
    cronPrompt: 'タスク内容',
    cronPromptPlaceholder: '自己完結型のタスク説明を書く',
    cronDeliver: '配信先',
    cronDeliverPlaceholder: 'local / origin / telegram:...',
    cronName: 'タスク名（任意）',
    cronNamePlaceholder: 'リマインダー',
    checkingHermes: 'Hermesを確認中...',
    connected: 'Hermes接続完了 · 返信完了',
    hermesUnavailable: 'Hermes CLIが利用できません',
    installHermes: 'hermesがインストールされているか確認してください',
    loadingHistory: '履歴を読み込み中...',
    historyLoaded: '履歴を読み込みました',
    loadHistoryFailed: '履歴の読み込みに失敗しました',
    switchSessionFailed: 'セッションの切り替えに失敗しました',
    createSessionFailed: 'セッションの作成に失敗しました',
    error: 'エラー',
    loadSettingsFailed: '設定の読み込みに失敗しました',
    settingsSaved: '設定を保存しました',
    saveFailed: '保存に失敗しました',
    sessionCreated: 'セッションを作成しました',
    choosingImage: '画像を選択中...',
    imageUpdated: '画像を更新しました',
    cancelled: 'キャンセルしました',
    imageReset: '画像をリセットしました',
    stateImagesReset: '状態画像をリセットしました',
    switchingModel: 'モデル / プロバイダを切り替え中...',
    saveButSwitchFailed: '設定は保存しましたが、切り替えに失敗しました',
    newSessionFailed: '新しいセッションの作成に失敗しました',
    cronNeedFill: 'スケジュールとタスク内容を入力してください',
    addingCron: 'Cronを追加中...',
    cronAddFailed: 'Cronの追加に失敗しました',
    cronAdded: 'Cronを追加しました',
    sessionLabel: '新しいセッション...',
    welcome: 'Leoさん、こんにちは。デスクトップにいます。左クリックでチャット、右クリックで設定。',
    welcomeNewSession: 'Leoさん、新しいセッションが始まりました。左クリックでチャット、右クリックで設定。',
    welcomeHistory: 'Leoさん、左クリックでチャット、右クリックで設定。',
    online: 'オンライン',
    listening: '聞いています...',
    thinking: '考え中...',
    gotIt: '受信しました',
    offline: 'オフライン',
    typing: '考え中...',
    petReminder: 'リマインダー',
    copy: 'コピー',
    copyCode: 'コードをコピー',
    copied: 'コピーしました',
    copyContent: '内容をコピー',
    running: '実行中',
    completed: '完了',
    loadFailed: '読み込み失敗',
    inputPlaceholder: 'メッセージを入力、Enterで送信、Shift+Enterで改行',
    petTitle: '左クリックでチャット、右クリックで設定、ドラッグで移動',
    closeChat: '閉じる',
    closeSettings: '設定を閉じる',
    closeCron: '閉じる',
    switchSession: 'セッションを切り替え',
    resize: 'ドラッグでサイズ変更',
    settingsSuffix: '設定',
    calling: '呼び出し中',
    loading: '読み込み中...',
    noCronJobs: 'Cronジョブがありません',
    nextRun: '次回',
    lastRun: '前回',
  },
  ko: {
    send: '전송',
    saveSettings: '설정 저장',
    choose: '선택',
    newSession: '새 세션',
    resetAll: '기본으로',
    addCron: 'Cron 추가',
    name: '이름',
    petNamePlaceholder: '펫 이름을 입력하세요',
    size: '크기',
    stateImages: '상태 이미지',
    idleImagePlaceholder: '기본 상태 이미지 경로',
    thinkingImagePlaceholder: '생각 중 이미지 경로',
    happyImagePlaceholder: '완료 이미지 경로',
    provider: '제공자',
    model: '모델',
    modelPlaceholder: '예: gpt-4o, claude-sonnet-4',
    hermesPath: 'Hermes 경로',
    hermesPathPlaceholder: '비워두면 자동 검색',
    autoDetected: '자동 검색',
    notFound: '찾을 수 없습니다, 수동으로 입력하세요',
    currentSession: '현재 세션',
    cronSchedule: '일정',
    cronSchedulePlaceholder: '30m / every 2h / 0 9 * * *',
    cronPrompt: '작업 내용',
    cronPromptPlaceholder: '자체 포함된 작업 설명을 작성하세요',
    cronDeliver: '전달 위치',
    cronDeliverPlaceholder: 'local / origin / telegram:...',
    cronName: '작업명 (선택)',
    cronNamePlaceholder: '리마인더',
    checkingHermes: 'Hermes 확인 중...',
    connected: 'Hermes 연결됨 · 응답 완료',
    hermesUnavailable: 'Hermes CLI를 사용할 수 없습니다',
    installHermes: 'hermes가 설치되어 있는지 확인하세요',
    loadingHistory: '기록 로딩 중...',
    historyLoaded: '기록을 불러왔습니다',
    loadHistoryFailed: '기록 로딩 실패',
    switchSessionFailed: '세션 전환 실패',
    createSessionFailed: '세션 생성 실패',
    error: '오류',
    loadSettingsFailed: '설정 로딩 실패',
    settingsSaved: '설정이 저장되었습니다',
    saveFailed: '저장 실패',
    sessionCreated: '세션이 생성되었습니다',
    choosingImage: '이미지 선택 중...',
    imageUpdated: '이미지가 업데이트되었습니다',
    cancelled: '취소되었습니다',
    imageReset: '이미지가 초기화되었습니다',
    stateImagesReset: '상태 이미지가 초기화되었습니다',
    switchingModel: '모델 / 제공자 전환 중...',
    saveButSwitchFailed: '설정은 저장되었으나 전환에 실패했습니다',
    newSessionFailed: '새 세션 생성 실패',
    cronNeedFill: '일정과 작업 내용을 입력하세요',
    addingCron: 'Cron 추가 중...',
    cronAddFailed: 'Cron 추가 실패',
    cronAdded: 'Cron이 추가되었습니다',
    sessionLabel: '새 세션...',
    welcome: 'Leo님, 안녕하세요. 데스크톱에 있습니다. 좌클릭으로 채팅, 우클릭으로 설정.',
    welcomeNewSession: 'Leo님, 새 세션이 시작되었습니다. 좌클릭으로 채팅, 우클릭으로 설정.',
    welcomeHistory: 'Leo님, 좌클릭으로 채팅, 우클릭으로 설정.',
    online: '온라인',
    listening: '듣는 중...',
    thinking: '생각 중...',
    gotIt: '받았습니다',
    offline: '오프라인',
    typing: '생각 중...',
    petReminder: '리마인더',
    copy: '복사',
    copyCode: '코드 복사',
    copied: '복사됨',
    copyContent: '내용 복사',
    running: '실행 중',
    completed: '완료',
    loadFailed: '로딩 실패',
    inputPlaceholder: '메시지를 입력하세요. Enter로 전송, Shift+Enter로 줄바꿈',
    petTitle: '좌클릭으로 채팅, 우클릭으로 설정, 드래그로 이동',
    closeChat: '닫기',
    closeSettings: '설정 닫기',
    closeCron: '닫기',
    switchSession: '세션 전환',
    resize: '드래그로 크기 조절',
    settingsSuffix: '설정',
    calling: '호출 중',
    loading: '로딩 중...',
    noCronJobs: 'Cron 작업 없음',
    nextRun: '다음',
    lastRun: '이전',
  },
};

let currentLocale = 'zh';
function t(key, vars = {}) {
  const dict = I18N[currentLocale] || I18N.zh;
  let text = dict[key] !== undefined ? dict[key] : I18N.zh[key] !== undefined ? I18N.zh[key] : key;
  for (const [k, v] of Object.entries(vars)) {
    text = text.replace(new RegExp(`{${k}}`, 'g'), v);
  }
  return text;
}

function setLocale(locale) {
  currentLocale = ['zh', 'en', 'ja', 'ko'].includes(locale) ? locale : 'zh';
  updateAllTexts();
  // 根据当前 pet 状态刷新气泡文字
  if (petState === PET_STATES.IDLE) {
    bubble.textContent = `${currentSettings.petName || 'Hermes'} ${t('online')}`;
  } else if (petState === PET_STATES.LISTENING) {
    bubble.textContent = `${currentSettings.petName || 'Hermes'} ${t('listening')}`;
  } else if (petState === PET_STATES.THINKING) {
    bubble.textContent = `${currentSettings.petName || 'Hermes'} ${t('thinking')}`;
  } else if (petState === PET_STATES.HAPPY) {
    bubble.textContent = `${currentSettings.petName || 'Hermes'} ${t('gotIt')}`;
  }
}

function updateAllTexts() {
  if (sendButton) sendButton.textContent = t('send');
  if (saveSettings) saveSettings.textContent = t('saveSettings');
  if (chooseImage) chooseImage.textContent = t('choose');
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
  if (thinkingImageInput) thinkingImageInput.placeholder = t('thinkingImagePlaceholder');
  if (happyImageInput) happyImageInput.placeholder = t('happyImagePlaceholder');
  const labelProvider = document.querySelector('label[for="providerSelect"]');
  if (labelProvider) labelProvider.textContent = t('provider');
  const labelModel = document.querySelector('label[for="modelInput"]');
  if (labelModel) labelModel.textContent = t('model');
  if (modelInput) modelInput.placeholder = t('modelPlaceholder');
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
  if (sessionSelect && sessionSelect.options[0]) sessionSelect.options[0].textContent = t('sessionLabel');
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
let activeStreamRequestId = null;
let activeStreamCleanups = [];

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

function setChatVisible(visible) {
  chatPanel.classList.toggle('hidden', !visible);
  chatPanel.classList.toggle('near-pet', visible);
  if (visible) {
    setSettingsVisible(false);
    setCronVisible(false);
    setPetState(PET_STATES.LISTENING);
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
    setPetState(PET_STATES.LISTENING);
    updatePanelOffsets();
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
    setPetState(PET_STATES.LISTENING);
    updatePanelOffsets();
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

function applySettings(settings = {}) {
  currentSettings = {
    model: settings.model || 'hermes-agent',
    petImage: settings.petImage || '',
    thinkingImage: settings.thinkingImage || '',
    happyImage: settings.happyImage || '',
    petScale: settings.petScale || 100,
    petName: settings.petName || 'Hermes',
    locale: settings.locale || 'zh',
    hermesPath: settings.hermesPath || '',
    cronDeliver: settings.cronDeliver || 'local',
    sessionId: settings.sessionId || '',
  };

  petImage.value = currentSettings.petImage;
  if (thinkingImageInput) thinkingImageInput.value = currentSettings.thinkingImage;
  if (happyImageInput) happyImageInput.value = currentSettings.happyImage;
  if (petScaleInput) petScaleInput.value = currentSettings.petScale;
  if (petScaleValue) petScaleValue.textContent = `${currentSettings.petScale}%`;
  if (petNameInput) petNameInput.value = currentSettings.petName;
  if (hermesPathInput) hermesPathInput.value = currentSettings.hermesPath;
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
  if (state === PET_STATES.THINKING || state === PET_STATES.LISTENING) {
    if (currentSettings.thinkingImage) {
      return toImageUrl(currentSettings.thinkingImage);
    }
    return new URL('./assets/pet_thinking.png', location.href).href;
  }
  if (state === PET_STATES.HAPPY) {
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
  pet.classList.remove('idle', 'thinking', 'happy');
  pet.classList.add(petState);

  const imageUrl = getStateImage(petState);
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

  if (state === PET_STATES.HAPPY) {
    bubble.textContent = `${currentSettings.petName || 'Hermes'} ${t('gotIt')}`;
    petStateTimer = setTimeout(() => {
      // 只有窗口全部关闭时才回到 idle
      if (
        chatPanel.classList.contains('hidden') &&
        settingsPanel.classList.contains('hidden') &&
        cronPanel.classList.contains('hidden')
      ) {
        setPetState(PET_STATES.IDLE);
      }
    }, 3000);
  } else if (state === PET_STATES.THINKING) {
    bubble.textContent = `${currentSettings.petName || 'Hermes'} ${t('thinking')}`;
  } else if (state === PET_STATES.LISTENING) {
    bubble.textContent = `${currentSettings.petName || 'Hermes'} ${t('listening')}`;
  } else {
    bubble.textContent = `${currentSettings.petName || 'Hermes'} ${t('online')}`;
  }
}

async function loadProviders() {
  try {
    const result = await window.desktopPet.listHermesProviders();
    if (!result.ok || !result.providers) return;

    // Keep first option (自定义...)
    const customOption = providerSelect.options[0];
    providerSelect.innerHTML = '';
    providerSelect.appendChild(customOption);

    for (const p of result.providers) {
      const option = document.createElement('option');
      option.value = p;
      option.textContent = p;
      providerSelect.appendChild(option);
    }
  } catch (_error) {}
}

async function loadModelConfig() {
  try {
    await loadProviders();
    const result = await window.desktopPet.getHermesModelConfig();
    if (!result.ok) return;
    if (result.provider && providerSelect) {
      const exists = Array.from(providerSelect.options).some((o) => o.value === result.provider);
      if (exists) {
        providerSelect.value = result.provider;
      } else {
        // Add current provider if not in list
        const option = document.createElement('option');
        option.value = result.provider;
        option.textContent = result.provider;
        providerSelect.appendChild(option);
        providerSelect.value = result.provider;
      }
    }
    if (result.model && modelInput) {
      modelInput.value = result.model;
    }
  } catch (_error) {}
}

async function loadSettings() {
  try {
    applySettings(await window.desktopPet.getSettings());
    await loadModelConfig();
  } catch (error) {
    setSettingsMessage(`${t('loadSettingsFailed')}：${error.message}`, 'error');
  }
}

function applyPetScale(scale) {
  const s = Math.min(300, Math.max(50, Number(scale) || 100));
  pet.style.setProperty('--pet-scale', (s / 100).toString());
  if (!chatPanel.classList.contains('hidden') ||
      !settingsPanel.classList.contains('hidden') ||
      !cronPanel.classList.contains('hidden')) {
    updatePanelOffsets();
  }
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
    thinkingImage: thinkingImageInput.value,
    happyImage: happyImageInput.value,
    petScale: Number(petScaleInput?.value) || 100,
    petName: String(petNameInput?.value || 'Hermes').trim() || 'Hermes',
    hermesPath: String(hermesPathInput?.value || '').trim(),
    cronDeliver: cronDeliver.value,
    ...partial,
  });
  applySettings(saved);
  return saved;
}

async function startNewSession() {
  const saved = await window.desktopPet.saveSettings({ sessionId: '' });
  applySettings(saved);
  history.length = 0;
  messagesEl.innerHTML = `<div class="message assistant">${t('welcomeNewSession')}</div>`;
    setSettingsMessage(t('sessionCreated'), 'ok');
}

async function loadSessions() {
  try {
    const result = await window.desktopPet.listSessions();
    if (!result.ok) return;

    const currentId = currentSettings.sessionId || '';
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
      const content = msg.content || '';
      if (!content.trim()) continue;
      history.push({ role, content });
      appendMessage(role, content);
    }

    if (history.length === 0) {
      messagesEl.innerHTML = `<div class="message assistant">${t('welcomeHistory')}</div>`;
    }
    setStatus(t('historyLoaded'), 'ok');
  } catch (error) {
    setStatus(`${t('loadHistoryFailed')}：${error.message}`, 'error');;
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
  const cleanText = text.trim();
  if (!cleanText) return;

  isBusy = true;
  setPetState(PET_STATES.THINKING);
  input.value = '';
  input.disabled = true;
  sendButton.disabled = true;

  appendMessage('user', cleanText);
  history.push({ role: 'user', content: cleanText });

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

  const removeDone = window.desktopPet.onStreamDone(requestId, () => {
    cleanupStream(requestId);
    if (replyText) {
      history.push({ role: 'assistant', content: replyText });
    }
    setStatus(t('connected'), 'ok');
    setPetState(PET_STATES.HAPPY);
    isBusy = false;
    input.disabled = false;
    sendButton.disabled = false;
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
    input.focus();
  });

  activeStreamCleanups.push(removeChunk, removeTool, removeDone, removeError);

  try {
    window.desktopPet.sendMessageStream(requestId, {
      text: cleanText,
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
    input.focus();
  }
}

/* ===== Pet interactions ===== */
pet.addEventListener('contextmenu', (event) => {
  event.preventDefault();
  suppressClickAfterDrag = true;
  window.desktopPet.openSettingsMenu({ x: event.clientX, y: event.clientY });
});

pet.addEventListener('pointerdown', (event) => {
  if (event.button !== 0) return;
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

pet.addEventListener('click', async () => {
  if (suppressClickAfterDrag) return;
  const visible = await window.desktopPet.toggleChat();
  if (visible) checkHermes();
});

closeChat.addEventListener('click', () => {
  window.desktopPet.setChatVisible(false);
});

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
    await persistSettings({ petImage: '', thinkingImage: '', happyImage: '', petScale: 100 });
    setSettingsMessage(t('imageReset'), 'ok');
  });
}

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

saveSettings.addEventListener('click', async () => {
  try {
    await persistSettings();
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
  if (el.closest('#pet, #chatPanel, #settingsPanel, #cronPanel')) return true;
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

/* ===== Chat panel resize (TL, TR, BL) ===== */
let resizingChat = false;
let resizeReady = false;
let resizeCorner = '';
let resizeStart = { x: 0, y: 0, w: 0, h: 0, winX: 0, winY: 0 };

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
      resizeReady = true;
    }).catch(() => {
      resizeStart.winX = 0;
      resizeStart.winY = 0;
      resizeReady = true;
    });
  });

  handle.addEventListener('pointermove', (event) => {
    if (!resizingChat || !resizeReady || resizeCorner !== corner) return;
    const deltaX = event.screenX - resizeStart.x;
    const deltaY = event.screenY - resizeStart.y;

    let newW = resizeStart.w;
    let newH = resizeStart.h;
    let newX = resizeStart.winX;
    let newY = resizeStart.winY;

    if (corner.includes('left')) {
      newW = resizeStart.w - deltaX;
      newX = resizeStart.winX + deltaX;
    } else {
      newW = resizeStart.w + deltaX;
    }

    if (corner.includes('top')) {
      newH = resizeStart.h - deltaY;
      newY = resizeStart.winY + deltaY;
    } else {
      newH = resizeStart.h + deltaY;
    }

    // Panel offset constants must stay in sync with CSS:
    // .chat-panel { top: 18px }  and  .chat-panel.near-pet { bottom: 220px }
    const PANEL_TOP_OFFSET = 18;
    const PANEL_BOTTOM_OFFSET = 220;
    const PANEL_HEIGHT_MARGIN = PANEL_TOP_OFFSET + PANEL_BOTTOM_OFFSET; // 238

    const maxPanelH = window.screen.availHeight - PANEL_HEIGHT_MARGIN;
    newW = Math.max(260, Math.min(640, newW));
    newH = Math.max(200, Math.min(maxPanelH, newH));

    if (corner.includes('left')) {
      newX = resizeStart.winX + (resizeStart.w - newW);
    }
    if (corner.includes('top')) {
      newY = resizeStart.winY + (resizeStart.h - newH);
    }

    chatPanel.style.width = `${newW}px`;
    chatPanel.style.height = `${newH}px`;
    window.desktopPet.setWindowBounds(Math.round(newX), Math.round(newY), Math.round(newW + 60), Math.round(newH + PANEL_HEIGHT_MARGIN));

    // Incremental: update start state for next pointermove so reverse drag works immediately after hitting a limit
    resizeStart.x = event.screenX;
    resizeStart.y = event.screenY;
    resizeStart.w = newW;
    resizeStart.h = newH;
    resizeStart.winX = newX;
    resizeStart.winY = newY;
  });

  handle.addEventListener('pointerup', (event) => {
    resizingChat = false;
    resizeReady = false;
    resizeCorner = '';
    handle.releasePointerCapture(event.pointerId);
  });

  handle.addEventListener('pointercancel', (event) => {
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


