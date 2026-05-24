/**
 * 8.1 坐标映射核心函数
 *
 * 负责 MIDI tick → 像素、音高 → 像素的双向转换。
 * Orientation 感知：告诉调用方哪个轴是时间轴、哪个轴是音高轴。
 */

import { tickToSeconds, secondsToTick } from '@/model/time-convert'
import { PITCH_MAX } from '@/constants'
import type { TempoEvent } from '@/types'

// ============================================================
// 常量
// ============================================================

/** 每秒钟对应的基准像素数（zoomX = 1 时） */
export const BASE_PIXELS_PER_SECOND = 200

/** 像素精度常数 —— 用于防止极短段落的浮点误差 */
const EPSILON = 1e-9

// ============================================================
// 类型定义
// ============================================================

export type Orientation = 'vertical' | 'horizontal'

export interface CoordinateMapper {
  /** 当前布局方向 */
  orientation: Orientation

  /** 当前时间轴像素密度（px/s），已包含 zoomX */
  pixelsPerSecond: number

  /** 每行（一个半音）的像素高度，已包含 zoomY */
  noteHeight: number

  /** 音高轴偏移量：对齐键盘顶部不完整八度（C8 独白键） */
  pitchOffset: number

  /**
   * 将 tick 转换为时间轴上的像素位置（绝对坐标，不含 scroll）
   * - vertical:   X 轴
   * - horizontal: Y 轴
   */
  tickToPixel(tick: number): number

  /**
   * 将 MIDI 音高转换为音高轴上的像素位置（绝对坐标，不含 scroll）
   * - vertical:   Y 轴（pitch 127 在顶部）
   * - horizontal: X 轴
   */
  pitchToPixel(pitch: number): number

  /**
   * 将时间轴上的像素位置转换回 tick
   */
  pixelToTick(pixel: number): number

  /**
   * 将音高轴上的像素位置转换回 MIDI 音高
   */
  pixelToPitch(pixel: number): number
}

// ============================================================
// Factory
// ============================================================

/**
 * 创建 CoordinateMapper 实例
 *
 * @param orientation  布局方向
 * @param zoomX        水平缩放（影响时间轴）
 * @param noteHeight   有效行高（已缩放：whiteKeySize × 7/12 × zoomY）
 * @param tempoMap     速度映射表
 * @param ppq          每四分音符 tick 数
 */
export function createCoordinateMapper(
  orientation: Orientation,
  zoomX: number,
  noteHeight: number,
  tempoMap: TempoEvent[],
  ppq: number,
): CoordinateMapper {
  const pixelsPerSec = BASE_PIXELS_PER_SECOND * Math.max(zoomX, 0.01)
  // 音高轴偏移：键盘顶部 C8 是完整白键，但 Piano Roll 只分给它 noteHeight。
  // 相差 whiteKeySize - noteHeight = noteHeight × (12/7 - 1) = noteHeight × 5/7。
  // 加此偏移后 B7 Piano Roll 行起点 = 偏移 + noteHeight = whiteKeySize，与键盘对齐。
  const pitchOffset = orientation === 'vertical'
    ? noteHeight * (5 / 7)
    : 0

  return {
    orientation,
    pixelsPerSecond: pixelsPerSec,
    noteHeight,
    pitchOffset,

    tickToPixel: (tick: number): number => {
      return tickToSeconds(tick, tempoMap, ppq) * pixelsPerSec
    },

    pitchToPixel: (pitch: number): number => {
      return (PITCH_MAX - pitch) * noteHeight + pitchOffset
    },

    pixelToTick: (pixel: number): number => {
      const seconds = Math.max(0, pixel / pixelsPerSec)
      return secondsToTick(seconds, tempoMap, ppq)
    },

    pixelToPitch: (pixel: number): number => {
      const adjustedPixel = pixel - pitchOffset
      const p = PITCH_MAX - Math.round(adjustedPixel / Math.max(noteHeight, EPSILON))
      return Math.max(0, Math.min(127, p))
    },
  }
}
