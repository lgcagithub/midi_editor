# Merengue — Tokens

## 0. PRIMITIVES

Raw scales derived from the brand. These are the building blocks — semantic tokens reference them.

### Color Ramps

**Neutral** (warm-tinted ~2%)

| Step | Hex | Use |
|------|-----|-----|
| 50 | `#FAF9F8` | Lightest background |
| 100 | `#F5F2F0` | Light surfaces |
| 200 | `#E8E3DF` | Borders, dividers (light) |
| 300 | `#D4CDC7` | Strong borders (light) |
| 400 | `#A89D96` | Placeholder text |
| 500 | `#7A706A` | Muted text |
| 600 | `#5C5450` | Secondary text |
| 700 | `#423B38` | Strong borders (dark) |
| 800 | `#2E2927` | Dark surfaces |
| 900 | `#242223` | Darkest surface |
| 950 | `#1A1819` | Near-black background |

**Brand** (Coral Pink — coral)

| Step | Hex |
|------|-----|
| 50 | `#FFF0F2` |
| 100 | `#FFE0E4` |
| 200 | `#FFC2CA` |
| 300 | `#FF8A98` |
| 400 | `#FF6E82` |
| 500 | `#FF5C72` — primary accent |
| 600 | `#E54D62` |
| 700 | `#C03950` |
| 800 | `#962A3D` |
| 900 | `#6B1A2A` |
| 950 | `#3D0D17` |

**Status Colors**

| Color | 50 (bg tint) | 500 (foreground) | 900 (dark tint) |
|-------|-------------|-----------------|-----------------|
| Red | `#FEF2F2` | `#E5484D` | `#7F1D1D` |
| Green | `#F0FDF6` | `#4BC0A0` | `#134E3E` |
| Amber | `#FFFBF0` | `#F4A742` | `#78471A` |

### Spacing Primitives

`[0, 1, 2, 4, 6, 8, 12, 16, 20, 24, 32, 40, 48, 64, 96]`

### Radii Primitives

`[0, 4, 8, 12, 16, 24, 999]`

---

## 1. TYPOGRAPHY

### Font Stack

| Role | Font | Fallback | Weight | Use |
|------|------|----------|--------|-----|
| **Display** | `"Fredoka"` | `"Segoe UI", "Noto Sans SC", sans-serif` | 500 | Screen titles, hero numbers |
| **Body / UI** | `"Nunito Sans"` | `"Segoe UI", "Noto Sans SC", sans-serif` | 400, 600, 700 | Body text, descriptions, UI labels |
| **Mono / Code** | `"JetBrains Mono"` | `"Consolas", "Courier New", monospace` | 400 | Code snippets, tick values, timecodes |

### Mono Font Rules

**`mono_for_code`: true** · **`mono_for_metrics`: true**

MIDI 编辑器中充满了技术数值——tick 数、时间码、音符力度、PPQ 参数。等宽字体确保这些数值在界面中对齐清晰，与音乐制作工具的精密性一致。

- **`mono_for_code: true`:** 代码块、文件路径、API 端点使用等宽字体。
- **`mono_for_metrics: true`:** tick 数、时间码 (MM:SS.cs)、velocity 值 (0-127)、PPQ、BPM、文件大小使用等宽字体。

**字体选用理由：**
- **Fredoka** 圆润的几何造型像气泡一样轻盈，传递"可爱"与"创意"的第一印象。500 weight 刚好够稳，不飘。
- **Nunito Sans** 是圆体无衬线中可读性最好的选择之一。圆润但不幼稚，正文阅读流畅。
- **JetBrains Mono** 专为代码阅读优化，连字特性让 `=>` `<=` `!=` 更有辨识度，适合技术界面。

### Type Scale

