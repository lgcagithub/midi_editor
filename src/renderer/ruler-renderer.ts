/**
 * 8.10 标尺渲染器
 *
 * 独立 Canvas 渲染器，位于 Piano Roll 上方。
 * 绘制密度自适应的小节/拍线、拍号文本、播放光标三角指示器。
 *
 * 遵循 KeyboardRenderer 模式：自身持有 Canvas + 渲染 + 事件。
 *
 * 状态机：idle → scrubbing（点击/拖拽时 seek 到对应 tick 位置）
 */

import type { CoordinateMapper } from './coordinate-mapper'
import type { TempoEvent, TimeSigEvent } from '@/types'
import { DEFAULT_BPM } from '@/constants'
import { seekTo } from '@/engine/playback-manager'

// ============================================================
// 颜色常量（Merengue 暗色主题）
// ============================================================

/** 标尺背景色 */
const BG_COLOR = '#1A1819'

/** 小节数字颜色 */
const MEASURE_NUMBER_COLOR = '#7A6E68'

/** 拍号标签颜色（低透明度） */
const BEAT_LABEL_COLOR = 'rgba(122, 110, 104, 0.7)'

/** 主刻度线颜色（满高度） */
const MAJOR_LINE_COLOR = '#2E2927'

/** 次刻度线颜色（半高度，低透明度） */
const MINOR_LINE_COLOR = 'rgba(46, 41, 39, 0.5)'

/** 播放光标三角颜色（珊瑚色） */
const CURSOR_TRIANGLE_COLOR = '#FF5C72'

/** 主刻度线宽 */
const MAJOR_LINE_WIDTH = 1

/** 次刻度线宽 */
const MINOR_LINE_WIDTH = 1

/** 光标三角尺寸：6px 宽 × 8px 高 */
const TRIANGLE_HALF_BASE = 3
const TRIANGLE_HEIGHT = 8

// ============================================================
// 密度级别阈值（像素/拍）
// ============================================================

/** 完整细节：小节号 + 拍标签 + 主线 + 次线 */
const DENSITY_FULL = 80

/** 中等细节：小节号 + 主线 */
const DENSITY_MEDIUM = 40

/** 稀疏细节：隔一个小节号 + 主线 */
const DENSITY_SPARSE = 20

// ============================================================
// 字体常量
// ============================================================

const MEASURE_NUMBER_FONT = '11px "JetBrains Mono", monospace'
const BEAT_LABEL_FONT = '10px "JetBrains Mono", monospace'

// ============================================================
// superscript 数字映射（用于拍号标签如 ¹²³⁴）
// ============================================================

const SUPERSCRIPT_MAP: Record<string, string> = {
  '0': '⁰',
  '1': '¹',
  '2': '²',
  '3': '³',
  '4': '⁴',
  '5': '⁵',
  '6': '⁶',
  '7': '⁷',
  '8': '⁸',
  '9': '⁹',
}

function toSuperscript(n: number): string {
  return String(n)
    .split('')
    .map((c) => SUPERSCRIPT_MAP[c] || c)
    .join('')
}

// ============================================================
// 工具 —— 获取指定 tick 处的拍号
// ============================================================

interface TimeSigInfo {
  numerator: number
  denominator: number
}

function getTimeSigAt(tick: number, timeSigs: TimeSigEvent[]): TimeSigInfo {
  if (timeSigs.length === 0) return { numerator: 4, denominator: 4 }
  let current = timeSigs[0]!
  for (const ts of timeSigs) {
    if (ts.tick <= tick) current = ts
    else break
  }
  return { numerator: current.numerator, denominator: current.denominator }
}

// ============================================================
// 工具 —— 获取指定 tick 处的 BPM
// ============================================================

function getBpmAt(tick: number, tempoMap: TempoEvent[]): number {
  if (tempoMap.length === 0) return DEFAULT_BPM
  let bpm = tempoMap[0]!.bpm
  for (let i = 1; i < tempoMap.length; i++) {
    if (tempoMap[i]!.tick <= tick) {
      bpm = tempoMap[i]!.bpm
    } else {
      break
    }
  }
  return bpm
}

// ============================================================
// 标尺渲染器
// ============================================================

export class RulerRenderer {
  private canvas: HTMLCanvasElement
  private ctx: CanvasRenderingContext2D
  private mapper: CoordinateMapper
  private scrollX: number = 0
  private currentTick: number = 0
  private getTempoMap: () => TempoEvent[]
  private getPpq: () => number
  private getTimeSigs: () => TimeSigEvent[]

  /** DPR 缓存 */
  private dpr: number = 1

  /** 已绑定的事件处理器引用（用于清理） */
  private boundHandleMouseDown: (e: MouseEvent) => void
  private boundHandleMouseMove: (e: MouseEvent) => void
  private boundHandleMouseUp: (e: MouseEvent) => void

