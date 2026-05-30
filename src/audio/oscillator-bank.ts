import { SoundSource } from './sound-source'
import { midiToHz } from '@/utils/math'

// ── 指数衰减包络参数 ────────────────────────────────
const ATTACK_TIME = 0.002       // 起音时长（秒）
const DECAY_TARGET_FACTOR = 0.05 // 衰减目标为峰值增益的比率
const DECAY_TIME_FACTOR = 4      // timeConstant = 剩余时长 / 4
const MIN_TIME_CONSTANT = 0.005  // 最小 timeConstant（保护短音符）

interface ActiveOscillator {
  oscillator: OscillatorNode
  gain: GainNode
}

/**
 * 简单的方波振荡器合成引擎
 *
 * - 每个音高对应一个独立的 OscillatorNode + GainNode
 * - noteOn 时创建并启动振荡器
 * - 当提供 endTime 时，调度 attack + exponential decay 包络，模拟钢琴延音
 * - 无 endTime 时保持恒定增益（用于预览音符）
 * - noteOff 时停止振荡器并从活动表中移除
 * - dispose 时停止并断开所有振荡器
 */
export class OscillatorBank implements SoundSource {
  private audioCtx: AudioContext
  private active = new Map<number, ActiveOscillator>()

  constructor(audioCtx: AudioContext) {
    this.audioCtx = audioCtx
  }

  noteOn(pitch: number, velocity: number, when: number, endTime?: number): void {
    // 若该音高已有活动振荡器，先停止它
    this.noteOff(pitch, when)

    const osc = this.audioCtx.createOscillator()
    const gain = this.audioCtx.createGain()

    osc.type = 'square'
    osc.frequency.setValueAtTime(midiToHz(pitch), when)

    const peakGain = (velocity / 127) * 0.3

    if (endTime !== undefined) {
      // 指数衰减包络：attack (2ms) → exponential decay
      const attackEnd = when + ATTACK_TIME
      const decayDuration = endTime - attackEnd
      const timeConstant = Math.max(decayDuration / DECAY_TIME_FACTOR, MIN_TIME_CONSTANT)

      gain.gain.setValueAtTime(0, when)
      gain.gain.linearRampToValueAtTime(peakGain, attackEnd)
      gain.gain.setTargetAtTime(peakGain * DECAY_TARGET_FACTOR, attackEnd, timeConstant)
    } else {
      // 无 endTime：恒定增益（预览音符）
      gain.gain.setValueAtTime(peakGain, when)
    }

    osc.connect(gain)
    gain.connect(this.audioCtx.destination)

    osc.start(when)

    this.active.set(pitch, { oscillator: osc, gain })
  }

  noteOff(pitch: number, when: number): void {
    const entry = this.active.get(pitch)
    if (!entry) return

    try {
      entry.oscillator.stop(when)
    } catch {
      // 振荡器可能已经停止，忽略
    }
    this.active.delete(pitch)
  }

  /** 立即停止所有发声中的振荡器 */
  stopAll(when: number): void {
    for (const [_pitch, entry] of this.active) {
      try {
        entry.oscillator.stop(when)
      } catch {
        // 已停止，忽略
      }
      entry.oscillator.disconnect()
      entry.gain.disconnect()
    }
    this.active.clear()
  }

  setInstrument(_program: number): void {
    // 方波合成器不支持切换乐器
  }

  dispose(): void {
    const now = this.audioCtx.currentTime
    for (const entry of this.active.values()) {
      try {
        entry.oscillator.stop(now)
      } catch {
        // 已经停止，忽略
      }
      entry.oscillator.disconnect()
      entry.gain.disconnect()
    }
    this.active.clear()
  }
}
