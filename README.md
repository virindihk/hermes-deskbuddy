# Hermes Pet

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
git clone https://github.com/virindihk/hermes-desktop-pet.git
cd hermes-desktop-pet
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
- `dist/mac-arm64/Hermes Pet.app` — 可直接双击打开
- `dist/Hermes Pet-0.1.1-arm64.dmg` — 安装包（拖拽进 Applications）

> 第一次打开可能因为未签名被系统拦截，右键 → 打开 即可。

## Hermes 依赖

需要本机安装 [Hermes CLI](https://github.com/fatedier/hermes)（`hermes` 命令可用）。

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

## License

UNLICENSED
