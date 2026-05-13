# Hermes DeskBuddy

简体中文 | [English](#english)

Hermes DeskBuddy 是一个运行在桌面上的 AI 小伙伴：它像桌面宠物一样悬浮在屏幕边缘，点击就能和 Hermes Agent 聊天，也能管理定时任务、切换模型、调整外观和大小。

它不是一个完整 IDE，也不是聊天网页的壳子，而是给 Hermes Agent 做的轻量桌面入口：常驻、透明、可拖动、少打扰，需要时就在手边。

当前版本：0.2.1

![Hermes DeskBuddy normal avatar](src/renderer/assets/pet_normal.png)

## 它能做什么

- 和本机 Hermes Agent CLI 对话，支持流式回复
- 支持 API Server 对话模式，并把 DeskBuddy 自己的对话历史独立保存；可直接发送图片附件给支持视觉的模型
- 一键截取屏幕并作为图片附件发送，发送前可预览确认
- 支持添加图片、文本/代码类文件附件，图片会以 `image_url` 多模态消息发送，文本会内联摘要内容
- 管理 Hermes cron 定时任务
- 切换 Provider / Model，并读取本机 `~/.hermes/.env` 配置
- 支持中文、英文、日文、韩文界面
- 自定义 pet 名字、缩放比例和状态图片
- 支持 idle / listening / thinking / done 四种状态动画，thinking 默认使用 running 图片
- 透明悬浮窗口，pet 可拖动，非命中区域可穿透点击
- 面板会根据 pet 缩放自动避让，防止聊天框被宠物挡住或被透明窗口裁切

## 0.2.1 更新

- 新增「框选截图」：macOS 下会临时隐藏桌宠窗口，用 `screencapture` 进入区域选择，框选后生成预览附件并由用户确认发送。
- 新增附件发送：可选择图片、文本、Markdown、CSV、JSON、YAML、XML、HTML、JS/TS、CSS、Python、PDF 等文件；小文本文件会内联内容，小图片会转成 data URL。
- API Server 模式的会话选择器和历史记录保存在 DeskBuddy 自己的 userData 中，不再读取 Hermes WebUI 或共享 API Server 的会话列表。
- API Server 模式支持视觉输入：图片附件会作为 OpenAI 兼容的 `image_url` 多模态消息发送给支持视觉的模型；CLI 模式会保留附件路径和文本摘要。
- 附件只会在发送成功完成后清空；发送失败时保留待发送附件，避免需要重新截图或重新选择文件。
- 新增 running / thinking 默认状态图，并完善 idle / listening / thinking / done 四状态配置。
- 补齐中英日韩界面文案、IPC bridge、设置持久化、API payload 和回归测试。

## 安装与启动

需要先安装本机 Hermes Agent，并确保 `hermes` 命令可用。

```bash
git clone https://github.com/virindihk/hermes-deskbuddy.git
cd hermes-deskbuddy
npm install
npm start
```

如果 Electron 下载慢，可以使用镜像：

```bash
ELECTRON_MIRROR=https://npmmirror.com/mirrors/electron/ npm install
```

检查 Hermes CLI：

```bash
hermes chat -q "hello"
```

## 使用方式

| 操作 | 说明 |
| --- | --- |
| 左键点击 pet | 打开 / 收起聊天窗口 |
| 右键点击 pet | 打开菜单：设置、Cron、语言、退出 |
| 拖动 pet | 移动悬浮位置 |
| 聊天窗口右上角「框选截图」 | 框选屏幕区域并加入待发送附件 |
| 输入框旁「添加附件」 | 选择图片或文本/代码文件作为附件 |
| Enter | 发送消息 |
| Shift + Enter | 换行 |
| 拖动聊天面板边角 | 调整面板大小 |

## 设置项

- 名字：修改桌面伙伴显示名
- 大小：50% 到 300% 缩放
- 状态图片：分别设置 idle / listening / thinking / done 图片
- 对话模式：在 Hermes CLI 会话和 API Server 会话之间切换
- API Base URL：配置本机 API Server 地址，默认 `http://127.0.0.1:8642`
- Provider / Model：切换 Hermes 使用的模型配置
- Always on Top：控制是否始终置顶
- Cron：查看和创建定时任务

设置会保存在 Electron userData 目录下的 `pet-settings.json`。DeskBuddy 自己的 API 对话会单独保存在同目录的 `deskbuddy-api-conversations.json`。

## 开发

```bash
npm test
npm run typecheck
npm run smoke
```

当前项目保持简单的 Electron 启动方式：

- `src/main.js` 是主进程入口
- `src/preload.js` 暴露安全 IPC bridge
- `src/renderer/renderer.js` 负责界面交互
- `src/main/settings-store.js` 负责设置读写
- `src/main/hermes-cli-client.js` 负责 Hermes CLI 调用
- `src/renderer/modules/` 放置 i18n、pet 命中测试、面板布局等可测试模块

TypeScript 目前只作为 check-only 安全网，不改变运行时输出。

## 打包 macOS

```bash
npm run pack
npm run dist:mac
```

输出在 `dist/`：

- `dist/mac-arm64/Hermes DeskBuddy.app`
- `dist/Hermes DeskBuddy-0.2.1-arm64.dmg`

未签名版本第一次打开时，macOS 可能会拦截；右键选择“打开”即可。

## License

MIT — see [LICENSE](LICENSE).

---

<a name="english"></a>

[简体中文](#hermes-deskbuddy) | English

# Hermes DeskBuddy

Hermes DeskBuddy is a lightweight AI desktop companion for Hermes Agent. It floats near the edge of your screen like a desktop pet, and opens a local Hermes chat panel whenever you need it.

It is not a full IDE or a web-chat wrapper. It is a small, always-available desktop entry point for Hermes Agent: transparent, draggable, low-distraction, and ready when you need a quick conversation, model switch, or cron check.

Current version: 0.2.1

![Hermes DeskBuddy normal avatar](src/renderer/assets/pet_normal.png)

## What it does

- Chats with the local Hermes Agent CLI with streaming replies
- Supports API Server conversation mode with DeskBuddy-local conversation history and can send image attachments to vision-capable models
- Captures the screen with one click and attaches the screenshot after preview/confirmation
- Supports image and text/code file attachments; images are sent as OpenAI-style `image_url` multimodal parts and text files are summarized inline
- Manages Hermes cron jobs from a dedicated panel
- Switches Provider / Model and reads local `~/.hermes/.env` configuration
- Supports Chinese, English, Japanese, and Korean UI languages
- Lets you customize the pet name, scale, and state images
- Supports idle / listening / thinking / done pet states; thinking uses the running image by default
- Uses a transparent floating window with draggable pet behavior and click-through transparent areas
- Keeps panels scale-aware so chat/settings/cron panels avoid the pet and are not clipped by the transparent Electron window

## 0.2.1 update

- Adds “Select Area”: on macOS the app briefly hides the pet window, opens area selection with `screencapture`, then adds the selected screenshot as a previewable attachment for confirmation before sending.
- Adds attachment sending for images and text/code-like files, including Markdown, CSV, JSON, YAML, XML, HTML, JS/TS, CSS, Python, and PDF; small text files are inlined and small images become data URLs.
- API Server mode keeps its conversation picker/history in DeskBuddy's own userData store, separate from Hermes WebUI and the shared Hermes API Server session list.
- API Server mode now supports vision input: image attachments are sent as OpenAI-compatible `image_url` multimodal message parts for vision-capable models; CLI mode keeps attachment paths and text summaries.
- Pending attachments are cleared only after a successful send finishes; failed sends keep the screenshot/file attached so you can retry without recapturing or reselecting.
- Adds the default running/thinking avatar asset and completes idle / listening / thinking / done state configuration.
- Expands Chinese/English/Japanese/Korean UI copy, IPC bridge coverage, settings persistence, API payload handling, and regression tests.

## Install and run

Install Hermes Agent first and make sure the `hermes` command is available.

```bash
git clone https://github.com/virindihk/hermes-deskbuddy.git
cd hermes-deskbuddy
npm install
npm start
```

If Electron downloads are slow, use a mirror:

```bash
ELECTRON_MIRROR=https://npmmirror.com/mirrors/electron/ npm install
```

Check Hermes CLI:

```bash
hermes chat -q "hello"
```

## Usage

| Action | Description |
| --- | --- |
| Left-click the pet | Open / close the chat panel |
| Right-click the pet | Open menu: Settings, Cron, Language, Quit |
| Drag the pet | Move the floating window |
| “Select Area” in the chat header | Select a screen area and add it as a pending attachment |
| “Add Attachment” beside the input | Pick an image or text/code file attachment |
| Enter | Send message |
| Shift + Enter | New line |
| Drag chat panel corners | Resize the panel |

## Settings

- Name: change the desktop companion display name
- Size: scale from 50% to 300%
- State images: set separate idle / listening / thinking / done images
- Conversation mode: switch between Hermes CLI sessions and API Server conversations
- API Base URL: configure the local API Server endpoint, defaulting to `http://127.0.0.1:8642`
- Provider / Model: switch the model configuration used by Hermes
- Always on Top: control whether the pet stays above other windows
- Cron: view and create scheduled jobs

Settings are stored in `pet-settings.json` under Electron's userData directory. DeskBuddy-owned API conversations are stored separately in `deskbuddy-api-conversations.json` in the same directory.

## Development

```bash
npm test
npm run typecheck
npm run smoke
```

The project keeps a simple Electron runtime setup:

- `src/main.js` is the main-process entry point
- `src/preload.js` exposes the safe IPC bridge
- `src/renderer/renderer.js` handles UI interactions
- `src/main/settings-store.js` handles settings persistence
- `src/main/hermes-cli-client.js` handles Hermes CLI calls
- `src/renderer/modules/` contains testable modules for i18n, pet hit-testing, and panel layout

TypeScript is currently used as a check-only safety net and does not change runtime output.

## Build for macOS

```bash
npm run pack
npm run dist:mac
```

Outputs are written to `dist/`:

- `dist/mac-arm64/Hermes DeskBuddy.app`
- `dist/Hermes DeskBuddy-0.2.1-arm64.dmg`

The unsigned build may be blocked by macOS on first launch. Right-click and choose Open to allow it.

## License

MIT — see [LICENSE](LICENSE).
