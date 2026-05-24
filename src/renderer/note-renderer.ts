/**
 * 8.5 音符层
 *
 * Merengue 规格的钢琴卷帘音符渲染：
 * - 3px 圆角
 * - 高光线 + 底部阴影
 * - 音轨色填充
 * - velocity → 透明度 0.55–1.0
 * - 虚拟渲染 AABB 裁剪
 * - 选中态 2px accent 外框 + 内高光
 * - 拖拽态阴影
 */

import type { CoordinateMapper, Orientation } from './coordinate-mapper'
import type { Note, Track } from '@/types'
import { TRACK_COLORS } from '@/constants'

// ============================================================
// 常量
// ============================================================

/** 音符圆角半径 */
const NOTE_RADIUS = 3

/** 最小音符像素宽度 —— 小于此宽度的绘制为 1px 竖线 */
const MIN_NOTE_WIDTH = 3

/** 选中态 accent 边框宽度 */
const SELECTED_BORDER_WIDTH = 2

/** 拖拽阴影 */
const DRAG_SHADOW_COLOR = 'rgba(0,0,0,0.3)'
const DRAG_SHADOW_BLUR = 12
const DRAG_SHADOW_OFFSET_Y = 4

/** 顶部高光 */
const TOP_HIGHLIGHT = 'rgba(255,255,255,0.2)'
const TOP_HIGHLIGHT_HEIGHT = 1

/** 底部阴影 */
const BOTTOM_SHADOW = 'rgba(0,0,0,0.2)'
const BOTTOM_SHADOW_HEIGHT = 1

/** 选中态内高光（白色半透明叠层） */
const SELECTED_INNER_OVERLAY = 'rgba(255,255,255,0.2)'

// ============================================================
// 类型
// ============================================================

export interface NoteRenderParams {
  ctx: CanvasRenderingContext2D
  mapper: CoordinateMapper
  orientation: Orientation
  scrollX: number
  scrollY: number
  width: number
  height: number
  tracks: Track[]
  allTracksNotes: Array<{ trackIndex: number; note: Note }>
  selectedNoteIds: Set<string>
  /** 正在被拖拽的音符 ID 集合（用于渲染阴影） */
  draggingNoteIds?: Set<string>
  noteHeight: number
}

// 音符在屏幕上的投影矩形
interface NoteScreenRect {
  x: number
  y: number
  w: number
  h: number
}

// ============================================================
// 辅助 —— 根据 velocity 计算不透明度
// ============================================================

function velocityOpacity(velocity: number): number {
  return 0.55 + (velocity / 127) * 0.45
}

// ============================================================
// 辅助 —— 计算音符的屏幕矩形（orientation 感知）
// ============================================================

function computeNoteRect(
  note: Note,
  mapper: CoordinateMapper,
  orientation: Orientation,
  scrollX: number,
  scrollY: number,
  noteHeight: number,
): NoteScreenRect {
  if (orientation === 'vertical') {
    const x = mapper.tickToPixel(note.startTick) - scrollX
    const y = mapper.pitchToPixel(note.pitch) - scrollY
    const w = mapper.tickToPixel(note.startTick + note.duration) - mapper.tickToPixel(note.startTick)
    return { x, y, w: Math.max(1, w), h: noteHeight }
  }

  // horizontal
  const x = mapper.pitchToPixel(note.pitch) - scrollX
  const y = mapper.tickToPixel(note.startTick) - scrollY
  const w = noteHeight
  const h = mapper.tickToPixel(note.startTick + note.duration) - mapper.tickToPixel(note.startTick)
  return { x, y, w, h: Math.max(1, h) }
}

// ============================================================
// 辅助 —— AABB 裁剪
// ============================================================

function isVisible(rect: NoteScreenRect, viewW: number, viewH: number): boolean {
  return rect.x + rect.w > 0 && rect.x < viewW && rect.y + rect.h > 0 && rect.y < viewH
}

// ============================================================
// 圆角矩形路径
// ============================================================

function roundRect(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  w: number,
  h: number,
  r: number,
): void {
  r = Math.min(r, w / 2, h / 2)
  ctx.beginPath()
  ctx.moveTo(x + r, y)
  ctx.lineTo(x + w - r, y)
  ctx.arcTo(x + w, y, x + w, y + r, r)
  ctx.lineTo(x + w, y + h - r)
  ctx.arcTo(x + w, y + h, x + w - r, y + h, r)
  ctx.lineTo(x + r, y + h)
  ctx.arcTo(x, y + h, x, y + h - r, r)
  ctx.lineTo(x, y + r)
  ctx.arcTo(x, y, x + r, y, r)
  ctx.closePath()
}

// ============================================================
// 主渲染函数
// ============================================================