| Token | Size | Line Height | Letter Spacing | Weight | Use |
|-------|------|-------------|----------------|--------|-----|
| `--display` | 36px | 1.15 | -0.01em | 500 | Hero numbers, screen titles |
| `--h1` | 28px | 1.2 | -0.005em | 500 | Page headings |
| `--h2` | 22px | 1.25 | 0 | 600 | Section headings |
| `--h3` | 18px | 1.3 | 0 | 600 | Subsection titles, card titles |
| `--body` | 14px | 1.5 | 0 | 400 | Body text, descriptions |
| `--body-sm` | 12px | 1.5 | 0 | 400 | Secondary text, notes |
| `--caption` | 11px | 1.4 | 0.01em | 400 | Timestamps, footnotes |
| `--label` | 10px | 1.3 | 0.03em | 700 | Micro-labels, metadata |

### Typographic Rules

- Fredoka 仅用于 Display (`--display`) 和 H1 (`--h1`)，绝不出现在正文或 UI 标签中。
- 正文行宽不超过 600px。超出则使用 max-width 约束。
- 标题使用 `--text1`，永远不用 `--accent` 为标题着色——珊瑚色是交互信号，不是装饰。
- `--font-mono` 用于所有数值显示：tick 数、时间码、velocity、BPM、PPQ。

---

## 2. COLOR SYSTEM (Semantic Tokens)

Semantic tokens reference the primitives above. Components use semantic tokens, never primitives directly.

### Primary Mode (Dark — warm studio)

| Token | Primitive | Hex | Role |
|-------|-----------|-----|------|
| `--background` | `neutral.950` | `#1A1819` | Page background |
| `--bg` | — | `var(--background)` | Shorthand alias for `--background` |
| `--surface1` | `neutral.900` | `#242223` | Cards, elevated containers |
| `--surface2` | `neutral.800` | `#2E2927` | Secondary cards, grouped backgrounds |
| `--surface3` | `neutral.700` | `#423B38` | Tertiary surfaces, inset areas |
| `--border` | `neutral.800` | `#2E2927` | Subtle dividers, card edges |
| `--border-visible` | `neutral.700` | `#423B38` | Stronger borders — inputs, active controls |
| `--text1` | `neutral.50` | `#FAF9F8` | Primary text — headings, body |
| `--text2` | `neutral.400` | `#A89D96` | Secondary text — descriptions, labels |
| `--text3` | `neutral.500` | `#7A706A` | Tertiary text — placeholders, timestamps |
| `--text4` | `neutral.600` | `#5C5450` | Disabled text, ghost elements |
| `--accent` | `brand.400` | `#FF6E82` | Primary accent — interactive elements, CTAs |
| `--accent-subtle` | `brand.950` | `#3D0D17` | Tinted backgrounds for accent |
| `--success` | `green.500` | `#4BC0A0` | Confirmed, completed, positive |
| `--warning` | `amber.500` | `#F4A742` | Caution, pending, approaching limit |
| `--error` | `red.500` | `#E5484D` | Destructive, overdue, critical |

### Secondary Mode (Light — warm paper)

| Token | Primitive | Hex | Role |
|-------|-----------|-----|------|
| `--background` | `neutral.50` | `#FAF9F8` | Page background |
| `--surface1` | `neutral.100` | `#F5F2F0` | Cards, elevated containers |
| `--surface2` | `neutral.200` | `#E8E3DF` | Secondary cards, grouped backgrounds |
| `--surface3` | `neutral.300` | `#D4CDC7` | Tertiary surfaces, inset areas |
| `--border` | `neutral.200` | `#E8E3DF` | Subtle dividers, card edges |
| `--border-visible` | `neutral.300` | `#D4CDC7` | Stronger borders — inputs, active controls |
| `--text1` | `neutral.900` | `#242223` | Primary text |
| `--text2` | `neutral.600` | `#5C5450` | Secondary text |
| `--text3` | `neutral.500` | `#7A706A` | Tertiary text |
| `--text4` | `neutral.400` | `#A89D96` | Disabled text |
| `--accent` | `brand.500` | `#FF5C72` | Primary accent |
| `--accent-subtle` | `brand.50` | `#FFF0F2` | Tinted backgrounds for accent |
| `--success` | `green.500` | `#4BC0A0` | Positive states |
| `--warning` | `amber.500` | `#F4A742` | Caution states |
| `--error` | `red.500` | `#E5484D` | Negative states |

