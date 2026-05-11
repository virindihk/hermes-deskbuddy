# Hermes DeskBuddy

**简体中文** | [English](#english)

一个桌面小宠物，集成 Hermes Agent CLI，支持聊天、定时任务管理、多语言和多模型切换。

![pet icon](build/icon_source.png)

## 功能

- 🤖 **AI 聊天** — 直连 Hermes Agent，支持流式输出和 Markdown 渲染
- 🐱 **状态动画** — idle / thinking / happy 三种状态，可自定义每张状态图片
- 🌍 **多语言** — 右键菜单切换 中文 / English / 日本語 / 한국어
- ⚙️ **设定面板** — 自定义名字、大小缩放、状态图片、模型 Provider
- ⏰ **Cron 管理** — 独立面板查看和创建定时任务
- 💬 **会话管理** — 切换历史会话或新建会话
- 🖱️ **透明悬浮** — 鼠标穿透、拖拽移动、圆角面板

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

## 文件结构

```
├── src/
│   ├── main.js              # Electron 主进程
│   ├── preload.js           # IPC 桥接
│   └── renderer/
│       ├── index.html       # UI 结构
│       ├── renderer.js      # 渲染逻辑
│       └── styles.css       # 样式与动画
├── avatar/                  # 默认状态图片素材
├── build/                   # 应用图标
└── package.json
```

---

<a name="english"></a>
**[简体中文](#hermes-deskbuddy)** | English

# Hermes DeskBuddy

A tiny desktop pet that integrates with the Hermes Agent CLI. Chat, manage scheduled tasks, switch languages, and toggle models — all from a floating transparent companion.

![pet icon](build/icon_source.png)

## Features

- 🤖 **AI Chat** — Direct connection to Hermes Agent with streaming output and Markdown rendering
- 🐱 **State Animations** — idle / thinking / happy states, each with a customizable image
- 🌍 **Multi-language** — Right-click menu to switch between 中文 / English / 日本語 / 한국어
- ⚙️ **Settings Panel** — Name, scale (50%–300%), state images, model provider
- ⏰ **Cron Manager** — Dedicated panel to view and create scheduled tasks
- 💬 **Session Management** — Switch between past sessions or start a new one
- 🖱️ **Transparent & Float** — Click-through, draggable, rounded panels

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

## File Structure

```
├── src/
│   ├── main.js              # Electron main process
│   ├── preload.js           # IPC bridge
│   └── renderer/
│       ├── index.html       # UI structure
│       ├── renderer.js      # Renderer logic
│       └── styles.css       # Styles & animations
├── avatar/                  # Default state image assets
├── build/                   # App icons
└── package.json
```

## License

MIT — see [LICENSE](LICENSE).
