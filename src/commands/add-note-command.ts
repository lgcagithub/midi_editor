/**
 * 11.2 AddNoteCommand
 *
 * 添加一个音符，undo 时按 note.id 移除。
 */

import type { Command } from './types'
import type { Note, Track } from '@/types'
import type { StoreState } from '@/state/store'

/** 简易 ID 生成（与 project-slice 保持一致） */
function generateId(): string {
  return Math.random().toString(36).substring(2, 11)
}

export class AddNoteCommand implements Command {
  public readonly note: Note

  constructor(
    private trackId: string,
    note: Omit<Note, 'id'> & { id?: string },
    private store: StoreState,
  ) {
    this.note = { ...note, id: note.id || generateId() }
  }

  execute(): void {
    // 如果该音符已存在（undo 后 redo 的正常场景），先移除再添加
    const track = this.store.tracks.find((t: Track) => t.id === this.trackId)
    if (track && track.notes.some((n: Note) => n.id === this.note.id)) {
      this.store.removeNote(this.trackId, this.note.id)
    }
    this.store.addNote(this.trackId, this.note)
  }

  undo(): void {
    this.store.removeNote(this.trackId, this.note.id)
  }
}
