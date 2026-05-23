## ADDED Requirements

### Requirement: Project structure

系统 SHALL 维护一个 `Project` 对象作为顶层数据容器，包含：

- `ppq`: number — pulses per quarter note，默认值 480
- `tracks`: Track[] — 音轨列表，至少包含一个音轨
- `tempoMap`: TempoEvent[] — 速度变化事件列表
- `timeSigs`: TimeSigEvent[] — 拍号变化事件列表

#### Scenario: Create default project

- **WHEN** 创建一个新的空项目
- **THEN** 项目包含一个空音轨、一个默认 tempo 事件 (tick=0, bpm=120)、一个默认拍号事件 (tick=0, 4/4)、ppq=480

### Requirement: Note structure

系统 SHALL 用 `Note` 表示单个音符，包含字段：

- `id`: string — 唯一标识
- `pitch`: number — MIDI 音高，约束在 88 键钢琴范围 (21-108, A0 到 C8)
- `startTick`: number — 起始位置，单位 tick，≥ 0
- `duration`: number — 时长，单位 tick，> 0
- `velocity`: number — 力度 (0-127)

#### Scenario: Create a note

- **WHEN** 创建一个新音符 pitch=60, startTick=0, duration=480, velocity=100
- **THEN** 音符各字段为给定值，且 `id` 为唯一非空字符串

### Requirement: Track structure

系统 SHALL 用 `Track` 表示一个音轨，包含字段：

- `id`: string — 唯一标识
- `name`: string — 音轨名称
- `instrument`: number — MIDI program number (0-127)
- `color`: string — 显示颜色
- `notes`: Note[] — 该音轨包含的音符列表

#### Scenario: Add note to track

- **WHEN** 向音轨添加一个音符
- **THEN** 音轨的 `notes` 数组包含该音符

### Requirement: Tempo event structure

系统 SHALL 用 `TempoEvent` 表示速度变化，包含字段：

- `tick`: number — 从哪个 tick 开始生效，≥ 0
- `bpm`: number — 每分钟拍数，> 0

`tempoMap` 中的事件 SHALL 按 `tick` 升序排列，首个事件的 `tick` 必须为 0。

#### Scenario: Tempo map with single event

- **WHEN** tempoMap 为 `[{tick: 0, bpm: 120}]`
- **THEN** 整个时间范围内速度为 120 BPM

#### Scenario: Tempo map must start at tick 0

- **WHEN** 尝试设置首个 tempo 事件的 tick > 0
- **THEN** 抛出错误，提示 tempo map 首个事件必须从 tick 0 开始

### Requirement: Time signature event structure

系统 SHALL 用 `TimeSigEvent` 表示拍号变化，包含字段：

- `tick`: number — 从哪个 tick 开始生效，≥ 0
- `numerator`: number — 每小节拍数
- `denominator`: number — 以几分音符为一拍

`timeSigs` 中的事件 SHALL 按 `tick` 升序排列，首个事件的 `tick` 必须为 0。

#### Scenario: Default time signature

- **WHEN** timeSigs 为 `[{tick: 0, numerator: 4, denominator: 4}]`
- **THEN** 整个时间范围为 4/4 拍

### Requirement: tick-to-seconds conversion

系统 SHALL 提供函数 `tickToSeconds(targetTick, tempoMap, ppq)`，返回从 tick 0 到 `targetTick` 经过的累计秒数。

转换公式：`seconds += (deltaTicks / ppq) * (60 / bpm)`，对 tempoMap 中的每个速度段分别计算后累加。

#### Scenario: Constant tempo no events between

- **WHEN** tempoMap 仅含 `{tick: 0, bpm: 120}`，ppq=480，targetTick=960
- **THEN** 返回 1.0 秒

#### Scenario: Two tempo segments

- **WHEN** tempoMap 为 `[{tick: 0, bpm: 120}, {tick: 1920, bpm: 80}]`，ppq=480，targetTick=3840
- **THEN** 返回 1920/480*(60/120) + 1920/480*(60/80) = 2.0 + 3.0 = 5.0 秒

#### Scenario: No tempo events

- **WHEN** tempoMap 为空数组
- **THEN** 按默认 120 BPM 计算

### Requirement: seconds-to-tick conversion

系统 SHALL 提供函数 `secondsToTick(targetSeconds, tempoMap, ppq, startTick)`，返回从 `startTick` 出发经过 `targetSeconds` 秒后达到的 tick 位置。

转换需要遍历 tempoMap 的速度段，反向累加 tick，直到累加秒数达到 `targetSeconds`。

#### Scenario: Constant tempo

- **WHEN** tempoMap 仅含 `{tick: 0, bpm: 120}`，ppq=480，startTick=0，targetSeconds=2.0
- **THEN** 返回 1920 tick

#### Scenario: From non-zero start

- **WHEN** tempoMap 为 `[{tick: 0, bpm: 120}]`，ppq=480，startTick=480，targetSeconds=1.0
- **THEN** 返回 1440 tick

#### Scenario: Across tempo change

- **WHEN** tempoMap 为 `[{tick: 0, bpm: 120}, {tick: 1920, bpm: 60}]`，ppq=480，startTick=0，targetSeconds=3.0
- **THEN** 前 2 秒走完 1920 tick (120 BPM)，剩余 1 秒按 60 BPM 走 = 1*(60/60)*480 = 480 tick，返回 2400 tick

### Requirement: 88-key piano range constraint

音符 `pitch` SHALL 约束在 88 键钢琴范围（21-108，A0 到 C8）。创建或修改音符时，pitch 超出此范围 SHALL 被钳制到 21（下限）或 108（上限）。

#### Scenario: Note pitch at lowest valid key

- **WHEN** 创建音符 pitch=21 (A0)
- **THEN** 音符正常创建

#### Scenario: Note pitch at highest valid key

- **WHEN** 创建音符 pitch=108 (C8)
- **THEN** 音符正常创建

#### Scenario: Note pitch below 88-key range is clamped

- **WHEN** 创建音符 pitch=10
- **THEN** pitch 被钳制为 21

### Requirement: Black key identification

系统 SHALL 提供函数 `isBlackKey(pitch)`，当 `pitch % 12` 为 1, 3, 6, 8, 10 时返回 `true`，否则返回 `false`。

#### Scenario: White key C

- **WHEN** pitch=60 (C4)
- **THEN** `isBlackKey(60)` 返回 `false`

#### Scenario: Black key C#

- **WHEN** pitch=61 (C#4)
- **THEN** `isBlackKey(61)` 返回 `true`

#### Scenario: White key E

- **WHEN** pitch=64 (E4)
- **THEN** `isBlackKey(64)` 返回 `false`
