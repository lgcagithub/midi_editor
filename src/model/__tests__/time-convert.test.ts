import { describe, it, expect } from 'vitest'
import { tickToSeconds, secondsToTick } from '../time-convert'
import { TempoEvent } from '../../types'
import { DEFAULT_PPQ, DEFAULT_BPM } from '../../constants'

describe('tickToSeconds', () => {
  it('空 tempoMap 时使用默认 BPM（120）计算', () => {
    // 一个四分音符 = 480 ticks = 0.5 秒（120BPM）
    const seconds = tickToSeconds(480, [], 480)
    expect(seconds).toBeCloseTo(0.5, 5)
  })

  it('单一恒速 tempo 正确转换', () => {
    const tempoMap: TempoEvent[] = [
      { tick: 0, bpm: 120 },
    ]
    // 480 ticks at 120 BPM = 0.5 秒
    expect(tickToSeconds(480, tempoMap, 480)).toBeCloseTo(0.5, 5)
    // 960 ticks = 1.0 秒
    expect(tickToSeconds(960, tempoMap, 480)).toBeCloseTo(1.0, 5)
    // 0 ticks = 0 秒
    expect(tickToSeconds(0, tempoMap, 480)).toBeCloseTo(0.0, 5)
  })

  it('不同 BPM 正确计算', () => {
    // 60 BPM 时，一个四分音符（480 ticks）= 1 秒
    const tempoMap: TempoEvent[] = [
      { tick: 0, bpm: 60 },
    ]
    expect(tickToSeconds(480, tempoMap, 480)).toBeCloseTo(1.0, 5)
  })

  it('跨多段 tempo 变化正确累加时间', () => {
    // 段 1: tick 0-480, BPM=120 => 0.5 秒
    // 段 2: tick 480-960, BPM=60 => 1.0 秒
    // 总计: tick 960 => 1.5 秒
    const tempoMap: TempoEvent[] = [
      { tick: 0, bpm: 120 },
      { tick: 480, bpm: 60 },
    ]
    expect(tickToSeconds(960, tempoMap, 480)).toBeCloseTo(1.5, 5)
    // 在段 1 中间: tick 240 => 0.25 秒
    expect(tickToSeconds(240, tempoMap, 480)).toBeCloseTo(0.25, 5)
    // 在段 2 中间: tick 720 => 0.5 + 0.5 = 1.0 秒
    expect(tickToSeconds(720, tempoMap, 480)).toBeCloseTo(1.0, 5)
  })

  it('目标 tick 在第一个 tempo 事件之前（tick=0）', () => {
    const tempoMap: TempoEvent[] = [
      { tick: 0, bpm: 120 },
    ]
    expect(tickToSeconds(0, tempoMap, 480)).toBeCloseTo(0, 5)
  })

  it('目标 tick 超出最后一个 tempo 事件范围', () => {
    const tempoMap: TempoEvent[] = [
      { tick: 0, bpm: 120 },
      { tick: 480, bpm: 60 },
    ]
    // tick 0-480 = 0.5s (120BPM)
    // tick 480-1440 = (960/480)*(60/60) = 2.0s
    // 总计 = 2.5s
    expect(tickToSeconds(1440, tempoMap, 480)).toBeCloseTo(2.5, 5)
  })

  it('自定义 PPQ 正确计算', () => {
    const tempoMap: TempoEvent[] = [
      { tick: 0, bpm: 120 },
    ]
    // 960 ticks at 120BPM with PPQ=960 = 0.5 秒
    expect(tickToSeconds(960, tempoMap, 960)).toBeCloseTo(0.5, 5)
  })
})

