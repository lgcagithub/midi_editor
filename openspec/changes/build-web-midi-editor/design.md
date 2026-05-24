## Context

全新项目，从零开始构建一个运行在浏览器中的 MIDI Piano Roll 编辑器。用户为 Web 开发初学者，该项目兼具学习目的（学习 OpenSpec + Superpowers 工作流来驾驭 AI 开发）和实用目的（自己使用，并可能推荐给朋友同事）。

浏览器提供所需的所有底层能力：Canvas 2D 用于高性能 2D 渲染、Web Audio API 用于音频合成与调度、File API 用于文件读写。

## Goals / Non-Goals

**Goals:**
- 在浏览器中实现 MIDI 文件的加载、播放、编辑、保存完整闭环
- Piano Roll 编辑体验流畅：60fps 播放光标、Canvas 分层渲染、虚拟视口
- 支持横向和纵向两种键盘/音符布局，适配不同屏幕设备
- 音频播放精确，无明显延迟或抖动
- 代码结构清晰、可扩展，后续可接入更高质量的音源

**Non-Goals:**
- 不涉及 VST/AU 插件
- 不涉及实时 MIDI 输入设备连接（Web MIDI API），但保留扩展空间
- 不做多用户协作
- 不做自动化/脚本化（如批量处理 CLI）
- 不做音频波形编辑（这是 DAW 的另一个维度，MIDI 编辑器聚焦乐器数字接口层面）

## Decisions

### 1. 技术栈

| 层面 | 选择 | 理由 |
|------|------|------|
| 语言 | TypeScript | MIDI 领域数据结构复杂，类型系统防止大量边界错误 |
| UI 框架 | React 18 | 主流生态、学习资源丰富；仅用于 UI 外壳（工具栏、侧栏、走带），不参与 Canvas 渲染 |
| 构建工具 | Vite | 快速 HMR、零配置接近、TypeScript 原生支持 |
| 状态管理 | Zustand | 比 Redux 轻量很多、API 简洁、TypeScript 友好、无 boilerplate |
| Canvas 渲染 | 原生 Canvas 2D API | 完全控制渲染管线，不引入封装库 |
| MIDI 解析 | 自研 SMF 解析器 | MIDI 文件格式核心逻辑不复杂，自研便于深度理解领域和控制行为 |
| 测试 | Vitest | 与 Vite 共享配置、速度快 |
| 代码规范 | 无需 ESLint/Prettier 配置 | 不写 Lint 配置，把精力放在功能实现上 |

**备选方案考虑：**
- **Svelte vs React**：Svelte 更简洁，但 React 生态和社区更大，用户日后接触 React 的可能性更高，学习收益更大
- **tone.js 等音频库**：提供了更高级的调度和音源能力，但会隐藏 Web Audio API 的核心概念，不利于理解播放引擎的底层原理
- **midi-file / @tonejs/midi**：成熟稳定，但本项目目标是学习，且 SMF 格式本身不复杂，自研可控

### 2. Canvas 分层架构

采用 4 层堆叠 `<canvas>` 元素（CSS `position: absolute` 叠加），各层独立绘制：

```
z-index  层名称         重绘频率          内容
─────────────────────────────────────────────────
  0      背景网格层      仅缩放/滚动时      小节线、拍线、细分网格线、行底色
  1      音符层          编辑操作时         所有音符矩形条
  2      光标层          ~60fps (rAF)      播放位置竖线/横线
  3      交互层          鼠标/触摸事件时    正在绘制的音符预览、选择框、拖拽手柄
```

每层对应的 Canvas 元素各自独立，重绘时互不干扰。交互层的元素通常在 mouseup 后消失并反映到音符层。

### 3. 数据模型设计

```typescript
// 核心类型
interface Note {
  id: string;
  pitch: number;      // 0-127, MIDI 音高
  startTick: number;  // 起始位置 (tick)
  duration: number;   // 时长 (tick)
  velocity: number;   // 0-127, 力度
}

interface TempoEvent {
  tick: number;       // 从哪个 tick 开始生效
  bpm: number;        // 每分钟拍数
}

interface TimeSigEvent {
  tick: number;
  numerator: number;
  denominator: number;
}

interface Track {
  id: string;
  name: string;
  instrument: number; // MIDI program number (0-127)
  color: string;
  notes: Note[];
}

interface Project {
  ppq: number;              // ticks per quarter note (通常 480)
  tracks: Track[];
  tempoMap: TempoEvent[];
  timeSigs: TimeSigEvent[];
}
```

