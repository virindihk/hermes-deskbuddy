# Bug Report: 聊天窗口拖到最大时顶部内容消失

## 现象

往上拖动 resize handle（TL/TR/BL）将聊天窗口放大到接近最大尺寸时，header 区域第一行内容（Pet 名字 `chatTitle` 和关闭按钮 `closeChat`）消失，只剩下第二行的 session 选择框 `sessionSelect` 和状态文本 `status`。

![截图示意](screenshot-placeholder)

> 截图中可见：header 背景渐变仍在，圆角仍在，session 选择框可见，但 title "Hermes" 和右上角关闭按钮 "×" 完全消失。

## 复现步骤

1. 左键点击 pet 打开聊天窗口
2. 拖动左上角/右上角/bottom-left 的 resize handle 往上拉，使窗口变大
3. 拉到接近最大限制（宽 640px × 高 800px）时，header 顶部的名字和关闭按钮消失
4. 松开鼠标后问题持续存在，不会自动恢复

## 环境

- macOS Apple Silicon (arm64)
- Electron 39.8.10
- 窗口配置：`frame: false`, `transparent: true`, `resizable: false`
- 屏幕：主显示器（含菜单栏）

## 已排查 & 已尝试的修复

### 1. 窗口移出屏幕 → 已修复但未解决根本问题

**推测：** 从 TL/TR handle 向上 resize 时，`newY` 计算导致窗口顶部移出屏幕（`y < 0`），被菜单栏遮挡。

**尝试：**
- `main.js` 中 `setWindowBounds` 先用 `Math.max(0, ...)` 限制坐标，后改用 `workArea.x/y` 精确限制在可用区域内。

**结果：** 未解决。即使窗口明显留在屏幕内（y 坐标正确），header 顶部内容仍然消失。

### 2. resize handles 被 overflow 裁剪 → 已修复但未解决根本问题

**推测：** handles 原先用 `top: -6px / left: -6px` 放在 chatPanel 外面，被 `overflow: hidden` 裁剪。

**尝试：**
- 将 handles 移至 chatPanel 内部（`top: 2px / left: 2px`），尺寸从 14px 增大到 18px。

**结果：** handles 本身的问题解决，但 header 内容消失的问题仍然存在。

### 3. header 被 grid 压缩 → 已尝试但未解决

**推测：** `.chat-header` 使用 `display: grid; grid-template-rows: auto auto;`，向上拖动时某些因素导致第一行被压缩到高度为 0。

**尝试：**
- 给 `.chat-header` 添加 `min-height: 64px`，强制保留两行内容的空间。

**结果：** 未解决。即使 header 高度足够，row 1 的内容仍然不可见。

### 4. resize 增量式更新导致状态漂移 → 已修复

**推测：** 原 resize 逻辑基于 pointerdown 时的固定 `resizeStart`，碰到限制边界后反向拖动不生效。

**尝试：**
- 改为增量式 resize：每次 `pointermove` 后更新 `resizeStart.x/y/w/h/winX/winY`。
- `setPointerCapture` 改为在 `pointerdown` 开始时立即调用（而非等异步 bounds 获取完成后）。

**结果：** 原来的"越拉越大"bug 已修复，但 header 消失的问题与此无关。

## 当前代码状态（关键片段）

### HTML 结构

```html
<section id="chatPanel" class="chat-panel hidden">
  <header class="chat-header">
    <div id="chatTitle" class="title">Hermes</div>
    <button id="closeChat" class="icon-button" title="收起">×</button>
    <select id="sessionSelect" class="session-select">
      <option value="">新建会话...</option>
    </select>
    <div id="status" class="status">检查 Hermes 中...</div>
  </header>
  <div id="messages" class="messages">...</div>
  <form id="composer">...</form>
</section>
```

### CSS

```css
.chat-panel {
  position: absolute;
  left: 18px;
  top: 18px;
  width: 360px;
  height: 390px;
  border-radius: 24px;
  overflow: hidden;
  transform: translateZ(0);   /* GPU layer */
  /* ... */
}

.chat-header,
.settings-header,
.cron-header {
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  padding: 16px 16px 12px;
  border-bottom: 1px solid rgba(117, 109, 132, 0.13);
  background: linear-gradient(135deg, rgba(255, 229, 242, 0.88), rgba(238, 231, 255, 0.88));
  border-radius: 24px 24px 0 0;
}

.chat-header {
  display: grid;
  grid-template-columns: 1fr auto;
  grid-template-rows: auto auto;
  gap: 6px 8px;
  align-items: center;
  min-height: 64px;   /* 已添加，未解决问题 */
}

.chat-header .title       { grid-column: 1; grid-row: 1; }
.chat-header .icon-button { grid-column: 2; grid-row: 1; justify-self: end; }
.chat-header .session-select { grid-column: 1; grid-row: 2; }
.chat-header .status      { grid-column: 2; grid-row: 2; justify-self: end; }
```

### Renderer resize 逻辑（增量式）

