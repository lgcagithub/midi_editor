/**
 * 8.3 / 8.4 背景网格层
 *
 * 绘制在 gridCanvas（z-0）上：
 * - 水平线：每半音一行，间距 noteHeight
 * - 垂直线：小节线、拍线、细分线（密度自适应）
 * - 白键行交替底色
 * - C 行底部加重边框
 */

import type { CoordinateMapper, Orientation } from './coordinate-mapper'
import type { TimeSigEvent } from '@/types'

// ============================================================
// 类型
// ============================================================

export interface GridRenderParams {
  ctx: CanvasRenderingContext2D
  mapper: CoordinateMapper
  orientation: Orientation
  scrollX: number
  scrollY: number
  width: number
  height: number
  noteHeight: number
  timeSigs: TimeSigEvent[]
  ppq: number
}

// ============================================================
// 工具 —— 获取指定 tick 的拍号
// ============================================================

function getTimeSigAt(
  tick: number,
  timeSigs: TimeSigEvent[],
): { numerator: number; denominator: number } {
  if (timeSigs.length === 0) return { numerator: 4, denominator: 4 }
  let current = timeSigs[0]!
  for (const ts of timeSigs) {
    if (ts.tick <= tick) current = ts
    else break
  }
  return { numerator: current.numerator, denominator: current.denominator }
}

// ============================================================
// 白键判断
// ============================================================

const WHITE_SEMITONE_SET = new Set([0, 2, 4, 5, 7, 9, 11])

function isWhitePitch(pitch: number): boolean {
  return WHITE_SEMITONE_SET.has(pitch % 12)
}

function isCPitch(pitch: number): boolean {
  return pitch % 12 === 0
}

// ============================================================
// 半音行主题色（白键行交替）
// ============================================================

/** 白键行基底色（略深于表面） */
const WHITE_ROW_BG = 'rgba(255,255,255,0.03)'
const WHITE_ROW_BG_ALT = 'rgba(255,255,255,0.06)'

/** C 行底部边框强调色 */
const C_ROW_BORDER = 'rgba(255,255,255,0.12)'

/** 普通半音行分隔线色 */
const ROW_LINE_COLOR = 'rgba(255,255,255,0.06)'

/** 小节线色 */
const MEASURE_LINE_COLOR = 'rgba(255,255,255,0.25)'
const MEASURE_LINE_WIDTH = 1

/** 拍线色 */
const BEAT_LINE_COLOR = 'rgba(255,255,255,0.12)'
const BEAT_LINE_WIDTH = 1

/** 细分线色 */
const SUBDIVISION_LINE_COLOR = 'rgba(255,255,255,0.05)'
const SUBDIVISION_LINE_WIDTH = 1

/** 细分线最小间距（px），小于此值则隐藏 */
const MIN_SUBDIVISION_SPACING = 4

// ============================================================
// 主渲染函数
// ============================================================

export function renderGrid(params: GridRenderParams): void {
  const { ctx, mapper, orientation, scrollX, scrollY, width, height, noteHeight, timeSigs, ppq } = params

  ctx.clearRect(0, 0, width, height)

  // === 两个方向共用的大逻辑，但水平和垂直轴角色互换 ===
  const isVert = orientation === 'vertical'

  // ---------- 水平行 / 音高方向 ----------
  // vertical:   pitch axis = Y, horizontal lines
  // horizontal: pitch axis = X, vertical lines
  if (isVert) {
    renderHorizontalPitchLines(ctx, mapper, scrollY, width, height, noteHeight)
  } else {
    renderVerticalPitchLines(ctx, mapper, scrollX, width, height, noteHeight)
  }

  // ---------- 垂直时标线 ----------
  // vertical:   time axis = X, vertical lines
  // horizontal: time axis = Y, horizontal lines
  if (isVert) {
    renderVerticalTimeLines(ctx, mapper, scrollX, scrollY, width, height, timeSigs, ppq)
  } else {
    renderHorizontalTimeLines(ctx, mapper, scrollX, scrollY, width, height, timeSigs, ppq)
  }
}

