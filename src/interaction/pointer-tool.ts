/**
 * 9.3 / 9.4 / 9.5 / 9.6 / 9.7 指针工具
 *
 * 处理 Pointer 工具下的所有交互：
 * - 单选 / 清选（单击未选中音符选中，单击空白清选）
 * - 拖拽移动（含约束 startTick ≥ 0, 21 ≤ pitch ≤ 108, 相对吸附）
 * - 边缘拉伸（左/右边缘，duration ≥ 1 tick）
 * - 框选（mousedown 起点 → mousemove 虚线框 → mouseup AABB 命中选中）
 */

import type { StoreState } from '@/state/store'
import type { Note } from '@/types'
import type { CoordinateMapper } from '@/renderer/coordinate-mapper'
import type { InteractionState } from '@/renderer/piano-roll'
import { PITCH_MIN, PITCH_MAX } from '@/constants'
import { clamp } from '@/utils/math'
import { snapTick } from './snap-grid'
import { hitTest, computeNoteScreenRect } from './hit-test'

// ============================================================
// 内部状态
// ============================================================

interface DragState {
  type: 'drag'
  /** 正在拖拽的音符列表 */
  notes: Array<{ trackId: string; noteId: string; startTick: number; pitch: number }>
  /** 鼠标按下时的屏幕坐标 */
  mouseStartX: number
  mouseStartY: number
  /** 鼠标按下时鼠标位置对应的 tick */
  startTickAtMouse: number
  /** 鼠标按下时鼠标位置对应的 pitch */
  startPitchAtMouse: number
}

interface ResizeState {
  type: 'resize'
  edge: 'left' | 'right'
  trackId: string
  trackIndex: number
  noteId: string
  originalNote: Note
  mouseStartX: number
  startTickAtMouse: number
}

// 框选状态 —— selectionRect 在 interactionState 中实时更新
interface RubberBandState {
  type: 'rubberBand'
  startScreenX: number
  startScreenY: number
}

type PointerState =
  | { type: 'idle' }
  | DragState
  | ResizeState
  | RubberBandState

// ============================================================
// 辅助
// ============================================================

// ============================================================
// PointerToolHandler
// ============================================================

export class PointerToolHandler {
  private state: PointerState = { type: 'idle' }

  // -------------------------------------------------------
  // 入口
  // -------------------------------------------------------

  handleMouseDown(
    ctx: ToolEventContext,
  ): void {
    const state = this.state
    if (state.type !== 'idle') return

    const hit = hitTest(
      ctx.canvasX,
      ctx.canvasY,
      ctx.allFlatNotes,
      ctx.mapper,
      ctx.scrollX,
      ctx.scrollY,
      ctx.noteHeight,
    )

    if (!hit) {
      // 单击空白 → 清空选中 + 开始框选
      ctx.storeState.clearSelection()
      ctx.setInteractionState({ selectionRect: null, ghostNotes: null, notePreview: null })
      this.state = {
        type: 'rubberBand',
        startScreenX: ctx.canvasX,
        startScreenY: ctx.canvasY,
      }
      return
    }

    if (hit.type === 'body') {
      // 点击身体 → 选中 / 拖拽
      const isAlreadySelected = ctx.storeState.selectedNoteIds.includes(hit.noteId)
      if (isAlreadySelected) {
        // 点击已选中的音符 → 拖拽所有选中音符
        this.startDrag(ctx, ctx.storeState.selectedNoteIds)
      } else {
        // 点击未选中的音符 → 单选此音符 + 拖拽
        ctx.storeState.setSelection([hit.noteId])
        this.startDrag(ctx, [hit.noteId])
      }
    } else if (hit.type === 'leftEdge' || hit.type === 'rightEdge') {
      // 点击边缘 → 准备拉伸
      this.startResize(ctx, hit.type)
    }
  }

