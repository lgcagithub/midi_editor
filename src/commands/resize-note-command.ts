/**
 * 11.5 ResizeNoteCommand
 *
 * 调整单个音符的 startTick 和 duration（左/右边缘拉伸）。
 * 存储 old/new 两组值，execute/undo 在两者之间切换。
 */

import type { Command } from './types'
import type { StoreState } from '@/state/store'

export class ResizeNoteCommand implements Command {
  constructor(
    private trackId: string,
    private noteId: string,
    private oldStartTick: number,
    private oldDuration: number,
    private newStartTick: number,
    private newDuration: number,
    private store: StoreState,
  ) {}

  execute(): void {
    this.store.updateNote(this.trackId, this.noteId, {
      startTick: this.newStartTick,
      duration: this.newDuration,
    })
  }

  undo(): void {
    this.store.updateNote(this.trackId, this.noteId, {
      startTick: this.oldStartTick,
      duration: this.oldDuration,
    })
  }
}