  /** 交互状态 */
  private scrubState: 'idle' | 'scrubbing' = 'idle'

  constructor(
    canvas: HTMLCanvasElement,
    options: {
      mapper: CoordinateMapper
      getTempoMap: () => TempoEvent[]
      getPpq: () => number
      getTimeSigs: () => TimeSigEvent[]
    },
  ) {
    this.canvas = canvas
    const ctx = canvas.getContext('2d')
    if (!ctx) {
      throw new Error('RulerRenderer: Cannot get 2D context from canvas')
    }
    this.ctx = ctx
    this.mapper = options.mapper
    this.getTempoMap = options.getTempoMap
    this.getPpq = options.getPpq
    this.getTimeSigs = options.getTimeSigs

    this.dpr = window.devicePixelRatio || 1

    // 绑定事件处理器
    this.boundHandleMouseDown = this.handleMouseDown.bind(this)
    this.boundHandleMouseMove = this.handleMouseMove.bind(this)
    this.boundHandleMouseUp = this.handleMouseUp.bind(this)

    this.setupEvents()
  }

  // ============================================================
  // 公共 API
  // ============================================================

  /** 设置水平滚动偏移 */
  setScrollX(x: number): void {
    this.scrollX = x
  }

  /** 设置当前播放位置（tick） */
  setCurrentTick(tick: number): void {
    this.currentTick = tick
  }

  /** 更新坐标映射器 */
  updateMapper(mapper: CoordinateMapper): void {
    this.mapper = mapper
  }

  /** 更新 DPR（窗口 resize 时调用） */
  updateDPR(): void {
    this.dpr = window.devicePixelRatio || 1
  }

  /** 执行完整渲染 */
  render(): void {
    const { canvas, ctx, dpr } = this
    const width = canvas.width / dpr
    const height = canvas.height / dpr

    ctx.save()
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0)

    // ---- 清空 ----
    ctx.clearRect(0, 0, width, height)

    // ---- 背景 ----
    ctx.fillStyle = BG_COLOR
    ctx.fillRect(0, 0, width, height)

    // ---- 绘制刻度线和标签 ----
    this.drawTicks(width, height)

    // ---- 绘制播放光标三角 ----
    this.drawCursorTriangle(height)

