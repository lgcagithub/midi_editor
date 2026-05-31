## ADDED Requirements

### Requirement: Ruler view layout

系统 SHALL 在 Piano Roll 上方渲染独立的标尺视图。标尺位于 flex 布局的第 2 列（与 Piano Roll 同列），高度由 `editorSlice.rulerHeight` 配置决定，默认值为 32px。标尺左侧留出与键盘等宽（72px）的角落空白区，确保标尺刻度线与 Piano Roll 网格线水平对齐。

标尺使用独立的 `<canvas>` 元素和独立的 `RulerRenderer` 类，不纳入 Piano Roll 的 4 层 Canvas 体系。

#### Scenario: Ruler aligns with piano roll grid lines

- **WHEN** 标尺和 Piano Roll 都使用相同的 `scrollX` 和 `CoordinateMapper`
- **THEN** 标尺的小节线、拍线的像素位置与 Piano Roll 网格线的像素位置完全一致

#### Scenario: Ruler has configurable height

- **WHEN** `editorSlice.rulerHeight` 设置为 40
- **THEN** 标尺 canvas 高度为 40px，角落空白区高度为 40px

### Requirement: Ruler tick mark rendering

标尺 SHALL 根据当前 `zoomX` 和 `tempoMap` 动态计算并绘制时间刻度标记，遵循密度自适应规则：

| 节拍像素间距 | 显示内容 |
|-------------|---------|
| ≥ 80px | 小节号（JetBrains Mono 11px）+ 拍号标记 + major 线（延伸到标尺底部）+ minor 线（一半高度）|
| ≥ 40px | 小节号 + major 线 |
| ≥ 20px | 小节号（偶数跳过，如 1, 3, 5...）+ major 线 |
| < 20px | 小节号（间隔更大）+ major 线 |

小节号使用 `var(--text3, #7A6E68)` 颜色，JetBrains Mono 字体。标尺容器底部渲染 1px 分隔线（`border-bottom: 1px solid var(--border, #2E2927)`），分隔线在容器 `box-sizing: border-box` 范围内，不额外增加高度，确保 Piano Roll 与键盘对齐不被破坏。

#### Scenario: Zoomed-in ruler shows full details

- **WHEN** zoomX 使每拍间距 ≥ 80px
- **THEN** 标尺显示小节号、拍号标记（¹ ² ³ ⁴）、major 线、minor 线

#### Scenario: Zoomed-out ruler skips labels

- **WHEN** zoomX 使相邻小节间距 < 20px
- **THEN** 小节号间隔显示，major 线保留，minor 线隐藏

#### Scenario: Ruler respects tempo changes

- **WHEN** tempoMap 包含变速事件
- **THEN** 标尺刻度间距随速度变化相应压缩或拉伸

### Requirement: Ruler click-to-seek

用户在标尺区域 mousedown SHALL 触发 seek：通过 `pixelToTick(mouseX + scrollX)` 计算目标 tick，调用 `playbackManager.seekTo(tick)` 跳转光标。如果当前正在播放，seek 后从新位置继续播放。

#### Scenario: Click ruler while stopped

- **WHEN** transportState='stopped'，用户在标尺 x=400px 处 click（对应 tick=960）
- **THEN** `currentTick` 变为 960，光标跳转到 x=400px 位置

#### Scenario: Click ruler while playing

- **WHEN** transportState='playing', currentTick≈500，用户点击标尺 tick=1920 处
- **THEN** 所有发声音符静音，`currentTick` 变为 1920，播放从 tick=1920 继续

### Requirement: Ruler scrubbing

用户在标尺区域 mousedown 后拖拽 SHALL 触发 scrubbing：`mousemove` 期间连续调用 `seekTo(tick)`，`mouseup` 后停留在最后位置。Scrubbing 由 `RulerRenderer` 内部状态机管理，不经过 `MouseHandler`。

#### Scenario: Scrub while playing

- **WHEN** transportState='playing'，用户在标尺上从 tick=480 拖拽至 tick=1440
- **THEN** 播放位置随鼠标移动连续跳转，松手后从 tick=1440 继续播放

#### Scenario: Scrub while paused

- **WHEN** transportState='paused', currentTick=960，用户拖拽至 tick=480
- **THEN** `currentTick` 连续跟随鼠标，松手后停在 tick=480，状态保持 paused

### Requirement: Cursor indicator in ruler

标尺 SHALL 在 `currentTick` 对应位置绘制向下的三角形游标指示器，颜色 `var(--accent, #FF5C72)`，尺寸 6px 宽 × 8px 高。游标随 `scrollX` 变化同步移动。游标与 Piano Roll 中光标层的光标竖线垂直对齐。

#### Scenario: Cursor triangle aligns with piano roll cursor line

- **WHEN** 播放中 currentTick=960
- **THEN** 标尺三角的 x 坐标与 Piano Roll 光标竖线的 x 坐标一致

### Requirement: Ruler Merengue dark theme

标尺 SHALL 遵循 Merengue 设计语言的暗色主题：

- 背景色 `var(--bg, #1A1819)`
- 容器底部分隔线（`border-bottom`）`var(--border, #2E2927)` 1px，位于 `box-sizing: border-box` 范围内
- 小节号 JetBrains Mono 11px, `var(--text3, #7A6E68)`
- 拍号标记 JetBrains Mono 10px, `var(--text3, #7A6E68)` with 0.7 opacity
- Major 线 `var(--border, #2E2927)` 1px
- Minor 线 `rgba(46, 41, 39, 0.5)` 1px
- 光标三角 `var(--accent, #FF5C72)`
- Corner 空白区背景 `var(--bg, #1A1819)`

#### Scenario: Ruler matches dark theme appearance

- **WHEN** 应用启动
- **THEN** 标尺视觉风格与键盘、Piano Roll 底色一致，暖色深底

### Requirement: Density-adaptive labels are always JetBrains Mono

标尺中的所有文本 SHALL 使用 JetBrains Mono 字体，遵循 Merengue 的类型层级纪律——精确数值（小节号、拍号、时间刻度）属于技术数据范畴。

#### Scenario: Measure numbers use monospace font

- **WHEN** 标尺渲染小节号 "1", "2", "3"
- **THEN** 所有文本使用 `var(--font-mono, "JetBrains Mono")` 字体
