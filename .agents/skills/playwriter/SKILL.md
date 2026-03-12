---
name: playwriter
description: Control the user own Chrome browser via Playwriter extension with Playwright code snippets in a stateful local js sandbox via playwriter cli. Automate web interactions, take screenshots, inspect accessibility trees, debug & profile web applications. Run `playwriter skill` command to read the complete up to date skill
---

## CLI 用法

### 会话管理

每会话运于**隔离沙箱**，有独立 `state` 对象。用以：

- 隔离不同任务或代理之状态
- 跨多次 execute 调用持久化数据（页面、变量）
- 多代理并用时避免干扰

取新会话 ID：

```bash
playwriter session new
# outputs: 1
```

**务用自有会话** — 传 `-s <id>` 于所有命令。同一会话保持 `state`，异会话则全新。

列出所有活跃会话及其 state 键：

```bash
playwriter session list
# ID  State Keys
# --------------
# 1   myPage, userData
# 2   -
```

若浏览器连接陈旧或断开，重置会话：

```bash
playwriter session reset <sessionId>
```

### 执行代码

```bash
playwriter -s <sessionId> -e "<code>"
```

`-s` 指定会话 ID（必需），以 `playwriter session new` 取得。同一会话可跨命令持久化状态。

默认超时 10 秒，以 `--timeout <ms>` 增之。

**示例：**

```bash
# 导航至页面
playwriter -s 1 -e "state.page = await context.newPage(); await state.page.goto('https://example.com')"

# 点击按钮
playwriter -s 1 -e "await page.click('button')"

# 取页面标题
playwriter -s 1 -e "console.log(await page.title())"

# 截图
playwriter -s 1 -e "await page.screenshot({ path: 'screenshot.png', scale: 'css' })"

# 取无障碍快照
playwriter -s 1 -e "console.log(await accessibilitySnapshot({ page }))"
```

**多行代码：**

```bash
# 以 $'...' 语法
playwriter -s 1 -e $'
const title = await page.title();
const url = page.url();
console.log({ title, url });
'

# 或用 heredoc
playwriter -s 1 -e "$(cat <<'EOF'
const links = await page.$$eval('a', els => els.map(e => e.href));
console.log('Found', links.length, 'links');
EOF
)"
```

### 排障 playwriter 问题

若遇内部严重错误，可读中继服务器日志：

```bash
playwriter logfile  # 输出日志文件路径
# 通常: /tmp/playwriter/relay-server.log (Linux/macOS) 或 %TEMP%\playwriter\relay-server.log (Windows)
```

中继日志含扩展、MCP 与 WS 服务器之日志。另有 CDP JSONL 日志（见 `playwriter logfile`），载所有 CDP 命令/响应与事件，长字符串已截断。二文件于服务器每次启动时重建。排障时以 grep/rg 查相关行。

汇总 CDP 流量示例：

```bash
jq -r '.direction + "\t" + (.message.method // "response")' /tmp/playwriter/cdp.jsonl | uniq -c
```

若发现 bug，可以 `gh issue create -R remorses/playwriter --title title --body body` 提交。须先征得用户同意。

---

# playwriter 最佳实践

经 Playwright 代码片段控制用户 Chrome 浏览器。宜用单行代码以分号分隔语句。若遇 "extension is not connected" 或 "no browser tabs have Playwriter enabled" 错误，告知用户于目标标签页点击 playwriter 扩展图标。

可与用户协作——用户可协助处理验证码、难操控元素或复现 bug。

## 上下文变量

- `state` — 于**本会话内**跨调用持久化之对象。各会话隔离。用以存储页面、数据、监听器（如 `state.myPage = await context.newPage()`）
- `page` — 用户激活之默认页面，除需操作多页面外用此即可
- `context` — 浏览器上下文，以 `context.pages()` 访问所有页面
- `require` — 加载 Node.js 模块如 fs
- Node.js 全局对象：`setTimeout`、`setInterval`、`fetch`、`URL`、`Buffer`、`crypto` 等

