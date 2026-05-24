/**
 * 钢琴键盘数学与几何工具
 *
 * 88 键钢琴范围: A0(21) ~ C8(108), 52 个白键
 * 白键分布: 八度 0=A0,B0 / 八度 1-7=各 7 白键 / 八度 8=C8
 */

import { PITCH_MIN, PITCH_MAX } from '../constants'
import { isBlackKey } from '../model/note-utils'

// ============================================================
// 类型定义
// ============================================================

export type Orientation = 'vertical' | 'horizontal'

export interface KeyboardGeometry {
  /** 键盘区域左上角 X */
  x: number
  /** 键盘区域左上角 Y */
  y: number
  /** 键盘区域宽度 */
  width: number
  /** 键盘区域高度 */
  height: number
  /** 白键尺寸（垂直布局=高度，水平布局=宽度） */
  whiteKeySize: number
  /** 黑键行/列尺寸 */
  blackKeySize: number
  /** 88 键网格起始偏移 */
  keyOffset: number
  /** 布局方向 */
  orientation: Orientation
}

// ============================================================
// 常量
// ============================================================

/** 一个八度内的白键半音偏移量 (C, D, E, F, G, A, B) */
const WHITE_SEMITONES = [0, 2, 4, 5, 7, 9, 11] as const


/** 黑键横向（交叉轴）宽度占比 */
const BLACK_KEY_CROSS_RATIO = 0.65

/** 白键总数 */
const WHITE_KEY_COUNT = 52

// ============================================================
// 7.1 — 白键索引 ↔ MIDI 音高双向映射
// ============================================================

/**
 * 将白键索引转换为 MIDI 音高
 * @param whiteIdx 白键索引 (0-51)
 * @returns MIDI 音高编号 (21-108)
 */
export function whiteIndexToPitch(whiteIdx: number): number {
  const idx = Math.round(whiteIdx)
  if (idx <= 0) return PITCH_MIN
  if (idx >= 51) return PITCH_MAX

  if (idx === 0) return 21  // A0
  if (idx === 1) return 23  // B0

  // whiteIdx 2+ → 八度 1-8
  const adjusted = idx - 2                           // 在八度 1-8 空间中的 0 基索引
  const octave = 1 + Math.floor(adjusted / 7)        // 1-8
  const posInOctave = adjusted % 7                   // 0-6
  const semitone = WHITE_SEMITONES[posInOctave]!

  // MIDI 音高 = (octave + 1) * 12 + semitone
  return (octave + 1) * 12 + semitone
}

/**
 * 将 MIDI 音高转换为白键索引
 * @param pitch MIDI 音高编号 (0-127)
 * @returns 白键索引 (0-51)
 */
export function pitchToWhiteIndex(pitch: number): number {
  const p = Math.round(pitch)
  if (p <= PITCH_MIN) return 0
  if (p >= PITCH_MAX) return 51

  if (p < 24) {
    // 不完整八度 0: A0(21), A#0(22), B0(23)
    return p === 23 ? 1 : 0   // B0→1, A0/A#0→0
  }

  // p >= 24 时使用八度公式
  const musicalOctave = Math.floor(p / 12) - 1     // 1-indexed 八度号
  const semitone = p % 12

  // 不完整八度 0 中的白键数 (A0, B0)
  let count = 2

  // 完整八度 1 到 musicalOctave-1 中的白键
  if (musicalOctave > 1) {
    count += (musicalOctave - 1) * 7
  }

  // 当前八度中半音偏移 ≤ 当前半音的白键数
  let countInOctave = 0
  for (const ws of WHITE_SEMITONES) {
    if (ws <= semitone) countInOctave++
    else break
  }
  count += countInOctave

  return count - 1   // 计数转 0 基索引
}

// ============================================================
// 7.2 — 键盘几何计算
// ============================================================

/**
 * 计算键盘几何参数
 * @param areaX 键盘区域 X
 * @param areaY 键盘区域 Y
 * @param areaWidth 键盘区域宽度
 * @param areaHeight 键盘区域高度
 * @param orientation 布局方向（默认为垂直）
 * @returns 键盘几何参数
 */
export function computeKeyboardGeometry(
  areaX: number,
  areaY: number,
  areaWidth: number,
  areaHeight: number,
  orientation: Orientation = 'vertical',
): KeyboardGeometry {
  if (orientation === 'horizontal') {
    const whiteKeySize = areaWidth / WHITE_KEY_COUNT
    const blackKeySize = whiteKeySize * 7 / 12
    const firstBlackKeyX = areaX + whiteKeySize * 2 - blackKeySize * 2
    const keyOffset = firstBlackKeyX - blackKeySize
    return {
      x: areaX,
      y: areaY,
      width: areaWidth,
      height: areaHeight,
      whiteKeySize,
      blackKeySize,
      keyOffset,
      orientation,
    }
  }

  // 垂直布局（默认）
  const whiteKeySize = areaHeight / WHITE_KEY_COUNT
  const blackKeySize = whiteKeySize * 7 / 12
  const firstBlackKeyY = areaY + whiteKeySize * 2 - blackKeySize * 2
  const keyOffset = firstBlackKeyY - blackKeySize
  return {
    x: areaX,
    y: areaY,
    width: areaWidth,
    height: areaHeight,
    whiteKeySize,
    blackKeySize,
    keyOffset,
    orientation,
  }
}

