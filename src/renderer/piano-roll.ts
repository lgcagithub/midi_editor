/**
 * 8.2 / 8.6 / 8.7 / 8.8 Piano Roll Orchestrator
 *
 * 协调 4 层 Canvas，管理视口状态、缩放、滚动、rAF 动画循环。
 * 不依赖 React，可直接挂载到任何 DOM 容器。
 */

import type { StoreApi, UseBoundStore } from 'zustand'
import type { StoreState } from '@/state/store'
import type { TransportState } from '@/state/transport-slice'
import { createCoordinateMapper, type CoordinateMapper, type Orientation } from './coordinate-mapper'
import { renderGrid } from './grid-renderer'
import { renderNotes } from './note-renderer'
import { renderCursor } from './cursor-renderer'
import { renderInteraction, type NotePreview, type SelectionRect, type GhostNote } from './interaction-renderer'
import { clamp } from '@/utils/math'
import { MouseHandler } from '@/interaction/mouse-handler'
import { undoManager } from '@/commands/undo-manager'

// ============================================================
// 常量
// ============================================================

/** 最小 zoomX */
const MIN_ZOOM = 0.1

/** 最大 zoomX */
const MAX_ZOOM = 20

/** 鼠标滚动缩放步进因子 */
const ZOOM_STEP = 0.001

// ============================================================
// 交互状态 （用于 interaction 层）
// ============================================================

export interface InteractionState {
  notePreview?: NotePreview | null
  selectionRect?: SelectionRect | null
  ghostNotes?: GhostNote[] | null
}

// ============================================================
// 引擎类型 —— 用于获取播放位置
// ============================================================

export interface TickProvider {
  getCurrentTick(): number
}

// ============================================================
// 读取当前 tick —— 由 Scheduler 更新到 store.currentTick
// ============================================================

function computeCurrentTick(state: StoreState): number {
  // Scheduler 在 25ms 循环中基于 audioCtx.currentTime 推算并写入
  // store.currentTick；这里直接读取以免跨时钟域 (performance.now vs audioCtx)
  return state.currentTick
}

// ============================================================
// 简化 flat 音符列表（含 trackIndex）
// ============================================================

interface TrackNoteEntry {
  trackIndex: number
  note: import('@/types').Note
}

function flattenTrackNotes(state: StoreState): TrackNoteEntry[] {
  const result: TrackNoteEntry[] = []
  for (let i = 0; i < state.tracks.length; i++) {
    const track = state.tracks[i]!
    for (const note of track.notes) {
      result.push({ trackIndex: i, note })
    }
  }
  return result
}

// ============================================================
// DPI 感知
// ============================================================

function getDPR(): number {
  return window.devicePixelRatio || 1
}

// ============================================================
// PianoRollOrchestrator
// ============================================================

export class PianoRollOrchestrator {
  // --- DOM ---
  private container: HTMLDivElement
  private gridCtx: CanvasRenderingContext2D
  private noteCtx: CanvasRenderingContext2D
  private cursorCtx: CanvasRenderingContext2D
  private interactionCtx: CanvasRenderingContext2D

  // --- Store ---
  private getState: () => StoreState

  // --- Mapper ---
  private mapper!: CoordinateMapper
  private prevOrientation: Orientation = 'vertical'
  private prevZoomX = 1
  private prevZoomY = 1
  private prevScrollX = 0
  private prevScrollY = 0
  private prevProjectVersion = -1
  private prevSelectedHash = ''
  private prevTool: string = 'pointer'
  /** 上一个传输状态（用于检测 stopped→playing 切换） */
  private prevTransportState: TransportState = 'stopped'

  // --- Canvas 尺寸 ---
  private canvasWidth = 0
  private canvasHeight = 0
  private dpr = 1

  // --- 脏标记 ---
  private dirtyGrid = true
  private dirtyNotes = true

  // --- 动画 ---
  private animFrameId = 0
  private lastCursorTick = -1

