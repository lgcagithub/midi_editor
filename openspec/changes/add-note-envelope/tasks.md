## 1. 接口层

- [x] 1.1 `SoundSource.noteOn` 签名添加可选参数 `endTime?: number`

## 2. 核心实现

- [x] 2.1 `OscillatorBank.noteOn` 实现 `endTime` 驱动的指数衰减包络：attack 2ms (`linearRampToValueAtTime`) + decay (`setTargetAtTime`, τ = 时长/4)
- [x] 2.2 极短音符保护：`duration < 20ms` 时使用最小时间常数 5ms

## 3. 集成

- [x] 3.1 `Scheduler.tick` 将 `noteEndAudioTime` 作为第 4 参数传入 `noteOn`

## 4. 测试

- [x] 4.1 更新 `scheduler.test.ts` 中 Mock SoundSource 的 `noteOn` 签名
- [x] 4.2 更新现有测试中的 `noteOn` 断言，补充 `endTime` 参数
- [x] 4.3 添加包络衰减相关测试：验证 `noteOn` 在提供/不提供 `endTime` 时的行为差异

## 5. 验证

- [x] 5.1 类型检查通过：`npx tsc --noEmit`
- [x] 5.2 现有测试全部通过：`npm test`
- [x] 5.3 手动播放验证：播放一段旋律，确认音色有自然衰减且无咔嗒声
