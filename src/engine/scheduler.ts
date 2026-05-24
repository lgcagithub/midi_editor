import type { SoundSource } from '@/audio/sound-source'
import type { Transport } from './transport'
import type { StoreApi, UseBoundStore } from 'zustand'
import type { StoreState } from '@/state/store'
import { tickToSeconds } from '@/model/time-convert'

type AudioStore = UseBoundStore<StoreApi<StoreState>>

/**
 * Look-Ahead 调度器
 *
 * - 每 25ms 检查一次即将发生的事件
 * - 窗口 = [lastScheduledTime, now + 0.1s]
 * - 窗口内的 noteOn/noteOff 通过 SoundSource 提前调度
 * - 后台标签页恢复后自动跳过已错过的音符
 * - 每次 tick 更新 store 中的 currentTick
 */
export class Scheduler {
  private transport: Transport
  private soundSource: SoundSource
  private store: AudioStore
  private audioCtx: AudioContext
  private intervalId: ReturnType<typeof setInterval> | null = null
  private lastScheduledTime = 0
  private lastTickTime = 0
  private wasPlaying = false

  constructor(
    transport: Transport,
    soundSource: SoundSource,
    store: AudioStore,
    audioCtx: AudioContext,
  ) {
    this.transport = transport
    this.soundSource = soundSource
    this.store = store
    this.audioCtx = audioCtx
  }

  /** 启动调度循环 */
  start(): void {
    this.lastScheduledTime = 0
    this.lastTickTime = 0
    this.wasPlaying = false
    this.intervalId = setInterval(() => this.tick(), 25)
  }

  /** 停止调度循环 */
  stop(): void {
    if (this.intervalId !== null) {
      clearInterval(this.intervalId)
      this.intervalId = null
    }
  }

  // ── 调度逻辑（公开以便测试） ──────────────────────

  tick(): void {
    const state = this.store.getState()
    const isPlaying = state.transportState === 'playing'

    // 刚切换到 playing 时，重置调度窗口到当前时间
    if (isPlaying && !this.wasPlaying) {
      this.lastScheduledTime = this.audioCtx.currentTime
      this.lastTickTime = this.audioCtx.currentTime
    }
    this.wasPlaying = isPlaying

    if (!isPlaying) return

    const now = this.audioCtx.currentTime
    const { startTime, startTick, tempoMap, ppq, tracks } = state

    // ── 后台标签页补偿 ──────────────────────────
    const elapsed = now - this.lastTickTime
    if (elapsed > 0.5) {
      // 标签页被切到后台超过 500ms，跳过已错过的音符
      this.lastScheduledTime = now
    }
    this.lastTickTime = now

    const lookAhead = 0.1
    const windowStart = this.lastScheduledTime
    const windowEnd = now + lookAhead

    if (windowStart >= windowEnd) return

    // 计算 startTick 对应的歌曲时间（秒），用于将 tick 转为绝对音频时间
    const startSongTime = tickToSeconds(startTick, tempoMap, ppq)

    for (const track of tracks) {
      for (const note of track.notes) {
        const noteStartAudioTime =
          startTime + (tickToSeconds(note.startTick, tempoMap, ppq) - startSongTime)
        const noteEndAudioTime =
          startTime +
          (tickToSeconds(note.startTick + note.duration, tempoMap, ppq) - startSongTime)

        if (noteStartAudioTime >= windowStart && noteStartAudioTime < windowEnd) {
          this.soundSource.noteOn(note.pitch, note.velocity, noteStartAudioTime)
        }

        if (noteEndAudioTime >= windowStart && noteEndAudioTime < windowEnd) {
          this.soundSource.noteOff(note.pitch, noteEndAudioTime)
        }
      }
    }

    this.lastScheduledTime = windowEnd

    // 更新 store 中的 currentTick（用于 UI 光标同步）
    const currentTick = this.transport.getCurrentTick()
    this.store.setState({ currentTick })
  }
}
