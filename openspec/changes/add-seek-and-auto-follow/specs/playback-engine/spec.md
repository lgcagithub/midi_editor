## MODIFIED Requirements

### Requirement: Transport state machine

系统 SHALL 维护一个三态 Transport 状态机：

- **STOPPED**：播放停止，cursor 位置由 `stopBehavior` 决定
- **PLAYING**：播放进行中，cursor 随时间前进
- **PAUSED**：播放暂停，cursor 保持在当前位置

状态转换：

- `play()`: STOPPED → PLAYING (cursor 从 0 开始) 或 PAUSED → PLAYING (cursor 从暂停位置继续)
- `pause()`: PLAYING → PAUSED
- `stop()`: PLAYING → STOPPED 或 PAUSED → STOPPED。cursor 行为由 `stopBehavior` 选项决定：`'reset'` 时 cursor 归零，`'keep'` 时 cursor 保留在当前位置
- `seekTo(tick)`: 任意状态均可调用——PLAYING 时重置 `startTime=audioCtx.currentTime, startTick=tick` 并继续播放；PAUSED/STOPPED 时直接设 `currentTick=tick`

Transport 状态 SHALL 包含以下字段：

- `state`: `'stopped'` | `'playing'` | `'paused'`
- `currentTick`: number — 当前播放位置
- `startTime`: number — 本次 play 开始的 `AudioContext.currentTime`
- `startTick`: number — 本次 play 开始时的 cursor tick
- `lastStartTick`: number — 最近一次 `play()` 或 `seekTo()` 设置 `startTick` 时的值，用于 `stopBehavior='return'`
- `stopBehavior`: `'reset'` | `'return'` — stop 后的 cursor 行为（默认 `'reset'`）。`reset` 回到 tick 0；`return` 回到 `lastStartTick`，即上次开始播放或 seek 的位置
- `endBehavior`: `'stop'` | `'loop'` — 播放到项目末尾的行为（默认 `'stop'`）
- `autoFollow`: boolean — 播放时是否自动跟随光标（默认 `true`）

#### Scenario: Play from stopped starts at tick 0

- **WHEN** state=STOPPED，调用 `play()`
- **THEN** state 变为 PLAYING，startTick=0，startTime=audioCtx.currentTime

#### Scenario: Play from paused resumes from pause point

- **WHEN** state=PAUSED，currentTick=960，调用 `play()`
- **THEN** state 变为 PLAYING，startTick=960，startTime=audioCtx.currentTime

#### Scenario: Pause from playing

- **WHEN** state=PLAYING，调用 `pause()`
- **THEN** state 变为 PAUSED，currentTick 保持在暂停时刻的位置

#### Scenario: Stop with reset behavior resets cursor to 0

- **WHEN** stopBehavior='reset'，state=PLAYING 或 PAUSED，调用 `stop()`
- **THEN** state 变为 STOPPED，currentTick=0

#### Scenario: Stop with return behavior goes back to last start position

- **WHEN** stopBehavior='return', lastStartTick=1920, state=PLAYING，调用 `stop()`
- **THEN** state 变为 STOPPED，currentTick=1920（回到上次 play/seek 的位置，而非当前播放位置）

#### Scenario: Seek while stopped

- **WHEN** state=STOPPED，调用 `seekTo(480)`
- **THEN** state 保持 STOPPED，currentTick=480

#### Scenario: Seek while playing

- **WHEN** state=PLAYING，调用 `seekTo(960)`
- **THEN** state 保持 PLAYING，startTick=960，startTime=audioCtx.currentTime，当前发声音符静音，播放从 tick=960 继续

#### Scenario: Seek while paused

- **WHEN** state=PAUSED, currentTick=100，调用 `seekTo(480)`
- **THEN** state 保持 PAUSED，currentTick=480，startTick=480

### Requirement: SoundSource interface

系统 SHALL 定义 `SoundSource` 接口，作为所有音源实现的抽象：

```typescript
interface SoundSource {
  noteOn(pitch: number, velocity: number, when: number, endTime?: number): void;
  noteOff(pitch: number, when: number): void;
  stopAll(when: number): void;
  setInstrument(program: number): void;
  dispose(): void;
}
```

- `noteOn`：在 `when` 秒（AudioContext 时间）开始演奏指定音高。可选的 `endTime` 参数指定音符结束的绝对音频时间，允许音源实现预调度完整的音量包络
- `noteOff`：在 `when` 秒停止指定音高
- `stopAll`：在 `when` 秒立即停止所有正在发声的音符并清理资源。用于 stop、pause、seek 操作时的快速静音
- `setInstrument`：切换 MIDI program（音色），各实现自行解释
- `dispose`：释放音频资源

#### Scenario: OscillatorBank satisfies SoundSource

- **WHEN** 创建 `OscillatorBank` 实例
- **THEN** 该实例满足 `SoundSource` 接口的所有方法签名，包括 `stopAll`

#### Scenario: SoundSource supports optional endTime

- **WHEN** 调用 `soundSource.noteOn(60, 100, 10.0)` 不传第 4 参数
- **THEN** 调用正常执行（兼容旧签名）

#### Scenario: stopAll silences all active oscillators

- **WHEN** OscillatorBank 有 3 个活跃振荡器（C4, E4, G4），调用 `stopAll(audioCtx.currentTime)`
- **THEN** 所有 3 个振荡器在指定时间停止并被清理

### Requirement: Look-ahead scheduler loop

系统 SHALL 使用 `setInterval` 运行调度循环，周期为 25ms。

每次循环执行以下逻辑：