### Accent & Status Tints

| Token | Primary (dark) | Secondary (light) | Usage |
|-------|---------|-----------|-------|
| `--accent-subtle` | `#3D0D17` | `#FFF0F2` | Tinted backgrounds for accent elements |
| `--success-bg` | `#0F2E28` | `#F0FDF6` | Success tinted backgrounds |
| `--warning-bg` | `#2E2412` | `#FFFBF0` | Warning tinted backgrounds |
| `--error-bg` | `#2E1515` | `#FEF2F2` | Error tinted backgrounds |

### Color Usage Rules

- 每屏最多 2 个色相同时出现：珊瑚强调色 + 一个语义色。
- `--accent` 是交互信号——按钮、链接、选中态、焦点环。绝不用作装饰色、标题色或背景色。
- 暗模式下 `--accent` 使用 `brand.400`（比 light 模式的 `brand.500` 更亮），补偿深色底上的视觉衰减。
- 音符颜色使用独立的 8 色调色板（见 `components.md`），不在语义 token 范围内。
- 暖灰是界面的主角——珊瑚只是点睛之笔。

---

## 3. SPACING

### Scale (8px base)

| Token | Value | Use |
|-------|-------|-----|
| `--space-2xs` | 2px | 光学微调——图标与文本对齐 |
| `--space-xs` | 4px | 图标与标签间距、tight padding |
| `--space-sm` | 8px | 组件内部 padding、元素间小间隙 |
| `--space-md` | 16px | 标准 padding、卡片内容间距 |
| `--space-lg` | 24px | 卡片 padding、区域内部间距 |
| `--space-xl` | 32px | 区域分隔、面板间距 |
| `--space-2xl` | 48px | 主要区域断点 |
| `--space-3xl` | 64px | 页面区块分隔 |
| `--space-4xl` | 96px | Hero 呼吸空间 |

---

## 4. BORDERS & RADII

### Radii Scale (Semantic → Primitive)

| Token | Value | Primitive | Use |
|-------|-------|-----------|-----|
| `--radius-element` | 4px | `radii[1]` | Small controls, checkboxes, icons |
| `--radius-control` | 8px | `radii[2]` | Buttons, inputs, toggles |
| `--radius-component` | 12px | `radii[3]` | Cards, panels, list items |
| `--radius-container` | 16px | `radii[4]` | Modals, sheets, popovers |
| `--radius-pill` | 999px | `radii[6]` | Pills, tags, chips |

### Border Treatment

| Element | Border |
|---------|--------|
| Cards / Surfaces | `1px solid var(--border)` + shadow (不要同时用 visible border + shadow) |
| Buttons | Primary/Ghost 无边框；Secondary `1px solid var(--border)` |
| Inputs | `1px solid var(--border-visible)` default → `1px solid var(--accent)` focus |
| Tags / Chips | 无边框，纯背景色填充 |
| Modals / Sheets | `1px solid var(--border)` |

**圆角哲学：** 软但不圆——组件层面圆角上限 16px，留有结构感；标签/芯片用 pill (999px) 增加可爱度。所有圆角使用 `px` 单位（非 `%` / `rem`），确保在所有元素尺寸下保持一致。

---

## 5. ELEVATION & SHADOWS

