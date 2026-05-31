import { describe, it, expect } from 'vitest'

// ============================================================
// 密度级别阈值（与 ruler-renderer.ts 中定义的常量一致）
// ============================================================

const DENSITY_FULL = 80
const DENSITY_MEDIUM = 40
const DENSITY_SPARSE = 20

/**
 * 根据每拍像素数计算标尺密度级别
 *
 * 该函数封装了 ruler-renderer.ts 中 drawTicks 的密度判定逻辑，
 * 使其可脱离 Canvas 独立测试。
 *
 * @param pixelsPerBeat - 每拍对应的像素宽度
 * @returns 密度级别：1=最简，2=稀疏，3=中等，4=完整
 */
function computeDensityLevel(pixelsPerBeat: number): 1 | 2 | 3 | 4 {
  if (pixelsPerBeat >= DENSITY_FULL) return 4
  if (pixelsPerBeat >= DENSITY_MEDIUM) return 3
  if (pixelsPerBeat >= DENSITY_SPARSE) return 2
  return 1
}

// ============================================================
// 测试
// ============================================================

describe('computeDensityLevel', () => {
  it('pixelsPerBeat >= 80 → level 4 (full detail: measure number + beat labels + major + minor lines)', () => {
    expect(computeDensityLevel(80)).toBe(4)
    expect(computeDensityLevel(120)).toBe(4)
    expect(computeDensityLevel(200)).toBe(4)
  })

  it('pixelsPerBeat >= 40 → level 3 (medium: measure number + major line only)', () => {
    expect(computeDensityLevel(40)).toBe(3)
    expect(computeDensityLevel(60)).toBe(3)
    expect(computeDensityLevel(79)).toBe(3)
  })

  it('pixelsPerBeat >= 20 → level 2 (sparse: skip even measure labels + major line)', () => {
    expect(computeDensityLevel(20)).toBe(2)
    expect(computeDensityLevel(30)).toBe(2)
    expect(computeDensityLevel(39)).toBe(2)
  })

  it('pixelsPerBeat < 20 → level 1 (minimal: sparse measure labels + major line)', () => {
    expect(computeDensityLevel(0)).toBe(1)
    expect(computeDensityLevel(10)).toBe(1)
    expect(computeDensityLevel(19)).toBe(1)
  })

  it('boundary values are handled correctly', () => {
    // Exact boundary: >= uses inclusive comparison
    expect(computeDensityLevel(80)).toBe(4)
    expect(computeDensityLevel(40)).toBe(3)
    expect(computeDensityLevel(20)).toBe(2)
    // Just below boundary falls to lower level
    expect(computeDensityLevel(79)).toBe(3)
    expect(computeDensityLevel(39)).toBe(2)
    expect(computeDensityLevel(19)).toBe(1)
  })
})
