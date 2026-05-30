## Purpose

振荡器音量包络的规格定义——指数衰减模型，模拟钢琴的锤击-衰减行为。

## ADDED Requirements

### Requirement: Gain envelope on note start

系统 SHALL 在 `noteOn` 被调用且提供了 `endTime` 参数时，为振荡器预调度一条指数衰减增益曲线：

- Attack 阶段：`gain` 在 `when` 时刻从 0 开始，在 `when + ATTACK_TIME`（2ms）达到峰值 `(velocity / 127) × 0.3`
- Decay 阶段：`gain` 从 `when + ATTACK_TIME` 开始，以 `setTargetAtTime` 指数衰减趋近目标值 `peakGain × 0.05`
- 时间常数 `τ = (endTime - when - ATTACK_TIME) / 4`
- 若 `endTime` 未提供，使用恒定增益（现有行为）

#### Scenario: Long note has slow decay

- **WHEN** `noteOn(60, 100, 10.0, 12.0)` 被调用（2 秒时长）
- **THEN** gain 在 10.0s 为 0，在 10.002s 达到峰值 ~0.236，随后以 τ ≈ 0.5s 指数衰减，在 12.0s 时增益约为峰值的 1.8%

#### Scenario: Short note has fast decay

- **WHEN** `noteOn(60, 100, 10.0, 10.15)` 被调用（150ms 时长）
- **THEN** gain 在 10.0s 为 0，在 10.002s 达到峰值 ~0.236，随后以 τ ≈ 0.037s 指数衰减，在 10.15s 时增益约为峰值的 1.8%

#### Scenario: No endTime falls back to constant gain

- **WHEN** `noteOn(60, 100, 10.0)` 被调用（无 endTime）
- **THEN** gain 在 10.0s 设为 `(100/127) × 0.3 ≈ 0.236`，之后保持不变（与当前行为一致）

### Requirement: Note-off click prevention

当 `endTime` 被提供时，系统 SHALL 确保在 `endTime` 时刻增益已衰减到 0，使得 `noteOff` 中 `oscillator.stop()` 的调用不产生可闻咔嗒声。

#### Scenario: Clean note ending

- **WHEN** `noteOn(60, 100, 10.0, 12.0)` 已调度完整包络，随后 `noteOff(60, 12.0)` 在 `endTime` 被调用
- **THEN** 振荡器在 gain = 0 时停止，无可闻咔嗒声

### Requirement: Extreme short note protection

对于极短音符（`endTime - when < 20ms`），系统 SHALL 使用最小时间常数 5ms，确保至少 1 个完整 τ 的衰减。

#### Scenario: Very short note gets minimum decay time

- **WHEN** `noteOn(60, 100, 10.0, 10.008)` 被调用（8ms 时长）
- **THEN** 时间常数取 `max((10.008 - 10.0 - 0.002) / 4, 0.005)` = 5ms，而非 1.5ms
