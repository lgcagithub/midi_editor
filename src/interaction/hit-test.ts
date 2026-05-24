/**
 * 9.2 命中检测
 *
 * 检测鼠标位置与音符的交互区域：
 *   左边缘 4px → 右边缘 4px → 音符身体 → 空白
 *
 * 返回 HitTarget 描述命中类型。
 */

import type { Note } from '@/types'
import type { CoordinateMapper } from '@/renderer/coordinate-mapper'

// ============================================================
// 常量
// ============================================================

/** 边缘热区宽度（逻辑像素） */
const EDGE_HIT_RADIUS = 4

// ============================================================
// 类型
// ============================================================

/** 音符在屏幕上的投影矩形 */
export interface NoteScreenRect {
  x: number
  y: number
  w: number
  h: number
}

/** 命中结果 */
export type HitTarget =
  | { type: 'leftEdge'; noteId: string }
  | { type: 'rightEdge'; noteId: string }
  | { type: 'body'; noteId: string }
  | null

// ============================================================
// 计算音符屏幕矩形
// ============================================================

/**
 * 根据音符数据 + mapper + scroll 计算出音符在屏幕上的像素矩形。
 * 当前仅支持 vertical 方向。
 */
export function computeNoteScreenRect(
  note: Note,
  mapper: CoordinateMapper,
  scrollX: number,
  scrollY: number,
  noteHeight: number,
): NoteScreenRect {
  const x = mapper.tickToPixel(note.startTick) - scrollX
  const y = mapper.pitchToPixel(note.pitch) - scrollY
  const w =
    mapper.tickToPixel(note.startTick + note.duration) -
    mapper.tickToPixel(note.startTick)
  return { x, y, w: Math.max(1, w), h: noteHeight }
}

// ============================================================
// 命中检测主函数
// ============================================================

/**
 * 从最上层（最后绘制）到最下层遍历音符，按优先级检测：
 * 左边缘 → 右边缘 → 身体 → 未命中
 */
export function hitTest(
  mouseX: number,
  mouseY: number,
  allNotes: ReadonlyArray<{ trackIndex: number; note: Note }>,
  mapper: CoordinateMapper,
  scrollX: number,
  scrollY: number,
  noteHeight: number,
): HitTarget {
  // 从后往前遍历（后绘制的音符在上层）
  for (let i = allNotes.length - 1; i >= 0; i--) {
    const entry = allNotes[i]
    if (!entry) continue
    const { note } = entry
    const rect = computeNoteScreenRect(note, mapper, scrollX, scrollY, noteHeight)

    const { x, y, w, h } = rect

    // 先检查边缘（优先级更高）
    // 左边缘热区
    if (
      mouseX >= x - EDGE_HIT_RADIUS &&
      mouseX < x + EDGE_HIT_RADIUS &&
      mouseY >= y &&
      mouseY <= y + h
    ) {
      return { type: 'leftEdge', noteId: note.id }
    }

    // 右边缘热区
    if (
      mouseX >= x + w - EDGE_HIT_RADIUS &&
      mouseX < x + w + EDGE_HIT_RADIUS &&
      mouseY >= y &&
      mouseY <= y + h
    ) {
      return { type: 'rightEdge', noteId: note.id }
    }

    // 身体
    if (
      mouseX >= x &&
      mouseX <= x + w &&
      mouseY >= y &&
      mouseY <= y + h
    ) {
      return { type: 'body', noteId: note.id }
    }
  }

  return null
}