时间转换的关键函数签名：

```typescript
function tickToSeconds(tick: number, tempoMap: TempoEvent[], ppq: number): number;
function secondsToTick(seconds: number, tempoMap: TempoEvent[], ppq: number, startTick: number): number;
```

### 4. 状态管理架构

Zustand store 分为三个切片（slice），通过组合构成完整 store：

```
┌─────────────┐  ┌──────────────┐  ┌──────────────┐
│ projectSlice │  │transportSlice │  │  editorSlice  │
│             │  │               │  │               │
│ - tracks    │  │ - state       │  │ - tool        │
│ - tempoMap  │  │ - currentTick │  │ - selection   │
│ - timeSigs  │  │ - startTime   │  │ - zoom/scroll │
│ - ppq       │  │ - startTick   │  │ - orientation │
└─────────────┘  └──────────────┘  └──────────────┘
        │                │                  │
        └────────────────┼──────────────────┘
                         │
                  ┌──────▼──────┐
                  │  useStore   │
                  └─────────────┘
```

- `projectSlice`：项目数据，对应 `Project` 类型
- `transportSlice`：播放状态，纯运行时状态
- `editorSlice`：编辑器 UI 状态（当前工具、选中音符集合、视口缩放/偏移、横/纵布局方向）

### 5. 音频架构

```
┌──────────────────────────────────┐
│          Transport               │
│  state, currentTick, startTime   │
└──────────────┬───────────────────┘
               │
┌──────────────▼───────────────────┐
│       Look-Ahead Scheduler       │
│  每 ~25ms 运行一次               │
│  窗口: [lastSchedTime, now+100ms]│
└──────────────┬───────────────────┘
               │
┌──────────────▼───────────────────┐
│        SoundSource (接口)        │
│  noteOn(pitch, vel, when)       │
│  noteOff(pitch, when)           │
│  setInstrument(program)         │
└──────────────┬───────────────────┘
               │
     ┌─────────┴─────────┐
     ▼                   ▼
┌─────────┐        ┌──────────┐
│OscBank  │        │SoundFont  │  ← 以后扩展
│(初期)   │        │Source     │
└─────────┘        └──────────┘
```

调度循环使用 `setInterval`（25ms），在 AudioContext `currentTime` 的基础上提前 100ms 安排事件。播放光标使用独立的 `requestAnimationFrame` 循环，直接从 `currentTime` 推算 tick，与调度循环解耦。

### 6. 命令模式（撤销/重做）

```
                    ┌─────────┐
                    │ Command │
                    ├─────────┤
                    │execute()│
                    │ undo()  │
                    └────┬────┘
           ┌─────────────┼─────────────┐
           ▼             ▼             ▼
   AddNoteCommand  MoveNotesCommand  DeleteNotesCommand
   (单个)          (批量 old/new)    (批量，存被删列表)
```

拖拽操作的命令聚合：mousedown 时记录起始状态，mousemove 期间实时更新 UI 预览（不产生命令），mouseup 时创建一条命令存入栈。

### 7. 目录结构

```
src/
  types.ts                 - 全局类型定义 (Note, Track, Project, TempoEvent, ...)
  constants.ts             - 常量 (PPQ 默认值, 音域范围, 默认 tempo, ...)
  model/
    time-convert.ts        - tick ↔ seconds 转换 (含 tempo map 遍历)
    project.ts             - Project 创建、查询辅助
  engine/
    transport.ts           - Transport 状态机 (play/pause/stop)
    scheduler.ts           - Look-ahead 调度循环
  audio/
    sound-source.ts        - SoundSource 接口定义
    oscillator-bank.ts     - 初期实现: 振荡器组
  renderer/
    piano-roll.ts          - Piano Roll 主画布 (背景网格层 + 音符层)
    keyboard.ts            - 钢琴键盘 (独立 canvas, 横/纵向)
    cursor.ts              - 播放光标 (独立 canvas, rAF 驱动)
    interaction-layer.ts   - 交互层 (独立 canvas, 预览/选择框)
    grid.ts                - 网格绘制辅助
  interaction/
    tools.ts               - 工具模式定义 (Pointer, Pencil, Eraser)
    pointer.ts             - 指针工具: 选中/拖拽/拉伸
    pencil.ts              - 画笔工具: 添加音符
    eraser.ts              - 橡皮工具: 删除音符
    rubber-band.ts         - 框选
    hit-test.ts            - 命中检测 (音符、边缘、键盘)
  io/
    midi-parser.ts         - SMF → Project
    midi-serializer.ts     - Project → SMF
  state/
    store.ts               - Zustand store (组合三个 slice)
    project-slice.ts       - 项目数据切片
    transport-slice.ts     - 播放状态切片
    editor-slice.ts        - 编辑器 UI 状态切片
  commands/
    types.ts               - Command 接口
    add-note.ts
    delete-notes.ts
    move-notes.ts
    resize-note.ts
    undo-manager.ts        - UndoManager 类
  components/
    App.tsx                - 根组件，布局编排
    Toolbar.tsx            - 工具栏
    PianoRollView.tsx      - Piano Roll 画布区域 (管理 4 层 canvas)
    KeyboardView.tsx       - 键盘
    TransportBar.tsx       - 走带控制 (播放/暂停/停止、时间显示)
    TrackList.tsx          - 音轨列表侧栏
    GridSelector.tsx       - 吸附网格选择器
  utils/
    math.ts                - clamp, midiToHz, snapToGrid 等工具函数
  main.tsx                 - 入口
```

