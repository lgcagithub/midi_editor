/**
 * 9.8 / 9.9 / 9.10 画笔工具
 *
 * 点击添加音符（绝对吸附，默认时长 = 网格单位，替换已有音符）。
 * 拖拽调整时长（复用右边缘拉伸逻辑）。
 * 音高范围约束 21–108。
 */

import type { ToolEventContext } from './pointer-tool'
import { PITCH_MIN, PITCH_MAX } from '@/constants'
import { clamp } from '@/utils/math'
import { snapTick } from './snap-grid'
import { undoManager } from '@/commands/undo-manager'
import { AddNoteCommand } from '@/commands/add-note-command'

// ============================================================
// 内部状态
// ============================================================

interface CreatingState {
  type: 'creating'
  trackId: string
  trackIndex: number
  startTick: number
  pitch: number
  /** 鼠标拖拽时的起始屏幕 X（用于判断是否有拖拽） */
  mouseDownX: number
  /** 鼠标按下时的 tick（用于计算拖拽时长） */
  startTickAtMouse: number
}

type PencilState =
  | { type: 'idle' }
  | CreatingState

// ============================================================
// PencilToolHandler
// ============================================================

export class PencilToolHandler {
  private state: PencilState = { type: 'idle' }

  handleMouseDown(ctx: ToolEventContext): void {
    if (this.state.type !== 'idle') return

    // 计算绝对吸附后的 tick 和 pitch
    const rawTick = ctx.mapper.pixelToTick(ctx.canvasX + ctx.scrollX)
    const snappedTick = snapTick(rawTick, ctx.snapGridTicks)
    const pitch = clamp(
      ctx.mapper.pixelToPitch(ctx.canvasY + ctx.scrollY),
      PITCH_MIN,
      PITCH_MAX,
    )

    // 确定目标 track（当前选中 track 或第一个 track）
    const trackIndex = 0 // TODO: 将来使用 activeTrackIndex
    const track = ctx.storeState.tracks[trackIndex]
    if (!track) return

    // 如果该位置已有音符，先删除（替换语义）
    const existing = track.notes.find(
      (n) => n.pitch === pitch && n.startTick === snappedTick,
    )
    if (existing) {
      ctx.storeState.removeNote(track.id, existing.id)
    }

    const tickAtMouse = ctx.mapper.pixelToTick(ctx.canvasX + ctx.scrollX)

    this.state = {
      type: 'creating',
      trackId: track.id,
      trackIndex,
      startTick: snappedTick,
      pitch,
      mouseDownX: ctx.canvasX,
      startTickAtMouse: tickAtMouse,
    }

    // 显示音符预览
    ctx.setInteractionState({
      notePreview: {
        startTick: snappedTick,
        pitch,
        duration: 0,
        velocity: 100,
        trackIndex,
      },
      selectionRect: null,
      ghostNotes: null,
    })
  }

  handleMouseMove(ctx: ToolEventContext): void {
    if (this.state.type !== 'creating') return
    const s = this.state as CreatingState

    // 计算从按下位置到当前位置的 delta tick
    const currentTickAtMouse = ctx.mapper.pixelToTick(ctx.canvasX + ctx.scrollX)
    const deltaTick = currentTickAtMouse - s.startTickAtMouse

    // 时长 = 默认网格单位 + deltaTick（最小 1 tick）
    const duration = Math.max(1, ctx.snapGridTicks + deltaTick)

    ctx.setInteractionState({
      notePreview: {
        startTick: s.startTick,
        pitch: s.pitch,
        duration,
        velocity: 100,
        trackIndex: s.trackIndex,
      },
      selectionRect: null,
      ghostNotes: null,
    })
  }

  handleMouseUp(ctx: ToolEventContext): void {
    if (this.state.type !== 'creating') return
    const s = this.state as CreatingState

    // 决定最终时长
    let duration: number

    if (Math.abs(ctx.canvasX - s.mouseDownX) < 3) {
      // 几乎没移动 → 点击添加，默认时长 = gridSize
      duration = ctx.snapGridTicks
    } else {
      // 拖拽了 → 用预览的时长
      const currentTickAtMouse = ctx.mapper.pixelToTick(ctx.canvasX + ctx.scrollX)
      const deltaTick = currentTickAtMouse - s.startTickAtMouse
      duration = Math.max(1, ctx.snapGridTicks + deltaTick)
    }

    // 再次检查是否有音符在目标位置（可能在拖拽期间被其他操作添加）
    const track = ctx.storeState.tracks[s.trackIndex]
    if (track) {
      const existing = track.notes.find(
        (n) => n.pitch === s.pitch && n.startTick === s.startTick && n.id !== '__preview__',
      )
      if (existing) {
        ctx.storeState.removeNote(track.id, existing.id)
      }
    }

    // 通过 UndoManager 执行添加（AddNoteCommand 内部会生成 ID）
    const newNote = {
      pitch: s.pitch,
      startTick: s.startTick,
      duration,
      velocity: 100,
    }
    const cmd = new AddNoteCommand(s.trackId, newNote, ctx.storeState)
    undoManager.execute(cmd)

    // 清除交互状态
    ctx.setInteractionState({
      notePreview: null,
      selectionRect: null,
      ghostNotes: null,
    })
    this.state = { type: 'idle' }
  }

  reset(): void {
    this.state = { type: 'idle' }
  }
}
