/**
 * 钢琴键盘 Canvas 渲染器
 *
 * 在提供的 Canvas 上绘制 88 键钢琴键盘，支持：
 * - 白键/黑键分层绘制
 * - 视口裁剪（仅绘制可见音高范围）
 * - 点击检测与试听（Note On/Off）
 * - 垂直/水平双布局
 */

import {
  type KeyboardGeometry,
  type Orientation,
  computeKeyboardGeometry,
  computeVisiblePitchRange,
  whiteIndexToPitch,
  whiteKeyStart,
  keySlotStart,
  blackKeyVisualSize,
  blackKeyVisualTopOffset,
  blackKeyCrossSize,
  blackKeyCrossStart,
  detectKeyClick,
  pitchLabel,
} from './keyboard-math'
import { isBlackKey } from '../model/note-utils'
import { PITCH_MIN } from '../constants'

// ============================================================
// 颜色常量（Merengue 暗色主题）
// ============================================================

const WHITE_KEY_GRADIENT_TOP = '#3C3835'
const WHITE_KEY_GRADIENT_BOTTOM = '#2E2927'
const BLACK_KEY_GRADIENT_TOP = '#1A1819'
const BLACK_KEY_GRADIENT_BOTTOM = '#141212'
const BORDER_COLOR = '#2E2927'
const BORDER_VISIBLE_COLOR = '#423B38'
const LABEL_COLOR = '#5C5450'
const C_LABEL_FONT = '7px sans-serif'

/** 分割线高度 */
const SEPARATOR_LINE_WIDTH = 1

/** 黑键圆角半径 */
const BLACK_KEY_RADIUS = 4

// ============================================================
// 类型定义
// ============================================================

export interface KeyboardRendererOptions {
  /** 键盘区域 X */
  x?: number
  /** 键盘区域 Y */
  y?: number
  /** 键盘区域宽度 */
  width?: number
  /** 键盘区域高度 */
  height?: number
  /** 布局方向 */
  orientation?: Orientation
  /** 主轴滚动偏移 */
  scrollPos?: number
  /** Note On 回调 */
  noteOn?: (pitch: number) => void
  /** Note Off 回调 */
  noteOff?: (pitch: number) => void
}

// ============================================================
// 渲染器
// ============================================================

export class KeyboardRenderer {
  private canvas: HTMLCanvasElement
  private ctx: CanvasRenderingContext2D
  private geo: KeyboardGeometry
  private scrollPos: number = 0
  private noteOn?: (pitch: number) => void
  private noteOff?: (pitch: number) => void

  /** 当前按下的音高（用于试听） */
  private activePitch: number | null = null

  /** 已绑定的事件处理器引用（用于清理） */
  private boundHandleMouseDown: (e: MouseEvent) => void
  private boundHandleMouseMove: (e: MouseEvent) => void
  private boundHandleMouseUp: (e: MouseEvent) => void
  private boundHandleMouseLeave: (e: MouseEvent) => void

  constructor(canvas: HTMLCanvasElement, options?: KeyboardRendererOptions) {
    this.canvas = canvas
    const ctx = canvas.getContext('2d')
    if (!ctx) {
      throw new Error('KeyboardRenderer: Cannot get 2D context from canvas')
    }
    this.ctx = ctx

    this.noteOn = options?.noteOn
    this.noteOff = options?.noteOff

    // 初始化几何
    this.geo = computeKeyboardGeometry(
      options?.x ?? 0,
      options?.y ?? 0,
      options?.width ?? canvas.width,
      options?.height ?? canvas.height,
      options?.orientation ?? 'vertical',
    )

    if (options?.scrollPos != null) {
      this.scrollPos = options.scrollPos
    }

    // 绑定事件处理器
    this.boundHandleMouseDown = this.handleMouseDown.bind(this)
    this.boundHandleMouseMove = this.handleMouseMove.bind(this)
    this.boundHandleMouseUp = this.handleMouseUp.bind(this)
    this.boundHandleMouseLeave = this.handleMouseLeave.bind(this)

    this.setupEvents()
  }

  // ============================================================
  // 公共 API
  // ============================================================

  /** 更新键盘几何参数 */
  updateGeometry(geo: KeyboardGeometry): void {
    this.geo = geo
  }

