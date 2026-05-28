## Purpose

### Requirement: SMF format 0 and 1 support

## ADDED Requirements

### Requirement: SMF format 0 and 1 support

系统 SHALL 支持解析和生成 SMF (Standard MIDI File) format 0（单音轨）和 format 1（多音轨）。format 2 不在初期支持范围内，遇到时 SHALL 给出明确错误提示。

#### Scenario: Load format 1 MIDI file

- **WHEN** 用户加载一个 format 1 的 .mid 文件（含 tempo 轨和多个音符轨）
- **THEN** 解析成功，各音轨分离为 Project 中的独立 Track

#### Scenario: Load format 0 MIDI file

- **WHEN** 用户加载一个 format 0 的 .mid 文件
- **THEN** 解析成功，单个音轨的数据转为 Project 中的单 Track

#### Scenario: Unsupported format 2

- **WHEN** 尝试加载 format 2 的 MIDI 文件
- **THEN** 解析失败，返回错误信息说明不支持的格式

### Requirement: Header chunk parsing

系统 SHALL 解析 SMF 文件头（MThd chunk），提取：

- `format`: 0, 1, 或 2
- `trackCount`: 音轨数量
- `division`: PPQ（pulses per quarter note）或 SMPTE 格式

若 division 的 bit 15 为 1（SMPTE 格式），初期 SHALL 报错不支持。

#### Scenario: Parse standard header

- **WHEN** 文件头为 format=1, trackCount=3, division=480
- **THEN** 解析结果为 ppq=480，预期 3 个音轨

### Requirement: Variable-length quantity decoding

系统 SHALL 正确解码 MIDI 的变长量（VLQ）编码的 delta time 值。

VLQ 规则：每字节低 7 位为数据，最高位（bit 7）为 1 表示后续还有字节，为 0 表示结束。最多 4 字节。

#### Scenario: Single byte VLQ

- **WHEN** delta time 编码为 `0x40`
- **THEN** 解码值为 64

#### Scenario: Two byte VLQ

- **WHEN** delta time 编码为 `0x81 0x7F`
- **THEN** 解码值为 (0x01 << 14) + (0x7F << 7) + ... wait, VLQ:
  0x81 = 1000_0001 → data=0x01, continue
  0x7F = 0111_1111 → data=0x7F, stop
  结果 = (0x01 << 7) | 0x7F = 128 + 127 = 255

Wait, that's wrong. Let me think again.

VLQ: each byte contributes 7 bits. First byte's data bits are most significant.
0x81 = 1000_0001 → low 7 bits = 0x01, has next = true
0x7F = 0111_1111 → low 7 bits = 0x7F, has next = false

result = (0x01 << 7) | 0x7F = 128 | 127 = 255

Actually wait, VLQ reading: starting from the leftmost byte, each provides the next 7 most significant bits.
0x81 → contribution = 0x01, continue
0x7F → contribution = 0x7F, stop
result = (0x01 << 7) | 0x7F = 128 + 127 = 255

Yes, that's correct. Let me keep this.

#### Scenario: Maximum two byte VLQ

- **WHEN** delta time 编码为 `0xFF 0x7F`
- **THEN** 解码值为 (0x7F << 7) | 0x7F = 16383

### Requirement: Running status support

系统 SHALL 在解析时处理 running status：若事件字节的首字节 < 0x80（非状态字节），则沿用上一个事件的 status byte。

#### Scenario: Running status note sequence

- **WHEN** 音轨数据为 `[status=0x90, pitch, vel, pitch, vel, pitch, vel]`（后两个 note 无显式 status）
- **THEN** 解析出 3 个 Note On 事件，后两个复用 status 0x90

### Requirement: Note On and Note Off event parsing

系统 SHALL 解析以下 MIDI 事件生成内部 Note：

- **Note On**（status 0x9n, velocity > 0）：创建活跃音符记录
- **Note Off**（status 0x8n）或 **Note On with velocity=0**：结束活跃音符，生成 Note（含 startTick 和 duration）

音符的 `startTick` 为 Note On 事件的累计 tick，`duration` = Note Off 的累计 tick − Note On 的累计 tick。

