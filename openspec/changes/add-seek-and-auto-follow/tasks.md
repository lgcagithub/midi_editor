## 1. Foundation — Store & Interface 变更

- [ ] 1.1 `SoundSource` 接口新增 `stopAll(when: number): void`，`OscillatorBank` 已有实现无需改动
- [ ] 1.2 `TransportSlice` 新增 `seekTo(tick: number)` action、`lastStartTick`、`pauseBehavior` (`'keep'`\|`'return'`) / `endBehavior` / `autoFollow` 字段 + setter
- [ ] 1.3 `EditorSlice.viewport` 新增 `rulerHeight: number`（默认 32px）

## 2. Transport & Scheduler 增强

- [ ] 2.1 `Transport.seekTo(tick)`: 根据 transportState 处理——playing 时重置 startTime/startTick；paused/stopped 时设 currentTick
- [ ] 2.2 `Transport.getCurrentTick()` 适配 seek：playing 状态下的实时推算逻辑不受影响；seek 后立即返回正确位置
- [ ] 2.3 `Scheduler.resetScheduleWindow()`: 将 `lastScheduledTime` 重置为 `audioCtx.currentTime`
- [ ] 2.4 `Scheduler.tick()` 中增加项目末尾检测：当 `currentTick >= maxEndTick` 时根据 `endBehavior` 触发 stop 或 seekTo(0)

## 3. Playback Manager 编排

- [ ] 3.1 `playbackManager.seekTo(tick)`: 编排 oscBank.stopAll() → transport.seekTo() → scheduler.resetScheduleWindow() → store.currentTick 更新
- [ ] 3.2 `playbackManager.stop()` 调用 oscBank.stopAll() 并设 currentTick=0；`playbackManager.pause()` 根据 `pauseBehavior` 设 currentTick (`keep` 保留 / `return` 跳回 lastStartTick)
- [ ] 3.3 `playbackManager` 暴露 `seekTo` 给外部调用

## 4. Ruler 标尺渲染

- [ ] 4.1 新建 `src/renderer/ruler-renderer.ts` — `RulerRenderer` 类，包含：
  - 小节号、节拍线（major/minor）密度自适应绘制
  - 播放光标三角指示器
  - 底部 1px 分隔线
  - Merengue 暗色主题样式（JetBrains Mono、--text3、--border、--accent）
- [ ] 4.2 Ruler 密度自适应逻辑：根据 `pixelsPerBeat` 动态决定显示层级（完整 → 小节号 → 跳过标签）
- [ ] 4.3 `RulerRenderer` 鼠标事件：mousedown → seekTo（点击 seek），mousemove（拖拽中）→ 连续 seekTo（scrubbing），mouseup → 结束 scrubbing
- [ ] 4.4 新建 `src/components/RulerView.tsx` — React 组件，创建 `<canvas>` 并初始化 `RulerRenderer`，订阅 `scrollX` 和 `currentTick` 变化触发重绘

## 5. App 布局改造

- [ ] 5.1 `App.tsx` mainStyle 区域从单行 flex 改为 2×2 网格：Col 1（corner spacer + KeyboardView）+ Col 2（RulerView + PianoRollView）
- [ ] 5.2 Corner spacer：72px 宽、rulerHeight 高的空白 `<div>`，背景 `--bg`，底部 `--border` 分隔线
- [ ] 5.3 确保 RulerView 的 canvas 宽度与 PianoRollView 的 canvas 宽度同步（共享 Col 2 的 flex:1 宽度）

## 6. Smooth Auto-Follow

- [ ] 6.1 `piano-roll.ts` rAF 循环中增加 auto-follow 逻辑：`autoFollow && playing` 时计算 `targetScrollX = cursorPx - vw * 0.3`，缓动插值（factor 0.12），clamp 边界
- [ ] 6.2 `piano-roll.ts` 手动滚动检测：`handleWheel` 和 `handleMouseMove`（中键拖拽）中，若 playing 且 autoFollow，设 autoFollow=false
- [ ] 6.3 stop→play 过渡时恢复 autoFollow=true
- [ ] 6.4 playing 状态下 scrollX 变化时，grid + note 层在当前帧直接重绘（不依赖 dirty 标记机制），保证跟随画面流畅

## 7. TransportBar 播放模式 Toggle

- [ ] 7.1 Loop toggle 按钮：点击切换 `endBehavior` (`stop` ↔ `loop`)，激活态 coral 高亮
- [ ] 7.2 Auto-Follow toggle 按钮：点击切换 `autoFollow`，激活态 coral 高亮；`autoFollow` 被手动滚动关闭时同步变灰
- [ ] 7.3 Pause Behavior 下拉：齿轮按钮 + 弹出面板 (`Keep` / `Return`)，选中项 checkmark，点击外部关闭

## 8. 测试

- [ ] 8.1 `transport.test.ts` 新增 seekTo 测试（stopped / paused / playing 三种状态）
- [ ] 8.2 `scheduler.test.ts` 新增 resetScheduleWindow 测试、endBehavior 测试
- [ ] 8.3 `ruler-renderer` 单元测试：密度自适应逻辑（不同 zoomX 下的显示层级）
- [ ] 8.4 `cursor-auto-follow` 单元测试：targetScrollX 计算、clamp 边界、缓动公式
