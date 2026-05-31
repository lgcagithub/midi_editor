import type { StoreApi, UseBoundStore } from 'zustand'
import type { StoreState } from '@/state/store'
import { secondsToTick } from '@/model/time-convert'

type AudioStore = UseBoundStore<StoreApi<StoreState>>

/**
 * 传输引擎 —— 包装 Zustand transportSlice，以 audioCtx.currentTime 为时间基准
 *
 * - play()   将 startTime 设为 audioCtx.currentTime（而非 performance.now()）
 * - pause()  冻结 currentTick
 * - stop()   重置 currentTick = 0
 * - seekTo(tick)  跳转到指定位置，更新 startTime/startTick 确保后续播放定位正确
 * - getCurrentTick()  根据音频时钟实时推算当前 tick
 */
export class Transport {
  private audioCtx: AudioContext
  private store: AudioStore

  constructor(audioCtx: AudioContext, store: AudioStore) {
    this.audioCtx = audioCtx
    this.store = store
  }

  /** 开始/继续播放 */
  play(): void {
    const state = this.store.getState()
    const startTick = state.transportState === 'paused' ? state.currentTick : 0
    // 调用 store 的 play action（会设置 transportState='playing', startTime=performance.now()）
    state.play()
    // 用音频时钟覆盖 startTime
    this.store.setState({ startTime: this.audioCtx.currentTime, startTick })
  }

  /** 暂停播放
   *
   * 暂停位置取决于 store 的 pauseBehavior：
   * - 'keep'（默认）：停留在暂停时的 tick
   * - 'return'：回卷到 lastStartTick（本次播放开始的 tick） */
  pause(): void {
    const state = this.store.getState()
    if (state.pauseBehavior === 'return') {
      this.store.setState({ transportState: 'paused', currentTick: state.lastStartTick })
    } else {
      const tick = this.getCurrentTick()
      this.store.setState({ transportState: 'paused', currentTick: tick })
    }
  }

  /** 停止并回卷到 tick 0 */
  stop(): void {
    this.store.getState().stop()
  }

  /** 跳转到指定 tick
   *
   * 调用 store 的 seekTo action，然后用音频时钟覆盖 startTime，
   * 确保 seek 后续的 getCurrentTick() 能正确从新位置推算 */
  seekTo(tick: number): void {
    const state = this.store.getState()
    state.seekTo(tick)
    // 用音频时钟覆盖 startTime（与 play() 相同的模式）
    this.store.setState({ startTime: this.audioCtx.currentTime })
  }

  /**
   * 获取当前播放位置（tick）
   * 只在 playing 状态时实时推算；否则返回 store 缓存的 currentTick
   *
   * 注：seekTo 正确设置了 startTime 和 startTick，因此 seek 后该函数仍能正确推算位置
   */
  getCurrentTick(): number {
    const state = this.store.getState()
    if (state.transportState !== 'playing') return state.currentTick

    const elapsed = this.audioCtx.currentTime - state.startTime
    if (elapsed < 0) return state.startTick
    return secondsToTick(elapsed, state.tempoMap, state.ppq, state.startTick)
  }
}