  // --- 事件绑定 ---
  private handleWheelBind: (e: WheelEvent) => void
  private handleMouseDownBind: (e: MouseEvent) => void
  private handleMouseMoveBind: (e: MouseEvent) => void
  private handleMouseUpBind: (e: MouseEvent) => void
  private handleResizeBind: () => void
  private handleKeyDownBind: (e: KeyboardEvent) => void

  // --- 交互系统 ---
  private mouseHandler!: MouseHandler

  /** 当前被拖拽的音符 ID 集合（供 note 渲染层添加阴影） */
  public draggingNoteIds: Set<string> = new Set()

  // --- 拖拽平移（中键） ---
  private isPanning = false
  private panStartX = 0
  private panStartY = 0
  private panScrollX = 0
  private panScrollY = 0

  // --- 订阅 ---
  private unsubscribeStore: (() => void) | null = null

  // === Interaction State ===
  public interactionState: InteractionState = {}

  // ============================================================
  // 构造
  // ============================================================

  constructor(
    canvases: {
      grid: HTMLCanvasElement
      note: HTMLCanvasElement
      cursor: HTMLCanvasElement
      interaction: HTMLCanvasElement
    },
    container: HTMLDivElement,
    store: UseBoundStore<StoreApi<StoreState>>,
  ) {
    this.gridCtx = canvases.grid.getContext('2d')!
    this.noteCtx = canvases.note.getContext('2d')!
    this.cursorCtx = canvases.cursor.getContext('2d')!
    this.interactionCtx = canvases.interaction.getContext('2d')!
    this.container = container
    this.getState = store.getState

    // 绑定事件处理器
    this.handleWheelBind = this.handleWheel.bind(this)
    this.handleMouseDownBind = this.handleMouseDown.bind(this)
    this.handleMouseMoveBind = this.handleMouseMove.bind(this)
    this.handleMouseUpBind = this.handleMouseUp.bind(this)
    this.handleResizeBind = this.handleResize.bind(this)
    this.handleKeyDownBind = this.handleKeyDown.bind(this)

    // 注册事件
    this.container.addEventListener('wheel', this.handleWheelBind, { passive: false })
    this.container.addEventListener('mousedown', this.handleMouseDownBind)
    // mousemove / mouseup 挂在 document 上以免拖拽时超出容器丢失
    document.addEventListener('mousemove', this.handleMouseMoveBind)
    document.addEventListener('mouseup', this.handleMouseUpBind)
    document.addEventListener('keydown', this.handleKeyDownBind)
    window.addEventListener('resize', this.handleResizeBind)

    // 初始化尺寸
    this.syncCanvasSize()

    // 初始化 mapper
    this.updateMapper()

    // 初始化交互系统
    this.mouseHandler = new MouseHandler(
      store.getState.bind(store),
      () => this.mapper,
      container,
      (state) => { this.interactionState = state },
    )

    // 初始渲染
    this.dirtyGrid = true
    this.dirtyNotes = true

    // 订阅 store 变化
    this.unsubscribeStore = store.subscribe(() => {
      this.onStoreChange()
    })

    // 启动 rAF
    this.startAnimationLoop()
  }

  // ============================================================
  // 析构
  // ============================================================

  destroy(): void {
    if (this.unsubscribeStore) {
      this.unsubscribeStore()
      this.unsubscribeStore = null
    }
    cancelAnimationFrame(this.animFrameId)
    this.container.removeEventListener('wheel', this.handleWheelBind)
    this.container.removeEventListener('mousedown', this.handleMouseDownBind)
    document.removeEventListener('mousemove', this.handleMouseMoveBind)
    document.removeEventListener('mouseup', this.handleMouseUpBind)
    document.removeEventListener('keydown', this.handleKeyDownBind)
    window.removeEventListener('resize', this.handleResizeBind)
  }

  // ============================================================
  // 手动触发重绘
  // ============================================================

  requestRender(): void {
    this.dirtyGrid = true
    this.dirtyNotes = true
  }

  // ============================================================
  // Canvas 尺寸同步
  // ============================================================

