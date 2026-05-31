import { describe, it, expect } from 'vitest'

// ============================================================
// 纯函数 —— 封装 auto-follow 数学
//
// 这些函数实现选型文档定义的光标跟随算法（D3）：
// - computeTargetScrollX: 计算目标水平滚动偏移
// - lerpScrollX:          缓动插值（每帧趋向目标）
// - clampScrollX:         限制在有效范围内
// ============================================================

/**
 * 计算目标 scrollX 使得光标锚定在视口的指定比例位置
 *
 * @param cursorPixel - 光标的绝对像素位置（mapper.tickToPixel）
 * @param viewportWidth - 视口可见宽度（px）
 * @param anchorRatio - 锚点比例（0~1），如 0.3 表示光标在视口 30% 处
 * @returns 目标 scrollX（可能为负或超过最大值，需 clamp）
 */
function computeTargetScrollX(
  cursorPixel: number,
  viewportWidth: number,
  anchorRatio: number,
): number {
  return cursorPixel - viewportWidth * anchorRatio
}

/**
 * 缓动插值：每帧向目标移动剩余距离的 smoothing 比例
 *
 * @param current - 当前 scrollX
 * @param target - 目标 scrollX
 * @param smoothing - 缓动系数（0~1），如 0.12
 * @returns 新的 scrollX
 */
function lerpScrollX(current: number, target: number, smoothing: number): number {
  return current + (target - current) * smoothing
}

/**
 * 将 scrollX 限制在 [0, maxScrollX] 范围内
 *
 * @param scrollX - 待 clamp 的 scrollX 值
 * @param maxScrollX - 最大允许值（内容宽度 - 视口宽度）
 * @returns clamp 后的 scrollX
 */
function clampScrollX(scrollX: number, maxScrollX: number): number {
  return Math.max(0, Math.min(scrollX, maxScrollX))
}

// ============================================================
// computeTargetScrollX
// ============================================================

describe('computeTargetScrollX', () => {
  it('targetScrollX = cursorPixel - viewportWidth * 0.3 with anchorRatio=0.3', () => {
    // Scenario from spec: viewportWidth=800, cursorPixel=1000 → target = 1000 - 800*0.3 = 760
    expect(computeTargetScrollX(1000, 800, 0.3)).toBe(760)
  })

  it('target scroll is proportional to cursor position', () => {
    // With anchorRatio=0.3, target moves 1:1 with cursor
    const t1 = computeTargetScrollX(500, 800, 0.3)
    const t2 = computeTargetScrollX(600, 800, 0.3)
    expect(t2 - t1).toBe(100) // same delta as cursor
  })

  it('viewport width affects anchor offset proportionally', () => {
    // Wider viewport means more space before the anchor point
    expect(computeTargetScrollX(1000, 1000, 0.3)).toBe(700)
    expect(computeTargetScrollX(1000, 600, 0.3)).toBe(820)
  })

  it('anchorRatio=0 places cursor at left edge of viewport', () => {
    expect(computeTargetScrollX(500, 800, 0)).toBe(500)
  })

  it('anchorRatio=1 places cursor at right edge of viewport', () => {
    expect(computeTargetScrollX(500, 800, 1)).toBe(-300)
  })
})

// ============================================================
// lerpScrollX
// ============================================================

describe('lerpScrollX', () => {
  it('smoothing=0 returns current unchanged', () => {
    expect(lerpScrollX(100, 200, 0)).toBe(100)
  })

  it('smoothing=1 returns target exactly (instant snap)', () => {
    expect(lerpScrollX(100, 200, 1)).toBe(200)
  })

  it('smoothing=0.5 interpolates halfway', () => {
    expect(lerpScrollX(100, 200, 0.5)).toBe(150)
  })

  it('smoothing=0.12 interpolates correctly (spec default)', () => {
    const result = lerpScrollX(400, 760, 0.12)
    const expected = 400 + (760 - 400) * 0.12
    expect(result).toBeCloseTo(expected)
  })

  it('handles negative target (moving left)', () => {
    expect(lerpScrollX(500, 100, 0.5)).toBe(300)
  })

  it('approaches target over multiple steps', () => {
    let scrollX = 0
    const target = 100
    const smoothing = 0.5

    scrollX = lerpScrollX(scrollX, target, smoothing)
    expect(scrollX).toBe(50)

    scrollX = lerpScrollX(scrollX, target, smoothing)
    expect(scrollX).toBe(75)

    scrollX = lerpScrollX(scrollX, target, smoothing)
    expect(scrollX).toBeCloseTo(87.5)
  })
})

// ============================================================
// clampScrollX
// ============================================================

describe('clampScrollX', () => {
  it('clamps negative value to 0', () => {
    expect(clampScrollX(-50, 1000)).toBe(0)
  })

  it('clamps value exceeding maxScrollX to maxScrollX', () => {
    expect(clampScrollX(1500, 1000)).toBe(1000)
  })

  it('allows in-range values unchanged', () => {
    expect(clampScrollX(0, 1000)).toBe(0)
    expect(clampScrollX(500, 1000)).toBe(500)
    expect(clampScrollX(1000, 1000)).toBe(1000)
  })

  it('negative target (from computeTargetScrollX) clamped to 0', () => {
    // When cursor is near left edge, target can be negative
    expect(clampScrollX(-100, 2000)).toBe(0)
  })

  it('large positive value clamped to maxScrollX', () => {
    expect(clampScrollX(9999, 5000)).toBe(5000)
  })

  it('maxScrollX=0 means no scrolling possible', () => {
    expect(clampScrollX(-10, 0)).toBe(0)
    expect(clampScrollX(0, 0)).toBe(0)
    expect(clampScrollX(10, 0)).toBe(0)
  })
})
