## MODIFIED Requirements

### Requirement: Canvas layered architecture

系统 SHALL 使用 4 个堆叠的 `<canvas>` 元素渲染 Piano Roll，各层 z-index 由低到高为：

1. **背景网格层** — 小节线、拍线、细分网格线、行底色
2. **音符层** — 所有音符矩形条
3. **光标层** — 播放位置指示线，由 `requestAnimationFrame` 驱动
4. **交互层** — 正在绘制的音符预览、选择框、拖拽手柄

标尺渲染使用独立的 `<canvas>` 元素（由 `RulerView` 组件持有），不属于上述 4 层体系。标尺 Canvas 与 Piano Roll Canvas 共享相同的 `CoordinateMapper` 和 `scrollX`，通过 CSS flex 布局实现物理对齐。

各层 Canvas 通过 CSS `position: absolute` 叠放在同一容器内，各自独立重绘。

#### Scenario: Background grid persists during note editing

- **WHEN** 用户在音符层上拖拽音符
- **THEN** 背景网格层不触发重绘，仅音符层和交互层重绘

#### Scenario: Cursor moves while background is static

- **WHEN** 播放进行中，autoFollow=false
- **THEN** 光标层每帧重绘，其他三层保持不动

#### Scenario: Smooth follow repaints grid and notes each frame

- **WHEN** 播放进行中，autoFollow=true，scrollX 因跟随每帧变化
- **THEN** grid 层和 note 层直接在当前帧重绘（绕过 dirty 标记），确保画面流畅

### Requirement: Viewport state

系统 SHALL 维护视口状态，包含：

- `scrollX`, `scrollY`: number — 视口左上角在逻辑坐标中的偏移（像素）
- `zoomX`, `zoomY`: number — 横向和纵向缩放比例
- `noteHeight`: number — 每个半音行的像素高度，等于 `whiteKeySize × 7 / 12`（88 键网格间距）
- `rulerHeight`: number — 标尺高度（像素），默认 32px，可配置

缩放改变 `pixelsPerSecond` 和 `noteHeight`，滚动改变视口可见范围。

#### Scenario: Zoom in horizontally

- **WHEN** 横向缩放比例从 1.0 调整为 2.0
- **THEN** `pixelsPerSecond` 变为原来的 2 倍，同一音符在画布上宽度变为 2 倍

#### Scenario: Scroll changes visible range

- **WHEN** scrollX 从 0 变为 500
- **THEN** 视口左边界从逻辑 x=0 变为 x=500，视口范围内可见的音符集合相应更新

#### Scenario: Ruler height is configurable

- **WHEN** `rulerHeight` 设置为 40
- **THEN** 标尺 canvas 高度为 40px，角落空白区高度同步为 40px

### Requirement: Background grid rendering

系统 SHALL 在背景网格层绘制以下元素：

- **小节线**：在 TimeSig 事件对应的小节边界处绘制，颜色 `--border-visible` (`#423B38`)，1px
- **拍线**：每拍边界处绘制，颜色 `rgba(66,59,56,0.3)`
- **细分网格线**：根据当前吸附网格级别绘制，颜色 `rgba(46,41,39,0.5)`，间距随缩放比例动态调整
- **行底色**：每行半音网格线，白键行底色奇偶交替 `rgba(36,34,35,0.3)`；C 键行（`pitch % 12 === 0`）底线 `--border-visible` (`#423B38`) 略加深作八度视觉分隔

标尺中的时间刻度线 SHALL 与网格层的小节线、拍线在相同 tick 位置绘制，保证垂直对齐。

#### Scenario: Grid lines at 4/4 time signature

- **WHEN** 4/4 拍，ppq=480，pixelsPerSecond=200，tempo=120 BPM
- **THEN** 小节线间距为 4×0.5×200 = 400px，每小节内有 3 条拍线

#### Scenario: Subdivision lines hidden when too dense

- **WHEN** 细分网格线间距 < 4px
- **THEN** 该级细分线不绘制

#### Scenario: Ruler beat lines align with grid measure lines

- **WHEN** TimeSig 为 4/4，标尺在 tick=1920（第 2 小节开始）绘制 major 线
- **THEN** 网格层在相同 tick 位置绘制小节线，标尺线像素位置与网格线像素位置一致

## ADDED Requirements

### Requirement: Ruler corner spacer

系统 SHALL 在标尺行左侧渲染与键盘等宽（72px）的角落空白区，背景色 `var(--bg, #1A1819)`，容器底部 `border-bottom: 1px solid var(--border, #2E2927)`。分隔线通过 `box-sizing: border-box` 在容器高度内部实现，不额外增加高度，确保键盘与 Piano Roll 的垂直对齐不被破坏。角落区不可交互。

#### Scenario: Corner spacer matches keyboard width

- **WHEN** 键盘宽度为 72px
- **THEN** 角落空白区宽度为 72px

### Requirement: App layout grid for ruler

App 主内容区的布局 SHALL 从单行 flex row 改为嵌套 flex 布局（3 列，其中第 1-2 列内部为 2 行）：

- **第 1 列**（固定 72px）：角落空白区（顶部）+ 键盘（底部，flex:1）
- **第 2 列**（flex:1）：标尺（顶部，rulerHeight）+ Piano Roll（底部，flex:1）
- **第 3 列**：TrackList（保持不变）

#### Scenario: Ruler and piano roll share column width

- **WHEN** 窗口 resize
- **THEN** 标尺宽度始终等于 Piano Roll 宽度（Col 2 的 flex:1 宽度）

### Requirement: Playback cursor visible in ruler

播放光标 SHALL 同时在标尺和 Piano Roll 中渲染：标尺中为向下的三角指示器，Piano Roll 中为竖线 + 顶三角。两者的 x 坐标相同，基于相同的 `currentTick` 经 `CoordinateMapper.tickToPixel()` 计算。

#### Scenario: Cursor positions match in ruler and piano roll

- **WHEN** currentTick=960, scrollX=200
- **THEN** 标尺三角 x = `tickToPixel(960) - 200`，Piano Roll 光标竖线 x 相同