  private syncCanvasSize(): void {
    const rect = this.container.getBoundingClientRect()
    const w = Math.max(1, Math.floor(rect.width))
    const h = Math.max(1, Math.floor(rect.height))
    this.dpr = getDPR()
    const displayW = Math.round(w * this.dpr)
    const displayH = Math.round(h * this.dpr)

    const canvases = [
      this.gridCtx.canvas,
      this.noteCtx.canvas,
      this.cursorCtx.canvas,
      this.interactionCtx.canvas,
    ]

    for (const cvs of canvases) {
      if (cvs.width !== displayW || cvs.height !== displayH) {
        cvs.width = displayW
        cvs.height = displayH
        cvs.style.width = `${w}px`
        cvs.style.height = `${h}px`
      }
    }

    this.canvasWidth = w
    this.canvasHeight = h
    this.dpr = this.dpr
  }

  // ============================================================
  // Mapper 更新
  // ============================================================

  private updateMapper(): void {
    const state = this.getState()
    this.mapper = createCoordinateMapper(
      state.orientation,
      state.viewport.zoomX,
      state.viewport.noteHeight,
      state.tempoMap,
      state.ppq,
    )
    this.prevOrientation = state.orientation
    this.prevZoomX = state.viewport.zoomX
    this.prevZoomY = state.viewport.zoomY
  }

  // ============================================================
  // Store 变化回调
  // ============================================================

  private onStoreChange(): void {
    const state = this.getState()
    const vp = state.viewport

    // 检测 stopped→playing 切换，自动恢复 autoFollow
    // 必须先更新 prevTransportState，避免 setAutoFollow 触发嵌套 onStoreChange 时无限递归
    const wasStopped = this.prevTransportState === 'stopped'
    this.prevTransportState = state.transportState
    if (state.transportState === 'playing' && wasStopped) {
      state.setAutoFollow(true)
    }

    // 检测是否需要更新 mapper
    // 保存旧值：updateMapper 会更新 prevZoomX/prevOrientation，
    // 但脏标记检查需要用旧值判断 zoomX 是否真的变化了
    const oldZoomX = this.prevZoomX
    const oldOrientation = this.prevOrientation
    if (
      state.orientation !== this.prevOrientation ||
      vp.zoomX !== this.prevZoomX ||
      vp.zoomY !== this.prevZoomY
    ) {
      this.updateMapper()
    }

    // 检测 viewport 变化 → 需要重绘网格
    if (
      vp.scrollX !== this.prevScrollX ||
      vp.scrollY !== this.prevScrollY ||
      state.orientation !== oldOrientation ||
      vp.zoomX !== oldZoomX
    ) {
      this.dirtyGrid = true
      this.dirtyNotes = true
      this.prevScrollX = vp.scrollX
      this.prevScrollY = vp.scrollY
    }

    // 检测项目数据变化（音符增/删/改、轨道变化等）
    if (state.projectVersion !== this.prevProjectVersion) {
      this.dirtyNotes = true
      this.prevProjectVersion = state.projectVersion
    }

    // 检测选中项变化
    const selectedHash = state.selectedNoteIds.join(',')
    if (selectedHash !== this.prevSelectedHash) {
      this.dirtyNotes = true
      this.prevSelectedHash = selectedHash
    }

    // 检测工具切换 → 重置交互状态
    if (state.activeTool !== this.prevTool) {
      this.prevTool = state.activeTool
      this.mouseHandler.reset()
    }

    // 尺寸变化
    const rect = this.container.getBoundingClientRect()
    if (Math.abs(rect.width - this.canvasWidth) > 1 || Math.abs(rect.height - this.canvasHeight) > 1) {
      this.handleResize()
    }
  }

  // ============================================================
  // 渲染循环
  // ============================================================

  private startAnimationLoop(): void {
    const loop = () => {
      this.renderFrame()
      this.animFrameId = requestAnimationFrame(loop)
    }
    this.animFrameId = requestAnimationFrame(loop)
  }