**注意**：`state` 为**会话隔离**，然 `context.pages()` 为**所有会话共享**。各代理见同一浏览器标签页。若他代理导航或关闭页面，本代理亦可见。为避干扰，当创建自有页面并存于 `state`（见"页面操作"节）。

## 规则

- **用自有会话**：各会话状态隔离，防他代理干扰
- **将页面存于 state**：自动化时以 `context.newPage()` 创建页面并存于 `state.myPage`，防他代理干扰
- **多次调用**：复杂逻辑宜分多次 execute 调用——便于理解中间状态、隔离失败操作
- **勿关闭**：切勿调用 `browser.close()` 或 `context.close()`。仅关闭自创页面或用户明确要求时方可
- **勿 bringToFront**：除用户要求外勿调——扰人且无必要，后台页面亦可交互
- **操作后检查状态**：点击/提交后务必验证页面状态（见下节）
- **清理监听器**：消息结束时调 `page.removeAllListeners()` 防泄漏
- **CDP 会话**：用 `getCDPSession({ page })` 而非 `page.context().newCDPSession()` — 后者经 playwriter 中继不可用
- **等待加载**：用 `page.waitForLoadState('domcontentloaded')` 而非 `page.waitForEvent('load')` — 后者若已加载则超时
- **避免超时等待**：勿用 `page.waitForTimeout()`，有更佳等待元素之法

## 检查页面状态

操作后（点击、提交、导航）须验证结果：

```js
console.log("url:", page.url());
console.log(
  await accessibilitySnapshot({ page }).then((x) =>
    x.split("\n").slice(0, 30).join("\n"),
  ),
);
```

视觉复杂页面（网格、画廊、仪表盘）改用 `screenshotWithAccessibilityLabels({ page })` 以理解空间布局。

若无变化，试 `await waitForPageLoad({ page, timeout: 3000 })` 或检查是否点错元素。

## 无障碍快照

```js
await accessibilitySnapshot({ page, search?, showDiffSinceLastCall? })
```

- `search` — 字符串/正则过滤结果（返回前 10 匹配行）
- `showDiffSinceLastCall` — 返回与上次快照之差异（操作后用之）

分页取快照用 `.split('\n').slice(offset, offset + limit).join('\n')`：

```js
console.log(
  (await accessibilitySnapshot({ page })).split("\n").slice(0, 50).join("\n"),
); // 前 50 行
console.log(
  (await accessibilitySnapshot({ page })).split("\n").slice(50, 100).join("\n"),
); // 次 50 行
```

输出示例：

```md
- banner [ref=e3]:
  - link "Home" [ref=e5] [cursor=pointer]:
    - /url: /
  - navigation [ref=e12]:
    - link "Docs" [ref=e13] [cursor=pointer]:
      - /url: /docs
```

以 `aria-ref` 交互 — **ref 值不加引号**：

```js
await page.locator("aria-ref=e13").click();
```

搜索特定元素：

```js
const snapshot = await accessibilitySnapshot({
  page,
  search: /button|submit/i,
});
```

## 快照方法之择

`accessibilitySnapshot` 与 `screenshotWithAccessibilityLabels` 皆用 `aria-ref` 体系，可组合使用。

**宜用 `accessibilitySnapshot`**：

- 页面结构简明、语义化（文章、表单、列表）
- 需搜索特定文本或模式
- 注重 token 用量（文本小于图片）
- 需以程序处理输出

**宜用 `screenshotWithAccessibilityLabels`**：

- 页面视觉复杂（网格、画廊、仪表盘、地图）
- 空间位置攸关（如"第一张图"、"左上按钮"）
- DOM 序与视觉序不符
- 需理解视觉层级

**组合之法**：先以截图理解布局并定位目标元素，后续以 `accessibilitySnapshot({ search: /pattern/ })` 高效搜索。

## 选择器最佳实践

**未知网站**：用 `accessibilitySnapshot()` 配 `aria-ref` — 显示实际可交互元素。

