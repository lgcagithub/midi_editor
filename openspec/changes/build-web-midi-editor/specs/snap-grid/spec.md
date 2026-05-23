## ADDED Requirements

### Requirement: Grid subdivision levels

系统 SHALL 提供以下吸附网格级别，以四分音符为一拍的 tick 间距来定义：

| 级别 | 名称 | tick 间距 |
|------|------|-----------|
| 1 | 全音符 | `ppq × 4` |
| 2 | 二分音符 | `ppq × 2` |
| 3 | 四分音符 | `ppq` |
| 4 | 八分音符 | `ppq / 2` |
| 5 | 十六分音符 | `ppq / 4` |
| 6 | 三十二分音符 | `ppq / 8` |
| 7 | 六十四分音符 | `ppq / 16` |
| 8 | 八分三连音 | `ppq / 3` |
| 9 | 十六分三连音 | `ppq / 6` |

其中 ppq 为 Project 的 pulses per quarter note。默认网格级别为十六分音符。

#### Scenario: Quarter note grid with ppq=480

- **WHEN** 选择四分音符网格
- **THEN** 网格间距为 480 ticks

#### Scenario: 16th triplet grid with ppq=480

- **WHEN** 选择十六分三连音网格
- **THEN** 网格间距为 480 / 6 = 80 ticks

### Requirement: Snap to grid function

系统 SHALL 提供 `snapTick(tick, gridTicks)` 函数，返回最近的网格线位置：

```
snapTick(tick, gridTicks) = Math.round(tick / gridTicks) × gridTicks
```

#### Scenario: Snap forward to nearest grid

- **WHEN** tick=500, gridTicks=480
- **THEN** 返回 480（最近网格线）

#### Scenario: Snap to midpoint between grid lines

- **WHEN** tick=240, gridTicks=480
- **THEN** 返回 0 或 480（两者距离相等，`Math.round` 决定）

### Requirement: Relative snap for drag operations

拖拽音符移动时 SHALL 使用**相对吸附**：仅对鼠标移动产生的 `deltaTick` 做吸附，与音符原始位置的 offset 无关。

```
deltaTick = snapTick(rawDeltaTick, gridTicks)
newStartTick = Math.max(0, originalNote.startTick + deltaTick)
```

#### Scenario: Off-grid note retains offset after drag

- **WHEN** 音符 startTick=487（偏离格线 7 ticks），用户拖拽等效 deltaX 产生 deltaTick≈30
- **THEN** snapTick(30, 480) = 0（30 不到 240），newStartTick = 487 + 0 = 487（原始偏移保留）

#### Scenario: Large drag snaps to grid offset

- **WHEN** 音符 startTick=100，用户拖拽产生 deltaTick≈500
- **THEN** snapTick(500, 480) = 480, newStartTick = 100 + 480 = 580

### Requirement: Pencil absolute snap

画笔工具创建音符时 SHALL 使用**绝对吸附**：鼠标位置直接吸附到最近网格线确定起始 tick。

```
noteStartTick = snapTick(rawClickTick, gridTicks)
```

#### Scenario: Pencil click snaps to grid

- **WHEN** 画笔在 tick=520 处点击，gridTicks=480
- **THEN** 音符 startTick = snapTick(520, 480) = 480

### Requirement: Grid line density adaptation

背景网格层 SHALL 根据当前缩放级别动态调整细分线的显示：

- 细分网格线间距 < 4px → 不绘制该级细分线
- 拍线间距 < 8px → 仅绘制小节线
- 小节线始终绘制

#### Scenario: Fine grid hidden when zoomed out

- **WHEN** 选择三十二分音符网格，但当前缩放使网格线间距 = 2px
- **THEN** 三十二分音符细分线不绘制，绘制的网格线回退到更大一级

#### Scenario: Grid reappears when zoomed in

- **WHEN** 用户放大使三十二分音符网格线间距 ≥ 4px
- **THEN** 三十二分音符细分线恢复绘制

### Requirement: Grid visual alignment

网格线 SHALL 与逻辑 tick 对应的像素位置对齐。网格线来自 tick 到 x（或横向布局下的 y）的坐标映射。所有网格线间距与当前 `pixelsPerSecond` 和 `tempoMap` 保持一致。

#### Scenario: Grid aligned with note positions

- **WHEN** 显示一个 startTick=480 的音符（吸附在四分音符网格上）
- **THEN** 音符左边缘与最近的四分音符网格线在像素级别重合