### 8. 横/纵向布局切换

两种布局由 `editorSlice.orientation` 控制（`'vertical'` | `'horizontal'`）：

**纵向（默认，常规 Piano Roll）：**

```
┌───────────┬──────────────────────────────┐
│           │                              │
│  键盘     │    Piano Roll 画布            │
│  (左侧)   │    ○ 时间 →                  │
│           │    ↑ 音高                    │
│  y=音高   │    x=时间                    │
│           │                              │
│           │    ┌──────┐                  │
│           │    │ 音符  │  (横向矩形条)    │
│           │    └──────┘                  │
└───────────┴──────────────────────────────┘
```

**横向：**

```
┌──────────────────────────────────────────┐
│          Piano Roll 画布                  │
│          ○ 时间 ↓                        │
│          → 音高                           │
│          x=音高, y=时间                   │
│                                          │
│          ┌────┐                           │
│          │音符│  (纵向矩形条)              │
│          └────┘                           │
├──────────────────────────────────────────┤
│          键盘 (底部)                      │
│          x=音高                           │
└──────────────────────────────────────────┘
```

- **纵向**：键盘在左侧 (y 轴 = 音高)，Piano Roll 在右侧 (x 轴 = 时间)，音符为横向矩形条
- **横向**：键盘在底部 (x 轴 = 音高)，Piano Roll 在上方 (y 轴 = 时间，时间向下流动)，音符为纵向矩形条

渲染层通过投影函数处理两种布局，数据模型和交互逻辑不变，仅在坐标计算时根据 orientation 交换 x/y 轴和宽高的角色。

### 9. 视觉设计系统 — Merengue

采用 **Merengue** 设计语言，专为创意音乐工具而生。

**字体系统：**

| 角色 | 字体 | 用途 |
|------|------|------|
| 品牌/标题 | Fredoka (500) | `--display`、`--h1` |
| 正文/UI | Nunito Sans (400/600/700) | `--body`、标签、按钮、音轨名 |
| 技术数值 | JetBrains Mono (400) | tick 数、时间码、velocity、BPM、PPQ |

**色彩系统（暗色模式为主题）：**

| Token | 值 | 用途 |
|-------|----|------|
| `--background` | `#1A1819` | 页面背景（暖黑） |
| `--surface1` | `#242223` | 卡片、面板、键盘、音轨侧栏 |
| `--surface2` | `#2E2927` | 次级面板 |
| `--surface3` | `#423B38` | 输入框 |
| `--text1` | `#FAF9F8` | 主文字（暖白） |
| `--text2` | `#A89D96` | 次要文字 |
| `--text3` | `#7A706A` | 辅助文字 |
| `--accent` | `#FF6E82` | 珊瑚强调色 — 仅用于交互信号 |
| `--accent-subtle` | `#3D0D17` | 强调色背景衬底 |

**音符色彩（8 轨色板，独立于语义色）：**

| 索引 | 0 (Coral) | 1 (Tangerine) | 2 (Sky) | 3 (Lavender) | 4 (Mint) | 5 (Peach) | 6 (Lemon) | 7 (Lilac) |
|------|-----------|---------------|---------|--------------|----------|-----------|-----------|------------|
| 值 | `#FF5C72` | `#FFB347` | `#7EC8E3` | `#C3A6F4` | `#4BC0A0` | `#FF8A80` | `#FFE566` | `#D4A5F6` |

**音符矩形块渲染规格：**