**开发环境**（有源码时），按稳定性排序选择器：

1. **最佳**：`[data-testid="submit"]` — 明确测试属性，不会意外变更
2. **良好**：`getByRole('button', { name: 'Save' })` — 无障碍、语义化
3. **良好**：`getByText('Sign in')`、`getByLabel('Email')` — 可读、面向用户
4. **尚可**：`input[name="email"]`、`button[type="submit"]` — 语义 HTML
5. **避免**：`.btn-primary`、`#submit` — class/ID 常变
6. **末选**：`div.container > form > button` — 脆弱易折

组合定位器以提高精度：

```js
page.locator("tr").filter({ hasText: "John" }).locator("button").click();
page.locator("button").nth(2).click();
```

若定位器匹配多元素，Playwright 抛 "strict mode violation"。用 `.first()`、`.last()` 或 `.nth(n)`：

```js
await page.locator("button").first().click(); // 首匹配
await page.locator(".item").last().click(); // 末匹配
await page.locator("li").nth(3).click(); // 第四项（0 起）
```

## 页面操作

**页面共享之理**：`context.pages()` 返回所有启用 playwriter 之浏览器标签页。此为**所有会话共享** — 若多代理并行，皆见同一标签页。然各会话 `state` 隔离，故将页面引用存于 `state.myPage` 可保安全。

**创建自有页面（自动化推荐）：**

自动化时当创建专用页面并存于 `state`，防他代理干扰：

```js
state.myPage = await context.newPage();
await state.myPage.goto("https://example.com");
// 本会话后续操作皆用 state.myPage
```

**查找用户已开页面：**

用户有时于特定标签页启用 playwriter 扩展（如已登录之应用）。以 URL 模式查找：

```js
const pages = context.pages().filter((x) => x.url().includes("myapp.com"));
if (pages.length === 0)
  throw new Error(
    "No myapp.com page found. Ask user to enable playwriter on it.",
  );
if (pages.length > 1)
  throw new Error(`Found ${pages.length} matching pages, expected 1`);
state.targetPage = pages[0];
```

**以部分 URL 查找特定页面：**

```js
const pages = context.pages().filter((x) => x.url().includes("localhost"));
if (pages.length !== 1)
  throw new Error(`Expected 1 page, found ${pages.length}`);
state.targetPage = pages[0];
```

**列出所有可用页面：**

```js
console.log(context.pages().map((p) => p.url()));
```

## 导航

`page.goto()` 宜用 `domcontentloaded`：

```js
await page.goto("https://example.com", { waitUntil: "domcontentloaded" });
await waitForPageLoad({ page, timeout: 5000 });
```

## 常见模式

**弹出窗口** — 触发前先捕获：

```js
const [popup] = await Promise.all([
  page.waitForEvent("popup"),
  page.click("a[target=_blank]"),
]);
await popup.waitForLoadState();
console.log("Popup URL:", popup.url());
```

**下载** — 捕获并保存：

```js
const [download] = await Promise.all([
  page.waitForEvent("download"),
  page.click("button.download"),
]);
await download.saveAs(`/tmp/${download.suggestedFilename()}`);
```

**iFrame** — 用 frameLocator：

```js
const frame = page.frameLocator("#my-iframe");
await frame.locator("button").click();
```

**对话框** — 处理 alert/confirm/prompt：

```js
page.on("dialog", async (dialog) => {
  console.log(dialog.message());
  await dialog.accept();
});
await page.click("button.trigger-alert");
```

## 工具函数

**getLatestLogs** — 取捕获之浏览器控制台日志（每页至多 5000 条，导航时清空）：

```js
await getLatestLogs({ page?, count?, search? })
// 示例:
const errors = await getLatestLogs({ search: /error/i, count: 50 })
const pageLogs = await getLatestLogs({ page })
```

自定义日志采集跨调用持久化，存于 state：`state.logs = []; page.on('console', m => state.logs.push(m.text()))`

**getCleanHTML** — 从定位器或页面取清洁 HTML，支持搜索与差异比较：

