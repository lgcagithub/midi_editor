## Purpose

### Requirement: Command interface

## ADDED Requirements

### Requirement: Command interface

系统 SHALL 定义 `Command` 接口，每个编辑操作封装为一个 Command 对象：

```typescript
interface Command {
  execute(): void;
  undo(): void;
}
```

- `execute()`：执行操作（含新建时的首次执行）
- `undo()`：反向操作，将状态恢复到执行前

#### Scenario: Command execute and undo are symmetric

- **WHEN** 执行 `cmd.execute()` 后执行 `cmd.undo()`
- **THEN** 项目状态恢复到 `execute()` 之前

### Requirement: UndoManager

系统 SHALL 提供 `UndoManager` 类管理撤销/重做栈：

- `undoStack`: Command[] — 已执行的命令列表
- `redoStack`: Command[] — 已撤销的命令列表
- `maxDepth`: number — 最大撤销深度，默认 200
- `execute(command)`: 执行命令，推入 undoStack，清空 redoStack
- `undo()`: 从 undoStack 弹出最近命令，调用其 `undo()`，推入 redoStack
- `redo()`: 从 redoStack 弹出最近命令，调用其 `execute()`，推入 undoStack

#### Scenario: Undo reverses last action

- **WHEN** 用户添加了一个音符后调用 `undo()`
- **THEN** 该音符从音轨中移除

#### Scenario: Redo restores undone action

- **WHEN** 用户撤销后调用 `redo()`
- **THEN** 被撤销的音符重新出现

#### Scenario: New action clears redo stack

- **WHEN** 用户撤销一次后执行新的编辑操作
- **THEN** redoStack 被清空，之前撤销的内容不可重做

#### Scenario: Stack overflow discards oldest

- **WHEN** undoStack 长度达到 maxDepth (200)，执行第 201 个命令
- **THEN** 最早（最旧）的命令被丢弃，新命令压入栈顶

### Requirement: AddNoteCommand

系统 SHALL 提供 `AddNoteCommand` 实现添加音符操作：

- `execute()`：向指定音轨添加音符
- `undo()`：从音轨中移除该音符（按 id 匹配）

#### Scenario: Undo add note

- **WHEN** 执行 AddNoteCommand 后调用 undo
- **THEN** 添加的音符从音轨中移除

### Requirement: DeleteNotesCommand

系统 SHALL 提供 `DeleteNotesCommand` 实现删除音符操作，支持单个或批量：

- 构造时存储被删音符的完整数据和所属音轨
- `execute()`：从音轨中移除这些音符
- `undo()`：将存储的音符还原到原音轨

#### Scenario: Undo delete restores notes

- **WHEN** 删除 3 个音符后调用 undo
- **THEN** 3 个音符原样还原到各自音轨，id、pitch、duration 等字段不变

### Requirement: MoveNotesCommand

系统 SHALL 提供 `MoveNotesCommand` 实现音符移动操作（拖拽）：

- 构造时存储移动前后状态：`[{noteId, oldStartTick, oldPitch, newStartTick, newPitch}, ...]`
- `execute()`：将音符 startTick 和 pitch 设为 new 值
- `undo()`：将音符 startTick 和 pitch 恢复为 old 值
- 支持同时移动多个音符（批量拖拽选中音符）

#### Scenario: Undo move restores original position

- **WHEN** 拖拽 2 个音符到新位置后调用 undo
- **THEN** 2 个音符恢复到移动前的 startTick 和 pitch

### Requirement: ResizeNoteCommand

系统 SHALL 提供 `ResizeNoteCommand` 实现音符拉伸操作：

- 构造时存储：`{noteId, oldStartTick, oldDuration, newStartTick, newDuration}`
- 拉伸左边缘时 startTick 变、duration 变、结束位置不变
- 拉伸右边缘时 startTick 不变、duration 变
- `execute()`：应用新值
- `undo()`：恢复旧值

#### Scenario: Undo resize restores original duration

- **WHEN** 将音符从 duration=480 拉伸到 960 后调用 undo
- **THEN** 音符 duration 恢复为 480

### Requirement: Drag command aggregation

拖拽/拉伸操作期间的中间帧 SHALL NOT 产生命令。仅在 `mouseup` 时生成一条 `MoveNotesCommand` 或 `ResizeNoteCommand` 压入 undoStack：

- mousedown：记录所有受影响音符的 old 状态
- mousemove：实时更新音符位置/尺寸（UI 预览，不产生命令）
- mouseup：用最终位置/尺寸创建命令，调用 `undoManager.execute(cmd)`

#### Scenario: Entire drag produces single undo entry

- **WHEN** 用户拖拽音符跨越 500 像素释放
- **THEN** undoStack 增加 1 条 MoveNotesCommand，而非每帧 1 条

### Requirement: Keyboard shortcut for undo/redo

系统 SHALL 支持键盘快捷键触发撤销/重做：

- **Ctrl+Z**（Windows/Linux）或 **Cmd+Z**（macOS）→ `undoManager.undo()`
- **Ctrl+Y** 或 **Ctrl+Shift+Z** 或 **Cmd+Shift+Z** → `undoManager.redo()`

#### Scenario: Ctrl+Z triggers undo

- **WHEN** 用户按下 Ctrl+Z
- **THEN** undoManager.undo() 被调用