  handleMouseMove(
    ctx: ToolEventContext,
  ): void {
    switch (this.state.type) {
      case 'drag':
        this.updateDrag(ctx)
        break
      case 'resize':
        this.updateResize(ctx)
        break
      case 'rubberBand':
        this.updateRubberBand(ctx)
        break
    }
  }

  handleMouseUp(
    ctx: ToolEventContext,
  ): void {
    switch (this.state.type) {
      case 'drag':
        this.endDrag(ctx)
        break
      case 'resize':
        this.endResize(ctx)
        break
      case 'rubberBand':
        this.endRubberBand(ctx)
        break
    }
    this.state = { type: 'idle' }
    ctx.setInteractionState({ selectionRect: null, ghostNotes: null, notePreview: null })
  }

  /** 取消进行中的交互（不提交、不回滚 — 在直接更新模式下不处理回滚） */
  reset(): void {
    this.state = { type: 'idle' }
  }

  // -------------------------------------------------------
  // 拖拽
  // -------------------------------------------------------

  private startDrag(ctx: ToolEventContext, noteIds: string[]): void {
    const state = ctx.storeState

    // 收集所有选中音符的原始位置
    const notes: DragState['notes'] = []
    for (let i = 0; i < state.tracks.length; i++) {
      const track = state.tracks[i]
      if (!track) continue
      for (const note of track.notes) {
        if (noteIds.includes(note.id)) {
          notes.push({
            trackId: track.id,
            noteId: note.id,
            startTick: note.startTick,
            pitch: note.pitch,
          })
        }
      }
    }

    const tickAtMouse = ctx.mapper.pixelToTick(ctx.canvasX + ctx.scrollX)
    const pitchAtMouse = ctx.mapper.pixelToPitch(ctx.canvasY + ctx.scrollY)

    this.state = {
      type: 'drag',
      notes,
      mouseStartX: ctx.canvasX,
      mouseStartY: ctx.canvasY,
      startTickAtMouse: tickAtMouse,
      startPitchAtMouse: pitchAtMouse,
    }
  }

  private updateDrag(ctx: ToolEventContext): void {
    const s = this.state as DragState

    const currentTickAtMouse = ctx.mapper.pixelToTick(ctx.canvasX + ctx.scrollX)
    const currentPitchAtMouse = ctx.mapper.pixelToPitch(ctx.canvasY + ctx.scrollY)

    let deltaTick = currentTickAtMouse - s.startTickAtMouse
    const deltaPitch = currentPitchAtMouse - s.startPitchAtMouse

    // 相对吸附（保留原始 offset）
    deltaTick = snapTick(deltaTick, ctx.snapGridTicks)

    // 更新每个音符位置（直接写 store → note 层实时渲染）
    for (const orig of s.notes) {
      const newStartTick = Math.max(0, orig.startTick + deltaTick)
      const newPitch = clamp(orig.pitch + deltaPitch, PITCH_MIN, PITCH_MAX)

      ctx.storeState.updateNote(orig.trackId, orig.noteId, {
        startTick: newStartTick,
        pitch: newPitch,
      })
    }

    // 不设 ghost notes — note 层已通过 store 更新显示新位置
    ctx.setInteractionState({
      selectionRect: null,
      ghostNotes: null,
      notePreview: null,
    })
  }

  private endDrag(_ctx: ToolEventContext): void {
    // 拖拽结束 — 实时更新模式下已经写入 store，无需额外操作
    // Task 11 会在此处创建 MoveNotesCommand
  }

  // -------------------------------------------------------
  // 边缘拉伸
  // -------------------------------------------------------

