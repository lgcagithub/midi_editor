/**
 * 8.10 交互层
 *
 * z-3 层，用于绘制临时的交互反馈：
 * - 绘制中的音符预览（pencil 工具）
 * - 选择框虚线矩形（rubber-band）
 * - 拖拽位置幽灵
 */

import type { CoordinateMapper, Orientation } from './coordinate-mapper'
import { TRACK_COLORS } from '@/constants'

// ============================================================
// 常量
// ============================================================

/** 选择框虚线样式 */
const SELECTION_RECT_COLOR = '#FF6E82'
const SELECTION_RECT_LINE_WIDTH = 1

/** 音符预览透明度 */
const PREVIEW_OPACITY = 0.6

/** 幽灵音符透明度 */
const GHOST_OPACITY = 0.4

// ============================================================
// 类型
// ============================================================

/** 绘制中的音符预览 */
export interface NotePreview {
  startTick: number
  pitch: number
  duration: number
  velocity: number
  trackIndex: number
}

/** 选择框 */
export interface SelectionRect {
  x: number
  y: number
  width: number
  height: number
}

/** 幽灵音符 */
export interface GhostNote {
  x: number
  y: number
  w: number
  h: number
  trackIndex: number
}

export interface InteractionRenderParams {
  ctx: CanvasRenderingContext2D
  mapper: CoordinateMapper
  orientation: Orientation
  scrollX: number
  scrollY: number
  width: number
  height: number
  noteHeight: number

  /** 可选：绘制中的音符预览 */
  notePreview?: NotePreview | null

  /** 可选：选择框 */
  selectionRect?: SelectionRect | null

  /** 可选：幽灵音符列表（拖拽中） */
  ghostNotes?: GhostNote[] | null
}

// ============================================================
// 辅助 —— 圆角矩形路径
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

export function renderInteraction(params: InteractionRenderParams): void {
  const { ctx, mapper, orientation, scrollX, scrollY, width, height, noteHeight, notePreview, selectionRect, ghostNotes } = params

  ctx.clearRect(0, 0, width, height)
  ctx.save()

  // ---- 音符预览 ----
  if (notePreview) {
    drawNotePreview(ctx, mapper, orientation, scrollX, scrollY, noteHeight, notePreview)
  }

  // ---- 选择框 ----
  if (selectionRect) {
    drawSelectionRect(ctx, selectionRect)
  }

  // ---- 幽灵音符 ----
  if (ghostNotes && ghostNotes.length > 0) {
    drawGhostNotes(ctx, ghostNotes)
  }

  ctx.restore()
}

// ============================================================
// 音符预览绘制
// ============================================================

function drawNotePreview(
  ctx: CanvasRenderingContext2D,
  mapper: CoordinateMapper,
  orientation: Orientation,
  scrollX: number,
  scrollY: number,
  noteHeight: number,
  preview: NotePreview,
): void {
  const isVert = orientation === 'vertical'

  const x = isVert
    ? mapper.tickToPixel(preview.startTick) - scrollX
    : mapper.pitchToPixel(preview.pitch) - scrollX
  const y = isVert
    ? mapper.pitchToPixel(preview.pitch) - scrollY
    : mapper.tickToPixel(preview.startTick) - scrollY
  const w = isVert
    ? mapper.tickToPixel(preview.startTick + preview.duration) - mapper.tickToPixel(preview.startTick)
    : noteHeight
  const h = isVert
    ? noteHeight
    : mapper.tickToPixel(preview.startTick + preview.duration) - mapper.tickToPixel(preview.startTick)

  if (w < 1 || h < 1) return

  const color = TRACK_COLORS[preview.trackIndex % TRACK_COLORS.length]!

  ctx.save()
  ctx.globalAlpha = PREVIEW_OPACITY
  ctx.fillStyle = color
  roundRect(ctx, x, y, Math.max(1, w), Math.max(1, h), 3)
  ctx.fill()

  // 边框
  ctx.globalAlpha = 1
  ctx.strokeStyle = color
  ctx.lineWidth = 1
  roundRect(ctx, x, y, Math.max(1, w), Math.max(1, h), 3)
  ctx.stroke()
  ctx.restore()
}

// ============================================================
// 选择框绘制
// ============================================================

function drawSelectionRect(ctx: CanvasRenderingContext2D, rect: SelectionRect): void {
  const { x, y, width: w, height: h } = rect

  ctx.save()
  ctx.strokeStyle = SELECTION_RECT_COLOR
  ctx.lineWidth = SELECTION_RECT_LINE_WIDTH

  // 虚线
  ctx.setLineDash([4, 4])
  ctx.strokeRect(x, y, w, h)

  // 半透明填充
  ctx.fillStyle = 'rgba(255, 110, 130, 0.08)'
  ctx.fillRect(x, y, w, h)

  ctx.restore()
}

// ============================================================
// 幽灵音符绘制
// ============================================================

function drawGhostNotes(ctx: CanvasRenderingContext2D, ghosts: GhostNote[]): void {
  ctx.save()
  ctx.globalAlpha = GHOST_OPACITY

  for (const ghost of ghosts) {
    const color = TRACK_COLORS[ghost.trackIndex % TRACK_COLORS.length]!

    ctx.fillStyle = color
    roundRect(ctx, ghost.x, ghost.y, Math.max(1, ghost.w), Math.max(1, ghost.h), 3)
    ctx.fill()

    ctx.strokeStyle = color
    ctx.lineWidth = 1
    roundRect(ctx, ghost.x, ghost.y, Math.max(1, ghost.w), Math.max(1, ghost.h), 3)
    ctx.stroke()
  }

  ctx.restore()
}