export function renderNotes(params: NoteRenderParams): void {
  const {
    ctx, mapper, orientation, scrollX, scrollY,
    width, height, allTracksNotes, selectedNoteIds,
    draggingNoteIds, noteHeight,
  } = params

  ctx.clearRect(0, 0, width, height)

  const dragSet = draggingNoteIds ?? new Set<string>()

  for (const { trackIndex, note } of allTracksNotes) {
    const rect = computeNoteRect(note, mapper, orientation, scrollX, scrollY, noteHeight)

    // AABB 裁剪
    if (!isVisible(rect, width, height)) continue

    const isSelected = selectedNoteIds.has(note.id)
    const isDragging = dragSet.has(note.id)

    // 获取轨道颜色
    const trackColor = TRACK_COLORS[trackIndex % TRACK_COLORS.length]!

    // 极短音符处理
    const isVertical = orientation === 'vertical'
    const notePixelWidth = isVertical ? rect.w : rect.h

    if (notePixelWidth < MIN_NOTE_WIDTH) {
      // 绘制为 1px 竖线（在垂直布局下）
      drawTinyNote(ctx, rect, isVertical, trackColor, isSelected)
      continue
    }

    // 正常音符
    drawNormalNote(ctx, rect, trackColor, note.velocity, isSelected, isDragging)
  }
}

// ============================================================
// 绘制极短音符（< 3px）
// ============================================================

function drawTinyNote(
  ctx: CanvasRenderingContext2D,
  rect: NoteScreenRect,
  isVertical: boolean,
  color: string,
  isSelected: boolean,
): void {
  ctx.save()
  ctx.strokeStyle = color
  ctx.lineWidth = 1

  if (isVertical) {
    ctx.beginPath()
    ctx.moveTo(rect.x, rect.y)
    ctx.lineTo(rect.x, rect.y + rect.h)
    ctx.stroke()
  } else {
    ctx.beginPath()
    ctx.moveTo(rect.x, rect.y)
    ctx.lineTo(rect.x + rect.w, rect.y)
    ctx.stroke()
  }

  if (isSelected) {
    ctx.strokeStyle = '#FF6E82'
    ctx.lineWidth = 2
    if (isVertical) {
      ctx.beginPath()
      ctx.moveTo(rect.x - 1, rect.y)
      ctx.lineTo(rect.x - 1, rect.y + rect.h)
      ctx.stroke()
      ctx.beginPath()
      ctx.moveTo(rect.x + 1, rect.y)
      ctx.lineTo(rect.x + 1, rect.y + rect.h)
      ctx.stroke()
    } else {
      ctx.beginPath()
      ctx.moveTo(rect.x, rect.y - 1)
      ctx.lineTo(rect.x + rect.w, rect.y - 1)
      ctx.stroke()
      ctx.beginPath()
      ctx.moveTo(rect.x, rect.y + 1)
      ctx.lineTo(rect.x + rect.w, rect.y + 1)
      ctx.stroke()
    }
  }

  ctx.restore()
}

// ============================================================
// 绘制正常音符
// ============================================================

function drawNormalNote(
  ctx: CanvasRenderingContext2D,
  rect: NoteScreenRect,
  color: string,
  velocity: number,
  isSelected: boolean,
  isDragging: boolean,
): void {
  const { x, y, w, h } = rect
  const alpha = velocityOpacity(velocity)

  ctx.save()

  // ---- 拖拽阴影 ----
  if (isDragging) {
    ctx.shadowColor = DRAG_SHADOW_COLOR
    ctx.shadowBlur = DRAG_SHADOW_BLUR
    ctx.shadowOffsetY = DRAG_SHADOW_OFFSET_Y
  }

  // ---- 主体填充 ----
  ctx.globalAlpha = alpha
  roundRect(ctx, x, y, w, h, NOTE_RADIUS)
  ctx.fillStyle = color
  ctx.fill()

  // 关闭拖拽阴影（后续不需要了）
  ctx.shadowColor = 'transparent'
  ctx.shadowBlur = 0
  ctx.shadowOffsetY = 0

  // ---- 顶部高光 ----
  if (h > TOP_HIGHLIGHT_HEIGHT + 1) {
    ctx.globalAlpha = 1
    ctx.fillStyle = TOP_HIGHLIGHT
    roundRect(ctx, x, y, w, TOP_HIGHLIGHT_HEIGHT, NOTE_RADIUS)
    ctx.fill()
  }

  // ---- 底部阴影 ----
  if (h > BOTTOM_SHADOW_HEIGHT + 1) {
    ctx.fillStyle = BOTTOM_SHADOW
    roundRect(ctx, x, y + h - BOTTOM_SHADOW_HEIGHT, w, BOTTOM_SHADOW_HEIGHT, NOTE_RADIUS)
    ctx.fill()
  }

  // ---- 选中态外框 ----
  if (isSelected) {
    ctx.globalAlpha = 1
    ctx.strokeStyle = '#FF6E82'
    ctx.lineWidth = SELECTED_BORDER_WIDTH
    roundRect(ctx, x, y, w, h, NOTE_RADIUS + 1)
    ctx.stroke()

    // 选中态内高光
    ctx.fillStyle = SELECTED_INNER_OVERLAY
    roundRect(ctx, x + 1, y + 1, w - 2, h - 2, NOTE_RADIUS)
    ctx.fill()
  }

  ctx.restore()
}