```js
await getCleanHTML({ locator, search?, showDiffSinceLastCall?, includeStyles? })
// 示例:
const html = await getCleanHTML({ locator: page.locator('body') })
const html = await getCleanHTML({ locator: page, search: /button/i })
const diff = await getCleanHTML({ locator: page, showDiffSinceLastCall: true })
```

- `locator` — Playwright Locator 或 Page
- `search` — 字符串/正则过滤（返回前 10 匹配行）
- `showDiffSinceLastCall` — 返回与上次之差异
- `includeStyles` — 保留 style 与 class 属性（默认 false）

返回仅含必要属性之清洁 HTML（aria-\*、data-\*、href、role、title、alt 等）。移除 script、style、svg、head 标签。

分页用 `.split('\n').slice(offset, offset + limit).join('\n')`：

```js
console.log(
  (await getCleanHTML({ locator: page })).split("\n").slice(0, 50).join("\n"),
); // 前 50 行
console.log(
  (await getCleanHTML({ locator: page })).split("\n").slice(50, 100).join("\n"),
); // 次 50 行
```

**waitForPageLoad** — 智能加载检测，忽略分析/广告请求：

```js
await waitForPageLoad({ page, timeout?, pollInterval?, minWait? })
// 返回: { success, readyState, pendingRequests, waitTimeMs, timedOut }
```

**getCDPSession** — 发送原始 CDP 命令：

```js
const cdp = await getCDPSession({ page });
const metrics = await cdp.send("Page.getLayoutMetrics");
```

**getLocatorStringForElement** — 从临时 aria-ref 取稳定选择器：

```js
const selector = await getLocatorStringForElement(page.locator("aria-ref=e14"));
// => "getByRole('button', { name: 'Save' })"
```

**getReactSource** — 取 React 组件源码位置（仅开发模式）：

```js
const source = await getReactSource({ locator: page.locator("aria-ref=e5") });
// => { fileName, lineNumber, columnNumber, componentName }
```

**getStylesForLocator** — 查元素 CSS 样式，类浏览器 DevTools "Styles" 面板。用于排查样式问题、查找 CSS 属性定义位置（file:line）、检查继承样式。返回各匹配规则之选择器、源位置与声明。**务先以 curl 或 webfetch 获取 `https://playwriter.dev/resources/styles-api.md`**。

```js
const styles = await getStylesForLocator({
  locator: page.locator(".btn"),
  cdp: await getCDPSession({ page }),
});
console.log(formatStylesAsText(styles));
```

**createDebugger** — 设断点、单步执行、运行时检查变量。用于排查仅在浏览器复现之问题、理解代码流程、检查特定点之状态。可于异常暂停、在作用域内求值、屏蔽框架代码。**务先获取 `https://playwriter.dev/resources/debugger-api.md`**。

```js
const cdp = await getCDPSession({ page });
const dbg = createDebugger({ cdp });
await dbg.enable();
const scripts = await dbg.listScripts({ search: "app" });
await dbg.setBreakpoint({ file: scripts[0].url, line: 42 });
// 暂停时: dbg.inspectLocalVariables(), dbg.stepOver(), dbg.resume()
```

**createEditor** — 运行时查看与实时编辑页面脚本和 CSS。编辑存于内存（刷新前有效）。用于测试快速修复、以 grep 搜索页面脚本、切换调试标志。**务先读取 `https://playwriter.dev/resources/editor-api.md`**。

```js
const cdp = await getCDPSession({ page });
const editor = createEditor({ cdp });
await editor.enable();
const matches = await editor.grep({ regex: /console\.log/ });
await editor.edit({
  url: matches[0].url,
  oldString: "DEBUG = false",
  newString: "DEBUG = true",
});
```

**screenshotWithAccessibilityLabels** — 截图并于交互元素上叠加 Vimium 风格可视标签。显示标签、截图、移除标签。图像与无障碍快照自动含于响应中。可多次调用以捕获多张截图。复杂页面用 **20 秒**超时。