// ============================================================
// 水平行（垂直布局 —— pitch = Y 方向）
// ============================================================

function renderHorizontalPitchLines(
  ctx: CanvasRenderingContext2D,
  mapper: CoordinateMapper,
  scrollY: number,
  width: number,
  height: number,
  noteHeight: number,
): void {
  // 计算可见音高范围
  const pitchTop = mapper.pixelToPitch(Math.max(0, scrollY))
  const pitchBottom = mapper.pixelToPitch(scrollY + height)
  const minPitch = Math.max(21, Math.min(pitchBottom, pitchTop))
  const maxPitch = Math.min(108, Math.max(pitchBottom, pitchTop))

  // 从下往上遍历（视觉上 pitch 0 在底部）
  for (let p = minPitch; p <= maxPitch; p++) {
    const y = mapper.pitchToPixel(p) - scrollY

    // 白键行交替底色
    if (isWhitePitch(p)) {
      ctx.fillStyle = p % 2 === 0 ? WHITE_ROW_BG_ALT : WHITE_ROW_BG
      ctx.fillRect(0, y, width, noteHeight)
    }

    // 行分隔线（底部边框）
    const lineY = y + noteHeight
    if (isCPitch(p)) {
      ctx.strokeStyle = C_ROW_BORDER
      ctx.lineWidth = 1
      ctx.beginPath()
      ctx.moveTo(0, lineY)
      ctx.lineTo(width, lineY)
      ctx.stroke()
    } else {
      ctx.strokeStyle = ROW_LINE_COLOR
      ctx.lineWidth = 1
      ctx.beginPath()
      ctx.moveTo(0, lineY)
      ctx.lineTo(width, lineY)
      ctx.stroke()
    }
  }
}

// ============================================================
// 水平行（水平布局 —— pitch = X 方向 / 竖直线）
// ============================================================

function renderVerticalPitchLines(
  ctx: CanvasRenderingContext2D,
  mapper: CoordinateMapper,
  scrollX: number,
  width: number,
  height: number,
  noteHeight: number,
): void {
  // 计算可见音高范围（沿 X 轴）
  const pitchLeft = mapper.pixelToPitch(Math.max(0, scrollX))
  const pitchRight = mapper.pixelToPitch(scrollX + width)
  const minPitch = Math.max(21, Math.min(pitchRight, pitchLeft))
  const maxPitch = Math.min(108, Math.max(pitchRight, pitchLeft))

  for (let p = minPitch; p <= maxPitch; p++) {
    const x = mapper.pitchToPixel(p) - scrollX

    // 白键列交替底色
    if (isWhitePitch(p)) {
      ctx.fillStyle = p % 2 === 0 ? WHITE_ROW_BG_ALT : WHITE_ROW_BG
      ctx.fillRect(x, 0, noteHeight, height)
    }

    // 列分隔线（右侧边框）
    const lineX = x + noteHeight
    if (isCPitch(p)) {
      ctx.strokeStyle = C_ROW_BORDER
      ctx.lineWidth = 1
      ctx.beginPath()
      ctx.moveTo(lineX, 0)
      ctx.lineTo(lineX, height)
      ctx.stroke()
    } else {
      ctx.strokeStyle = ROW_LINE_COLOR
      ctx.lineWidth = 1
      ctx.beginPath()
      ctx.moveTo(lineX, 0)
      ctx.lineTo(lineX, height)
      ctx.stroke()
    }
  }
}

// ============================================================
// 垂直时标线（垂直布局 —— time = X 方向）
// ============================================================

