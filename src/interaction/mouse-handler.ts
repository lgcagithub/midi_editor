/**
 * 9.12 鼠标事件分发器
 *
 * 根据当前 activeTool 将鼠标事件分发给对应的工具处理器，
 * 并维护 interactionState 供渲染层使用。
 */

import type { StoreState } from '@/state/store'
import type { CoordinateMapper } from '@/renderer/coordinate-mapper'
import type { InteractionState } from '@/renderer/piano-roll'
import { PointerToolHandler, type ToolEventContext } from './pointer-tool'
import { PencilToolHandler } from './pencil-tool'
import { EraserToolHandler } from './eraser-tool'
import { flattenTrackNotes } from './tools'

// ============================================================
// MouseHandler
// ============================================================

export class MouseHandler {
  private pointerHandler = new PointerToolHandler()
  private pencilHandler = new PencilToolHandler()
  private eraserHandler = new EraserToolHandler()

  constructor(
    private getState: () => StoreState,
    private getMapper: () => CoordinateMapper,
    private container: HTMLElement,
    private setInteractionState: (state: InteractionState) => void,
  ) {}

  // -------------------------------------------------------
  // 事件入口
  // -------------------------------------------------------

  handleMouseDown(e: MouseEvent): boolean {
    const ctx = this.buildContext(e)
    if (!ctx) return false

    const tool = ctx.storeState.activeTool
    switch (tool) {
      case 'pointer':
        this.pointerHandler.handleMouseDown(ctx)
        return true
      case 'pencil':
        this.pencilHandler.handleMouseDown(ctx)
        return true
      case 'eraser':
        this.eraserHandler.handleMouseDown(ctx)
        return true
    }
  }

  handleMouseMove(e: MouseEvent): boolean {
    const ctx = this.buildContext(e)
    if (!ctx) return false

    const tool = ctx.storeState.activeTool
    switch (tool) {
      case 'pointer':
        this.pointerHandler.handleMouseMove(ctx)
        return true
      case 'pencil':
        this.pencilHandler.handleMouseMove(ctx)
        return true
      case 'eraser':
        this.eraserHandler.handleMouseMove(ctx)
        return true
    }
  }

  handleMouseUp(e: MouseEvent): boolean {
    const ctx = this.buildContext(e)
    if (!ctx) return false

    const tool = ctx.storeState.activeTool
    switch (tool) {
      case 'pointer':
        this.pointerHandler.handleMouseUp(ctx)
        return true
      case 'pencil':
        this.pencilHandler.handleMouseUp(ctx)
        return true
      case 'eraser':
        this.eraserHandler.handleMouseUp(ctx)
        return true
    }
  }

  // -------------------------------------------------------
  // 重置所有工具状态（工具切换时调用）
  // -------------------------------------------------------

  reset(): void {
    this.pointerHandler.reset()
    this.pencilHandler.reset()
    this.eraserHandler.reset()
    this.setInteractionState({
      notePreview: null,
      selectionRect: null,
      ghostNotes: null,
    })
  }

  // -------------------------------------------------------
  // 构造上下文
  // -------------------------------------------------------

  private buildContext(e: MouseEvent): ToolEventContext | null {
    const rect = this.container.getBoundingClientRect()
    const canvasX = e.clientX - rect.left
    const canvasY = e.clientY - rect.top
    const storeState = this.getState()
    const mapper = this.getMapper()

    return {
      canvasX,
      canvasY,
      mapper,
      scrollX: storeState.viewport.scrollX,
      scrollY: storeState.viewport.scrollY,
      noteHeight: storeState.viewport.noteHeight,
      storeState,
      allFlatNotes: flattenTrackNotes(storeState),
      setInteractionState: (partial) => {
        this.setInteractionState({
          notePreview: partial.notePreview ?? null,
          selectionRect: partial.selectionRect ?? null,
          ghostNotes: partial.ghostNotes ?? null,
        })
      },
    }
  }
}
