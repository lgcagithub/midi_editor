/**
 * 11.3 DeleteNotesCommand
 *
 * 删除一个或多个音符，undo 时按原始数据恢复。
 */

import type { Command } from './types'
import type { Note } from '@/types'
import type { StoreState } from '@/state/store'

export class DeleteNotesCommand implements Command {
  /** 深拷贝保存的音符列表 */
  private readonly notes: Note[]

  constructor(
    private trackId: string,
    notes: Note[],
    private store: StoreState,
  ) {
    this.notes = notes.map((n) => ({ ...n }))
  }

  execute(): void {
    for (const note of this.notes) {
      this.store.removeNote(this.trackId, note.id)
    }
  }

  undo(): void {
    for (const note of this.notes) {
      this.store.addNote(this.trackId, { ...note })
    }
  }
}