| Level | Light Mode | Dark Mode | Use |
|-------|-----------|----------|-----|
| **0** | None | None | Flat, inline elements |
| **1** | `0 1px 2px rgba(0,0,0,0.04), 0 1px 3px rgba(0,0,0,0.06)` | `0 1px 2px rgba(0,0,0,0.20), 0 1px 4px rgba(0,0,0,0.30)` | Standard cards, containers |
| **2** | `0 2px 8px rgba(0,0,0,0.06), 0 4px 16px rgba(0,0,0,0.04)` | `0 2px 8px rgba(0,0,0,0.30), 0 4px 16px rgba(0,0,0,0.20)` | Floating cards, menus, popovers |
| **3** | `0 4px 16px rgba(0,0,0,0.08), 0 8px 32px rgba(0,0,0,0.04)` | `0 4px 16px rgba(0,0,0,0.40), 0 8px 32px rgba(0,0,0,0.30)` | Modals, sheets, dialogs |

**海拔策略：** Subtle。阴影用于区分层级，但不喧宾夺主。暗模式下阴影更重（因为深色底上需要更强的对比度来感知深度）。卡片 = 阴影区分，输入框 = 边框区分——不同时使用两者。

---

## 6. MOTION & INTERACTION

### Personality

**Playful spring。** 界面元素有弹性、有生命感。不是游戏级别的弹跳，而是微妙的"活着"的感觉——按钮按下有轻微回弹，面板展开有柔和的 overshoot。

### Timing

| Type | Duration | Easing | Use |
|------|----------|--------|-----|
| **Micro** | 150ms | `cubic-bezier(0.34, 1.56, 0.64, 1)` | Button press, toggle, color change |
| **Standard** | 250ms | `cubic-bezier(0.34, 1.3, 0.64, 1)` | Card expand, content transitions |
| **Emphasis** | 400ms | `cubic-bezier(0.32, 1.2, 0.64, 1)` | Sheet present, navigation, page transitions |

### Interaction States

- **Hover:** 微妙的背景色变化（`neutral.800` → `neutral.700`），在暗模式下尤其微妙。
- **Press/Active:** `transform: scale(0.97)` + 更深的背景色。缩放反馈传递"按下"的触感。
- **Focus:** `box-shadow: 0 0 0 3px var(--accent-subtle)`——柔和但清晰可见。
- **Disabled:** `opacity: 0.4; cursor: not-allowed;` 无 hover/focus 效果。
- **Loading:** 柔和的骨架屏 shimmer 动画，不跳跃。

---

## 7. ICONOGRAPHY

> **Disclosure.** 预览中渲染的图标来自 Phosphor 图标库（MIT 许可），作为设计语言的最佳匹配。如需真实品牌图标，可替换为自定义资产。

### Observed style (设计方向)

| Attribute | Value |
|-----------|-------|
| Description | 温暖人文风格的双色调图标，圆润端点，友好可亲。适合创意工具和消费级产品。 |
| Stroke weight | regular (~1.5px) |
| Corner treatment | soft |
| Fill style | duotone (双色叠加) |
| Form language | humanist |
| Visual density | balanced |

### Fallback kit (预览实际渲染)

- **Kit:** Phosphor
- **Weight / variant:** Duotone
- **Match score:** high
- **Why this kit:** Phosphor duotone 的双色调设计和温暖人文风格完美匹配"可爱+艺术气息"的视觉方向。双色叠加让图标更有插画感和趣味性。Iconoir 是第二选择但缺乏 duotone 变体。
- **CDN:** `https://unpkg.com/@phosphor-icons/web@2/src/duotone/style.css`
- **Usage:** `<i class="ph-duotone ph-heart"></i>`

### Sizes

| Context | Size |
|---------|------|
| Inline with body text | 16px |
| Buttons | 18px |
| Navigation | 20px |

### Color rule

图标使用当前文本颜色 `currentColor`，Phosphor duotone 的第二色通过 `opacity: 0.4` 自动处理。Duotone 的填充色默认使用 `--text2`。

### Don't

- 不要在同一界面混合 Phosphor 不同 weight（统一用 duotone）。
- 不要用 `--accent` 给所有图标着色——图标用文本色，强调图标才用 accent。
- 不要声称这些是品牌真实图标——它们是最佳匹配降级方案。
