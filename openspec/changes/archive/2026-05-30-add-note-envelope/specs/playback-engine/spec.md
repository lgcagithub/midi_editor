## MODIFIED Requirements

### Requirement: SoundSource interface

系统 SHALL 定义 `SoundSource` 接口，作为所有音源实现的抽象：

```typescript
interface SoundSource {
  noteOn(pitch: number, velocity: number, when: number, endTime?: number): void;
  noteOff(pitch: number, when: number): void;
  setInstrument(program: number): void;
  dispose(): void;
}
```

- `noteOn`：在 `when` 秒（AudioContext 时间）开始演奏指定音高。可选的 `endTime` 参数指定音符结束的绝对音频时间，允许音源实现预调度完整的音量包络
- `noteOff`：在 `when` 秒停止指定音高
- `setInstrument`：切换 MIDI program（音色），各实现自行解释
- `dispose`：释放音频资源

#### Scenario: OscillatorBank satisfies SoundSource

- **WHEN** 创建 `OscillatorBank` 实例
- **THEN** 该实例满足 `SoundSource` 接口的所有方法签名，包括可选的 `endTime` 参数

#### Scenario: SoundSource supports optional endTime

- **WHEN** 调用 `soundSource.noteOn(60, 100, 10.0)` 不传第 4 参数
- **THEN** 调用正常执行（兼容旧签名）

### Requirement: OscillatorBank — initial sound source

系统 SHALL 实现 `OscillatorBank` 作为初始音源，使用 Web Audio API 的 `OscillatorNode`：

- `noteOn(pitch, velocity, when, endTime?)` 创建新的 `OscillatorNode`（方波），连接 `GainNode`，振荡器频率通过 `midiToHz(pitch)` 设定
- 当 `endTime` 提供时，增益遵循指数衰减包络：2ms attack → 以 `τ = (endTime - when - 2ms) / 4` 的时间常数指数衰减趋近 `peakGain × 0.05`
- 当 `endTime` 未提供时，增益为恒定值 `(velocity / 127) × 0.3`（向后兼容）
- `noteOff` 在指定时间调用 `osc.stop(when)`，并清理对应资源
- 每个 pitch 的活跃振荡器被追踪，以免资源泄漏

#### Scenario: Note on creates oscillator

- **WHEN** 调用 `noteOn(60, 100, audioCtx.currentTime + 0.05)`
- **THEN** 在 0.05 秒后演奏 C4，频率约 261.6Hz，增益约 0.236

#### Scenario: Note on with endTime creates envelope

- **WHEN** 调用 `noteOn(60, 100, 10.0, 12.0)`
- **THEN** 在 10.0s 演奏 C4，gain 经历 2ms attack + 指数衰减到 12.0s

#### Scenario: Note off stops oscillator

- **WHEN** 调用 `noteOff(60, audioCtx.currentTime + 0.5)`
- **THEN** 在 0.5 秒后停止 C4 对应的振荡器

### Requirement: Look-ahead scheduler loop

系统 SHALL 使用 `setInterval` 运行调度循环，周期为 25ms。

每次循环执行以下逻辑：

1. 计算当前 `now = audioCtx.currentTime`
2. 调度窗口为 `[lastScheduledTime, now + lookAheadTime]`，其中 `lookAheadTime = 0.1` 秒
3. 遍历所有音轨中所有音符，找到 `noteOnTick` 和 `noteOffTick` 落在调度窗口内且尚未调度的事件
4. 对每个事件计算准确的 AudioContext 时间：`eventTime = transport.startTime + tickDeltaToSeconds(eventTick - transport.startTick, tempoMap, ppq, transport.startTick)`
5. 对于 noteOn 事件，SHALL 调用 `soundSource.noteOn(pitch, velocity, noteStartAudioTime, noteEndAudioTime)`，将音符结束时间一并传入以支持包络预调度
6. 对于 noteOff 事件，调用 `soundSource.noteOff(pitch, noteEndAudioTime)`
7. 推进 `lastScheduledTime` 到 `now + lookAheadTime`

#### Scenario: Note within look-ahead window is scheduled with endTime

- **WHEN** 调度窗口覆盖到某音符的 startTick
- **THEN** `noteOn` 被调用并传入 `noteEndAudioTime` 作为第 4 参数

#### Scenario: Note outside look-ahead window is not scheduled yet

- **WHEN** 音符的 startTick 对应的 audioCtx 时间超出 `now + 0.1` 秒
- **THEN** 该音符不在本次循环中被调度，留待后续循环处理

#### Scenario: Already scheduled notes are skipped

- **WHEN** 音符的 startTick 对应的 audioCtx 时间 ≤ lastScheduledTime
- **THEN** 该音符本次不重复调度
