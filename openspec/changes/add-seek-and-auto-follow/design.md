## Context

`PianoRollOrchestrator` 管理 4 层 Canvas（grid/note/cursor/interaction），负责 rAF 循环、视口状态、缩放滚动、事件分发。播放由 `Transport`（audioCtx 时钟）+ `Scheduler`（调度音符）+ `OscillatorBank`（合成音频）驱动。当前光标渲染在 cursor 层，`currentTick` 由 Scheduler 的 25ms `setInterval` 写入 store。

缺失的部分：标尺 UI、seek 跳转、scrub 拖拽、光标自动跟随。

## Goals / Non-Goals

**Goals:**
- 实现标尺渲染与交互（点击 seek + 拖拽 scrubbing）
- 实现 seek-to-tick 能力（播放中 seek 静音 + 重置调度窗口）
- 实现播放时光标平滑自动跟随，手动滚动后暂停跟随
- `SoundSource` 接口新增 `stopAll(when)`，供 seek/stop 静音
- 提供 `stopBehavior`（reset/keep）和 `endBehavior`（stop/loop）播放选项

**Non-Goals:**
- 横向布局下的标尺（当前仅 vertical orientation）
- 循环播放的精确段定义（loop markers）
- Ruler 高度运行时拖拽调整（仅通过配置/代码调整）

## Decisions

### D1: Ruler 使用独立 Canvas + 独立 Renderer

**选择**：新建 `RulerRenderer` 类（模式同 `KeyboardRenderer`），包含自有 `<canvas>`，由 `RulerView` React 组件持有。标尺 row 通过 CSS flex 布局对齐，不放在 Piano Roll 的 4 层 canvas 内。

**替代方案**：作为第 5 层 Canvas 加入 PianoRollOrchestrator。
- 拒绝理由：(1) 标尺需要 `pointerEvents: auto` 响应点击，而现有 4 层全是 `pointerEvents: none`；(2) 标尺高度固定为 32px，在同一个容器内需要特殊处理顶部偏移；(3) 独立 Renderer 职责更清晰。

**布局结构**：
```
mainStyle (flex row)
├── Col 1 (width: 72px, flexShrink: 0, flex column)
│   ├── Corner Spacer (height: rulerHeight)
│   └── KeyboardView (flex: 1)
├── Col 2 (flex: 1, flex column)
│   ├── RulerView (height: rulerHeight)
│   └── PianoRollView (flex: 1)
└── Col 3: TrackList
```

对齐保证：Col 2 拥有 flex: 1 宽度，Ruler 和 Piano Roll 共享同一宽度和同一 `scrollX`，通过同一 `CoordinateMapper` 计算刻度位置，标尺刻线天然对齐 Piano Roll 网格线。

### D2: Ruler 密度自适应

**选择**：基于当前 zoomX 动态决定显示层级。

| 刻度间距 | 显示内容 |
|----------|---------|
| ≥ 80px | 小节号 + 拍号 + major 线 + minor 线 |
| ≥ 40px | 小节号 + major 线 |
| ≥ 20px | 小节号（偶数跳过）+ major 线 |
| < 20px | 小节号（间隔更大）+ major 线 |

判断逻辑：`pixelsPerBeat = pixelsPerSecond × 60 / bpm`，根据 `pixelsPerBeat` 值决定层级。

### D3: Smooth Auto-Follow 算法

**选择**：每帧计算目标 scrollX，使用缓动插值逼近。

```
anchorRatio = 0.3   // 光标锚定在视口 30% 位置
smoothing    = 0.12  // 每帧移动剩余距离的 12%

targetScrollX = cursorAbsolutePixel - viewportWidth × anchorRatio
scrollX += (targetScrollX - scrollX) × smoothing
scrollX = clamp(scrollX, 0, maxScrollX)
```

**替代方案**：Page-Flip（光标碰到边缘后一次性跳转）。
- 拒绝理由：用户明确偏好 smooth 方案。

**为什么 anchorRatio = 0.3**：光标偏左锚定，给前方留 70% 视野——用户关注"接下来弹什么"多于"刚才弹了什么"，这是 DAW 的标准做法。