```javascript
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

  newW = Math.max(260, Math.min(640, newW));
  newH = Math.max(200, Math.min(800, newH));

  if (corner.includes('left')) {
    newX = resizeStart.winX + (resizeStart.w - newW);
  }
  if (corner.includes('top')) {
    newY = resizeStart.winY + (resizeStart.h - newH);
  }

  chatPanel.style.width = `${newW}px`;
  chatPanel.style.height = `${newH}px`;
  window.desktopPet.setWindowBounds(
    Math.round(newX), Math.round(newY),
    Math.round(newW + 60), Math.round(newH + 170)
  );

  // 增量式更新
  resizeStart.x = event.screenX;
  resizeStart.y = event.screenY;
  resizeStart.w = newW;
  resizeStart.h = newH;
  resizeStart.winX = newX;
  resizeStart.winY = newY;
});
```

### Main process 窗口限制

```javascript
ipcMain.on('pet:set-window-bounds', (_event, x, y, width, height) => {
  if (!mainWindow || mainWindow.isDestroyed()) return;
  const { workArea } = screen.getPrimaryDisplay();
  x = Math.max(workArea.x, Math.min(x, workArea.x + workArea.width - 320));
  y = Math.max(workArea.y, Math.min(y, workArea.y + workArea.height - 380));
  const newW = Math.max(320, Math.min(workArea.x + workArea.width - x, Math.round(width)));
  const newH = Math.max(380, Math.min(workArea.y + workArea.height - y, Math.round(height)));
  mainWindow.setBounds({ x: Math.round(x), y: Math.round(y), width: newW, height: newH });
});
```

## 未解之谜 / 待排查方向

### 方向 A：Grid 布局在特定尺寸下失效

- `.chat-header` 有两个 `display` 规则：前面的 `display: flex`（组合选择器）和后面的 `display: grid`（单选择器）。
- 虽然后者优先级更高且在后面，但**是否在某些 resize 过程中浏览器对 grid 的重新计算出现 bug**？
- 建议：将 `.chat-header` 改为纯 flex 布局（`flex-direction: column` + 两行 `display: flex` 子容器），彻底避开 grid。

### 方向 B：`transform: translateZ(0)` GPU 层导致裁剪异常

- `chatPanel` 有 `transform: translateZ(0)` 强制 GPU 层，目的是防止 resize 时圆角丢失。
- **是否当 panel 尺寸变得很大时，GPU 层的裁剪边界计算错误**，导致 header 顶部的子元素被错误裁剪？
- 建议：尝试移除 `transform: translateZ(0)`，改用 `will-change: transform` 或 `isolation: isolate`。

### 方向 C：`overflow: hidden` + `border-radius` 组合导致子元素被隐藏

- `chatPanel` 同时有 `border-radius: 24px` 和 `overflow: hidden`。
- 当 panel 尺寸改变时，**浏览器是否错误地将圆角裁剪区域应用到 header 子元素上**，导致 row 1 被"切掉"？
- 建议：给 header 单独添加 `overflow: visible` 覆盖，或移除 chatPanel 的 `overflow: hidden`（需验证对 messages 滚动的影响）。

### 方向 D：Electron `frame: false` + `setBounds` 的渲染同步问题

- macOS 上 frameless transparent 窗口在 `setBounds` 频繁调用时，**WebKit 的 compositor 可能不同步更新**，导致某些像素区域显示旧帧或空白。
- 建议：在 `setBounds` 后调用 `mainWindow.webContents.invalidate()` 或 `mainWindow.webContents.redraw()` 强制重绘。

### 方向 E：CSS `box-sizing: border-box` 与 grid `auto` 行的相互作用

- 全局 `* { box-sizing: border-box; }`。
- header 的 padding 为 `16px 16px 12px`。
- 在 `border-box` 下，grid 的 `auto` 行高度计算是否受到 padding 影响，导致 row 1 被"挤出"？
- 建议：在 DevTools 中检查 header 的实际 computed height 和 grid row 高度。

### 方向 F：增量式 resize 中 `resizeStart.winY` 状态漂移

- 增量式更新会将 `resizeStart.winY` 设为限制**前**的 `newY`（可能为很大的负数）。
- 虽然 `setWindowBounds` 会修正，但**renderer 中 `resizeStart.winY` 的漂移是否间接影响了某些布局计算**？（目前看不太可能，但值得验证）
- 建议：在增量更新时，将 `resizeStart.winY` 设为 `mainWindow.getBounds().y` 的实际值（通过 IPC 获取），而非计算值。

## 建议的下一步调试手段

1. **DevTools 现场检查**：在 bug 出现时打开 DevTools，检查 `.chat-header` 的 computed styles：
   - `display` 实际值是 `grid` 还是 `flex`？
   - `grid-template-rows` 的两行高度分别是多少？
   - `.title` 和 `.icon-button` 的 `display`、`visibility`、`opacity`、`height`、`width` 各是多少？
   - 元素是否在 DOM 中？是否被 `overflow: hidden` 裁剪？

2. **最小复现**：创建一个独立的 HTML 文件，仅包含 `.chat-header` 的 grid 布局 + 一个按钮动态改变容器高度，看是否能复现 row 1 消失。

3. **移除 GPU 层测试**：临时移除 `transform: translateZ(0)`，重新打包测试。

4. **改用 flex 布局**：将 `.chat-header` 改为 flex column 布局，重新打包测试。

5. **Electron 日志**：在 `setWindowBounds` 前后打印 `bounds` 和 `chatPanel.offsetHeight`，确认数值是否匹配预期。
