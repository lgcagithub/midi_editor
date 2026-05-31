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
  /** 最近一次 play() 或 seekTo() 设置 startTick 时的值 */
  lastStartTick: number
  /** 暂停行为：keep = 停在当前位置, return = 跳回 lastStartTick */
  pauseBehavior: 'keep' | 'return'
  /** 结束行为：stop = 播放到末尾自动停, loop = 循环 */
  endBehavior: 'stop' | 'loop'
  /** 播放时是否自动跟随光标 */
  autoFollow: boolean

  /** 开始播放：STOPPED→PLAYING(startTick=0) | PAUSED→PLAYING(startTick=currentTick) */
  play: () => void
  /** 暂停播放：PLAYING→PAUSED（保留 currentTick） */
  pause: () => void
  /** 停止播放：→STOPPED（重置 currentTick=0） */
  stop: () => void
  /** 跳转到指定 tick 位置 */
  seekTo: (tick: number) => void
  /** 设置暂停行为 */
  setPauseBehavior: (v: 'keep' | 'return') => void
  /** 设置结束行为 */
  setEndBehavior: (v: 'stop' | 'loop') => void
  /** 设置播放时是否自动跟随光标 */
  setAutoFollow: (v: boolean) => void
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
  lastStartTick: 0,
  pauseBehavior: 'keep',
  endBehavior: 'stop',
  autoFollow: true,

  play: () =>
    set((state) => ({
      transportState: 'playing',
      startTime: performance.now(),
      startTick: state.transportState === 'paused' ? state.currentTick : 0,
      lastStartTick: state.transportState === 'paused' ? state.currentTick : 0,
    })),

  pause: () =>
    set((state) => ({
      transportState: 'paused',
      currentTick:
        state.pauseBehavior === 'return' ? state.lastStartTick : state.currentTick,
    })),

  stop: () =>
    set({
      transportState: 'stopped',
      currentTick: 0,
    }),

  seekTo: (tick) =>
    set((state) => ({
      startTick: tick,
      lastStartTick: tick,
      startTime: state.transportState === 'playing' ? performance.now() : state.startTime,
      currentTick: tick,
    })),

  setPauseBehavior: (v) => set({ pauseBehavior: v }),

  setEndBehavior: (v) => set({ endBehavior: v }),

  setAutoFollow: (v) => set({ autoFollow: v }),
})
