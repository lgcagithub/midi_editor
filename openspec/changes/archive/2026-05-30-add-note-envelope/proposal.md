## Why

当前 `OscillatorBank` 在音符整个持续时长内保持恒定增益——没有 attack、没有 decay、没有 release。结果音色呆板、机械、不自然，尤其是连续音符听起来像蜂鸣器。与此同时，`Scheduler` 已经精确计算了每个音符的结束时间（`noteEndAudioTime`），但 `noteOn` 接口没有接收这个信息，白白丢弃了驱动自然包络的关键参数。

## What Changes

- **`SoundSource.noteOn` 接口**：新增可选参数 `endTime?: number`，允许调用方传入音符结束的绝对音频时间
- **`Scheduler`**：将已计算的 `noteEndAudioTime` 传递给 `noteOn`（1 行改动）
- **`OscillatorBank`**：利用 `endTime` 预调度完整的指数衰减增益曲线，模拟钢琴的锤击-衰减模型：
  - Attack：2ms 内从 0 ramp 到峰值（消除起音咔嗒声）
  - Decay：指数衰减至峰值的 ~5%，时间常数 = 音符时长 / 4
  - 自然释放：gain 在 `endTime` 时已接近 0，`noteOff` 停止振荡器时不产生可闻咔嗒声
- **`stopAll` / `dispose` / `noteOff`**：保持现有行为不变，仍能立即停止振荡器（pause、stop、re-trigger 场景）

## Capabilities

### New Capabilities

- `note-envelope`：振荡器根据音符时长自动应用指数衰减音量包络，使合成音色具备类似钢琴的自然衰减特性

### Modified Capabilities

- `playback-engine`：`SoundSource.noteOn` 签名变更为 `noteOn(pitch: number, velocity: number, when: number, endTime?: number): void`

## Impact

| 文件 | 影响 |
|------|------|
| `src/audio/sound-source.ts` | 接口签名：`noteOn` 加 `endTime` 可选参数 |
| `src/audio/oscillator-bank.ts` | 核心实现：用 `linearRampToValueAtTime` + `setTargetAtTime` 替代 `setValueAtTime` |
| `src/engine/scheduler.ts` | 传参：`noteOn` 调用增加第 4 个参数 `noteEndAudioTime` |
| `src/engine/__tests__/scheduler.test.ts` | 测试 mock 适配新签名 |
