import { describe, it, expect } from 'vitest'
import { getGridLevels, snapTick } from '../snap-grid'
import { DEFAULT_PPQ } from '@/constants'

// ============================================================
// 10.1 — 网格级别常量
// ============================================================

describe('getGridLevels', () => {
  it('PPQ=480 时返回 9 级网格', () => {
    const levels = getGridLevels(480)
    expect(levels).toHaveLength(9)
  })

  it('各级网格 ticks 值正确', () => {
    const levels = getGridLevels(480)
    expect(levels[0]!).toEqual({ label: '1/1', ticks: 1920 })
    expect(levels[1]!).toEqual({ label: '1/2', ticks: 960 })
    expect(levels[2]!).toEqual({ label: '1/4', ticks: 480 })
    expect(levels[3]!).toEqual({ label: '1/8', ticks: 240 })
    expect(levels[4]!).toEqual({ label: '1/16', ticks: 120 })
    expect(levels[5]!).toEqual({ label: '1/32', ticks: 60 })
    expect(levels[6]!).toEqual({ label: '1/64', ticks: 30 })
    expect(levels[7]!).toEqual({ label: '1/8T', ticks: 160 })
    expect(levels[8]!).toEqual({ label: '1/16T', ticks: 80 })
  })

  it('PPQ=960 时 ticks 值随之缩放', () => {
    const levels = getGridLevels(960)
    expect(levels[0]!.ticks).toBe(3840)
    expect(levels[4]!.ticks).toBe(240)
    expect(levels[7]!.ticks).toBe(320)
  })

  it('每个级别的 ticks 都是整数', () => {
    const levels = getGridLevels(DEFAULT_PPQ)
    for (const level of levels) {
      expect(Number.isInteger(level.ticks)).toBe(true)
    }
  })

  it('每个级别都有非空 label', () => {
    const levels = getGridLevels(DEFAULT_PPQ)
    for (const level of levels) {
      expect(level.label.length).toBeGreaterThan(0)
    }
  })
})

// ============================================================
// 10.2 — snapTick
// ============================================================

describe('snapTick', () => {
  it('gridTicks <= 0 时返回原值', () => {
    expect(snapTick(100, 0)).toBe(100)
    expect(snapTick(100, -10)).toBe(100)
  })

  it('目标值恰好在网格线上不变', () => {
    expect(snapTick(0, 120)).toBe(0)
    expect(snapTick(120, 120)).toBe(120)
    expect(snapTick(240, 120)).toBe(240)
    expect(snapTick(480, 120)).toBe(480)
  })

  it('吸附到最近的网格线', () => {
    // 1/16 网格 (120 ticks)
    expect(snapTick(1, 120)).toBe(0)
    expect(snapTick(59, 120)).toBe(0)
    expect(snapTick(60, 120)).toBe(120) // 中间值四舍五入向上
    expect(snapTick(61, 120)).toBe(120)
    expect(snapTick(119, 120)).toBe(120)
    expect(snapTick(180, 120)).toBe(240)
  })

  it('整音符网格 (1920 ticks)', () => {
    expect(snapTick(0, 1920)).toBe(0)
    expect(snapTick(960, 1920)).toBe(1920)
    expect(snapTick(1920, 1920)).toBe(1920)
    expect(snapTick(2880, 1920)).toBe(3840)
  })

  it('八分三连音网格 (160 ticks)', () => {
    expect(snapTick(0, 160)).toBe(0)
    expect(snapTick(80, 160)).toBe(160)
    expect(snapTick(160, 160)).toBe(160)
    expect(snapTick(240, 160)).toBe(320)
  })

  it('负值也能正确吸附', () => {
    // Math.round 将 -0.5 向 +∞ 舍入 → -0 → ||0 后为 0
    expect(snapTick(-1, 120)).toBe(0)
    expect(snapTick(-60, 120)).toBe(0)  // Math.round(-0.5) = -0 → ||0 → 0
    expect(snapTick(-61, 120)).toBe(-120) // Math.round(-0.508) = -1
    expect(snapTick(-119, 120)).toBe(-120)
    expect(snapTick(-120, 120)).toBe(-120)
  })
})