  /** 设置滚动偏移 */
  setScrollPos(pos: number): void {
    this.scrollPos = pos
  }

  /** 更新选项 */
  updateOptions(options: Partial<KeyboardRendererOptions>): void {
    if (options.x != null || options.y != null || options.width != null || options.height != null || options.orientation != null) {
      this.geo = computeKeyboardGeometry(
        options.x ?? this.geo.x,
        options.y ?? this.geo.y,
        options.width ?? this.geo.width,
        options.height ?? this.geo.height,
        options.orientation ?? this.geo.orientation,
      )
    }
    if (options.scrollPos != null) {
      this.scrollPos = options.scrollPos
    }
    if (options.noteOn != null) {
      this.noteOn = options.noteOn
    }
    if (options.noteOff != null) {
      this.noteOff = options.noteOff
    }
  }

  /** 执行完整渲染 */
  render(): void {
    const { canvas, ctx } = this
    ctx.clearRect(0, 0, canvas.width, canvas.height)

    this.drawWhiteKeys()
    this.drawBlackKeys()
  }

  /** 销毁渲染器，移除事件监听 */
  dispose(): void {
    this.canvas.removeEventListener('mousedown', this.boundHandleMouseDown)
    this.canvas.removeEventListener('mousemove', this.boundHandleMouseMove)
    this.canvas.removeEventListener('mouseup', this.boundHandleMouseUp)
    this.canvas.removeEventListener('mouseleave', this.boundHandleMouseLeave)
  }

  // ============================================================
  // 事件绑定
  // ============================================================

  private setupEvents(): void {
    this.canvas.addEventListener('mousedown', this.boundHandleMouseDown)
    this.canvas.addEventListener('mousemove', this.boundHandleMouseMove)
    this.canvas.addEventListener('mouseup', this.boundHandleMouseUp)
    this.canvas.addEventListener('mouseleave', this.boundHandleMouseLeave)
  }

  private handleMouseDown(e: MouseEvent): void {
    const rect = this.canvas.getBoundingClientRect()
    const x = e.clientX - rect.left
    // canvas 屏幕坐标 → 键盘绝对坐标（绘制时减了 scrollPos，点击时加回来）
    const y = e.clientY - rect.top + this.scrollPos

    const hit = detectKeyClick(x, y, this.geo)
    if (hit) {
      this.activePitch = hit.pitch
      this.noteOn?.(hit.pitch)
    }
  }

  private handleMouseMove(e: MouseEvent): void {
    if (this.activePitch == null) return  // 未按下时不处理

    const rect = this.canvas.getBoundingClientRect()
    const x = e.clientX - rect.left
    const y = e.clientY - rect.top + this.scrollPos

    const hit = detectKeyClick(x, y, this.geo)
    if (hit && hit.pitch !== this.activePitch) {
      // 滑到了新琴键：停止旧音，触发新音
      this.noteOff?.(this.activePitch)
      this.activePitch = hit.pitch
      this.noteOn?.(hit.pitch)
    }
  }

  private handleMouseUp(_e: MouseEvent): void {
    if (this.activePitch != null) {
      this.noteOff?.(this.activePitch)
      this.activePitch = null
    }
  }

  private handleMouseLeave(_e: MouseEvent): void {
    if (this.activePitch != null) {
      this.noteOff?.(this.activePitch)
      this.activePitch = null
    }
  }

  // ============================================================
  // 绘制方法
  // ============================================================

  // ---- 7.3 白键绘制 ----