**为什么 smoothing = 0.12**：约 0.35 秒达到 90% 收敛（`1 - (1-0.12)^18 ≈ 0.9`，18 帧），快到几乎感觉不到延迟但有平滑的视觉过渡。

### D4: 手动滚动暂停 Auto-Follow

**选择**：用户通过滚轮或中键拖拽手动更改 scrollX 时，设置 `autoFollow = false`。按 Stop 后重新 Play 时自动恢复 `autoFollow = true`。

实现：在 `handleWheel` 和 `handleMouseMove`（中键拖拽分支）中检测 `transportState === 'playing'`，若为 true 则关闭 autoFollow。

### D5: Seek 实现路径

**选择**：在 `playback-manager.ts` 中新增 `seekTo(tick)` 函数，编排以下步骤：

```
seekTo(tick):
  1. oscBank.stopAll(audioCtx.currentTime)    // 立即静音
  2. transport.seekTo(tick)                   // 重置 startTime/startTick
  3. scheduler.resetScheduleWindow()           // lastScheduledTime = audioCtx.currentTime
  4. store.setState({ currentTick: tick })    // 光标立即跳转
```

- `Transport.seekTo(tick)`: 如果 playing，设 `startTime = audioCtx.currentTime, startTick = tick`；如果 paused/stopped，直接设 `currentTick = tick`
- `Scheduler.resetScheduleWindow()`: 设 `lastScheduledTime = audioCtx.currentTime`，确保下一个调度窗口覆盖新位置后的音符

### D6: Stop 行为可配置

**选择**：`transport-slice.ts` 新增 `stopBehavior: 'reset' | 'return'` 字段。

- `reset`（默认）：stop 时 `currentTick = 0`（绝对开头，向后兼容）
- `return`：stop 时 `currentTick` 回到上次开始播放的位置（`lastStartTick`），即最近一次 `play()` 或 `seekTo()` 设置 `startTick` 时的值。不同于 pause 保留当前进度——return 是反向跳回起点，方便反复试听同一段落

Transport slice 新增 `lastStartTick` 字段，在 `play()` 和 `seekTo()` 时更新，在 `stop()` (return 模式) 时用作目标位置。

**场景**：用户 seek 到 bar 16 → play → 播放到 bar 20 → stop（return 模式）→ 光标回到 bar 16。再次按 play → 从 bar 16 重新开始。等效于"循环试听同一段但没有显式 loop"。

`endBehavior: 'stop' | 'loop'` 字段：
- `stop`：播放超过最后一个音符的 endTick 时自动调用 `stop()`
- `loop`：播放到末尾时 `seekTo(0)` 并从 0 继续

### D7: SoundSource 接口扩展

**选择**：在 `SoundSource` 接口新增 `stopAll(when: number): void`。

`OscillatorBank` 已有 `stopAll(when)` 实现，无需改动。`playback-manager` 的 `pause()`、`stop()`、`seekTo()` 均通过接口调用 `stopAll()`，不再直接引用 `OscillatorBank` 类。

### D8: Scrubbing 手势

**选择**：Ruler 上的 scrubbing 由 `RulerRenderer` 内部状态机处理，不经过 `MouseHandler`。

```
状态机：
  idle ──mousedown──▶ scrubbing (seek + 记录)
  scrubbing ──mousemove──▶ scrubbing (连续 seek)
  scrubbing ──mouseup──▶ idle
```

Scrubbing 中连续调用 `playbackManager.seekTo(tick)`。如果正在播放，每次 seek 都会静音 + 重置调度窗口，产生"搓碟"式的音频反馈。

### D9: TransportBar 播放选项 Toggle UI

**选择**：在 `TransportBar` 中 SkipForward 按钮右侧新增三个 toggle 按钮，控制 `endBehavior`、`autoFollow`、`stopBehavior`。所有按钮使用 Phosphor Duotone 图标，Merengue 暗色主题胶囊样式。

**按钮布局**：

```
[⏮] [▶] [⏹] [⏭]  [🔁] [👁] [⚙]    timecode    BPM    Grid
 └─ 传输操作 ──┘   └── 播放模式 ──┘

 分组间距：传输组与模式组之间 gap=18px（视觉分组，不加分隔线）
```

