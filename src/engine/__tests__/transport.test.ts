import { describe, it, expect, beforeEach } from 'vitest'
import { create } from 'zustand'
import type { StoreState } from '@/state/store'
import { Transport } from '../transport'

// ── 辅助：构造 mock AudioContext ───────────────────

function createMockAudioCtx(currentTime = 0): AudioContext {
  return {
    currentTime,
    destination: {} as AudioDestinationNode,
    state: 'running',
    sampleRate: 44100,
    baseLatency: 0,
    outputLatency: 0,
    audioWorklet: {} as AudioWorklet,
    createOscillator: () => { throw new Error('not used in test') },
    createGain: () => { throw new Error('not used in test') },
    resume: async () => {},
    suspend: async () => {},
    close: async () => {},
    getOutputTimestamp: () => ({ contextTime: 0, performanceTime: 0 }),
    createBuffer: () => { throw new Error('not used') },
    createBufferSource: () => { throw new Error('not used') },
    createAnalyser: () => { throw new Error('not used') },
    createBiquadFilter: () => { throw new Error('not used') },
    createChannelMerger: () => { throw new Error('not used') },
    createChannelSplitter: () => { throw new Error('not used') },
    createConvolver: () => { throw new Error('not used') },
    createDelay: () => { throw new Error('not used') },
    createDynamicsCompressor: () => { throw new Error('not used') },
    createIIRFilter: () => { throw new Error('not used') },
    createMediaElementSource: () => { throw new Error('not used') },
    createMediaStreamSource: () => { throw new Error('not used') },
    createMediaStreamDestination: () => { throw new Error('not used') },
    createPeriodicWave: () => { throw new Error('not used') },
    createPanner: () => { throw new Error('not used') },
    createStereoPanner: () => { throw new Error('not used') },
    createWaveShaper: () => { throw new Error('not used') },
    decodeAudioData: async () => { throw new Error('not used') },
    onstatechange: null,
    addEventListener: () => {},
    removeEventListener: () => {},
    dispatchEvent: () => true,
  } as unknown as AudioContext
}

// ── 辅助：创建可工作的 mock store ──────────────────

function createTestStore(overrides?: Partial<StoreState>) {
  return create<StoreState>()((set, _get) => ({
    // ProjectSlice
    ppq: 480,
    tracks: [],
    tempoMap: [{ tick: 0, bpm: 120 }],
    timeSigs: [{ tick: 0, numerator: 4, denominator: 4 }],
    loadProject: () => {},
    newProject: () => {},
    addTrack: () => {},
    removeTrack: () => {},
    updateTrack: () => {},
    addNote: () => {},
    removeNote: () => {},
    updateNote: () => {},
    updateTempoMap: () => {},
    updateTimeSigs: () => {},

    // TransportSlice
    transportState: 'stopped',
    currentTick: 0,
    startTime: 0,
    startTick: 0,
    play: () =>
      set((s) => ({
        transportState: 'playing',
        startTime: performance.now(),
        startTick: s.transportState === 'paused' ? s.currentTick : 0,
      })),
    pause: () => set({ transportState: 'paused' }),
    stop: () => set({ transportState: 'stopped', currentTick: 0 }),

    // EditorSlice
    activeTool: 'pointer',
    selectedNoteIds: [],
    orientation: 'vertical',
    viewport: { scrollX: 0, scrollY: 0, zoomX: 1, zoomY: 1, noteHeight: 14 },
    setTool: () => {},
    selectNote: () => {},
    deselectNote: () => {},
    clearSelection: () => {},
    setSelection: () => {},
    setOrientation: () => {},
    setViewport: () => {},

    ...overrides,
  }))
}

// ── 测试主体 ───────────────────────────────────────

describe('Transport', () => {
  let mockCtx: AudioContext
  let store: ReturnType<typeof createTestStore>

  beforeEach(() => {
    mockCtx = createMockAudioCtx()
    store = createTestStore()
  })

  describe('状态机：play / pause / stop', () => {
    it('play() 从 stopped 切换到 playing，startTick = 0', () => {
      const transport = new Transport(mockCtx, store)
      transport.play()

      const state = store.getState()
      expect(state.transportState).toBe('playing')
      expect(state.startTick).toBe(0)
      expect(state.startTime).toBe(mockCtx.currentTime)
    })

    it('play() 从 paused 切换到 playing，startTick = currentTick', () => {
      const transport = new Transport(mockCtx, store)

      // 先手动设置模拟暂停状态
      store.setState({ transportState: 'paused', currentTick: 480 })
      transport.play()

      const state = store.getState()
      expect(state.transportState).toBe('playing')
      expect(state.startTick).toBe(480)
    })

    it('pause() 冻结为 paused 并保留 currentTick', () => {
      const transport = new Transport(mockCtx, store)
      transport.play()
      // 模拟一些时间流逝
      Object.defineProperty(mockCtx, 'currentTime', { value: 1.0 })

      transport.pause()

      const state = store.getState()
      expect(state.transportState).toBe('paused')
      // paused 后 currentTick 应由 getCurrentTick 推算得到
      expect(state.currentTick).toBeGreaterThan(0)
    })

    it('stop() 切换到 stopped 并重置 currentTick = 0', () => {
      const transport = new Transport(mockCtx, store)
      transport.play()
      transport.stop()

      const state = store.getState()
      expect(state.transportState).toBe('stopped')
      expect(state.currentTick).toBe(0)
    })

    it('stop() 在 paused 状态也能正确重置', () => {
      const transport = new Transport(mockCtx, store)
      transport.play()
      transport.pause()
      transport.stop()

      const state = store.getState()
      expect(state.transportState).toBe('stopped')
      expect(state.currentTick).toBe(0)
    })
  })

  describe('getCurrentTick', () => {
    it('非 playing 状态时返回 store 缓存的 currentTick', () => {
      store.setState({ currentTick: 123 })
      const transport = new Transport(mockCtx, store)

      expect(transport.getCurrentTick()).toBe(123)
    })

    it('playing 状态下根据音频时间推算 tick', () => {
      store.setState({
        transportState: 'playing',
        startTime: 10.0,
        startTick: 0,
        tempoMap: [{ tick: 0, bpm: 120 }],
        ppq: 480,
      })
      Object.defineProperty(mockCtx, 'currentTime', { value: 11.0 })

      const transport = new Transport(mockCtx, store)
      // 恒速 120 BPM, PPQ=480: 1 tick = 60/120/480 = 0.0010416s
      // 1s 经过 = 960 ticks
      expect(transport.getCurrentTick()).toBe(960)
    })

    it('elapsed 为负时返回 startTick（防止时钟回退）', () => {
      store.setState({
        transportState: 'playing',
        startTime: 15.0,
        startTick: 100,
      })
      Object.defineProperty(mockCtx, 'currentTime', { value: 14.0 })

      const transport = new Transport(mockCtx, store)
      expect(transport.getCurrentTick()).toBe(100)
    })
  })
})
