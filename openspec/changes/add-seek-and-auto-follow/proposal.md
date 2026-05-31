## Why

当前 MIDI 编辑器支持播放、暂停、停止，但用户无法通过点击时间轴跳转到指定位置（seek），播放时光标移出视口后也不会自动跟随滚动（auto-follow）。这两个功能是所有 DAW 的核心交互——没有 seek，用户只能从头播放或等待播放到达目标位置；没有 auto-follow，播放过程在视口外不可见。现在播放引擎和光标渲染已稳定，是补齐这两个功能的最佳时机。

## What Changes

- **新增 Ruler（标尺）**：Piano Roll 顶部添加独立标尺视图，展示小节号与节拍标记，点击标尺跳转播放位置，拖拽实现 scrubbing
- **新增 Seek 能力**：Transport 增加 `seekTo(tick)` 方法，播放中 seek 时静音当前音符并重置调度窗口
- **新增 Auto-Follow**：播放时光标平滑跟随，视口自动滚动保持光标可见；用户手动滚动后暂停跟随
- **新增 `stopAll` 到 SoundSource 接口**：seek 和 stop 时需要立即静音所有发声中的振荡器
- **新增播放选项**：`pauseBehavior`（暂停时保留当前位置 vs 回到播放起点）、`endBehavior`（播放到项目末尾停止 vs 循环）
- **标尺对齐布局**：通过 DOM flex 网格布局实现标尺与 Piano Roll 的精确对齐——标尺上方留出与键盘等宽的 corner spacer，确保标尺刻度线对齐 Piano Roll 网格线

## Capabilities

### New Capabilities

- `ruler-timeline`: 标尺渲染、密度自适应刻度、点击 seek、拖拽 scrubbing，作为独立 Renderer 实现
- `cursor-auto-follow`: 平滑播放跟随——光标锚定视口 30% 位置，每帧缓动插值（factor 0.12），手动滚动时暂停跟随

### Modified Capabilities

- `playback-engine`: Transport 新增 `seekTo(tick)` 方法；SoundSource 接口新增 `stopAll(when)`；Scheduler 新增 `resetScheduleWindow()`；新增 `pauseBehavior` 与 `endBehavior` 播放选项；Transport 状态机 `pause()` 行为改为可配置
- `piano-roll-renderer`: Viewport 新增 `rulerHeight` 配置项；App 布局从单行 flex 改为 2×2 网格（corner + ruler / keyboard + piano roll）

## Impact

- **State 层**: `transport-slice.ts` 新增 `seekTo`、`lastStartTick`、`pauseBehavior`、`endBehavior`、`autoFollow`；`editor-slice.ts` 新增 `rulerHeight`
- **Engine 层**: `transport.ts` 新增 `seekTo()`；`scheduler.ts` 新增 `resetScheduleWindow()`；`playback-manager.ts` 新增 `seekTo()`、修改 `pause()` 行为
- **Audio 层**: `sound-source.ts` 接口新增 `stopAll(when: number)`
- **Renderer 层**: 新增 `ruler-renderer.ts`（RulerRenderer 类，含渲染 + 事件处理）；`cursor-renderer.ts` 的光标三角指示器在标尺中复用
- **Components 层**: 新增 `RulerView.tsx`；修改 `App.tsx` 布局为 2×2 网格
- **交互**: Ruler 的 mousedown/mousemove/mouseup 事件由 RulerRenderer 独立处理，不经过 MouseHandler，与现有工具系统无冲突