  private renderFrame(): void {
    const state = this.getState()

    // 平滑自动跟随（播放中 + autoFollow 启用）
    if (state.transportState === 'playing' && state.autoFollow) {
      const tick = computeCurrentTick(state)
      const cursorPixel = this.mapper.tickToPixel(tick)
      const targetScrollX = cursorPixel - this.canvasWidth * 0.3
      const newScrollX = state.viewport.scrollX + (targetScrollX - state.viewport.scrollX) * 0.12
      if (Math.abs(targetScrollX - state.viewport.scrollX) > 1) {
        state.setViewport({ scrollX: Math.max(0, Math.min(newScrollX, 100000)) })
      }
    }

    // 播放中始终重绘网格+音符（用于平滑滚动）
    if (state.transportState === 'playing') {
      this.renderGridLayer(state)
      this.renderNoteLayer(state)
    } else {
      // 脏标志逻辑
      if (this.dirtyGrid) {
        this.renderGridLayer(state)
        this.dirtyGrid = false
      }
      if (this.dirtyNotes) {
        this.renderNoteLayer(state)
        this.dirtyNotes = false
      }
    }

    // 光标（每次 rAF 都重新计算，但只在变化时重绘）
    const tick = computeCurrentTick(state)
    if (Math.abs(tick - this.lastCursorTick) > 0.5 || state.transportState === 'playing') {
      this.renderCursorLayer(state, tick)
      this.lastCursorTick = tick
    }

    // 交互层（由 interactionState 变化触发，外部通过 renderInteraction 手动触发）
    this.renderInteractionLayer()
  }

  // ============================================================
  // 各层渲染
  // ============================================================

  private renderGridLayer(state: StoreState): void {
    const ctx = this.gridCtx
    ctx.setTransform(this.dpr, 0, 0, this.dpr, 0, 0)

    renderGrid({
      ctx,
      mapper: this.mapper,
      orientation: state.orientation,
      scrollX: state.viewport.scrollX,
      scrollY: state.viewport.scrollY,
      width: this.canvasWidth,
      height: this.canvasHeight,
      noteHeight: state.viewport.noteHeight,
      timeSigs: state.timeSigs,
      ppq: state.ppq,
    })
  }

  private renderNoteLayer(state: StoreState): void {
    const ctx = this.noteCtx
    ctx.setTransform(this.dpr, 0, 0, this.dpr, 0, 0)

    const allNotes = flattenTrackNotes(state)
    const selectedSet = new Set(state.selectedNoteIds)

    renderNotes({
      ctx,
      mapper: this.mapper,
      orientation: state.orientation,
      scrollX: state.viewport.scrollX,
      scrollY: state.viewport.scrollY,
      width: this.canvasWidth,
      height: this.canvasHeight,
      tracks: state.tracks,
      allTracksNotes: allNotes,
      selectedNoteIds: selectedSet,
      draggingNoteIds: this.draggingNoteIds,
      noteHeight: state.viewport.noteHeight,
    })
  }

  private renderCursorLayer(state: StoreState, tick: number): void {
    const ctx = this.cursorCtx
    ctx.setTransform(this.dpr, 0, 0, this.dpr, 0, 0)

    renderCursor({
      ctx,
      mapper: this.mapper,
      orientation: state.orientation,
      currentTick: tick,
      scrollX: state.viewport.scrollX,
      scrollY: state.viewport.scrollY,
      width: this.canvasWidth,
      height: this.canvasHeight,
    })
  }

  private renderInteractionLayer(): void {
    const ctx = this.interactionCtx
    ctx.setTransform(this.dpr, 0, 0, this.dpr, 0, 0)

    const { notePreview, selectionRect, ghostNotes } = this.interactionState

    renderInteraction({
      ctx,
      mapper: this.mapper,
      orientation: this.getState().orientation,
      scrollX: this.getState().viewport.scrollX,
      scrollY: this.getState().viewport.scrollY,
      width: this.canvasWidth,
      height: this.canvasHeight,
      noteHeight: this.getState().viewport.noteHeight,
      notePreview,
      selectionRect,
      ghostNotes,
    })
  }

  // ============================================================
  // 8.7 — 缩放（滚轮，以鼠标位置为中心）
  // ============================================================

