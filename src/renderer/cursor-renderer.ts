/**
 * 8.9 播放光标层
 *
 * rAF 驱动，每秒 60fps 更新。
 * 竖线颜色 accent #FF6E82，1px + 发光阴影 + 三角指示器。
 */

import type { CoordinateMapper, Orientation } from './coordinate-mapper'

// ============================================================
// 常量
// ============================================================

/** 光标竖线颜色（accent） */
const CURSOR_COLOR = '#FF6E82'

/** 光标线宽 */
const CURSOR_LINE_WIDTH = 1

/** 发光阴影 */
const GLOW_COLOR = 'rgba(255,110,130,0.5)'
const GLOW_BLUR = 8

/** 三角指示器尺寸 */
const TRIANGLE_HALF_BASE = 5
const TRIANGLE_HEIGHT = 8

// ============================================================
// 类型
// ============================================================

export interface CursorRenderParams {
  ctx: CanvasRenderingContext2D
  mapper: CoordinateMapper
  orientation: Orientation
  /** 当前播放位置（tick） */
  currentTick: number
  scrollX: number
  scrollY: number
  width: number
  height: number
}

// ============================================================
// 主渲染函数
// ============================================================

export function renderCursor(params: CursorRenderParams): void {
  const { ctx, mapper, orientation, currentTick, scrollX, scrollY, width, height } = params

  ctx.clearRect(0, 0, width, height)

  // 计算光标位置
  const isVert = orientation === 'vertical'
  const cursorTimePx = mapper.tickToPixel(currentTick)
  const cursorPos = isVert
    ? cursorTimePx - scrollX   // vertical: cursor along X axis
    : cursorTimePx - scrollY   // horizontal: cursor along Y axis

  // 如果光标在视口外，不绘制
  if (cursorPos < -10 || cursorPos > (isVert ? width : height) + 10) return

  ctx.save()

  // ---- 发光阴影 ----
  ctx.shadowColor = GLOW_COLOR
  ctx.shadowBlur = GLOW_BLUR

  // ---- 竖线 ----
  ctx.strokeStyle = CURSOR_COLOR
  ctx.lineWidth = CURSOR_LINE_WIDTH

  if (isVert) {
    ctx.beginPath()
    ctx.moveTo(cursorPos, 0)
    ctx.lineTo(cursorPos, height)
    ctx.stroke()

    // ---- 三角指示器（顶边居中） ----
    ctx.shadowBlur = 0
    ctx.fillStyle = CURSOR_COLOR
    ctx.beginPath()
    ctx.moveTo(cursorPos, TRIANGLE_HEIGHT)
    ctx.lineTo(cursorPos - TRIANGLE_HALF_BASE, 0)
    ctx.lineTo(cursorPos + TRIANGLE_HALF_BASE, 0)
    ctx.closePath()
    ctx.fill()
  } else {
    ctx.beginPath()
    ctx.moveTo(0, cursorPos)
    ctx.lineTo(width, cursorPos)
    ctx.stroke()

    // ---- 三角指示器（左边居中） ----
    ctx.shadowBlur = 0
    ctx.fillStyle = CURSOR_COLOR
    ctx.beginPath()
    ctx.moveTo(TRIANGLE_HEIGHT, cursorPos)
    ctx.lineTo(0, cursorPos - TRIANGLE_HALF_BASE)
    ctx.lineTo(0, cursorPos + TRIANGLE_HALF_BASE)
    ctx.closePath()
    ctx.fill()
  }

  ctx.restore()
}
