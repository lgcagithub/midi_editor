import { SoundSource } from './sound-source'
import { midiToHz } from '@/utils/math'

interface ActiveOscillator {
  oscillator: OscillatorNode
  gain: GainNode
}

/**
 * 简单的方波振荡器合成引擎
 *
 * - 每个音高对应一个独立的 OscillatorNode + GainNode
 * - noteOn 时创建并启动振荡器
 * - noteOff 时停止振荡器并从活动表中移除
 * - dispose 时停止并断开所有振荡器
 */
export class OscillatorBank implements SoundSource {
  private audioCtx: AudioContext
  private active = new Map<number, ActiveOscillator>()

  constructor(audioCtx: AudioContext) {
    this.audioCtx = audioCtx
  }

  noteOn(pitch: number, velocity: number, when: number): void {
    // 若该音高已有活动振荡器，先停止它
    this.noteOff(pitch, when)

    const osc = this.audioCtx.createOscillator()
    const gain = this.audioCtx.createGain()

    osc.type = 'square'
    osc.frequency.setValueAtTime(midiToHz(pitch), when)

    const gainValue = (velocity / 127) * 0.3
    gain.gain.setValueAtTime(gainValue, when)

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
