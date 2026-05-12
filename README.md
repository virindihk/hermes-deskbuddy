# Hermes DeskBuddy

**简体中文** | [English](#english)

一个桌面小宠物，集成 Hermes Agent CLI，支持聊天、定时任务管理、多语言、多模型切换和缩放友好的悬浮面板。

![pet icon](build/icon_source.png)

## 功能

- 🤖 **AI 聊天** — 直连 Hermes Agent CLI，支持流式输出和 Markdown 渲染
- 🐱 **状态动画** — idle / thinking / happy 三种状态，可自定义每张状态图片
- 🌍 **多语言** — 右键菜单切换 中文 / English / 日本語 / 한국어
- ⚙️ **设定面板** — 自定义名字、大小缩放、状态图片、模型 Provider
- ⏰ **Cron 管理** — 独立面板查看和创建定时任务
- 💬 **会话管理** — 切换历史会话或新建会话
- 🖱️ **透明悬浮** — 鼠标穿透、拖拽移动、圆角面板
- 📐 **缩放友好布局** — pet 放大到 200%/300% 时，聊天/设置/Cron 面板会自动避让，并按需扩展透明窗口，避免遮挡和裁切

## 启动开发

```bash
git clone https://github.com/virindihk/hermes-deskbuddy.git
cd hermes-deskbuddy
npm install
npm start
```

如果 Electron 下载很慢：

```bash
ELECTRON_MIRROR=https://npmmirror.com/mirrors/electron/ npm install
```

## 开发验证

```bash
# 类型检查：当前采用 JavaScript runtime + TypeScript check-only
npm run typecheck

# 行为/模块测试
npm test

# 可选：检查 Hermes CLI 连通性
npm run smoke
```

当前架构保持 `electron .` 直接启动，不需要构建步骤。TypeScript 只作为 `tsc --noEmit` 安全网，优先覆盖已抽出的稳定模块。

## 打包（macOS）

```bash
# 生成 .app（可直接运行）
npm run pack

# 生成 .dmg 安装包
npm run dist:mac
```

打包后的文件在 `dist/` 目录：

- `dist/mac-arm64/Hermes DeskBuddy.app` — 可直接双击打开
- `dist/Hermes DeskBuddy-0.1.2-arm64.dmg` — 安装包（拖拽进 Applications）

> 第一次打开可能因为未签名被系统拦截，右键 → 打开 即可。

## Hermes 依赖

需要本机安装 [Hermes Agent](https://github.com/NousResearch/hermes-agent)（自带 `hermes` CLI，安装后 `hermes` 命令可用）。

检查连接：

```bash
hermes chat -q "hello"
```

## 使用

| 操作 | 说明 |
|------|------|
| 左键点击 pet | 打开/收起聊天窗口 |
| 右键点击 pet | 打开菜单（设定 / Cron / 语言 / 退出） |
| 拖拽 pet | 移动窗口位置 |
| Enter | 发送消息 |
| Shift+Enter | 换行 |
| 面板内拖拽边角 | 调整聊天窗口大小 |

## 设定说明

- **名字** — pet 的显示名称（默认 Hermes）
- **大小** — 50% ~ 300% 缩放
- **状态图片** — 分别设置 idle / thinking / happy 三张图
- **Provider / Model** — 动态读取 `~/.hermes/.env` 中的 API key，支持一键切换
- **Cron 管理** — 查看当前定时任务列表，或新建 cron

## 架构说明

- Electron 入口仍是 `src/main.js`，保持开发启动和打包路径简单稳定。
- 主进程的设置读写与 Hermes CLI 调用已拆到 `src/main/settings-store.js`、`src/main/hermes-cli-client.js`，方便单元测试和类型检查。
- 渲染端仍由 `src/renderer/index.html` 直接加载脚本；`modules/i18n.js`、`modules/pet-hit-test.js`、`modules/panel-layout.js` 会在 `renderer.js` 前加载。
- pet 命中测试、面板布局/缩放窗口计算、i18n、设置持久化、Hermes CLI 解析都有独立测试覆盖。
- TypeScript 暂不改变运行时输出：`tsconfig.json` 只对抽出的 JS 模块做 check-only 校验。

## 文件结构

```text
├── src/
│   ├── main.js                  # Electron 主进程入口
│   ├── main/
│   │   ├── hermes-cli-client.js # Hermes CLI 调用、解析与健康检查
│   │   └── settings-store.js    # 设置规范化与持久化
│   ├── preload.js               # IPC 桥接
│   └── renderer/
│       ├── index.html           # UI 结构与脚本加载顺序
│       ├── modules/
│       │   ├── i18n.js          # 多语言字典与翻译函数
│       │   ├── panel-layout.js  # 面板避让、缩放和窗口扩展计算
│       │   └── pet-hit-test.js  # pet 透明区域命中测试
│       ├── renderer.js          # 渲染逻辑
│       ├── styles.css           # 样式与动画
│       └── assets/              # renderer 默认 pet 图片
├── src/types/                   # check-only TypeScript 声明
├── test/                        # node:test 行为与模块测试
├── docs/plans/                  # 架构与迁移决策记录
├── avatar/                      # 默认状态图片素材
├── build/                       # 应用图标
├── tsconfig.json                # TypeScript check-only 配置
└── package.json
```

---

<a name="english"></a>
**[简体中文](#hermes-deskbuddy)** | English

# Hermes DeskBuddy

A tiny desktop pet that integrates with the Hermes Agent CLI. Chat, manage scheduled tasks, switch languages, toggle models, and use scale-aware floating panels from a transparent companion.

![pet icon](build/icon_source.png)

## Features

- 🤖 **AI Chat** — Direct connection to Hermes Agent CLI with streaming output and Markdown rendering
- 🐱 **State Animations** — idle / thinking / happy states, each with a customizable image
- 🌍 **Multi-language** — Right-click menu to switch between 中文 / English / 日本語 / 한국어
- ⚙️ **Settings Panel** — Name, scale (50%–300%), state images, model provider
- ⏰ **Cron Manager** — Dedicated panel to view and create scheduled tasks
- 💬 **Session Management** — Switch between past sessions or start a new one
- 🖱️ **Transparent & Float** — Click-through, draggable, rounded panels
- 📐 **Scale-aware Layout** — When the pet is scaled to 200%/300%, chat/settings/Cron panels avoid the pet and the transparent window expands as needed to prevent overlap and clipping

## Development

```bash
git clone https://github.com/virindihk/hermes-deskbuddy.git
cd hermes-deskbuddy
npm install
npm start
```

If Electron downloads are slow:

```bash
ELECTRON_MIRROR=https://npmmirror.com/mirrors/electron/ npm install
```

## Verification

```bash
# Type checking: JavaScript runtime + TypeScript check-only
npm run typecheck

# Behavior/module tests
npm test

# Optional: verify Hermes CLI connectivity
npm run smoke
```

The app still starts directly with `electron .`; there is no required build step for development. TypeScript is used as a `tsc --noEmit` safety net around extracted stable modules.

## Build (macOS)

```bash
# Build .app (run directly)
npm run pack

# Build .dmg installer
npm run dist:mac
```

Output files are in `dist/`:

- `dist/mac-arm64/Hermes DeskBuddy.app` — Double-click to run
- `dist/Hermes DeskBuddy-0.1.2-arm64.dmg` — Drag into Applications

> On first launch macOS may block the unsigned app. Right-click → Open to allow.

## Hermes Dependency

You need [Hermes Agent](https://github.com/NousResearch/hermes-agent) installed locally (it provides the `hermes` CLI).

Verify the connection:

```bash
hermes chat -q "hello"
```

## Usage

| Action | Description |
|--------|-------------|
| Left-click pet | Open / close chat panel |
| Right-click pet | Open menu (Settings / Cron / Language / Quit) |
| Drag pet | Move the window |
| Enter | Send message |
| Shift+Enter | New line |
| Drag panel corners | Resize the chat panel |

## Settings

- **Name** — Display name of the pet (default: Hermes)
- **Size** — 50% ~ 300% scale
- **State Images** — Set images for idle / thinking / happy states
- **Provider / Model** — Reads API keys from `~/.hermes/.env`, one-click switching
- **Cron Manager** — View existing cron jobs or create new ones

## Architecture Notes

- The Electron entry point remains `src/main.js` to keep development startup and packaging simple.
- Main-process settings persistence and Hermes CLI integration live in `src/main/settings-store.js` and `src/main/hermes-cli-client.js` for focused tests and type checks.
- The renderer is still loaded directly by `src/renderer/index.html`; `modules/i18n.js`, `modules/pet-hit-test.js`, and `modules/panel-layout.js` load before `renderer.js`.
- Pet hit testing, panel layout/window expansion, i18n, settings persistence, and Hermes CLI parsing are covered by module/behavior tests.
- TypeScript does not change runtime output yet: `tsconfig.json` runs check-only validation over extracted JS modules.

## File Structure

```text
├── src/
│   ├── main.js                  # Electron main process entry
│   ├── main/
│   │   ├── hermes-cli-client.js # Hermes CLI calls, parsing, health checks
│   │   └── settings-store.js    # Settings normalization and persistence
│   ├── preload.js               # IPC bridge
│   └── renderer/
│       ├── index.html           # UI structure and script order
│       ├── modules/
│       │   ├── i18n.js          # Locale dictionaries and translation helpers
│       │   ├── panel-layout.js  # Panel avoidance, scaling, and window growth math
│       │   └── pet-hit-test.js  # Transparent pet hit testing
│       ├── renderer.js          # Renderer logic
│       ├── styles.css           # Styles & animations
│       └── assets/              # Renderer default pet images
├── src/types/                   # Check-only TypeScript declarations
├── test/                        # node:test behavior and module tests
├── docs/plans/                  # Architecture and migration decision notes
├── avatar/                      # Default state image assets
├── build/                       # App icons
├── tsconfig.json                # TypeScript check-only config
└── package.json
```

## License

MIT — see [LICENSE](LICENSE).
