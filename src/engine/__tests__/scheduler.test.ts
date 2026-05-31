import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { create } from 'zustand'
import type { StoreState } from '@/state/store'
import type { SoundSource } from '@/audio/sound-source'
import { Transport } from '../transport'
import { Scheduler } from '../scheduler'

// ── Mock SoundSource ──────────────────────────────

function createMockSoundSource(): SoundSource {
  return {
    noteOn: vi.fn<(pitch: number, velocity: number, when: number, endTime?: number) => void>(),
    noteOff: vi.fn(),
    setInstrument: vi.fn(),
    stopAll: vi.fn(),
    dispose: vi.fn(),
  }
}

// ── Mock AudioContext ─────────────────────────────

function createMockAudioCtx(time = 0): AudioContext {
  return {
    currentTime: time,
    destination: {} as AudioDestinationNode,
    state: 'running',
    sampleRate: 44100,
    baseLatency: 0,
    outputLatency: 0,
    audioWorklet: {} as AudioWorklet,
    createOscillator: () => { throw new Error('not used') },
    createGain: () => { throw new Error('not used') },
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

// ── 辅助：创建测试用 store ─────────────────────────

function createTestStore(overrides?: Partial<StoreState>) {
  return create<StoreState>()((set, _get) => ({
    // ProjectSlice
    ppq: 480,
    tracks: [],
    tempoMap: [{ tick: 0, bpm: 120 }],
    timeSigs: [{ tick: 0, numerator: 4, denominator: 4 }],
    projectVersion: 0,
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
    lastStartTick: 0,
    pauseBehavior: 'keep',
    endBehavior: 'stop',
    autoFollow: true,
    play: () =>
      set((s) => ({
        transportState: 'playing',
        startTime: performance.now(),
        startTick: s.transportState === 'paused' ? s.currentTick : 0,
        lastStartTick: s.transportState === 'paused' ? s.currentTick : 0,
      })),
    pause: () => set({ transportState: 'paused' }),
    stop: () => set({ transportState: 'stopped', currentTick: 0 }),
    seekTo: () => {},
    setPauseBehavior: () => {},
    setEndBehavior: () => {},
    setAutoFollow: () => {},

    // EditorSlice
    activeTool: 'pointer',
    activeTrackId: '',
    selectedNoteIds: [],
    orientation: 'vertical',
    viewport: { scrollX: 0, scrollY: 0, zoomX: 1, zoomY: 1, noteHeight: 14, rulerHeight: 32 },
    snapGridTicks: 120,
    setTool: () => {},
    setActiveTrackId: () => {},
    selectNote: () => {},
    deselectNote: () => {},
    clearSelection: () => {},
    setSelection: () => {},
    setOrientation: () => {},
    setViewport: () => {},
    setSnapGridTicks: () => {},

    ...overrides,
  }))
}

// ── 测试主体 ───────────────────────────────────────

describe('Scheduler', () => {
  let mockCtx: AudioContext
  let store: ReturnType<typeof createTestStore>
  let mockSound: ReturnType<typeof createMockSoundSource>
  let transport: Transport
  let scheduler: Scheduler

  beforeEach(() => {
    mockCtx = createMockAudioCtx(0)
    store = createTestStore()
    mockSound = createMockSoundSource()
    transport = new Transport(mockCtx, store)
    scheduler = new Scheduler(transport, mockSound, store, mockCtx)
  })

  afterEach(() => {
    scheduler.stop()
    vi.restoreAllMocks()
  })

  describe('start / stop', () => {
    it('start() 创建 25ms 的 setInterval', () => {
      const spy = vi.spyOn(globalThis as any, 'setInterval')
      scheduler.start()
      expect(spy).toHaveBeenCalledWith(expect.any(Function), 25)
      spy.mockRestore()
    })

    it('stop() 清除 interval', () => {
      const spy = vi.spyOn(globalThis as any, 'clearInterval')
      scheduler.start()
      scheduler.stop()
      expect(spy).toHaveBeenCalled()
      spy.mockRestore()
    })

    it('stop() 在没有 interval 时不报错', () => {
      expect(() => scheduler.stop()).not.toThrow()
    })
  })

  describe('tick 主逻辑', () => {
    beforeEach(() => {
      // 设置 playing 状态，音频时间从 10s 开始
      Object.defineProperty(mockCtx, 'currentTime', { value: 10.0, configurable: true })
      store.setState({
        transportState: 'playing',
        startTime: 10.0,
        startTick: 0,
        tempoMap: [{ tick: 0, bpm: 120 }],
        ppq: 480,
      })
    })

    it('非 playing 状态时直接返回', () => {
      store.setState({ transportState: 'paused' })
      scheduler.tick()
      expect(mockSound.noteOn).not.toHaveBeenCalled()
    })

    it('首次 playing 时重置调度窗口到当前时间', () => {
      // scheduler 刚创建，wasPlaying = false，lastScheduledTime = 0
      scheduler.tick()
      // 首次 playing tick 应重置 window，不会调度任何位于 0 的事件
      // 因为我们没有音符，所以只是个无操作的 tick
      expect(mockSound.noteOn).not.toHaveBeenCalled()
    })

    it('调度窗口内音符的 noteOn', () => {
      // 添加一条从 tick 0 开始持续 480 ticks 的音符
      store.setState({
        tracks: [
          {
            id: 't-1',
            name: 'Test',
            instrument: 0,
            color: '#4A90D9',
            notes: [
              { id: 'n-1', pitch: 60, startTick: 0, duration: 480, velocity: 100 },
            ],
          },
        ],
      })

      scheduler.tick()
      // 首次 tick: wasPlaying=false → 重置窗口到 10.0
      // window = [10.0, 10.1]
      // note(60) startAudio = 10.0 + 0 = 10.0 → 在窗内
      // endAudio = 10.0 + 0.5 = 10.5 → 同时传入包络调度
      expect(mockSound.noteOn).toHaveBeenCalledWith(60, 100, 10.0, 10.5)
    })

    it('调度窗口外音符不被调度', () => {
      store.setState({
        tracks: [
          {
            id: 't-1',
            name: 'Test',
            instrument: 0,
            color: '#4A90D9',
            notes: [
              // startTick = 960, 在 120BPM/480PPQ 下 = 2s
              { id: 'n-1', pitch: 60, startTick: 960, duration: 480, velocity: 100 },
            ],
          },
        ],
      })

      scheduler.tick()
      // 首次 tick 重置窗口到 10.0, window = [10.0, 10.1]
      // note startAudio = 10.0 + 2.0 = 12.0 → 不在窗内
      expect(mockSound.noteOn).not.toHaveBeenCalled()
    })

    it('调度窗口内音符的 noteOff', () => {
      // note 持续 0 ticks（理论上的瞬发音符），其 offset 应触发 noteOff
      // 实际上我们用 note 的开始和结束都在附近
      store.setState({
        tracks: [
          {
            id: 't-1',
            name: 'Test',
            instrument: 0,
            color: '#4A90D9',
            notes: [
              // pitch 60, startTick=0, duration=1tick
              // start=0s, end≈0.002s → 都在 [10.0, 10.1]
              { id: 'n-1', pitch: 60, startTick: 0, duration: 1, velocity: 100 },
            ],
          },
        ],
      })

      scheduler.tick()
      expect(mockSound.noteOn).toHaveBeenCalledWith(60, 100, 10.0, expect.any(Number))
      expect(mockSound.noteOff).toHaveBeenCalledWith(60, expect.any(Number))
    })

    it('第二次 tick 窗口正确滑动', () => {
      // 第一次 tick
      store.setState({
        tracks: [
          {
            id: 't-1',
            name: 'Test',
            instrument: 0,
            color: '#4A90D9',
            notes: [
              { id: 'n-1', pitch: 64, startTick: 0, duration: 480, velocity: 100 },
            ],
          },
        ],
      })
      scheduler.tick()

      // 清空调用记录
      vi.clearAllMocks()

      // 第二次 tick: 前进 25ms
      Object.defineProperty(mockCtx, 'currentTime', { value: 10.025 })
      scheduler.tick()

      // 此时窗口 = [10.1, 10.125]
      // note(64) start = 10.0，不在窗内
      expect(mockSound.noteOn).not.toHaveBeenCalled()
      expect(mockSound.noteOff).not.toHaveBeenCalled()
    })

    it('每次 tick 更新 store 中的 currentTick', () => {
      scheduler.tick()
      const state = store.getState()
      // 0s elapsed 不变
      expect(state.currentTick).toBe(0)
    })

    it('currentTick 随音频时间递增', () => {
      scheduler.tick()
      // 第二次 tick: 前进 1s
      Object.defineProperty(mockCtx, 'currentTime', { value: 11.0 })
      scheduler.tick()

      const state = store.getState()
      // 120BPM, 480PPQ → 1s = 960 ticks
      expect(state.currentTick).toBe(960)
    })
  })

  describe('后台标签页补偿', () => {
    it('两次 tick 间隔 > 0.5s 时重置调度窗口', () => {
      Object.defineProperty(mockCtx, 'currentTime', { value: 100.0, configurable: true })
      store.setState({
        transportState: 'playing',
        startTime: 100.0,
        startTick: 0,
        tempoMap: [{ tick: 0, bpm: 120 }],
        ppq: 480,
        tracks: [
          {
            id: 't-1',
            name: 'Test',
            instrument: 0,
            color: '#4A90D9',
            notes: [
              // tick 0 → 0s, audioTime = 100.0
              { id: 'n-1', pitch: 60, startTick: 0, duration: 480, velocity: 100 },
            ],
          },
        ],
      })
      // 首次 tick 建立窗口
      scheduler.tick()

      // 清空 mocks
      vi.clearAllMocks()

      // 模拟后台恢复：currentTime 跳到了 101.0 (1s 后)
      Object.defineProperty(mockCtx, 'currentTime', { value: 101.0 })
      store.setState({ startTime: 100.0 }) // 保持 startTime 不变

      scheduler.tick()
      // 因为间隔 1.0 > 0.5，应重置 lastScheduledTime = 101.0
      // 窗口 = [101.0, 101.1]
      // note(60) startAudio = 100.0 = 100.0 < 101.0 → 不在窗内
      expect(mockSound.noteOn).not.toHaveBeenCalled()
    })

    it('两次 tick 间隔 <= 0.5s 时不补偿（正常播放）', () => {
      Object.defineProperty(mockCtx, 'currentTime', { value: 100.0, configurable: true })
      store.setState({
        transportState: 'playing',
        startTime: 100.0,
        startTick: 0,
        tempoMap: [{ tick: 0, bpm: 120 }],
        ppq: 480,
        tracks: [
          {
            id: 't-1',
            name: 'Test',
            instrument: 0,
            color: '#4A90D9',
            notes: [
              { id: 'n-1', pitch: 60, startTick: 0, duration: 480, velocity: 100 },
            ],
          },
        ],
      })
      scheduler.tick()
      vi.clearAllMocks()

      // 模拟正常 25ms 间隔
      Object.defineProperty(mockCtx, 'currentTime', { value: 100.025 })
      scheduler.tick()

      // 窗口从上次的 100.1 开始，到 100.125
      // note(60) 已经被调度过，不应再出现
      expect(mockSound.noteOn).not.toHaveBeenCalled()
    })
  })

  describe('resume from pause', () => {
    it('从暂停恢复播放时重置调度窗口', () => {
      Object.defineProperty(mockCtx, 'currentTime', { value: 50.0, configurable: true })
      store.setState({
        transportState: 'paused',
        currentTick: 960,
        startTime: 0,
        startTick: 0,
      })
      // 先 tick 一次（暂停状态）
      scheduler.tick()
      expect(mockSound.noteOn).not.toHaveBeenCalled()

      // 恢复播放
      store.setState({
        transportState: 'playing',
        startTime: 50.0,
        startTick: 960,
        tracks: [
          {
            id: 't-1',
            name: 'Test',
            instrument: 0,
            color: '#4A90D9',
            notes: [
              // startTick=960 → 2s, audioTime = 50.0 + 2s - tickToSeconds(960) = 50.0 + 0 = 50.0
              { id: 'n-1', pitch: 72, startTick: 960, duration: 480, velocity: 100 },
            ],
          },
        ],
      })
      scheduler.tick()

      // wasPlaying 检测到 transition: 重置窗口到 50.0
      // 窗口 = [50.0, 50.1]
      // note(72) startAudio = 50.0 → 在窗内，endAudio = 50.0 + 0.5 = 50.5
      expect(mockSound.noteOn).toHaveBeenCalledWith(72, 100, 50.0, 50.5)
    })
  })
})