/**
 * 获取黑键视觉尺寸（沿主轴方向），直接等于 88 键网格间距
 */
export function blackKeyVisualSize(geo: KeyboardGeometry): number {
  return geo.blackKeySize
}

/**
 * 获取黑键在行内的视觉顶部偏移
 */
export function blackKeyVisualTopOffset(_geo: KeyboardGeometry): number {
  return 0
}

/**
 * 获取黑键在交叉轴方向的尺寸
 */
export function blackKeyCrossSize(geo: KeyboardGeometry): number {
  if (geo.orientation === 'horizontal') {
    return geo.height * BLACK_KEY_CROSS_RATIO
  }
  return geo.width * BLACK_KEY_CROSS_RATIO
}

/**
 * 获取黑键在交叉轴方向的起始偏移
 * 垂直布局 = 从左侧开始，水平布局 = 从底部开始
 */
export function blackKeyCrossStart(geo: KeyboardGeometry): number {
  if (geo.orientation === 'horizontal') {
    // 水平布局黑键在下半部分
    return geo.y + geo.height - blackKeyCrossSize(geo)
  }
  // 垂直布局黑键在左半部分
  return geo.x
}

/**
 * 获取 88 键网格中指定键的起始位置（沿主轴）
 * @param keyIndex 88 键索引 (0-87, pitch - 21)
 * @param geo 键盘几何参数
 * @returns 沿主轴的位置坐标
 */
export function keySlotStart(keyIndex: number, geo: KeyboardGeometry): number {
  if (geo.orientation === 'horizontal') {
    return geo.keyOffset + geo.blackKeySize * keyIndex
  }
  // 垂直布局：高音(C8)在顶部，低音(A0)在底部
  return geo.keyOffset + geo.blackKeySize * (87 - keyIndex)
}

/**
 * 获取指定白键的起始位置（沿主轴）
 * @param whiteIdx 白键索引 (0-51)
 * @param geo 键盘几何参数
 * @returns 沿主轴的位置坐标
 */
export function whiteKeyStart(whiteIdx: number, geo: KeyboardGeometry): number {
  if (geo.orientation === 'horizontal') {
    return geo.y + geo.whiteKeySize * whiteIdx
  }
  // 垂直布局：高音(C8)在顶部，低音(A0)在底部
  return geo.y + geo.whiteKeySize * (WHITE_KEY_COUNT - 1 - whiteIdx)
}

/**
 * 获取白键的终点位置（沿主轴）
 */
export function whiteKeyEnd(whiteIdx: number, geo: KeyboardGeometry): number {
  return whiteKeyStart(whiteIdx, geo) + geo.whiteKeySize
}

// ============================================================
// 7.5 — 视口裁剪
// ============================================================

export interface VisiblePitchRange {
  /** 可见的最小音高 */
  minPitch: number
  /** 可见的最大音高 */
  maxPitch: number
  /** 可见的最小白键索引 */
  minWhiteIdx: number
  /** 可见的最大白键索引 */
  maxWhiteIdx: number
}

/**
 * 计算视口内可见的音高范围
 * @param scrollPos 沿主轴的滚动偏移
 * @param viewportSize 视口沿主轴尺寸
 * @param geo 键盘几何参数
 * @returns 可见音高范围
 */
export function computeVisiblePitchRange(
  scrollPos: number,
  viewportSize: number,
  geo: KeyboardGeometry,
): VisiblePitchRange {
  if (geo.orientation === 'horizontal') {
    const firstVisible = Math.max(0, Math.floor(scrollPos / geo.whiteKeySize))
    const lastVisible = Math.min(WHITE_KEY_COUNT - 1, Math.ceil((scrollPos + viewportSize) / geo.whiteKeySize))
    return {
      minPitch: whiteIndexToPitch(firstVisible),
      maxPitch: whiteIndexToPitch(lastVisible),
      minWhiteIdx: firstVisible,
      maxWhiteIdx: lastVisible,
    }
  }

  // 垂直布局：scrollPos=0 时顶部显示 C8 (whiteIdx=51)
  const firstVisualRow = Math.floor(scrollPos / geo.whiteKeySize)
  const lastVisualRow = Math.ceil((scrollPos + viewportSize) / geo.whiteKeySize)
  const maxWhiteIdx = Math.min(WHITE_KEY_COUNT - 1, WHITE_KEY_COUNT - 1 - firstVisualRow)
  const minWhiteIdx = Math.max(0, WHITE_KEY_COUNT - 1 - lastVisualRow)

  return {
    minPitch: whiteIndexToPitch(minWhiteIdx),
    maxPitch: whiteIndexToPitch(maxWhiteIdx),
    minWhiteIdx,
    maxWhiteIdx,
  }
}

