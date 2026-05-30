## Context

当前 `OscillatorBank.noteOn()` 使用 `gain.gain.setValueAtTime(constant, when)` 设定恒定增益，音符在整个持续时间内保持相同音量。`noteOff` 直接调用 `oscillator.stop(when)`，产生可闻的咔嗒声。

Web Audio API 原生的 `AudioParam` 方法（`linearRampToValueAtTime`、`exponentialRampToValueAtTime`、`setTargetAtTime`）支持在创建振荡器时预调度完整的增益曲线，无需 JavaScript 回调或计时器。

`Scheduler` 已在每次 tick 中计算 `noteEndAudioTime`（即 `startTime + tickToSeconds(startTick + duration) - startSongTime`），但目前仅用于 `noteOff` 调用。

## Goals / Non-Goals

**Goals:**
- 为每个音符预调度一条自然的指数衰减音量曲线，模拟钢琴的锤击-衰减模型
- 消除 `noteOff` 时因增益突变产生的咔嗒声
- 衰减速率随音符时长自适应：短音符衰减快（打击感），长音符衰减慢（延音感）
- 接口变更最小化：`endTime` 为可选参数，向后兼容

**Non-Goals:**
- 不改波形（仍为 square）
- 不加滤波器（BiquadFilterNode）
- 不加多振荡器 detune / 合唱效果
- 不支持 Attack/Decay/Sustain/Release 全参数可配（那是未来 `setInstrument` 的职责）

## Decisions

### D1：使用 `setTargetAtTime` 实现指数衰减

**选择**：`gain.gain.setTargetAtTime(target, startTime, timeConstant)`

**替代方案**：

| 方案 | 优点 | 缺点 |
|------|------|------|
| `linearRampToValueAtTime` | 简单直观 | 线性衰减不自然，真实乐器（钢琴弦、吉他弦）都是指数衰减 |
| `exponentialRampToValueAtTime` | 精确控制终点值 | 不能 ramp 到 0（`log(0) = -∞`），需要 target > 0 再手动设 0 |
| **`setTargetAtTime`** ✅ | 天然指数曲线，从 startTime 开始持续衰减，无需指定终点 | 无法精确控制终点值（但这对衰减场景无所谓） |

`setTargetAtTime` 的参数语义：在 `startTime` 时刻开始，以 `timeConstant` 秒的时间常数指数趋近 `target`。经过 `N` 个时间常数后，剩余距离为 `e^(-N)`：

- 1τ → 36.8% 剩余（63.2% 衰减）
- 3τ → 5.0% 剩余（95.0% 衰减）
- 4τ → 1.8% 剩余（98.2% 衰减）
- 5τ → 0.7% 剩余（99.3% 衰减）

### D2：时间常数 = 音符时长 / 4

**选择**：`timeConstant = (endTime - when - attackTime) / 4`

**理由**：经过 4 个时间常数后 gain 衰减到峰值的 ~1.8%，在 `endTime` 处几乎为 0，`noteOff` 停止振荡器时不产生咔嗒声。同时衰减速度与音符时长成正比——短音符快速衰减，长音符缓慢衰减。

### D3：Attack 时间 = 2ms

**选择**：使用 `linearRampToValueAtTime(peakGain, when + 0.002)` 实现 2ms attack。

**理由**：钢琴锤击几乎是瞬时发声，2ms 足以避免从 0 跳变到 peak 的咔嗒声，同时不产生可感知的"淡入"效果（人耳对 10ms 以下的 attack 感知为瞬时）。

### D4：`endTime` 为可选参数

**选择**：`noteOn(pitch: number, velocity: number, when: number, endTime?: number): void`

**理由**：
- 向后兼容：现有调用方无需改动（如 `stopAll` 后续可能重新触发 noteOn 的场景）
- 接口消费者（`Scheduler`）可选地传入时长信息
- `OscillatorBank` 在 `endTime` 未提供时仍使用恒定增益（fallback 到当前行为）

### D5：`noteOff` 保持原有逻辑不变

**选择**：`noteOff` 仍调用 `oscillator.stop(when)` 并清理 `active` Map。

**理由**：
- 在正常播放流程中，到达 `endTime` 时 gain 已经接近 0，`oscillator.stop()` 不会产生咔嗒声
- 在 pause/stop 场景中，`stopAll` 立即停止所有振荡器（gain 未衰减完就被切断，但这是用户预期行为）
- 在 re-trigger 场景中，`noteOn` 内部先调用 `noteOff` 停止旧振荡器再创建新的
- 保持 `noteOff` 为"停止振荡器的唯一入口"，避免双重停止逻辑

## Risks / Trade-offs

| 风险 | 缓解 |
|------|------|
| **极短音符（< 10ms）**：attack 2ms + 剩余时间 < 8ms，时间常数极小，衰减过快可能产生咔嗒声 | 对 `duration < 20ms` 的音符使用最小时间常数（如 5ms），确保至少 1 个完整的 τ |
| **同一 pitch 重叠**：`noteOn` 中调用 `noteOff` 停止旧振荡器，旧振荡器的 `stop()` 时间可能与新振荡器的 `start()` 时间冲突 | 已有 try-catch 保护 `oscillator.stop()`，重叠场景下旧振荡器可能已被调度停止 |
| **`stopAll` 在衰减中途被调用**：振荡器被提前停止，增益未衰减到 0 | 这是用户预期行为（按了 pause/stop），不是 bug。`stopAll` 已有 try-catch |
| **指数衰减在高频音符感知上更快**（真实钢琴高音弦衰减确实更快） | 当前设计不区分 pitch，统一按时长衰减。未来可在 `setInstrument` 中引入 pitch-dependent 参数 |
