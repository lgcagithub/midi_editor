import { StateCreator } from 'zustand'

/** 播放器状态 */
export type TransportState = 'stopped' | 'playing' | 'paused'

export interface TransportSlice {
  /** 播放器状态 */
  transportState: TransportState
  /** 当前播放位置 (tick) */
  currentTick: number
  /** 开始播放时的时间戳 (performance.now) */
  startTime: number
  /** 开始播放时的起始 tick */
  startTick: number

  /** 开始播放：STOPPED→PLAYING(startTick=0) | PAUSED→PLAYING(startTick=currentTick) */
  play: () => void
  /** 暂停播放：PLAYING→PAUSED（保留 currentTick） */
  pause: () => void
  /** 停止播放：→STOPPED（重置 currentTick=0） */
  stop: () => void
}

export const createTransportSlice: StateCreator<
  TransportSlice,
  [],
  [],
  TransportSlice
> = (set) => ({
  transportState: 'stopped',
  currentTick: 0,
  startTime: 0,
  startTick: 0,

  play: () =>
    set((state) => ({
      transportState: 'playing',
      startTime: performance.now(),
      startTick: state.transportState === 'paused' ? state.currentTick : 0,
    })),

  pause: () =>
    set({
      transportState: 'paused',
    }),

  stop: () =>
    set({
      transportState: 'stopped',
      currentTick: 0,
    }),
})