function renderVerticalTimeLines(
  ctx: CanvasRenderingContext2D,
  mapper: CoordinateMapper,
  scrollX: number,
  _scrollY: number,
  width: number,
  height: number,
  timeSigs: TimeSigEvent[],
  ppq: number,
): void {
  // 计算可见 tick 范围
  const leftTick = mapper.pixelToTick(Math.max(0, scrollX))
  const rightTick = mapper.pixelToTick(scrollX + width)

  // 获取当前拍号（用左边界 tick 近似）
  const ts = getTimeSigAt(leftTick, timeSigs)
  const beatTicks = (ppq * 4) / ts.denominator   // 每拍 tick 数
  const measureTicks = beatTicks * ts.numerator    // 每小节 tick 数

  // 找到第一个节拍 >= leftTick
  const firstBeat = Math.ceil(leftTick / beatTicks) * beatTicks

  // --- 细分线（密度自适应）---
  const subTicks = beatTicks / 2   // 八分音符

  // 简化：直接用像素间距判断
  // 一个节拍的像素宽度 = tickToPixel(tick + beatTicks) - tickToPixel(tick)
  const oneBeatPx = mapper.tickToPixel(firstBeat + beatTicks) - mapper.tickToPixel(firstBeat)
  const subSpacing = oneBeatPx / 2  // 细分线间距（半拍）

  const drawSubdivisions = subSpacing >= MIN_SUBDIVISION_SPACING

  // --- 绘制时标线 ---
  for (let tick = firstBeat; tick <= rightTick + beatTicks; tick += subTicks) {
    const x = mapper.tickToPixel(tick) - scrollX
    if (x < -2 || x > width + 2) continue

    const isSubdivision = tick % subTicks !== 0
    if (isSubdivision) {
      if (!drawSubdivisions) continue
      ctx.strokeStyle = SUBDIVISION_LINE_COLOR
      ctx.lineWidth = SUBDIVISION_LINE_WIDTH
    } else if (tick % measureTicks === 0) {
      // 小节线
      ctx.strokeStyle = MEASURE_LINE_COLOR
      ctx.lineWidth = MEASURE_LINE_WIDTH
    } else {
      // 拍线
      ctx.strokeStyle = BEAT_LINE_COLOR
      ctx.lineWidth = BEAT_LINE_WIDTH
    }

    ctx.beginPath()
    ctx.moveTo(x, 0)
    ctx.lineTo(x, height)
    ctx.stroke()
  }
}

// ============================================================
// 水平时标线（水平布局 —— time = Y 方向）
// ============================================================

function renderHorizontalTimeLines(
  ctx: CanvasRenderingContext2D,
  mapper: CoordinateMapper,
  _scrollX: number,
  scrollY: number,
  width: number,
  height: number,
  timeSigs: TimeSigEvent[],
  ppq: number,
): void {
  const topTick = mapper.pixelToTick(Math.max(0, scrollY))
  const bottomTick = mapper.pixelToTick(scrollY + height)

  const ts = getTimeSigAt(topTick, timeSigs)
  const beatTicks = (ppq * 4) / ts.denominator
  const measureTicks = beatTicks * ts.numerator
  const subTicks = beatTicks / 2

  const firstBeat = Math.ceil(topTick / beatTicks) * beatTicks

  const oneBeatPx = mapper.tickToPixel(firstBeat + beatTicks) - mapper.tickToPixel(firstBeat)
  const subSpacing = oneBeatPx / 2
  const drawSubdivisions = subSpacing >= MIN_SUBDIVISION_SPACING

  for (let tick = firstBeat; tick <= bottomTick + beatTicks; tick += subTicks) {
    const y = mapper.tickToPixel(tick) - scrollY
    if (y < -2 || y > height + 2) continue

    const isSubdivision = tick % subTicks !== 0
    if (isSubdivision) {
      if (!drawSubdivisions) continue
      ctx.strokeStyle = SUBDIVISION_LINE_COLOR
      ctx.lineWidth = SUBDIVISION_LINE_WIDTH
    } else if (tick % measureTicks === 0) {
      ctx.strokeStyle = MEASURE_LINE_COLOR
      ctx.lineWidth = MEASURE_LINE_WIDTH
    } else {
      ctx.strokeStyle = BEAT_LINE_COLOR
      ctx.lineWidth = BEAT_LINE_WIDTH
    }

    ctx.beginPath()
    ctx.moveTo(0, y)
    ctx.lineTo(width, y)
    ctx.stroke()
  }
}
