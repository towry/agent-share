---
name: design-kit
description: |
  用：设计风格与对稿工作流之参考集——含 monochrome / blueprint editorial / Material Design / paper UI 之设计语言、MasterGo 设计稿对稿实装防 layout drift。用户言 monochrome、terminal 风格、blueprint、technical paper 风格、Material Design、paper 风格、博客排版、阅读页设计，或给 MasterGo URL、抱怨"还是不一样"、对稿截图复核时触发。

  不用：固化项目视觉规范为 DESIGN.md (走 design-md)、纯视觉审图 (走 ui-visual-critique)、UI 交互合规 (走 ux-interaction-audit)。
---

# design-kit

## 用法

本 skill 为设计参考集，不直接给方案，而是导向具体 reference 文件。

1. **先览目录**：

   ```bash
   run-skill-script design-kit list
   ```

   输出按 `[styles]` / `[workflows]` 分类，附一句话说明，便于辨该载何份。

2. **再载具体 reference**：以 Read 工具读 `references/<category>/<name>.md` 全文，依其规约动手。

## 目录结构

```
design-kit/
├── references/
│   ├── styles/                       # 风格语言：色板、字型、组件、token
│   │   ├── monochrome.md             # 单色/终端美学；高对比、克制 chrome
│   │   ├── blueprint-editorial.md     # 技术论文 + 工程草图；灰阶层次、线稿图解、soft product panels
│   │   ├── google-material-design.md # Material Design 3；elevation、HCT 动态色、自适应
│   │   └── paper-ui-style.md         # Paper UI；阅读优先、暖白纸感、居中窄栏、衬线正文
│   └── workflows/                    # 设计流程规约
│       └── mastergo-parity.md        # MasterGo 设计稿对稿实装；先树后码
```

## 与其他 skill 之分际

- **design-md**：欲将视觉身份固化为项目根之 `DESIGN.md` (YAML token + 八节正文)，并经 `npx @google/design.md lint` 校验，走 design-md。本 skill 仅给风格语言，非 DESIGN.md 写作工具链。
- **ui-visual-critique**：仅据截图作首眼视觉诊断，不开方。
- **ux-interaction-audit**：诊代码层 UX 合规（键盘、滚动、手势等），亦不开方。
- **mcp__vision__ui_to_artifact**：UI 截图转代码或 prompt。

## 触发判据

凡用户言及下列任一者，先 `list` 再载相应 reference：

- 风格关键词：`monochrome` / `terminal 风格` / `极简单色` / `blueprint` / `technical paper` / `工程草图` / `Material Design` / `Material 风格` / `paper UI` / `阅读风格` / `博客排版`
- 对稿场景：给 MasterGo URL、抱怨「还是不一样 / 差别很大 / looks wrong」、对截图求复核
- 含糊「设计风格」「视觉风格」相关问，先 `list` 让用户选

## 扩展

新增 reference 时：

1. 置于 `references/styles/` 或 `references/workflows/` 下，文件名 kebab-case。
2. 同步更新 `scripts/list.sh` 之 `STYLES` / `WORKFLOWS` 数组，加入名与一句话描述。
3. 若新增类别，于 `list.sh` 添新分组并更新本 SKILL.md 之「目录结构」。
