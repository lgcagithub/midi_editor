---
name: merengue-design
description: "This skill should be used when the user explicitly says 'Merengue style', 'Merengue design', '/merengue-design', or directly asks to use/apply the Merengue design system. NEVER trigger automatically for generic UI or design tasks."
version: 1.0.0
allowed-tools: [Read, Write, Edit, Glob, Grep]
---

# Merengue

You are a senior product designer. When this skill is active, every UI decision follows this design language.

**Before starting any design work, declare which fonts are required and how to load them** (see `references/platform-mapping.md`). Never assume fonts are already available.

---

## 1. DESIGN PHILOSOPHY

一间洒满暖光的创意音乐工作室。Merengue 是为创意工具而生的设计语言——它拒绝冰冷的功能主义，拥抱温暖、顽皮与艺术表达。

**设计血统：** 糖果色插画 × 温暖深色 UI × 弹性动画。灵感来自独立音乐人卧室里的暖光灯、水果糖的缤纷色彩、水彩颜料的自然晕染。

**核心张力：** 童趣的艺术表达 vs. 音乐工具的精密性。界面应该让你想"玩"音乐，而不是填写电子表格。圆润的形状和弹性动效负责"可爱"；暖色深底和精准的网格系统负责"可靠"。

**设计原则：**

1. **暖色深底是画布。** 纯黑太冷，暖灰才有温度。`#1A1819`——像夜晚工作室里那盏暖灯下的桌面。
2. **珊瑚是心跳。** `#FF5C72` 是界面的脉搏——它只出现在最重要的交互节点上。克制使用，每次出现都有意义。
3. **圆润，但不臃肿。** 圆角让界面柔软可亲（12px 组件 / 999px 标签），但间距和留白保持紧凑克制。可爱不等于松散。
4. **动效传递性格。** 弹簧缓动（spring easing）让每次点击都有微小的弹跳反馈。界面有"生命感"而不打扰工作流。
5. **色彩是音符的语言。** 钢琴卷帘上的每个音符都用精心挑选的糖果色编码——不仅是视觉愉悦，更是信息层次。
6. **字体说两种语言。** Fredoka 说"友好与创意"（标题/品牌），Nunito Sans 说"清晰与可靠"（正文/UI），JetBrains Mono 说"精确与技术"（tick/时间码/数值）。
7. **留白是呼吸。** 工具型界面容易拥挤。8px 网格提供一致的呼吸节奏，让密集的编辑区域也有喘息空间。

---

## 2. CRAFT RULES — HOW TO COMPOSE

### 视觉层次

| 层级 | 元素 | 字体 | 颜色 | 用途 |
|------|------|------|------|------|
| **L1 — 主导** | Hero 标题、品牌 | `--display` (Fredoka 36px) | `--text1` | 页面唯一焦点 |
| **L2 — 导航** | 区域标题、工具栏标签 | `--h2` (Nunito Sans 22px/600) | `--text1` | 界面分区 |
| **L3 — 内容** | 卡片标题、音轨名 | `--h3` (Nunito Sans 18px/600) | `--text1` | 内容块头部 |
| **L4 — 正文** | 描述、标签、数值 | `--body` (Nunito Sans 14px) | `--text2` | 主要内容 |
| **L5 — 辅助** | 时间戳、热键提示 | `--caption` (Nunito Sans 11px) | `--text3` | 补充信息 |
| **L6 — 技术** | tick 数、时间码 | `--font-mono` (JetBrains Mono 12px) | `--text2` | 精确数值 |

### 字体纪律

- 每个屏幕最多 3 个字重（400 / 600 / 700）。
- Fredoka 仅用于 Display 和 H1——不在正文中出现。
- JetBrains Mono 用于代码块、tick 数值、时间码、速度值、文件路径——所有精确技术数据。
- 标题永远用 `--text1`，不用 `--accent` 抢注意力。

### 间距语义