describe('secondsToTick', () => {
  it('空 tempoMap 时使用默认 BPM（120）计算', () => {
    // 0.5 秒 at 120 BPM with PPQ 480 = 480 ticks
    const tick = secondsToTick(0.5, [], 480)
    expect(tick).toBe(480)
  })

  it('单一恒速 tempo 正确反向转换', () => {
    const tempoMap: TempoEvent[] = [
      { tick: 0, bpm: 120 },
    ]
    // 0.5 秒 => 480 ticks
    expect(secondsToTick(0.5, tempoMap, 480)).toBe(480)
    // 1.0 秒 => 960 ticks
    expect(secondsToTick(1.0, tempoMap, 480)).toBe(960)
    // 0 秒 => 0 ticks
    expect(secondsToTick(0, tempoMap, 480)).toBe(0)
  })

  it('负 targetSeconds 返回 startTick', () => {
    const tempoMap: TempoEvent[] = [
      { tick: 0, bpm: 120 },
    ]
    expect(secondsToTick(-1, tempoMap, 480)).toBe(0)
    expect(secondsToTick(-1, tempoMap, 480, 100)).toBe(100)
  })

  it('跨多段 tempo 变化正确反向转换', () => {
    // 段 1: tick 0-480, BPM=120 => 每 tick 约 0.00104166 秒
    // 段 2: tick 480-960, BPM=60 => 每 tick 约 0.00208333 秒
    const tempoMap: TempoEvent[] = [
      { tick: 0, bpm: 120 },
      { tick: 480, bpm: 60 },
    ]
    // 0.25 秒 = 段 1 240 ticks
    expect(secondsToTick(0.25, tempoMap, 480)).toBe(240)
    // 0.5 + 0.5 = 1.0 秒 = 段 1 全部 + 段 2 240 ticks = 720 ticks
    expect(secondsToTick(1.0, tempoMap, 480)).toBe(720)
    // 0.5 + 0.1 = 0.6 秒 = 段 1 480 ticks + 段 2 48 ticks = 528 ticks
    expect(secondsToTick(0.6, tempoMap, 480)).toBe(528)
  })

  it('startTick 非零时正确转换', () => {
    const tempoMap: TempoEvent[] = [
      { tick: 0, bpm: 120 },
    ]
    // startTick = 480, 再加 0.25 秒 (240 ticks) => 720 ticks
    expect(secondsToTick(0.25, tempoMap, 480, 480)).toBe(720)
  })

  it('startTick 跨过 tempo 边界时正确计算', () => {
    // startTick = 480（第二段起始）
    const tempoMap: TempoEvent[] = [
      { tick: 0, bpm: 120 },
      { tick: 480, bpm: 60 },
    ]
    // startTick=480, targetSeconds=0.5 => BPM=60 下 0.5 秒 = 240 ticks => 720
    expect(secondsToTick(0.5, tempoMap, 480, 480)).toBe(720)
  })

  it('目标时间超出所有 tempo 段时继续计算', () => {
    const tempoMap: TempoEvent[] = [
      { tick: 0, bpm: 120 },
      { tick: 480, bpm: 60 },
    ]
    // 段 1: 480 ticks 在 120BPM = 0.5 秒
    // 段 2: 无限延续，60BPM
    // 额外 1 秒在 60BPM = 480 ticks
    // 总计: 480 + 480 = 960 ticks
    expect(secondsToTick(1.5, tempoMap, 480)).toBe(960)
  })

  it('自定义 PPQ 正确反向计算', () => {
    const tempoMap: TempoEvent[] = [
      { tick: 0, bpm: 120 },
    ]
    // 0.5 秒 at 120BPM with PPQ=960 = 960 ticks
    expect(secondsToTick(0.5, tempoMap, 960)).toBe(960)
  })

  it('tickToSeconds 和 secondsToTick 互为逆运算', () => {
    const tempoMap: TempoEvent[] = [
      { tick: 0, bpm: 140 },
      { tick: 480, bpm: 80 },
      { tick: 960, bpm: 100 },
    ]
    // 先转秒，再转回 tick，应与原始值接近
    const originalTick = 720
    const seconds = tickToSeconds(originalTick, tempoMap, 480)
    const roundTripTick = secondsToTick(seconds, tempoMap, 480)
    // 由于四舍五入可能差 1 tick
    expect(Math.abs(roundTripTick - originalTick)).toBeLessThanOrEqual(1)
  })
})
