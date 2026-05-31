## ADDED Requirements

### Requirement: Smooth cursor auto-follow during playback

当 `transportState='playing'` 且 `autoFollow=true` 时，系统 SHALL 在每帧 rAF 循环中计算目标 scrollX 并应用缓动插值，使播放光标保持在视口的指定锚点位置。

算法：

```
anchorRatio = 0.3
smoothing = 0.12

targetScrollX = cursorAbsolutePixel - viewportWidth × anchorRatio
newScrollX = scrollX + (targetScrollX - scrollX) × smoothing
clampedScrollX = clamp(newScrollX, 0, maxScrollX)
```

其中 `cursorAbsolutePixel = mapper.tickToPixel(currentTick)`（绝对坐标），`maxScrollX` 为内容总宽度减去视口宽度。

#### Scenario: Cursor anchored at 30% during smooth playback

- **WHEN** 播放中，viewportWidth=800px, cursorAbsolutePixel=1000px, scrollX=400px, autoFollow=true
- **THEN** targetScrollX = 1000 - 800 × 0.3 = 760，scrollX 向 760 缓动逼近

#### Scenario: Auto-follow respects scroll boundaries

- **WHEN** targetScrollX 计算值 < 0
- **THEN** scrollX 被 clamp 为 0

#### Scenario: Auto-follow respects max scroll

- **WHEN** targetScrollX 计算值 > maxScrollX
- **THEN** scrollX 被 clamp 为 maxScrollX

### Requirement: Manual scroll disables auto-follow

当用户在播放期间手动操作滚轮或中键拖拽更改 `scrollX` 时，系统 SHALL 将 `autoFollow` 设为 `false`，暂停自动跟随。自动跟随仅在下一次 Stop → Play 周期或用户显式操作（如点击"回到播放位置"按钮）时恢复。

#### Scenario: Wheel scroll during playback pauses auto-follow

- **WHEN** transportState='playing', autoFollow=true，用户滚动鼠标滚轮
- **THEN** `autoFollow` 变为 false，用户可以自由浏览，不会被迫弹回

#### Scenario: Stop then play restores auto-follow

- **WHEN** autoFollow=false，用户先 stop 再 play
- **THEN** `autoFollow` 变为 true

### Requirement: Auto-follow state in store

系统 SHALL 在 `transport-slice.ts` 中维护 `autoFollow: boolean` 状态字段和 `setAutoFollow(v: boolean)` action。初始化默认为 `true`。

#### Scenario: Default auto-follow is enabled

- **WHEN** 应用启动
- **THEN** `autoFollow` 为 `true`

### Requirement: Smooth follow grid and note repaint during playback

播放中 auto-follow 导致 scrollX 变化时，系统 SHALL 在 rAF 循环中直接重绘 grid 和 note 层（绕过 dirty 标记机制），确保每帧都有更新的画面。

#### Scenario: Scrolling during playback repaints immediately

- **WHEN** auto-follow 导致 scrollX 从 400 变为 500
- **THEN** 下一帧 grid 层和 note 层以新 scrollX 重绘，用户看到跟随效果
