## ADDED Requirements

### Requirement: Transport state machine

系统 SHALL 维护一个三态 Transport 状态机：

- **STOPPED**：播放停止，cursor 归零
- **PLAYING**：播放进行中，cursor 随时间前进
- **PAUSED**：播放暂停，cursor 保持在当前位置

状态转换：

- `play()`: STOPPED → PLAYING (cursor 从 0 开始) 或 PAUSED → PLAYING (cursor 从暂停位置继续)
- `pause()`: PLAYING → PAUSED
- `stop()`: PLAYING → STOPPED 或 PAUSED → STOPPED (cursor 归零)

Transport 状态 SHALL 包含以下字段：

- `state`: `'stopped'` | `'playing'` | `'paused'`
- `currentTick`: number — 当前播放位置
- `startTime`: number — 本次 play 开始的 `AudioContext.currentTime`
- `startTick`: number — 本次 play 开始时的 cursor tick

#### Scenario: Play from stopped starts at tick 0

- **WHEN** state=STOPPED，调用 `play()`
- **THEN** state 变为 PLAYING，startTick=0，startTime=audioCtx.currentTime

#### Scenario: Play from paused resumes from pause point

- **WHEN** state=PAUSED，currentTick=960，调用 `play()`
- **THEN** state 变为 PLAYING，startTick=960，startTime=audioCtx.currentTime

#### Scenario: Pause from playing

- **WHEN** state=PLAYING，调用 `pause()`
- **THEN** state 变为 PAUSED，currentTick 保持在暂停时刻的位置

#### Scenario: Stop from playing resets cursor to 0

- **WHEN** state=PLAYING，调用 `stop()`
- **THEN** state 变为 STOPPED，currentTick=0

#### Scenario: Stop from paused resets cursor to 0

- **WHEN** state=PAUSED，调用 `stop()`
- **THEN** state 变为 STOPPED，currentTick=0

### Requirement: Current tick calculation during playback

播放中，`currentTick` SHALL 通过以下公式计算：

```
currentTick = startTick + secondsToTick(elapsed, tempoMap, ppq, startTick)
其中 elapsed = audioCtx.currentTime - startTime
```

#### Scenario: Two seconds of playback from tick 480

- **WHEN** state=PLAYING, startTick=480, tempo=120 BPM, ppq=480, elapsed=2.0s
- **THEN** currentTick = 480 + 1920 = 2400

### Requirement: Look-ahead scheduler loop

系统 SHALL 使用 `setInterval` 运行调度循环，周期为 25ms。

每次循环执行以下逻辑：

1. 计算当前 `now = audioCtx.currentTime`
2. 调度窗口为 `[lastScheduledTime, now + lookAheadTime]`，其中 `lookAheadTime = 0.1` 秒
3. 遍历所有音轨中所有音符，找到 `noteOnTick` 和 `noteOffTick` 落在调度窗口内且尚未调度的事件
4. 对每个事件计算准确的 AudioContext 时间：`eventTime = transport.startTime + tickDeltaToSeconds(eventTick - transport.startTick, tempoMap, ppq, transport.startTick)`
5. 调用 `soundSource.noteOn()` 或 `soundSource.noteOff()` 在指定时间安排音频
6. 推进 `lastScheduledTime` 到 `now + lookAheadTime`

#### Scenario: Note within look-ahead window is scheduled

- **WHEN** 调度窗口覆盖到某音符的 startTick
- **THEN** 该音符的 Note On 在对应的准确 audioCtx 时间被安排

#### Scenario: Note outside look-ahead window is not scheduled yet

- **WHEN** 音符的 startTick 对应的 audioCtx 时间超出 `now + 0.1` 秒
- **THEN** 该音符不在本次循环中被调度，留待后续循环处理

#### Scenario: Already scheduled notes are skipped

- **WHEN** 音符的 startTick 对应的 audioCtx 时间 ≤ lastScheduledTime
- **THEN** 该音符本次不重复调度