    ctx.restore()
  }

  /** 销毁渲染器，移除事件监听 */
  dispose(): void {
    this.canvas.removeEventListener('mousedown', this.boundHandleMouseDown)
    document.removeEventListener('mousemove', this.boundHandleMouseMove)
    document.removeEventListener('mouseup', this.boundHandleMouseUp)
  }

  // ============================================================
  // 刻度渲染（密度自适应）
  // ============================================================

  private drawTicks(width: number, height: number): void {
    const { ctx, mapper, scrollX, getTempoMap, getPpq, getTimeSigs } = this
    const tempoMap = getTempoMap()
    const ppq = getPpq()
    const timeSigs = getTimeSigs()

    // 计算可见 tick 范围
    const leftTick = mapper.pixelToTick(Math.max(0, scrollX))
    const rightTick = mapper.pixelToTick(scrollX + width)

    // 获取当前 BPM（以左边界 tick 近似）
    const bpm = getBpmAt(leftTick, tempoMap)

    // 计算每拍像素宽度
    // pixelsPerBeat = (pixelsPerSecond * 60) / bpm
    const pixelsPerBeat = (mapper.pixelsPerSecond * 60) / bpm

    // 获取当前拍号（默认 4/4）
    const ts = getTimeSigAt(leftTick, timeSigs)
    const beatTicks = (ppq * 4) / ts.denominator // 每拍 tick 数
    const measureTicks = beatTicks * ts.numerator // 每小节 tick 数

    // 确定密度级别
    const densityLevel =
      pixelsPerBeat >= DENSITY_FULL
        ? 4 // 完整细节
        : pixelsPerBeat >= DENSITY_MEDIUM
          ? 3 // 中等细节
          : pixelsPerBeat >= DENSITY_SPARSE
            ? 2 // 稀疏细节
            : 1 // 最简细节

    // 找到第一个 >= leftTick 的 beat
    const firstBeat = Math.ceil(leftTick / beatTicks) * beatTicks

    // ---- 遍历每个 beat ----
    for (let tick = firstBeat; tick <= rightTick + beatTicks; tick += beatTicks) {
      const x = mapper.tickToPixel(tick) - scrollX
      if (x < -10 || x > width + 10) continue

      const isMeasureBoundary = tick % measureTicks === 0
      const measureIndex = isMeasureBoundary
        ? Math.round(tick / measureTicks)
        : -1
      const beatIndex = (tick % measureTicks) / beatTicks // 0-based beat within measure

      // ---- 绘制刻度线 ----
      if (densityLevel === 4) {
        // 完整细节：主线满高度，次线半高度
        if (isMeasureBoundary) {
          this.drawMajorLine(x, height)
        } else {
          this.drawMinorLine(x, height)
        }
      } else {
        // 其余密度：全部使用主线（满高度）
        this.drawMajorLine(x, height)
      }

      // ---- 绘制标签 ----
      if (densityLevel === 4 && !isMeasureBoundary) {
        // 完整细节：拍标签（¹²³⁴）
        const beatNumber = beatIndex + 1 // 1-based beat number
        if (beatNumber >= 1 && beatNumber <= ts.numerator) {
          ctx.fillStyle = BEAT_LABEL_COLOR
          ctx.font = BEAT_LABEL_FONT
          ctx.textAlign = 'center'
          ctx.textBaseline = 'bottom'
          const superscriptBeat = toSuperscript(beatNumber)
          ctx.fillText(superscriptBeat, x, height - 4)
        }
      }

      // 小节号
      if (isMeasureBoundary) {
        if (
          densityLevel === 4 ||
          densityLevel === 3 ||
          (densityLevel === 2 && measureIndex % 2 === 0) ||
          (densityLevel === 1 && measureIndex % 4 === 0)
        ) {
          this.drawMeasureNumber(x, height, measureIndex)
        }
      }
    }
  }

  // ============================================================
  // 绘制辅助方法
  // ============================================================

  /** 绘制主线（满高度） */
  private drawMajorLine(x: number, height: number): void {
    const { ctx } = this
    ctx.strokeStyle = MAJOR_LINE_COLOR
    ctx.lineWidth = MAJOR_LINE_WIDTH
    ctx.beginPath()
    ctx.moveTo(x + 0.5, 0)
    ctx.lineTo(x + 0.5, height)
    ctx.stroke()
  }

  /** 绘制次线（半高度，从底部往上） */
  private drawMinorLine(x: number, height: number): void {
    const { ctx } = this
    const halfHeight = height / 2
    ctx.strokeStyle = MINOR_LINE_COLOR
    ctx.lineWidth = MINOR_LINE_WIDTH
    ctx.beginPath()
    ctx.moveTo(x + 0.5, halfHeight)
    ctx.lineTo(x + 0.5, height)
    ctx.stroke()
  }

  /** 绘制小节号 */
  private drawMeasureNumber(x: number, height: number, measureIndex: number): void {
    const { ctx } = this
    ctx.fillStyle = MEASURE_NUMBER_COLOR
    ctx.font = MEASURE_NUMBER_FONT
    ctx.textAlign = 'center'
    ctx.textBaseline = 'bottom'
    ctx.fillText(String(measureIndex + 1), x, height - 4)
  }

  // ============================================================
  // 播放光标三角
  // ============================================================

  private drawCursorTriangle(height: number): void {
    const { mapper, scrollX, currentTick, ctx } = this

    const cursorPx = mapper.tickToPixel(currentTick) - scrollX

    // 如果光标在视口外，跳过
    if (cursorPx < -10 || cursorPx > (ctx.canvas.width / this.dpr) + 10) return

    // 三角位于 ruler 底部
    const baseY = height

    ctx.fillStyle = CURSOR_TRIANGLE_COLOR
    ctx.beginPath()
    ctx.moveTo(cursorPx, baseY)
    ctx.lineTo(cursorPx - TRIANGLE_HALF_BASE, baseY - TRIANGLE_HEIGHT)
    ctx.lineTo(cursorPx + TRIANGLE_HALF_BASE, baseY - TRIANGLE_HEIGHT)
    ctx.closePath()
    ctx.fill()
  }

  // ============================================================
  // 事件绑定
  // ============================================================

  private setupEvents(): void {
    this.canvas.addEventListener('mousedown', this.boundHandleMouseDown)
    // mousemove / mouseup 挂在 document 上以免拖拽超出 ruler 区域时丢失
    document.addEventListener('mousemove', this.boundHandleMouseMove)
    document.addEventListener('mouseup', this.boundHandleMouseUp)
  }

  /** 鼠标点击/拖拽位置 → tick */
  private computeTickFromEvent(e: MouseEvent): number {
    const rect = this.canvas.getBoundingClientRect()
    const mouseX = e.clientX - rect.left
    return this.mapper.pixelToTick(mouseX + this.scrollX)
  }

  private handleMouseDown(e: MouseEvent): void {
    if (e.button !== 0) return // 仅左键
    const tick = this.computeTickFromEvent(e)
    this.scrubState = 'scrubbing'
    seekTo(tick)
  }

  private handleMouseMove(e: MouseEvent): void {
    if (this.scrubState !== 'scrubbing') return
    const tick = this.computeTickFromEvent(e)
    seekTo(tick)
  }

  private handleMouseUp(_e: MouseEvent): void {
    if (this.scrubState !== 'scrubbing') return
    this.scrubState = 'idle'
  }
}