#### Scenario: Note on then note off

- **WHEN** tick=0 有 Note On (pitch=60, vel=100)，tick=480 有 Note Off (pitch=60)
- **THEN** 生成一个 Note {pitch: 60, startTick: 0, duration: 480, velocity: 100}

#### Scenario: Note on with velocity 0 as note off

- **WHEN** tick=240 有 Note On (pitch=72, vel=0)
- **THEN** 该事件被视为 Note Off，结束当前活跃的 pitch=72 音符

### Requirement: Meta event parsing

系统 SHALL 解析以下必要 Meta 事件：

- **Tempo**（FF 51 03）：设置 bpm = 60,000,000 / microsecondsPerQuarterNote
- **Time Signature**（FF 58 04）：提取 numerator, denominator
- **End of Track**（FF 2F 00）：标识音轨结束

其他 Meta 事件（如 Track Name, Instrument Name, Lyrics 等）SHALL 被跳过而不报错。

#### Scenario: Tempo meta event

- **WHEN** 解析到 tempo meta 事件 `FF 51 03 07 A1 20`（microsecondsPerQuarterNote = 500000）
- **THEN** bpm = 60,000,000 / 500,000 = 120，存入 tempoMap

#### Scenario: End of track stops parsing

- **WHEN** 解析到 End of Track meta 事件
- **THEN** 当前音轨解析完成，继续下一个音轨

### Requirement: MIDI event types skipped

系统 SHALL 安全跳过以下事件而不影响解析：System Exclusive (SysEx)、未识别的 Meta 事件（仅跳过其数据长度）、Control Change 事件。

#### Scenario: SysEx event skipped

- **WHEN** 解析到 SysEx 事件（0xF0 或 0xF7）
- **THEN** 按长度字段跳过数据，不影响后续事件解析

### Requirement: Project to SMF serialization

系统 SHALL 将 `Project` 对象序列化为 SMF format 1 文件：

- **Header**：format=1, trackCount=Track.length + 1（额外 tempo 轨），division=ppq
- **Tempo Track**（track 0）：包含所有 Tempo 和 TimeSig 事件的 delta-time 编码序列
- **Note Tracks**（track 1..N）：每个 Track 生成包含 Program Change 和 Note On/Off 事件的序列

事件按 tick 排序，delta time = 当前事件 tick − 上一事件 tick。输出 `Uint8Array` 供浏览器 File API 下载。

#### Scenario: Serialize project with one track

- **WHEN** Project 含 1 个音轨，ppq=480，tempoMap=[{tick: 0, bpm: 120}]，音轨含一个 Note {pitch: 60, startTick: 0, duration: 480}
- **THEN** 生成有效 SMF format 1 文件（含 tempo 轨 + 1 个音符轨）

### Requirement: File load via File API

系统 SHALL 通过浏览器 File API 加载 .mid 文件：用户通过文件选择器或拖拽选择文件，读取为 `ArrayBuffer`，传入解析器。解析器返回完整的 `Project` 对象，替换当前编辑器中的项目状态。

#### Scenario: User loads a MIDI file

- **WHEN** 用户通过文件选择器打开 test.mid
- **THEN** 文件内容被解析为 Project，编辑器展示其音轨和音符

### Requirement: File save via File API

系统 SHALL 将当前 `Project` 序列化后通过浏览器 download 能力保存为 .mid 文件：生成 Blob，创建下载链接，触发下载。

#### Scenario: User saves project

- **WHEN** 用户点击保存按钮
- **THEN** 浏览器下载一个 .mid 文件，其内容为当前 Project 的 SMF 序列化结果

### Requirement: Error handling for invalid files

系统 SHALL 在解析无效 MIDI 文件时返回明确的错误信息，而非崩溃：

- 文件长度不足（小于 14 字节的最小 MThd chunk）
- MThd/MTrk chunk 标识符不匹配
- 音轨数据截断（chunk 内数据不完整）

#### Scenario: Invalid file header

- **WHEN** 加载的文件不以 "MThd" 开头
- **THEN** 返回错误："无效的 MIDI 文件：缺少文件头标识"