### Requirement: Tab background compensation

系统 SHALL 在页面从后台恢复时处理调度追赶：由于浏览器在后台标签页中降频 `setInterval`，恢复前台时 `transport` 基于 `audioCtx.currentTime` 重新计算 `currentTick`，然后将 `lastScheduledTime` 重置为当前 `currentTime`，通过 `setInterval` 循环一次性安排追赶窗口内所有缺失事件。

#### Scenario: Resume after background tab

- **WHEN** 标签页在后台停留 5 秒后恢复，期间播放未暂停
- **THEN** currentTick 基于 currentTime 重算，已过去区间的音符 Note On 不补发，当前和未来窗口内的事件正常安排

### Requirement: Playback cursor via requestAnimationFrame

播放光标的位置 SHALL 通过独立的 `requestAnimationFrame` 循环计算和更新，与调度 `setInterval` 解耦：

```
cursorTick = transport.startTick + secondsToTick(audioCtx.currentTime - transport.startTime, tempoMap, ppq, transport.startTick)
```

光标像素位置由 `cursorTick` 经坐标映射函数得出，传递到光标层 Canvas 进行绘制。

#### Scenario: Cursor updates at frame rate

- **WHEN** 播放进行中
- **THEN** 播放光标每帧（约 16.7ms）更新一次位置

#### Scenario: Cursor stops on pause

- **WHEN** transport state 变为 PAUSED
- **THEN** rAF 循环终止，光标停在当前位置

### Requirement: SoundSource interface

系统 SHALL 定义 `SoundSource` 接口，作为所有音源实现的抽象：

```typescript
interface SoundSource {
  noteOn(pitch: number, velocity: number, when: number): void;
  noteOff(pitch: number, when: number): void;
  setInstrument(program: number): void;
  dispose(): void;
}
```

- `noteOn`：在 `when` 秒（AudioContext 时间）开始演奏指定音高
- `noteOff`：在 `when` 秒停止指定音高
- `setInstrument`：切换 MIDI program（音色），各实现自行解释
- `dispose`：释放音频资源

#### Scenario: OscillatorBank satisfies SoundSource

- **WHEN** 创建 `OscillatorBank` 实例
- **THEN** 该实例满足 `SoundSource` 接口的所有方法签名

### Requirement: OscillatorBank — initial sound source

系统 SHALL 实现 `OscillatorBank` 作为初始音源，使用 Web Audio API 的 `OscillatorNode`：

- `noteOn` 创建新的 `OscillatorNode`（方波），连接 `GainNode`（力度/127×0.3 增益），振荡器频率通过 `midiToHz(pitch)` 设定
- `noteOff` 在指定时间调用 `osc.stop(when)`，并清理对应资源
- 每个 pitch 的活跃振荡器被追踪，以免资源泄漏

#### Scenario: Note on creates oscillator

- **WHEN** 调用 `noteOn(60, 100, audioCtx.currentTime + 0.05)`
- **THEN** 在 0.05 秒后演奏 C4，频率约 261.6Hz，增益约 0.236

#### Scenario: Note off stops oscillator

- **WHEN** 调用 `noteOff(60, audioCtx.currentTime + 0.5)`
- **THEN** 在 0.5 秒后停止 C4 对应的振荡器

### Requirement: AudioContext user gesture unlock

系统 SHALL 在首次用户交互（点击播放按钮）时调用 `audioCtx.resume()`，满足浏览器自动播放策略要求。`AudioContext` SHALL 在应用启动时创建，但仅在用户手势后恢复运行。

#### Scenario: AudioContext starts suspended

- **WHEN** 应用首次加载
- **THEN** `audioCtx.state` 为 `'suspended'`

#### Scenario: Play button resumes AudioContext

- **WHEN** 用户点击播放按钮
- **THEN** `audioCtx.resume()` 被调用，`audioCtx.state` 变为 `'running'`