| 属性 | 值 |
|------|----|
| 圆角 | 3px |
| 边框 | `1px solid rgba(0,0,0,0.15)` 顶边+侧边；顶部高光线 `1px solid rgba(255,255,255,0.2)` |
| 选中态 | `box-shadow: 0 0 0 2px var(--accent)` + 内高光 `inset 0 0 0 1px rgba(255,255,255,0.3)` |
| 拖拽态阴影 | `0 4px 12px rgba(0,0,0,0.3)` |
| 力度映射 | 透明度 0.55 — 1.0 对应 velocity 1 — 127 |
| 最小可见宽度 | 3px（更窄降级为 1px 细线） |
| 行高 | `noteHeight = whiteKeySize × 7 / 12` — 由键盘几何推导，等于 88 键网格的半音间距 |

**网格线颜色：**

| 线型 | 颜色 |
|------|------|
| 小节线 | `--border-visible` |
| 拍线 | `--border` 降透明度 |
| 行底色（白键行） | 奇偶交替 `rgba(36,34,35,0.3)` |
| C 行标记 | `--border-visible` 略加深 |

**播放光标：** 颜色 `--accent`，线宽 1px，附加发光 `box-shadow: 0 0 8px rgba(255,110,130,0.4)` + 顶部三角指示器。

**键盘颜色：**

| 元素 | 样式 |
|------|------|
| 白键 | 渐变 `#3C3835` → `#2E2927`，分割线 `--border`，C 键分割线 `--border-visible` |
| 黑键 | 渐变 `#1A1819` → `#141212`，右侧圆角 4px |

**动效：**

| 类型 | 时长 | 缓动 | 用途 |
|------|------|------|------|
| Micro | 150ms | `cubic-bezier(0.34, 1.56, 0.64, 1)` | 按钮、切换 |
| Standard | 250ms | `cubic-bezier(0.34, 1.3, 0.64, 1)` | 面板展开 |

交互反馈：Hover 细微背景变化、Press `scale(0.97)`、Focus `box-shadow: 0 0 0 3px var(--accent-subtle)`、Disabled `opacity: 0.4`。

**图标：** Phosphor Duotone（MIT 许可）。

**间距（8px 基准）：** `--space-sm` 8px / `--space-md` 16px / `--space-lg` 24px。

**布局约定（纵向，默认）：**

```
┌─────────────────────────────────────────────────────────┐
│                     Title Bar                           │
├─────────────────────────────────────────────────────────┤
│                     Toolbar                             │
├─────────────┬────────────────────────────┬──────────────┤
│   Keyboard  │    Piano Roll Canvas       │ Track Sidebar│
│   (左侧)    │                            │   (右侧)     │
│             │                            │              │
│  与画布同高 │    占据剩余空间              │  与画布同高   │
│             │                            │              │
├─────────────┴────────────────────────────┴──────────────┤
│                  Transport Bar                          │
└─────────────────────────────────────────────────────────┘
```

- Title Bar（可选）→ Toolbar（工具+网格选择）→ 主区域（键盘+画布+音轨三栏等高）→ Transport Bar
- 键盘、画布、音轨侧栏三者高度一致，填满 toolbar 与 transport bar 之间的空间
- 横向布局时键盘移到底部、音轨侧栏按需调整

## Risks / Trade-offs

- **Canvas 2D 性能** → 音符数量达到数千时全量遍历可能掉帧。缓解：虚拟渲染只绘制视口内可见音符；可进一步用空间索引加速
- **`setInterval` 在后台标签页被浏览器降频（1Hz）** → 导致调度循环停止、播放卡住。缓解：恢复前台时 `transport` 基于 `currentTime` 重新同步，一次性安排缺失的事件
- **AudioContext 浏览器自动播放策略限制** → 用户必须先点击交互（播放按钮）触发 `audioCtx.resume()`。缓解：走带栏设计时确保"播放"是显式用户手势
- **振荡器音色体验一般** → 初期用方波/三角波合成，声音不如采样音源好听。缓解：`SoundSource` 接口已为 SoundFont 等采样方案预留扩展点
- **MIDI 文件兼容性** → SMF format 0/1/2 和一些非标准变体可能有解析差异。缓解：初期支持 format 0 和 1（覆盖绝大多数 MIDI 文件），遇到不兼容文件时给出明确错误提示
- **TypeScript + React 学习曲线** → 用户不熟悉 Web 开发，可能对这两者感到吃力。缓解：React 仅用于 UI 外壳，核心逻辑（模型、引擎、渲染、交互）皆为纯 TypeScript，框架依赖最小化