| Token | 使用场景 |
|-------|---------|
| `--space-xs` (4px) | 图标与标签间距、tight padding |
| `--space-sm` (8px) | 组件内部 padding、按钮内边距 |
| `--space-md` (16px) | 标准 padding、元素间隙 |
| `--space-lg` (24px) | 卡片 padding、区域内部间距 |
| `--space-xl` (32px) | 区域分隔、面板间距 |
| `--space-2xl` (48px) | 主要区域断点 |
| `--space-3xl` (64px) | 页面区块分隔 |

### 色彩策略

- 每屏最多 2 个色相（珊瑚强调色 + 一个语义色）。
- 暖灰中性色是主角——珊瑚只是点缀，不是主菜。
- 状态色（success/warning/error）只用于其语义，不用于装饰。
- 暗模式下，强调色从 `brand.500` 提亮到 `brand.400`，补偿深色底上的视觉衰减。
- 音符使用 8 色调色板（独立于语义色），每个音轨一个色彩主题。

### 构图方法

- **Squint Test:** 眯眼看界面。最亮/最饱和的区域应该是最重要的交互元素。如果装饰元素先于功能元素被注意，重新调整。
- **工具栏在上，内容在中，走带在下。** 经典 DAW 布局，用户肌肉记忆。
- **键盘左，画布雷，音轨右。** 信息从左到右：音高 → 时间 → 组织。

---

## 3. ANTI-PATTERNS — WHAT TO NEVER DO

1. **No 纯黑背景 (`#000`).** 用暖灰 `#1A1819`。纯黑是冰冷的地下室，暖灰才是亮着灯的工作室。
2. **No 锐利直角 (0px radius).** 最低 4px。直角在这个设计语言里是 bug，不是 feature。
3. **No 超过 2 个色相同时出现。** 珊瑚 + 一个语义色，够了。彩虹界面分散注意力。
4. **No 阴影叠加阴影。** 单层阴影（elevation 1-3），不用多层混合。保持清晰的海拔层级。
5. **No 纯白色文字 (`#FFF`) 在大面积深色底上。** 用 `#FAF9F8`（warm white）降低对比度，减少视觉疲劳。
6. **No 线性动画（linear / ease-in-out）. ** Merengue 用 spring easing。线性动效让界面感觉像机器人，不像是音乐工具。
7. **No 超过 600px 宽的正文行。** 超出则分行，保持舒适阅读。
8. **No 边框 + 阴影同时用于层级区分。** 用其一即可。偏好：卡片用阴影，输入框用边框。
9. **No Fredoka 在正文中出现。** Fredoka 是展示字体，不做正文。正文只有 Nunito Sans。
10. **No 图标用 outline 样式。** 用 Phosphor Duotone 双色调——单色轮廓线在这个设计语言里太冷漠。
11. **No 透明度 < 0.4 的文字。** 低于此阈值影响可访问性。disabled 状态用 opacity 0.4 整体处理，不要单独调文字透明度。
12. **No 超过 3 级字重叠加。** 即使是标题+正文+辅助三层，也不要用 4 种以上字重变化来建立层次。

---

## 4. WORKFLOW

1. **Declare fonts** — 检查 `references/platform-mapping.md` 获取 Google Fonts 加载链接
2. **Set tokens** — 从 `references/tokens.md` 应用 CSS 变量
3. **Build components** — 使用 `references/components.md` 中的规格
4. **Check hierarchy** — squint test：能一眼看出最重要的东西吗？
5. **Verify both modes** — light 和 dark 都必须感觉是"有意设计的"，而非简单反色
6. **Test extremes** — 长文本、空状态、单个音符、1000 个音符
7. **Platform-adapt** — 参考 `references/platform-mapping.md` 适配目标平台

---

## 5. REFERENCE FILES

| File | Contains |
|------|----------|
| `references/tokens.md` | 字体、排版层级、色彩系统 (light + dark)、间距、圆角、海拔、动效、图标 |
| `references/components.md` | 卡片、按钮、输入框、列表、导航、标签、覆盖层、状态模式 |
| `references/platform-mapping.md` | HTML/CSS、React/Tailwind — 平台特定代码和加载说明 |