网格、图片画廊、地图等视觉复杂页面优先用此。简单文字页面用 `accessibilitySnapshot` 配搜索更快且省 token。

```js
await screenshotWithAccessibilityLabels({ page });
// 图像与无障碍快照自动含于响应
// 以快照中 aria-ref 与元素交互
await page.locator("aria-ref=e5").click();

// 一次执行中可取多张截图
await screenshotWithAccessibilityLabels({ page });
await page.click("button");
await screenshotWithAccessibilityLabels({ page });
// 二图皆含于响应
```

标签色码：黄=链接，橙=按钮，珊瑚=输入，粉=复选框，桃=滑块，鲑=菜单，琥珀=标签页。

## 固定元素

用户可右键 → "Copy Playwriter Element Reference" 将元素存于 `globalThis.playwriterPinnedElem1`（逐次递增）。引用已复制至剪贴板：

```js
const el = await page.evaluateHandle(() => globalThis.playwriterPinnedElem1);
await el.click();
```

## 截图

务用 `scale: 'css'` 以避高 DPI 显示器产生 2-4 倍过大图像：

```js
await page.screenshot({ path: "shot.png", scale: "css" });
```

若需将图片读回上下文，务先缩放，确保最大尺寸 1500px。如 macOS 上：`sips --resampleHeightWidthMax 1500 input.png --out output.png`。

## page.evaluate

`page.evaluate()` 内代码运行于浏览器——仅用纯 JavaScript，勿用 TypeScript 语法。于外部返回值并打印（evaluate 内 console.log 运行于浏览器，不可见）：

```js
const title = await page.evaluate(() => document.title);
console.log("Title:", title);

const info = await page.evaluate(() => ({
  url: location.href,
  buttons: document.querySelectorAll("button").length,
}));
console.log(info);
```

## 加载文件

以文件内容填充输入框：

```js
const fs = require("node:fs");
const content = fs.readFileSync("./data.txt", "utf-8");
await page.locator("textarea").fill(content);
```

## 网络拦截

抓取或逆向 API 时，拦截网络请求而非滚动 DOM。存于 `state` 以跨调用分析：

```js
state.requests = [];
state.responses = [];
page.on("request", (req) => {
  if (req.url().includes("/api/"))
    state.requests.push({
      url: req.url(),
      method: req.method(),
      headers: req.headers(),
    });
});
page.on("response", async (res) => {
  if (res.url().includes("/api/")) {
    try {
      state.responses.push({
        url: res.url(),
        status: res.status(),
        body: await res.json(),
      });
    } catch {}
  }
});
```

触发操作（滚动、点击、导航）后分析捕获数据：

```js
console.log("Captured", state.responses.length, "API calls");
state.responses.forEach((r) => console.log(r.status, r.url.slice(0, 80)));
```

查特定响应以理解 schema：

```js
const resp = state.responses.find((r) => r.url.includes("users"));
console.log(JSON.stringify(resp.body, null, 2).slice(0, 2000));
```

直接重放 API（适于分页）：

```js
const { url, headers } = state.requests.find((r) => r.url.includes("feed"));
const data = await page.evaluate(
  async ({ url, headers }) => {
    const res = await fetch(url, { headers });
    return res.json();
  },
  { url, headers },
);
console.log(data);
```

完成后清理监听器：`page.removeAllListeners('request'); page.removeAllListeners('response');`

## 功能概览

playwriter 可为之事：

- 用户复现 bug 时监控控制台日志
- 拦截网络请求以逆向 API 并构建 SDK
- 以重放分页 API 调用抓取数据，替代滚动 DOM
- 取无障碍快照定位元素，而后自动化交互
- 以可视截图理解复杂布局（图片网格、仪表盘、地图）
- 采集日志与控制页面并行以排障
- 处理弹出窗口、下载、iframe 与对话框

## 最简示例

```bash
playwriter session new
playwriter -s 1 -e "await page.goto('https://example.com')"
```
