## Purpose

### Requirement: Tool modes

## ADDED Requirements

### Requirement: Tool modes

系统 SHALL 提供三种编辑工具，用户可在工具栏切换：

- **指针工具 (Pointer)**：选中、拖拽移动、拉伸边缘、框选多选
- **画笔工具 (Pencil)**：点击添加音符，拖拽调整时长
- **橡皮工具 (Eraser)**：点击删除音符

默认激活指针工具。一次仅一个工具处于激活状态。

#### Scenario: Switch to pencil tool

- **WHEN** 用户在工具栏点击画笔工具
- **THEN** 指针工具去激活，画笔工具激活

#### Scenario: Default tool is pointer

- **WHEN** 编辑器首次加载
- **THEN** 指针工具处于激活状态

### Requirement: Pointer — hit test priority

指针工具在 mousedown 时 SHALL 按以下优先级检测命中：

1. **音符边缘热区**（距离音符左或右边缘 ≤ 4px 的逻辑像素）→ 边缘拉伸
2. **音符身体**（在音符矩形内部，非边缘热区）→ 拖拽移动
3. **空白区域**（未命中任何音符）→ 开始框选

边缘热区的 4px 阈值 SHALL 在缩放时保持逻辑像素不变（即不受 zoom 影响）。

#### Scenario: Click near left edge triggers resize

- **WHEN** 点击位置距离音符左边缘 3px（在音符矩形内）
- **THEN** 命中判定为左边缘拉伸

#### Scenario: Click on note body triggers drag

- **WHEN** 点击位置在音符矩形内部，距离左右边缘均 > 4px
- **THEN** 命中判定为拖拽移动

#### Scenario: Click on empty space starts rubber band

- **WHEN** 点击位置不在任何音符矩形内
- **THEN** 开始框选

### Requirement: Pointer — single click selection

单击指针工具 SHALL 执行以下选中逻辑：

- 点击未选中的音符 → 清除所有其他选中，单选此音符
- 点击已选中的音符 → 保持选中（不做改变）
- 点击空白区域 → 清除所有选中

#### Scenario: Click unselected note

- **WHEN** 音符 A 未选中，用户点击音符 A 的身体区域
- **THEN** 只剩下音符 A 被选中

#### Scenario: Click empty area clears selection

- **WHEN** 音符 A 和 B 已选中，用户点击空白区域
- **THEN** 所有选中被清除

### Requirement: Pointer — drag move

当用户在音符身体开始拖拽时，系统 SHALL 执行移动操作：

- mousedown 时记录所有选中音符的原始位置（`oldStartTick`, `oldPitch`）
- mousemove 期间实时更新音符位置：`newStartTick = oldStartTick + deltaTick`, `newPitch = oldPitch + deltaPitch`
- `deltaTick` 由鼠标横向像素偏移经 pixelsPerSecond 换算后经吸附网格处理
- `deltaPitch` 由鼠标纵向像素偏移除以 noteHeight 取整，含横向布局时 axis 交换
- mouseup 时应用最终位置，并生成 `MoveNotesCommand` 存入撤销栈

约束：

- `newStartTick ≥ 0`
- `21 ≤ newPitch ≤ 108`（88 键钢琴范围）

#### Scenario: Drag note right and up

- **WHEN** 用户拖拽音符，鼠标移动 deltaX=+100px (右), deltaY=-40px (上)
- **THEN** 音符 startTick 增加（向右），pitch 增加（向上），约束在 88 键范围内

#### Scenario: Drag multiple selected notes together

- **WHEN** 音符 A 和 B 均被选中，用户拖拽其中任一音符
- **THEN** 两个音符以相同的 deltaTick 和 deltaPitch 一起移动

#### Scenario: Drag constrained to tick ≥ 0

- **WHEN** 拖拽使音符 startTick 变为负值
- **THEN** startTick 被钳制为 0

#### Scenario: Drag constrained to 88-key range

- **WHEN** 拖拽使音符 pitch 超出 88 键范围（< 21 或 > 108）
- **THEN** pitch 被钳制为 21（下限）或 108（上限）

