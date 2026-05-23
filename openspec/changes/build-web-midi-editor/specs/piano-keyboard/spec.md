## ADDED Requirements

### Requirement: Keyboard range

系统 SHALL 在标准 88 键钢琴范围内绘制键盘，对应 MIDI 音高 A0 (21) 到 C8 (108)。

88 键中白键 52 个，黑键 36 个。键盘区域通过 `keyboardWidth` 和 `keyboardHeight` 定义，根据横/纵向布局分别表示键盘的总宽度或总高度。

#### Scenario: Lowest key is A0

- **WHEN** 绘制键盘
- **THEN** 键盘第一个可识别键位对应 pitch=21 (A0)

#### Scenario: Highest key is C8

- **WHEN** 绘制键盘
- **THEN** 键盘最后一个可识别键位对应 pitch=108 (C8)

### Requirement: White key geometry

在纵向布局（键盘左侧，垂直展开）中，系统 SHALL 按以下规则计算白键尺寸：

- `whiteKeyHeight = keyboardHeight / 52`
- 每个白键高度均匀分布，52 个白键填满整个键盘区域

在横向布局中，宽高互换，`whiteKeyWidth = keyboardWidth / 52`。

#### Scenario: White keys fill keyboard

- **WHEN** keyboardHeight=1040px
- **THEN** whiteKeyHeight=20px，52 个白键累计高度 = 1040px

### Requirement: Black key geometry based on equal temperament

系统 SHALL 按十二平均律计算黑键尺寸，而非按白键等比例缩放：

- `blackKeySize = whiteKeySize × 7 / 12`

在纵向布局中 `blackKeyHeight = whiteKeyHeight × 7 / 12`；在横向布局中 `blackKeyWidth = whiteKeyWidth × 7 / 12`。

含义：一个八度含 7 个白键和 12 个半音，黑键宽度等于一个半音的宽度。

#### Scenario: Black key height relative to white key

- **WHEN** whiteKeyHeight=20px
- **THEN** blackKeyHeight = 20 × 7 / 12 ≈ 11.67px

### Requirement: First black key offset

首个黑键 A#0 的位置 SHALL 按以下公式计算：

- 纵向：`firstBlackKeyY = keyboardTop + whiteKeyHeight × 2 - blackKeyHeight × 2`
- 横向：`firstBlackKeyX = keyboardLeft + whiteKeyWidth × 2 - blackKeyWidth × 2`

该公式基于：0 区有 2 个白键（A0, B0），A#0 覆盖两个白键的连接处，起始位置从 0 区右侧往回退 2 个黑键尺寸。

#### Scenario: First black key A#0 position

- **WHEN** whiteKeyHeight=20px, blackKeyHeight=11.667px, keyboardTop=0
- **THEN** firstBlackKeyY = 0 + 40 - 23.334 = 16.666px

### Requirement: Two-layer drawing order

系统 SHALL 先绘制白键层，再绘制黑键层，使黑键视觉上叠在白键上方。

- **白键层**：按 52 白键索引遍历，每个白键填满整行，行间绘制分割线。C 键位置标注文字（八度编号）
- **黑键层**：按 88 键索引遍历，仅对 `isBlackKey(pitch)` 返回 `true` 的键位绘制黑键矩形，黑键高度/宽度为行尺寸的 65%，在行内居中

#### Scenario: Black key visually overlaps white key layer

- **WHEN** 键盘渲染完成
- **THEN** 黑键行中可见黑键矩形覆盖在白键底色上方，黑键左右两侧露出白键底色

#### Scenario: C key has octave label

- **WHEN** pitch % 12 === 0
- **THEN** 该白键行绘制"C"及八度编号文字（如 "C4"）

### Requirement: Virtual rendering for keyboard

键盘绘制 SHALL 执行视口裁剪，仅绘制当前可见音高范围内的键位：

- 可见音高范围由 Piano Roll 画布的纵向视口范围决定，两者同步滚动
- `firstVisiblePitch = yToPitch(scrollY + canvasHeight)`, `lastVisiblePitch = yToPitch(scrollY)`

#### Scenario: Only visible keys are drawn

- **WHEN** 视口仅显示 pitch 60-80 范围
- **THEN** 仅 pitch 21-59 和 81-108 范围的键不被绘制

### Requirement: Keyboard click detection — black key priority

键盘点击检测 SHALL 先判定点击是否落在黑键区域内，再判定白键区域：

1. 检查点击位置是否在键盘的**黑键共存高度区域**内（黑键矩形覆盖的范围）
2. 若在：使用 88 键网格（12 等分）定位，若对应的 pitch 为黑键音，则返回黑键命中
3. 若不在黑键共存区或未命中黑键：使用 52 白键分布定位，通过白键索引到 MIDI pitch 的映射函数返回命中

所有索引计算 SHALL 使用 `Math.floor`，不使用 `Math.round`。

#### Scenario: Click on black key returns black key pitch

- **WHEN** 点击落在 C#4 的黑键矩形区域内
- **THEN** 返回 `{pitch: 61, keyType: 'black'}`

#### Scenario: Click on white key area of black key row returns white key pitch

- **WHEN** 点击落在 C#4 行但不在黑键矩形内（黑键上下的白键底色区域）
- **THEN** 返回邻近白键的 pitch

#### Scenario: Click below black key zone uses 52-white-key distribution

- **WHEN** 点击落在键盘底部白键独占区域
- **THEN** 使用 52 等分定位，返回对应该位置的白键 pitch

### Requirement: White key index to MIDI pitch mapping

系统 SHALL 维护白键索引（0-51）与 MIDI pitch（21-108）的双向映射：

- 0 区（A0-B0）：白键索引 0、1 → pitch 21、23
- 1-7 区（C1-B7）：每区 7 白键，C 至 B
- 8 区（C8）：白键索引 51 → pitch 108

映射函数 SHALL 使用音乐八度（`musicalOctave = Math.floor(pitch / 12) - 1`）和半音偏移数组 `[0, 2, 4, 5, 7, 9, 11]` 进行转换。

#### Scenario: White index 0 maps to A0

- **WHEN** 调用 `whiteIndexToPitch(0)`
- **THEN** 返回 21

#### Scenario: White index 51 maps to C8

- **WHEN** 调用 `whiteIndexToPitch(51)`
- **THEN** 返回 108

#### Scenario: C4 maps back to correct white index

- **WHEN** 调用 `pitchToWhiteIndex(60)`
- **THEN** 返回 23（2 + (4-1)×7 + 0 = 23）

### Requirement: Orientation support

键盘绘制 SHALL 同时支持纵向（左侧）和横向（底部）两种布局，所有几何计算通过同一套公式，仅交换 x/y 轴和宽/高概念。

#### Scenario: Horizontal keyboard uses width-based geometry

- **WHEN** orientation='horizontal'
- **THEN** 白键按 `keyboardWidth / 52` 均匀分布，黑键宽度 = `whiteKeyWidth × 7 / 12`，键盘横向展开