  private drawWhiteKeys(): void {
    const { ctx, geo, scrollPos } = this
    const viewportHeight = this.canvas.height

    const range = computeVisiblePitchRange(scrollPos, viewportHeight, geo)

    for (let i = range.minWhiteIdx; i <= range.maxWhiteIdx; i++) {
      const absY = whiteKeyStart(i, geo)
      const y = absY - scrollPos
      const pitch = whiteIndexToPitch(i)
      const isC = pitch % 12 === 0

      // 渐变填充
      const gradient = ctx.createLinearGradient(
        geo.x, y,
        geo.x, y + geo.whiteKeySize,
      )
      gradient.addColorStop(0, WHITE_KEY_GRADIENT_TOP)
      gradient.addColorStop(1, WHITE_KEY_GRADIENT_BOTTOM)

      ctx.fillStyle = gradient
      ctx.fillRect(geo.x, y, geo.width, geo.whiteKeySize)

      // 底部分割线
      const separatorY = y + geo.whiteKeySize - SEPARATOR_LINE_WIDTH
      ctx.strokeStyle = isC ? BORDER_VISIBLE_COLOR : BORDER_COLOR
      ctx.lineWidth = SEPARATOR_LINE_WIDTH
      ctx.beginPath()
      ctx.moveTo(geo.x, separatorY + 0.5)
      ctx.lineTo(geo.x + geo.width, separatorY + 0.5)
      ctx.stroke()

      // C 键八度标注（右对齐）
      if (isC) {
        ctx.fillStyle = LABEL_COLOR
        ctx.font = C_LABEL_FONT
        ctx.textAlign = 'right'
        ctx.textBaseline = 'middle'
        const label = pitchLabel(pitch)
        ctx.fillText(label, geo.x + geo.width - 4, y + geo.whiteKeySize / 2)
      }
    }
  }

  // ---- 7.4 黑键绘制 ----

  private drawBlackKeys(): void {
    const { ctx, geo, scrollPos } = this
    const viewportHeight = this.canvas.height

    const range = computeVisiblePitchRange(scrollPos, viewportHeight, geo)

    // 将白键索引范围转换为 88 键索引范围
    const firstPitch = range.minPitch
    const lastPitch = range.maxPitch

    // 扩展到完整半音范围以确保边界黑键被覆盖
    const startIdx = Math.max(0, firstPitch - 2 - PITCH_MIN)
    const endIdx = Math.min(87, lastPitch + 2 - PITCH_MIN)

    const visualHeight = blackKeyVisualSize(geo)
    const topOffset = blackKeyVisualTopOffset(geo)
    const crossStart = blackKeyCrossStart(geo)
    const crossSize = blackKeyCrossSize(geo)

    for (let i = startIdx; i <= endIdx; i++) {
      const pitch = i + PITCH_MIN
      if (!isBlackKey(pitch)) continue

      const slotStart = keySlotStart(i, geo)
      const absVisualY = slotStart + topOffset
      // 视口裁剪：跳过不可见的黑键（在绝对坐标中判断）
      if (absVisualY + visualHeight < scrollPos || absVisualY > scrollPos + viewportHeight) {
        continue
      }

      const visualY = absVisualY - scrollPos

      // 渐变填充（每个黑键独立的垂直渐变）
      const gradient = ctx.createLinearGradient(
        crossStart, visualY,
        crossStart, visualY + visualHeight,
      )
      gradient.addColorStop(0, BLACK_KEY_GRADIENT_TOP)
      gradient.addColorStop(1, BLACK_KEY_GRADIENT_BOTTOM)

      ctx.fillStyle = gradient

      // 绘制带圆角的黑键矩形
      this.drawRoundedRect(
        crossStart, visualY, crossSize, visualHeight,
        geo.orientation,
      )
    }
  }

  /**
   * 绘制带圆角的黑键
   * 垂直布局：右侧圆角；水平布局：底部圆角
   */
  private drawRoundedRect(
    x: number,
    y: number,
    w: number,
    h: number,
    orientation: Orientation,
  ): void {
    const { ctx } = this
    const r = BLACK_KEY_RADIUS

    ctx.beginPath()

    if (orientation === 'horizontal') {
      // 水平布局：底部圆角（bottom-left, bottom-right）
      ctx.moveTo(x, y)
      ctx.lineTo(x + w, y)
      ctx.lineTo(x + w, y + h - r)
      ctx.quadraticCurveTo(x + w, y + h, x + w - r, y + h)
      ctx.lineTo(x + r, y + h)
      ctx.quadraticCurveTo(x, y + h, x, y + h - r)
    } else {
      // 垂直布局：右侧圆角（top-right, bottom-right）
      ctx.moveTo(x, y)
      ctx.lineTo(x + w - r, y)
      ctx.quadraticCurveTo(x + w, y, x + w, y + r)
      ctx.lineTo(x + w, y + h - r)
      ctx.quadraticCurveTo(x + w, y + h, x + w - r, y + h)
      ctx.lineTo(x, y + h)
    }

    ctx.closePath()
    ctx.fill()
  }
}