### Requirement: Pointer — edge resize

当用户在音符边缘热区开始拖拽时，系统 SHALL 执行拉伸操作：

- **左边缘**：调整 `startTick`，拖动同时反向调整 `duration` 保持音符结束位置不变
- **右边缘**：调整 `duration`，起始位置不变

约束：

- 拉伸后 `duration` ≥ 最小音符时长（1 tick），避免零宽音符
- 拉伸左边缘时 `startTick ≥ 0`

#### Scenario: Resize right edge

- **WHEN** 用户向右拖拽音符右边缘，鼠标移动 deltaX=+60px
- **THEN** 音符 duration 增加对应时长，startTick 不变

#### Scenario: Resize left edge

- **WHEN** 用户向左拖拽音符左边缘，鼠标移动 deltaX=-30px
- **THEN** 音符 startTick 减少对应时长，duration 增加对应时长，音符结束位置不变

#### Scenario: Minimum duration constraint

- **WHEN** 拉伸使 duration 变为 0 或负值
- **THEN** duration 被钳制为 1 tick

### Requirement: Pencil — add note

画笔工具在 mousedown 时 SHALL 执行以下逻辑：

1. 将鼠标位置吸附到最近网格线，得到起始 tick 和 pitch
2. pitch 约束在 88 键钢琴范围（21 到 108）
3. 创建一个最小默认时长的音符（等于当前网格吸附单位的时长）
4. 若该位置已有音符，先删除已有音符（替换行为）
5. 音符添加到当前选中音轨
6. 音符随鼠标持续拖拽而调整 duration（复用右边缘拉伸逻辑）
7. mouseup 时生成 `AddNoteCommand` 存入撤销栈

#### Scenario: Pencil click adds note at grid position

- **WHEN** 画笔工具激活，吸附网格=16 分音符 (120 ticks)，用户在 pitch=60 附近点击
- **THEN** 在最近网格位置创建一个 pitch=60, duration=120 ticks 的新音符

#### Scenario: Pencil replaces existing note

- **WHEN** 画笔工具在已有的音符上点击
- **THEN** 旧音符被删除，新音符被创建

#### Scenario: Pencil drag extends duration

- **WHEN** 画笔 mousedown 后拖拽鼠标 deltaX=+240px（对应 480 ticks）
- **THEN** 新音符 duration = 吸附网格单位 + 480 ticks（吸附后的值）

#### Scenario: Pencil pitch clamped to 88-key range

- **WHEN** 画笔在键盘范围外点击（对应 pitch < 21 或 > 108）
- **THEN** 音符 pitch 被钳制为 21 或 108

### Requirement: Eraser — delete note

橡皮工具在点击时 SHALL 删除命中检测命中的音符。若命中音符，删除后生成 `DeleteNotesCommand`。若未命中任何音符，无操作。

#### Scenario: Eraser click deletes note

- **WHEN** 橡皮工具激活，用户点击音符 A
- **THEN** 音符 A 从所在音轨中移除

#### Scenario: Eraser click on empty space does nothing

- **WHEN** 橡皮工具激活，用户点击空白区域
- **THEN** 无任何变化

### Requirement: Rubber band selection

指针工具在空白区域拖拽时 SHALL 执行框选：

1. mousedown 记录起点
2. mousemove 绘制选择框（虚线矩形），在交互层上渲染
3. mouseup 时对所有音轨的可见音符做 AABB 重叠测试
4. 音符矩形与选择框有任意重叠即被选中
5. 替换当前选中集合（非追加）

#### Scenario: Rubber band selects overlapping notes

- **WHEN** 框选矩形覆盖音符 A 和 B 的部分区域，但未覆盖音符 C
- **THEN** 音符 A 和 B 被选中，C 不被选中

#### Scenario: Rubber band replaces previous selection

- **WHEN** 音符 A 已选中，用户框选出只包含音符 B 的区域
- **THEN** 音符 A 取消选中，音符 B 选中