// ============================================================
// 7.6 — 点击检测
// ============================================================

export interface KeyHit {
  pitch: number
  keyType: 'white' | 'black'
}

/**
 * 检测点击位置对应的钢琴键
 *
 * 优先检测黑键（88 网格），再回退到白键（52 分布）
 *
 * @param clickX 点击 X 坐标
 * @param clickY 点击 Y 坐标
 * @param geo 键盘几何参数
 * @returns 检测到的键信息，若未命中任何键则返回 null
 */
export function detectKeyClick(
  clickX: number,
  clickY: number,
  geo: KeyboardGeometry,
): KeyHit | null {
  // 边界检查
  if (
    clickX < geo.x || clickX >= geo.x + geo.width ||
    clickY < geo.y || clickY >= geo.y + geo.height
  ) {
    return null
  }

  if (geo.orientation === 'horizontal') {
    return detectKeyClickHorizontal(clickX, clickY, geo)
  }

  return detectKeyClickVertical(clickX, clickY, geo)
}

function detectKeyClickVertical(
  clickX: number,
  clickY: number,
  geo: KeyboardGeometry,
): KeyHit | null {
  // ---- 第一步：检查黑键区域（88 网格） ----
  const blackCrossStart = blackKeyCrossStart(geo)
  const blackCrossSizeVal = blackKeyCrossSize(geo)

  if (clickX >= blackCrossStart && clickX < blackCrossStart + blackCrossSizeVal) {
    // 计算 88 网格行（垂直布局：行号 0=顶部=C8, 87=底部=A0）
    const gridRow = 87 - Math.floor((clickY - geo.keyOffset) / geo.blackKeySize)
    if (gridRow >= 0 && gridRow < 88) {
      const pitch = gridRow + PITCH_MIN
      if (isBlackKey(pitch)) {
        const slotStart = keySlotStart(gridRow, geo)
        const visualHeight = blackKeyVisualSize(geo)
        const topOffset = blackKeyVisualTopOffset(geo)
        const visualTop = slotStart + topOffset

        if (clickY >= visualTop && clickY < visualTop + visualHeight) {
          return { pitch, keyType: 'black' }
        }
      }
    }
  }

  // ---- 第二步：检查白键（52 网格） ----
  // 垂直布局：行号 0=顶部=C8, 51=底部=A0
  const whiteRow = WHITE_KEY_COUNT - 1 - Math.floor((clickY - geo.y) / geo.whiteKeySize)
  if (whiteRow >= 0 && whiteRow < WHITE_KEY_COUNT) {
    const pitch = whiteIndexToPitch(whiteRow)
    return { pitch, keyType: 'white' }
  }

  return null
}

function detectKeyClickHorizontal(
  clickX: number,
  clickY: number,
  geo: KeyboardGeometry,
): KeyHit | null {
  // ---- 第一步：检查黑键区域（88 网格） ----
  const blackCrossStart = blackKeyCrossStart(geo)
  const blackCrossSizeVal = blackKeyCrossSize(geo)

  if (clickY >= blackCrossStart && clickY < blackCrossStart + blackCrossSizeVal) {
    // 水平布局：88 网格沿 X 轴
    const gridCol = Math.floor((clickX - geo.keyOffset) / geo.blackKeySize)
    if (gridCol >= 0 && gridCol < 88) {
      const pitch = gridCol + PITCH_MIN
      if (isBlackKey(pitch)) {
        const slotStart = keySlotStart(gridCol, geo)
        const visualWidth = blackKeyVisualSize(geo)
        const topOffset = blackKeyVisualTopOffset(geo)
        const visualLeft = slotStart + topOffset

        if (clickX >= visualLeft && clickX < visualLeft + visualWidth) {
          return { pitch, keyType: 'black' }
        }
      }
    }
  }

  // ---- 第二步：检查白键（52 网格） ----
  const whiteCol = Math.floor((clickX - geo.x) / geo.whiteKeySize)
  if (whiteCol >= 0 && whiteCol < WHITE_KEY_COUNT) {
    const pitch = whiteIndexToPitch(whiteCol)
    return { pitch, keyType: 'white' }
  }

  return null
}

// ============================================================
// 辅助工具
// ============================================================

/**
 * 获取 MIDI 音高对应的音乐八度号
 */
export function musicalOctaveOf(pitch: number): number {
  return Math.floor(pitch / 12) - 1
}

/**
 * 获取 MIDI 音高在半音阶中的名称
 */
export function pitchClassName(pitch: number): string {
  const NAMES = ['C', 'C#', 'D', 'D#', 'E', 'F', 'F#', 'G', 'G#', 'A', 'A#', 'B']
  return NAMES[pitch % 12] ?? '?'
}

/**
 * 获取 MIDI 音高的完整名称（如 "C4"）
 */
export function pitchLabel(pitch: number): string {
  return `${pitchClassName(pitch)}${musicalOctaveOf(pitch)}`
}