  private handleWheel(e: WheelEvent): void {
    if (e.ctrlKey || e.metaKey) {
      // Ctrl/Meta + 滚轮 → 缩放
      e.preventDefault()

      const state = this.getState()
      const rect = this.container.getBoundingClientRect()
      const mouseX = e.clientX - rect.left
      const mouseY = e.clientY - rect.top
      const vp = state.viewport

      // 计算缩放系数
      const delta = -e.deltaY * ZOOM_STEP
      const newZoomX = clamp(vp.zoomX * (1 + delta), MIN_ZOOM, MAX_ZOOM)

      // 以鼠标位置为中心保持坐标稳定
      const oldMapper = this.mapper
      const tickAtMouse = oldMapper.pixelToTick(mouseX + vp.scrollX)
      const pitchAtMouse = oldMapper.pixelToPitch(mouseY + vp.scrollY)

      // 更新缩放
      const newNoteHeight = vp.noteHeight  // will be recalculated by external handler
      const newMapper = createCoordinateMapper(
        state.orientation,
        newZoomX,
        newNoteHeight,
        state.tempoMap,
        state.ppq,
      )

      // 计算新的 scroll 使鼠标位置不变
      const newScrollX = newMapper.tickToPixel(tickAtMouse) - mouseX
      const newScrollY = newMapper.pitchToPixel(pitchAtMouse) - mouseY

      // 通过 setViewport 应用
      state.setViewport({
        zoomX: newZoomX,
        scrollX: Math.max(0, newScrollX),
        scrollY: Math.max(0, newScrollY),
      })
    } else {
      // 普通滚轮 → 滚动
      e.preventDefault()
      const state = this.getState()
      // 手动滚动时关闭自动跟随
      if (state.transportState === 'playing' && state.autoFollow) {
        state.setAutoFollow(false)
      }
      state.setViewport({
        scrollX: Math.max(0, state.viewport.scrollX + e.deltaX),
        scrollY: Math.max(0, state.viewport.scrollY + e.deltaY),
      })
    }
  }

  // ============================================================
  // 8.8 — 滚动（鼠标拖拽平移）
  // ============================================================

  private handleMouseDown(e: MouseEvent): void {
    if (e.button === 1) {
      // 中键 → 拖拽平移
      this.isPanning = true
      this.panStartX = e.clientX
      this.panStartY = e.clientY
      const state = this.getState()
      this.panScrollX = state.viewport.scrollX
      this.panScrollY = state.viewport.scrollY
      return
    }

    if (e.button === 0) {
      // 左键 → 交互系统
      this.mouseHandler.handleMouseDown(e)
    }
  }

  private handleMouseMove(e: MouseEvent): void {
    if (this.isPanning) {
      const dx = e.clientX - this.panStartX
      const dy = e.clientY - this.panStartY

      const state = this.getState()
      // 手动拖拽平移时关闭自动跟随
      if (state.transportState === 'playing' && state.autoFollow) {
        state.setAutoFollow(false)
      }
      state.setViewport({
        scrollX: Math.max(0, this.panScrollX - dx),
        scrollY: Math.max(0, this.panScrollY - dy),
      })
      return
    }

    // 交互系统 mousemove
    this.mouseHandler.handleMouseMove(e)
  }

  private handleMouseUp(_e: MouseEvent): void {
    if (this.isPanning) {
      this.isPanning = false
      return
    }

    // 交互系统 mouseup
    this.mouseHandler.handleMouseUp(_e)
  }

  // ============================================================
  // Resize
  // ============================================================

  private handleResize(): void {
    this.syncCanvasSize()
    this.dirtyGrid = true
    this.dirtyNotes = true
  }

  // ============================================================
  // 11.8 键盘快捷键 — 撤销 / 重做
  // ============================================================

  private handleKeyDown(e: KeyboardEvent): void {
    const isMod = e.ctrlKey || e.metaKey
    if (!isMod) return

    if (e.key === 'z' && !e.shiftKey) {
      e.preventDefault()
      undoManager.undo()
    } else if (e.key === 'y' || (e.key === 'z' && e.shiftKey)) {
      e.preventDefault()
      undoManager.redo()
    }
  }
}