1. 计算当前 `now = audioCtx.currentTime`
2. 调度窗口为 `[lastScheduledTime, now + lookAheadTime]`，其中 `lookAheadTime = 0.1` 秒
3. 遍历所有音轨中所有音符，找到 `noteOnTick` 和 `noteOffTick` 落在调度窗口内且尚未调度的事件
4. 对每个事件计算准确的 AudioContext 时间
5. 对于 noteOn 事件，SHALL 调用 `soundSource.noteOn(pitch, velocity, noteStartAudioTime, noteEndAudioTime)`
6. 对于 noteOff 事件，调用 `soundSource.noteOff(pitch, noteEndAudioTime)`
7. 推进 `lastScheduledTime` 到 `now + lookAheadTime`

Scheduler SHALL 提供 `resetScheduleWindow()` 方法，将 `lastScheduledTime` 重置为 `audioCtx.currentTime`，用于 seek 操作后重建调度窗口。

#### Scenario: Note within look-ahead window is scheduled with endTime

- **WHEN** 调度窗口覆盖到某音符的 startTick
- **THEN** `noteOn` 被调用并传入 `noteEndAudioTime` 作为第 4 参数

#### Scenario: Note outside look-ahead window is not scheduled yet

- **WHEN** 音符的 startTick 对应的 audioCtx 时间超出 `now + 0.1` 秒
- **THEN** 该音符不在本次循环中被调度，留待后续循环处理

#### Scenario: Already scheduled notes are skipped

- **WHEN** 音符的 startTick 对应的 audioCtx 时间 ≤ lastScheduledTime
- **THEN** 该音符本次不重复调度

#### Scenario: resetScheduleWindow after seek

- **WHEN** seek 到 tick=1920，调用 `scheduler.resetScheduleWindow()`
- **THEN** `lastScheduledTime` 设为 `audioCtx.currentTime`，下一次 tick 的调度窗口覆盖 seek 后的音符

## ADDED Requirements

### Requirement: Playback end-of-project detection

系统 SHALL 在调度循环中检测当前 tick 是否已超过项目中最后一个音符的结束位置（`maxEndTick = max(track.notes.map(n => n.startTick + n.duration))`）。

当 `currentTick >= maxEndTick` 且 `endBehavior='stop'` 时，系统 SHALL 自动调用 `stop()`。当 `endBehavior='loop'` 时，系统 SHALL 自动调用 `seekTo(0)`。

#### Scenario: Auto-stop at project end

- **WHEN** endBehavior='stop', maxEndTick=3840, currentTick 达到 3840
- **THEN** playbackManager 自动 stop

#### Scenario: Auto-loop at project end

- **WHEN** endBehavior='loop', maxEndTick=3840, currentTick 达到 3840
- **THEN** 播放自动 seek 到 tick=0 并继续

### Requirement: Manual scroll disables auto-follow

当用户在播放期间手动更改 `scrollX`（通过滚轮或中键拖拽），系统 SHALL 设置 `autoFollow = false`。当用户调用 `stop()` 后再 `play()` 时，`autoFollow` SHALL 恢复为 `true`。

#### Scenario: Wheel scroll disables auto-follow

- **WHEN** transportState='playing', autoFollow=true，用户在 Piano Roll 上滚动滚轮
- **THEN** autoFollow 变为 false

#### Scenario: Stop then play re-enables auto-follow

- **WHEN** autoFollow=false，用户调用 `stop()` 后调用 `play()`
- **THEN** autoFollow 变为 true

### Requirement: TransportBar playback mode toggles

TransportBar SHALL 在 SkipForward 按钮右侧渲染三个播放模式 toggle 按钮（Loop、Auto-Follow、Stop Behavior），与传输操作按钮通过 18px 间距形成视觉分组。

三个 toggle 按钮 SHALL 使用 Phosphor Duotone 图标集，遵循 Merengue 暗色主题胶囊样式：28px × 28px，border-radius 8px，基础态 `--surface2` 底 + `--text3` 图标色；激活态 `--accent` 20% 透明度底 + `--accent` 图标色；hover 态 `--surface3` 底 + `--text1` 图标色。过渡动画 SHALL 使用 spring easing（`all 0.15s ease`）。

#### Scenario: Loop toggle switches endBehavior

- **WHEN** endBehavior='stop'，用户点击 Loop 按钮
- **THEN** endBehavior 变为 'loop'，按钮变为 coral 激活态；再次点击则切回 'stop'，按钮变回灰色

#### Scenario: Auto-follow toggle switches autoFollow

- **WHEN** autoFollow=true，用户点击 Auto-Follow 按钮
- **THEN** autoFollow 变为 false，按钮变为灰色；再次点击则恢复 true 和 coral 激活态

#### Scenario: Auto-follow button reflects manual scroll disable

- **WHEN** autoFollow=true（按钮 coral），用户手动滚动滚轮导致 autoFollow 变为 false
- **THEN** Auto-Follow 按钮 UI 同步变为灰色非激活态

#### Scenario: Stop behavior dropdown shows two options

- **WHEN** 用户点击 Stop Behavior（齿轮）按钮
- **THEN** 弹出面板显示 Reset（回到开头）和 Return（回到上次播放起点）两个选项，当前选中项左侧显示 coral checkmark

#### Scenario: Stop behavior dropdown selects return

- **WHEN** stopBehavior='reset'，用户打开下拉并点击 Return
- **THEN** stopBehavior 变为 'return'，面板关闭；后续 stop 操作光标回到 `lastStartTick` 而非 tick 0

#### Scenario: Stop behavior dropdown dismisses on outside click

- **WHEN** Stop Behavior 下拉面板打开，用户点击面板外任意位置
- **THEN** 面板关闭，stopBehavior 不变
