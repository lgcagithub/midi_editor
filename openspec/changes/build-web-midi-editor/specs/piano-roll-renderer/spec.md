## ADDED Requirements

### Requirement: Canvas layered architecture

系统 SHALL 使用 4 个堆叠的 `<canvas>` 元素渲染 Piano Roll，各层 z-index 由低到高为：

1. **背景网格层** — 小节线、拍线、细分网格线、行底色
2. **音符层** — 所有音符矩形条
3. **光标层** — 播放位置指示线，由 `requestAnimationFrame` 驱动
4. **交互层** — 正在绘制的音符预览、选择框、拖拽手柄

各层 Canvas 通过 CSS `position: absolute` 叠放在同一容器内，各自独立重绘。

#### Scenario: Background grid persists during note editing

- **WHEN** 用户在音符层上拖拽音符
- **THEN** 背景网格层不触发重绘，仅音符层和交互层重绘

#### Scenario: Cursor moves while background is static

- **WHEN** 播放进行中
- **THEN** 光标层每帧重绘，其他三层保持不动

### Requirement: Coordinate mapping for vertical orientation

在纵向布局中，系统 SHALL 使用以下坐标映射：

- `x = tickToSeconds(tick, tempoMap, ppq) × pixelsPerSecond + viewportOffsetX`
- `y = (127 - pitch) × noteHeight + viewportOffsetY`
- 音符宽度 = `tickToSeconds(duration, tempoMap, ppq) × pixelsPerSecond`
- 音符高度 = `noteHeight`

其中 `pixelsPerSecond` 为当前缩放比例下每秒对应的像素数，`noteHeight` 为每行半音的像素高度。

#### Scenario: Note at pitch 60 maps to correct y

- **WHEN** noteHeight=20, pitch=60 (C4)
- **THEN** 音符上边缘 y = (127 - 60) × 20 = 1340

#### Scenario: Note at pitch 127 maps to top

- **WHEN** noteHeight=20, pitch=127
- **THEN** 音符上边缘 y = 0

### Requirement: Virtual rendering — viewport culling

系统 SHALL 在绘制音符时仅渲染与当前视口有重叠的音符，判断条件使用 AABB 重叠测试：

- X 轴: `note.x < viewport.x + viewport.width` AND `note.x + note.width > viewport.x`
- Y 轴: `note.y < viewport.y + viewport.height` AND `note.y + note.height > viewport.y`

#### Scenario: Note partially visible left edge

- **WHEN** 视口范围为 x=[100, 500]，音符起始于 x=50，宽度为 100（音符 x 范围为 [50, 150]）
- **THEN** 该音符被渲染（右边缘 150 > 视口左边界 100）

#### Scenario: Note completely outside viewport left

- **WHEN** 视口范围为 x=[100, 500]，音符起始于 x=10，宽度为 50（音符 x 范围为 [10, 60]）
- **THEN** 该音符不被渲染（右边缘 60 < 视口左边界 100）

#### Scenario: Note completely outside viewport right

- **WHEN** 视口范围为 x=[100, 500]，音符起始于 x=600，宽度为 100（音符 x 范围为 [600, 700]）
- **THEN** 该音符不被渲染（左边缘 600 > 视口右边界 500）

#### Scenario: Very long note spanning entire viewport

- **WHEN** 视口范围为 x=[100, 500]，音符起始于 x=0，宽度为 1000（音符 x 范围为 [0, 1000]）
- **THEN** 该音符被渲染

### Requirement: Background grid rendering

系统 SHALL 在背景网格层绘制以下元素：

- **小节线**：在 TimeSig 事件对应的小节边界处绘制（粗线或深色线）
- **拍线**：每拍边界处绘制（中等粗细）
- **细分网格线**：根据当前吸附网格级别绘制（最细线），间距随缩放比例动态调整
- **行底色**：每行半音网格线，白键行底色略亮于黑键行底色

#### Scenario: Grid lines at 4/4 time signature

- **WHEN** 4/4 拍，ppq=480，pixelsPerSecond=200，tempo=120 BPM
- **THEN** 小节线间距为 4×0.5×200 = 400px，每小节内有 3 条拍线

#### Scenario: Subdivision lines hidden when too dense

- **WHEN** 细分网格线间距 < 4px
- **THEN** 该级细分线不绘制

### Requirement: Note rendering

系统 SHALL 将每个可见音符绘制为圆角矩形条：

- 填充颜色为该音符所属音轨的 `color` 属性
- 矩形的 x、y、width、height 由坐标映射函数计算
- 被选中的音符 SHALL 以不同视觉方式呈现（如边框高亮或颜色变化）

#### Scenario: Render selected note

- **WHEN** 音符 `isSelected` 为 true
- **THEN** 该音符矩形以高亮边框或加亮颜色绘制

### Requirement: Playback cursor

系统 SHALL 在光标层绘制一条播放位置指示线（纵向布局时为竖线，横向布局时为横线），位置由 `transport.currentTick` 实时计算。

光标位置通过 `requestAnimationFrame` 每帧独立推算：从 `AudioContext.currentTime` 开始，使用 `secondsToTick` 计算出当前的 tick，再映射到像素位置。

#### Scenario: Cursor moves during playback

- **WHEN** 播放状态为 PLAYING
- **THEN** 光标线位置随 `currentTick` 变化而移动，每帧更新

#### Scenario: Cursor static when paused

- **WHEN** 播放状态为 PAUSED 或 STOPPED
- **THEN** 光标线保持在当前 tick 位置不移动

### Requirement: Viewport state

系统 SHALL 维护视口状态，包含：

- `scrollX`, `scrollY`: number — 视口左上角在逻辑坐标中的偏移（像素）
- `zoomX`, `zoomY`: number — 横向和纵向缩放比例
- `noteHeight`: number — 每个半音行的像素高度

缩放改变 `pixelsPerSecond` 和 `noteHeight`，滚动改变视口可见范围。

#### Scenario: Zoom in horizontally

- **WHEN** 横向缩放比例从 1.0 调整为 2.0
- **THEN** `pixelsPerSecond` 变为原来的 2 倍，同一音符在画布上宽度变为 2 倍

#### Scenario: Scroll changes visible range

- **WHEN** scrollX 从 0 变为 500
- **THEN** 视口左边界从逻辑 x=0 变为 x=500，视口范围内可见的音符集合相应更新

### Requirement: Orientation-aware coordinate projection

系统 SHALL 提供统一的坐标投影函数，根据当前 `orientation`（`'vertical'` | `'horizontal'`）将 `{tick, pitch}` 映射为 `{x, y, width, height}`：

- **纵向**：x=时间, y=音高, width=时长, height=noteHeight
- **横向**：x=音高, y=时间, width=noteHeight, height=时长

所有渲染代码 SHALL 通过投影函数获取坐标，不直接做轴分配。

#### Scenario: Vertical orientation time maps to x

- **WHEN** orientation='vertical'，音符 startTick=480, duration=240
- **THEN** 音符 x=(480 对应的秒数×pixelsPerSecond)，width=(240 对应的秒数×pixelsPerSecond)

#### Scenario: Horizontal orientation time maps to y

- **WHEN** orientation='horizontal'，音符 startTick=480, duration=240
- **THEN** 音符 y=(480 对应的秒数×pixelsPerSecond)，height=(240 对应的秒数×pixelsPerSecond)