**交互细节**：

| 按钮 | 控制字段 | 图标 | 激活态 | 默认 |
|------|---------|------|--------|------|
| **Loop** | `endBehavior` | `ph-repeat` | coral 高亮 = loop 模式，灰色 = stop 模式 | 关闭（灰色） |
| **Auto-Follow** | `autoFollow` | `ph-eye` | coral 高亮 = 跟随开启，灰色 = 跟随暂停 | 开启（coral） |
| **Stop Behavior** | `stopBehavior` | `ph-gear` | 点击弹出小下拉：`Reset`（回到开头）/ `Return`（回到起始位置），当前选项 checkmark | reset |

**样式规格**（Merengue 主题）：

```
toggle 按钮（基础态）：
  width/height: 28px 圆角胶囊 (border-radius: 8px)
  background: --surface2 (#2E2927)
  border: 1px solid --border-visible (#423B38)
  color: --text3 (#7A6E68)
  font-size: 14px (Phosphor Duotone)
  cursor: pointer
  transition: all 0.15s ease (spring)

toggle 按钮（激活态）：
  background: --accent (#FF5C72) at 20% opacity
  border-color: --accent (#FF5C72)
  color: --accent (#FF5C72)

toggle 按钮（hover）：
  background: --surface3 (#423B38)
  color: --text1 (#FAF9F8)
```

**Auto-Follow 自动关闭联动**：当用户手动滚动导致 `autoFollow` 变为 `false` 时，按钮 UI 同步回到非激活态（灰色）。用户可点击按钮重新开启。

**Stop Behavior 下拉**：使用小弹出面板（`position: absolute` 在按钮上方），两个选项 `Reset`（回到开头）/ `Return`（回到上次播放起点）（Nunito Sans 12px, `--text2`），当前选中项左侧显示 checkmark（`ph-check`, `--accent`）。点击选项后立即应用并关闭弹出。点击面板外区域关闭。

**替代方案**：将选项放在全局设置面板而非 TransportBar。
- 拒绝理由：Loop 和 Auto-Follow 是高频操作，需要即时可见和 toggle。Stop behavior 使用频率低，但和 Stop 按钮放在同区域符合操作半径。传输操作与播放模式通过间距自然分组，不干扰肌肉记忆。

## Risks / Trade-offs

- **[R1] smooth auto-follow 每帧触发 grid + note 重绘**：因为 scrollX 每帧变化，`onStoreChange` 每帧标记 dirtyGrid=dirtyNotes=true。对于大量音符（>1000），60fps 重绘可能有性能压力。
  - 缓解：当前架构已有视口裁剪，不可见音符不绘制。如果未来出现性能问题，可改为在 playing 状态下跳过 dirty 标记机制，直接在 rAF 循环中强制重绘（避免 React 层的额外开销）。

- **[R2] Scrubbing 中 seek 的调度竞争**：快速 scrub 会产生密集的 `seekTo()` 调用和 `stopAll()` 调用。可能产生音频毛刺（click/pop）。
  - 缓解：`stopAll` 的 gain 立即降到 0。如需进一步消除毛刺，后续可加 2-3ms 的 de-click 渐变。

- **[R3] 标尺与钢琴卷帘的水平同步精度**：两者共享 `scrollX` 和同一 `CoordinateMapper`，但标尺的 `<canvas>` 和钢琴卷帘的 `<canvas>` 在不同的父容器中。如果 CSS 渲染差 1px，标尺刻线会与网格线错位。
  - 缓解：两者的 canvas 宽度在 `syncCanvasSize()` 中统一计算，使用 `Math.floor()` 避免亚像素。DPR 同步处理。

- **[R4] endBehavior=loop 时无缝循环的调度衔接**：循环 seek 到 0 后，`lastScheduledTime` 被重置，但音频时间仍在增长。需要确保 `startTime` 同时更新为 `audioCtx.currentTime`。
  - 缓解：loop 行为复用 `seekTo(0)` 的完整路径。`Transport.seekTo(0)` 中始终更新 `startTime`。
