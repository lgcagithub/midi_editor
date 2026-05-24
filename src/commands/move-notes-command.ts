/**
 * 11.4 MoveNotesCommand
 *
 * 移动一个或多个音符的位置（startTick + pitch）。
 * 存储 old/new 状态，execute/undo 在两者之间切换。
 *
 * 每条移动记录包含：
 *   noteId, trackId, oldStartTick, oldPitch, newStartTick, newPitch
 */

import type { Command } from './types'
import type { StoreState } from '@/state/store'

export interface NoteMove {
  noteId: string
  trackId: string
  oldStartTick: number
  oldPitch: number
  newStartTick: number
  newPitch: number
}

export class MoveNotesCommand implements Command {
  constructor(
    private moves: NoteMove[],
    private store: StoreState,
  ) {}

  execute(): void {
    for (const move of this.moves) {
      this.store.updateNote(move.trackId, move.noteId, {
        startTick: move.newStartTick,
        pitch: move.newPitch,
      })
    }
  }

  undo(): void {
    for (const move of this.moves) {
      this.store.updateNote(move.trackId, move.noteId, {
        startTick: move.oldStartTick,
        pitch: move.oldPitch,
      })
    }
  }
}
