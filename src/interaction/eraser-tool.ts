/**
 * 9.11 橡皮工具
 *
 * 点击删除音符。
 * 无状态，每次鼠标按下直接命中检测并删除。
 */

import type { ToolEventContext } from './pointer-tool'
import { hitTest } from './hit-test'
import { undoManager } from '@/commands/undo-manager'
import { DeleteNotesCommand } from '@/commands/delete-notes-command'

export class EraserToolHandler {
  handleMouseDown(ctx: ToolEventContext): void {
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

    // 找到 note 所属的 track
    for (let i = 0; i < ctx.storeState.tracks.length; i++) {
      const track = ctx.storeState.tracks[i]
      if (!track) continue
      const found = track.notes.find((n) => n.id === hit.noteId)
      if (found) {
        // 通过 UndoManager 执行删除
        const cmd = new DeleteNotesCommand(track.id, [found], ctx.storeState)
        undoManager.execute(cmd)
        return
      }
    }
  }

  // 橡皮工具无需 move / up 处理
  handleMouseMove(_ctx: ToolEventContext): void {
    // no-op
  }

  handleMouseUp(_ctx: ToolEventContext): void {
    // no-op
  }

  reset(): void {
    // no-op, 无状态
  }
}