  private startResize(ctx: ToolEventContext, edge: 'leftEdge' | 'rightEdge'): void {
    const hit = hitTest(
      ctx.canvasX,
      ctx.canvasY,
      ctx.allFlatNotes,
      ctx.mapper,
      ctx.scrollX,
      ctx.scrollY,
      ctx.noteHeight,
    )
    if (!hit) return

    // 查找 note 所属的 track
    const state = ctx.storeState
    for (let i = 0; i < state.tracks.length; i++) {
      const track = state.tracks[i]
      if (!track) continue
      const found = track.notes.find((n) => n.id === hit.noteId)
      if (found) {
        const tickAtMouse = ctx.mapper.pixelToTick(ctx.canvasX + ctx.scrollX)
        this.state = {
          type: 'resize',
          edge: edge === 'leftEdge' ? 'left' : 'right',
          trackId: track.id,
          trackIndex: i,
          noteId: hit.noteId,
          originalNote: { ...found },
          mouseStartX: ctx.canvasX,
          startTickAtMouse: tickAtMouse,
        }
        return
      }
    }
  }

  private updateResize(ctx: ToolEventContext): void {
    const s = this.state as ResizeState
    const currentTickAtMouse = ctx.mapper.pixelToTick(ctx.canvasX + ctx.scrollX)
    const deltaTick = currentTickAtMouse - s.startTickAtMouse

    const orig = s.originalNote

    if (s.edge === 'right') {
      const newDuration = Math.max(1, orig.duration + deltaTick)
      ctx.storeState.updateNote(s.trackId, s.noteId, { duration: newDuration })
    } else {
      // left edge: startTick 变化，duration 相应调整，note 结束位置不变
      const noteEnd = orig.startTick + orig.duration
      const newStartTick = Math.max(0, Math.min(orig.startTick + deltaTick, noteEnd - 1))
      const newDuration = noteEnd - newStartTick
      ctx.storeState.updateNote(s.trackId, s.noteId, {
        startTick: newStartTick,
        duration: newDuration,
      })
    }
  }

  private endResize(_ctx: ToolEventContext): void {
    // Task 11 会创建 ResizeNoteCommand
  }

  // -------------------------------------------------------
  // 框选
  // -------------------------------------------------------

  private updateRubberBand(ctx: ToolEventContext): void {
    const s = this.state as RubberBandState

    const x = Math.min(s.startScreenX, ctx.canvasX)
    const y = Math.min(s.startScreenY, ctx.canvasY)
    const w = Math.abs(ctx.canvasX - s.startScreenX)
    const h = Math.abs(ctx.canvasY - s.startScreenY)

    ctx.setInteractionState({
      selectionRect: { x, y, width: w, height: h },
      ghostNotes: null,
      notePreview: null,
    })
  }

  private endRubberBand(ctx: ToolEventContext): void {
    const s = this.state as RubberBandState
    const state = ctx.storeState

    const selX = Math.min(s.startScreenX, ctx.canvasX)
    const selY = Math.min(s.startScreenY, ctx.canvasY)
    const selW = Math.abs(ctx.canvasX - s.startScreenX)
    const selH = Math.abs(ctx.canvasY - s.startScreenY)

    // 如果框太小（< 3px），视为点击空白清空选择
    if (selW < 3 && selH < 3) {
      state.clearSelection()
      return
    }

    // AABB 测试：选中与选择矩形有重叠的所有音符
    const selected: string[] = []
    for (const entry of ctx.allFlatNotes) {
      const rect = computeNoteScreenRect(
        entry.note,
        ctx.mapper,
        ctx.scrollX,
        ctx.scrollY,
        ctx.noteHeight,
      )
      // AABB overlap
      if (
        rect.x < selX + selW &&
        rect.x + rect.w > selX &&
        rect.y < selY + selH &&
        rect.y + rect.h > selY
      ) {
        selected.push(entry.note.id)
      }
    }

    state.setSelection(selected)
  }
}

// ============================================================
// 上下文类型（供 mouse-handler 构造）
// ============================================================

export interface ToolEventContext {
  canvasX: number
  canvasY: number
  mapper: CoordinateMapper
  scrollX: number
  scrollY: number
  noteHeight: number
  storeState: StoreState
  allFlatNotes: ReadonlyArray<{ trackIndex: number; note: Note }>
  snapGridTicks: number
  setInteractionState: (state: Pick<InteractionState, 'selectionRect' | 'ghostNotes' | 'notePreview'>) => void
}
