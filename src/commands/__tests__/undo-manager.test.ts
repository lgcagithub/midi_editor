/**
 * 11.9 UndoManager & Commands 单元测试
 */

import { describe, it, expect, beforeEach } from 'vitest'
import { UndoManager } from '../undo-manager'
import { AddNoteCommand } from '../add-note-command'
import { DeleteNotesCommand } from '../delete-notes-command'
import { MoveNotesCommand, type NoteMove } from '../move-notes-command'
import { ResizeNoteCommand } from '../resize-note-command'
import type { Command } from '../types'
import type { Note, Track } from '@/types'
import type { StoreState } from '@/state/store'

// ============================================================
// 模拟 Store
// ============================================================

/**
 * 创建一个可用的 mock StoreState。
 * addNote/removeNote/updateNote 内部用闭包维护状态，
 * 满足 undo/redo 通过 set() 修改内部状态的语义。
 */
function createMockStore(initialNotes: Note[] = []): StoreState {
  let tracks: Track[] = [
    { id: 'track-1', name: 'Mock Track', instrument: 0, color: '#000', notes: initialNotes.map((n) => ({ ...n })) },
  ]

  function generateId(): string {
    return Math.random().toString(36).substring(2, 11)
  }

  // 使用 getter 确保外部访问 tracks 时总是获取最新引用
  return {
    get tracks() { return tracks },
    ppq: 480,
    tempoMap: [],
    timeSigs: [],
    projectVersion: 0,
    activeTool: 'pointer',
    activeTrackId: 'track-1',
    selectedNoteIds: [],
    orientation: 'vertical',
    viewport: { scrollX: 0, scrollY: 0, zoomX: 1, zoomY: 1, noteHeight: 14 },
    snapGridTicks: 120,

    // --- Project ---
    loadProject: () => {},
    newProject: () => {},
    addTrack: () => {},
    removeTrack: () => {},
    updateTrack: () => {},

    addNote: (trackId: string, note: Note) => {
      tracks = tracks.map((t) =>
        t.id === trackId
          ? { ...t, notes: [...t.notes, { ...note, id: note.id || generateId() }] }
          : t,
      )
    },

    removeNote: (trackId: string, noteId: string) => {
      tracks = tracks.map((t) =>
        t.id === trackId
          ? { ...t, notes: t.notes.filter((n) => n.id !== noteId) }
          : t,
      )
    },

    updateNote: (trackId: string, noteId: string, updates: Partial<Note>) => {
      tracks = tracks.map((t) =>
        t.id === trackId
          ? {
              ...t,
              notes: t.notes.map((n) =>
                n.id === noteId ? { ...n, ...updates } : n,
              ),
            }
          : t,
      )
    },

    // --- Editor ---
    setTool: () => {},
    setActiveTrackId: () => {},
    selectNote: () => {},
    deselectNote: () => {},
    clearSelection: () => {},
    setSelection: () => {},
    setOrientation: () => {},
    setViewport: () => {},
    setSnapGridTicks: () => {},

    // --- Transport ---
    transportState: 'stopped',
    startTime: 0,
    startTick: 0,
    currentTick: 0,
    play: () => {},
    pause: () => {},
    stop: () => {},

    // --- Tempo / TimeSig ---
    updateTempoMap: () => {},
    updateTimeSigs: () => {},
  }
}

/** 获取 mock store 当前的 notes */
function getNotes(mock: StoreState): Note[] {
  const track = mock.tracks[0]
  if (!track) return []
  return track.notes
}

// ============================================================
// UndoManager 基础操作
// ============================================================

describe('UndoManager', () => {
  let manager: UndoManager

  beforeEach(() => {
    manager = new UndoManager()
  })

  it('execute 执行命令并压入 undoStack', () => {
    const executed: string[] = []
    const undone: string[] = []
    const cmd = {
      execute: () => { executed.push('exec') },
      undo: () => { undone.push('undo') },
    }

    manager.execute(cmd)

    expect(executed).toEqual(['exec'])
    expect(manager.undoStack).toHaveLength(1)
    expect(manager.redoStack).toHaveLength(0)
  })

  it('undo 弹出 undoStack 并压入 redoStack', () => {
    const cmd = {
      execute: () => {},
      undo: () => {},
    }
    manager.execute(cmd)
    manager.undo()

    expect(manager.undoStack).toHaveLength(0)
    expect(manager.redoStack).toHaveLength(1)
  })

  it('redo 弹出 redoStack 并压入 undoStack', () => {
    const cmd = {
      execute: () => {},
      undo: () => {},
    }
    manager.execute(cmd)
    manager.undo()
    manager.redo()

    expect(manager.undoStack).toHaveLength(1)
    expect(manager.redoStack).toHaveLength(0)
  })

  it('新命令清空 redoStack', () => {
    const cmd1 = { execute: () => {}, undo: () => {} }
    const cmd2 = { execute: () => {}, undo: () => {} }

    manager.execute(cmd1)
    manager.undo()
    expect(manager.redoStack).toHaveLength(1)

    manager.execute(cmd2)
    expect(manager.redoStack).toHaveLength(0)
  })

  it('空栈调用 undo 无副作用', () => {
    expect(() => manager.undo()).not.toThrow()
  })

  it('空栈调用 redo 无副作用', () => {
    expect(() => manager.redo()).not.toThrow()
  })

  it('undo → redo 循环后状态一致', () => {
    let state = 0
    const cmd = {
      execute: () => { state += 1 },
      undo: () => { state -= 1 },
    }

    manager.execute(cmd)
    expect(state).toBe(1)

    manager.undo()
    expect(state).toBe(0)

    manager.redo()
    expect(state).toBe(1)
  })
})

// ============================================================
// maxDepth
// ============================================================

describe('UndoManager maxDepth', () => {
  it('超过 maxDepth 时丢弃最旧命令', () => {
    const manager = new UndoManager()
    manager.maxDepth = 3

    for (let i = 0; i < 5; i++) {
      const label = `cmd-${i}`
      manager.execute({
        execute: () => {},
        undo: () => {},
        label,
      } as Command & { label: string })
    }

    expect(manager.undoStack).toHaveLength(3)
    // 保留的是最后 3 个
    const labels = manager.undoStack.map((c) => (c as any).label)
    expect(labels).toEqual(['cmd-2', 'cmd-3', 'cmd-4'])
  })

  it('redo 时超过 maxDepth 也丢弃最旧命令', () => {
    const manager = new UndoManager()
    manager.maxDepth = 2

    const cmd1 = { execute: () => {}, undo: () => {} }
    const cmd2 = { execute: () => {}, undo: () => {} }

    manager.execute(cmd1)
    manager.execute(cmd2)
    manager.undo() // cmd2 → redoStack
    manager.undo() // cmd1 → redoStack
    // redoStack: [cmd2, cmd1]; undoStack: []

    manager.redo() // cmd1 → undoStack
    // undoStack: [cmd1]; redoStack: [cmd2]

    manager.redo() // cmd2 → undoStack
    // undoStack: [cmd1, cmd2]; redoStack: []; length=2, 未超

    expect(manager.undoStack).toHaveLength(2)
  })
})

// ============================================================
// AddNoteCommand
// ============================================================

describe('AddNoteCommand', () => {
  it('execute 添加音符到 store', () => {
    const store = createMockStore()
    const cmd = new AddNoteCommand('track-1', { pitch: 60, startTick: 0, duration: 120, velocity: 100 }, store)

    cmd.execute()
    const notes = getNotes(store)
    expect(notes).toHaveLength(1)
    expect(notes[0]!.pitch).toBe(60)
    expect(notes[0]!.startTick).toBe(0)
    expect(notes[0]!.duration).toBe(120)
  })

  it('undo 移除音符', () => {
    const store = createMockStore()
    const cmd = new AddNoteCommand('track-1', { pitch: 60, startTick: 0, duration: 120, velocity: 100 }, store)

    cmd.execute()
    expect(getNotes(store)).toHaveLength(1)

    cmd.undo()
    expect(getNotes(store)).toHaveLength(0)
  })

  it('redo（execute after undo）恢复音符', () => {
    const store = createMockStore()
    const cmd = new AddNoteCommand('track-1', { pitch: 64, startTick: 240, duration: 480, velocity: 90 }, store)

    cmd.execute()
    cmd.undo()
    cmd.execute()

    const notes = getNotes(store)
    expect(notes).toHaveLength(1)
    expect(notes[0]!.pitch).toBe(64)
    expect(notes[0]!.startTick).toBe(240)
  })

  it('无 ID 时自动生成 ID', () => {
    const store = createMockStore()
    const cmd = new AddNoteCommand('track-1', { pitch: 72, startTick: 0, duration: 120, velocity: 100 }, store)

    cmd.execute()
    const notes = getNotes(store)
    expect(notes[0]!.id).toBeTruthy()
    expect(notes[0]!.id).not.toBe('')
  })
})

// ============================================================
// DeleteNotesCommand
// ============================================================

describe('DeleteNotesCommand', () => {
  const initialNote: Note = { id: 'n1', pitch: 60, startTick: 0, duration: 120, velocity: 100 }

  it('execute 删除音符', () => {
    const store = createMockStore([initialNote])
    const cmd = new DeleteNotesCommand('track-1', [initialNote], store)

    cmd.execute()
    expect(getNotes(store)).toHaveLength(0)
  })

  it('undo 恢复音符', () => {
    const store = createMockStore([initialNote])
    const cmd = new DeleteNotesCommand('track-1', [initialNote], store)

    cmd.execute()
    cmd.undo()

    const notes = getNotes(store)
    expect(notes).toHaveLength(1)
    expect(notes[0]!.id).toBe('n1')
    expect(notes[0]!.pitch).toBe(60)
  })

  it('redo 再次删除', () => {
    const store = createMockStore([initialNote])
    const cmd = new DeleteNotesCommand('track-1', [initialNote], store)

    cmd.execute()
    cmd.undo()
    cmd.execute()

    expect(getNotes(store)).toHaveLength(0)
  })

  it('批量删除多个音符', () => {
    const notes: Note[] = [
      { id: 'n1', pitch: 60, startTick: 0, duration: 120, velocity: 100 },
      { id: 'n2', pitch: 64, startTick: 120, duration: 120, velocity: 100 },
      { id: 'n3', pitch: 67, startTick: 240, duration: 120, velocity: 100 },
    ]
    const store = createMockStore(notes)

    const cmd = new DeleteNotesCommand('track-1', notes, store)
    cmd.execute()
    expect(getNotes(store)).toHaveLength(0)

    cmd.undo()
    expect(getNotes(store)).toHaveLength(3)
  })
})

// ============================================================
// MoveNotesCommand
// ============================================================

describe('MoveNotesCommand', () => {
  it('execute 移动音符到新位置', () => {
    const initialNote: Note = { id: 'n1', pitch: 60, startTick: 0, duration: 120, velocity: 100 }
    const store = createMockStore([initialNote])

    const moves: NoteMove[] = [
      { noteId: 'n1', trackId: 'track-1', oldStartTick: 0, oldPitch: 60, newStartTick: 120, newPitch: 64 },
    ]

    const cmd = new MoveNotesCommand(moves, store)
    cmd.execute()

    const notes = getNotes(store)
    expect(notes[0]!.startTick).toBe(120)
    expect(notes[0]!.pitch).toBe(64)
  })

  it('undo 恢复到原始位置', () => {
    const initialNote: Note = { id: 'n1', pitch: 60, startTick: 0, duration: 120, velocity: 100 }
    const store = createMockStore([initialNote])

    const moves: NoteMove[] = [
      { noteId: 'n1', trackId: 'track-1', oldStartTick: 0, oldPitch: 60, newStartTick: 120, newPitch: 64 },
    ]

    const cmd = new MoveNotesCommand(moves, store)
    cmd.execute()
    cmd.undo()

    const notes = getNotes(store)
    expect(notes[0]!.startTick).toBe(0)
    expect(notes[0]!.pitch).toBe(60)
  })

  it('批量移动多个音符', () => {
    const notes: Note[] = [
      { id: 'n1', pitch: 60, startTick: 0, duration: 120, velocity: 100 },
      { id: 'n2', pitch: 64, startTick: 120, duration: 120, velocity: 100 },
    ]
    const store = createMockStore(notes)

    const moves: NoteMove[] = [
      { noteId: 'n1', trackId: 'track-1', oldStartTick: 0, oldPitch: 60, newStartTick: 240, newPitch: 67 },
      { noteId: 'n2', trackId: 'track-1', oldStartTick: 120, oldPitch: 64, newStartTick: 360, newPitch: 72 },
    ]

    const cmd = new MoveNotesCommand(moves, store)
    cmd.execute()

    const result = getNotes(store)
    expect(result).toHaveLength(2)
    expect(result[0]!.startTick).toBe(240)
    expect(result[0]!.pitch).toBe(67)
    expect(result[1]!.startTick).toBe(360)
    expect(result[1]!.pitch).toBe(72)

    cmd.undo()
    const undone = getNotes(store)
    expect(undone).toHaveLength(2)
    expect(undone[0]!.startTick).toBe(0)
    expect(undone[0]!.pitch).toBe(60)
    expect(undone[1]!.startTick).toBe(120)
    expect(undone[1]!.pitch).toBe(64)
  })
})

// ============================================================
// ResizeNoteCommand
// ============================================================

describe('ResizeNoteCommand', () => {
  it('execute 更新 startTick 和 duration', () => {
    const initialNote: Note = { id: 'n1', pitch: 60, startTick: 0, duration: 480, velocity: 100 }
    const store = createMockStore([initialNote])

    const cmd = new ResizeNoteCommand('track-1', 'n1', 0, 480, 120, 360, store)
    cmd.execute()

    const notes = getNotes(store)
    expect(notes[0]!.startTick).toBe(120)
    expect(notes[0]!.duration).toBe(360)
  })

  it('undo 恢复到原始尺寸', () => {
    const initialNote: Note = { id: 'n1', pitch: 60, startTick: 0, duration: 480, velocity: 100 }
    const store = createMockStore([initialNote])

    const cmd = new ResizeNoteCommand('track-1', 'n1', 0, 480, 120, 360, store)
    cmd.execute()
    cmd.undo()

    const notes = getNotes(store)
    expect(notes[0]!.startTick).toBe(0)
    expect(notes[0]!.duration).toBe(480)
  })

  it('redo 再次应用新尺寸', () => {
    const initialNote: Note = { id: 'n1', pitch: 60, startTick: 0, duration: 480, velocity: 100 }
    const store = createMockStore([initialNote])

    const cmd = new ResizeNoteCommand('track-1', 'n1', 0, 480, 120, 360, store)
    cmd.execute()
    cmd.undo()
    cmd.execute()

    const notes = getNotes(store)
    expect(notes[0]!.startTick).toBe(120)
    expect(notes[0]!.duration).toBe(360)
  })
})

// ============================================================
// 集成：完整的 undo/redo 周期
// ============================================================

describe('Undo/Redo 集成', () => {
  it('Add → Undo → Redo 完整周期', () => {
    const manager = new UndoManager()
    const store = createMockStore()

    // Add
    manager.execute(new AddNoteCommand('track-1', { pitch: 60, startTick: 0, duration: 120, velocity: 100 }, store))
    expect(getNotes(store)).toHaveLength(1)

    // Undo
    manager.undo()
    expect(getNotes(store)).toHaveLength(0)

    // Redo
    manager.redo()
    expect(getNotes(store)).toHaveLength(1)
  })

  it('Delete → Undo → Redo 完整周期', () => {
    const manager = new UndoManager()
    const note: Note = { id: 'n1', pitch: 60, startTick: 0, duration: 120, velocity: 100 }
    const store = createMockStore([note])

    manager.execute(new DeleteNotesCommand('track-1', [note], store))
    expect(getNotes(store)).toHaveLength(0)

    manager.undo()
    expect(getNotes(store)).toHaveLength(1)

    manager.redo()
    expect(getNotes(store)).toHaveLength(0)
  })

  it('Move → Undo → Redo 完整周期', () => {
    const manager = new UndoManager()
    const note: Note = { id: 'n1', pitch: 60, startTick: 0, duration: 120, velocity: 100 }
    const store = createMockStore([note])

    const moves: NoteMove[] = [
      { noteId: 'n1', trackId: 'track-1', oldStartTick: 0, oldPitch: 60, newStartTick: 120, newPitch: 64 },
    ]

    manager.execute(new MoveNotesCommand(moves, store))

    let notes = getNotes(store)
    expect(notes[0]!.startTick).toBe(120)

    manager.undo()
    notes = getNotes(store)
    expect(notes[0]!.startTick).toBe(0)

    manager.redo()
    notes = getNotes(store)
    expect(notes[0]!.startTick).toBe(120)
  })

  it('Resize → Undo → Redo 完整周期', () => {
    const manager = new UndoManager()
    const note: Note = { id: 'n1', pitch: 60, startTick: 0, duration: 480, velocity: 100 }
    const store = createMockStore([note])

    manager.execute(new ResizeNoteCommand('track-1', 'n1', 0, 480, 240, 240, store))

    let notes = getNotes(store)
    expect(notes[0]!.duration).toBe(240)

    manager.undo()
    notes = getNotes(store)
    expect(notes[0]!.duration).toBe(480)

    manager.redo()
    notes = getNotes(store)
    expect(notes[0]!.duration).toBe(240)
  })

  it('redo 被新命令清除', () => {
    const manager = new UndoManager()
    const store = createMockStore()

    manager.execute(new AddNoteCommand('track-1', { pitch: 60, startTick: 0, duration: 120, velocity: 100 }, store))
    manager.undo()

    // redoStack 非空
    expect(manager.redoStack).toHaveLength(1)

    // 新命令清空 redoStack
    manager.execute(new AddNoteCommand('track-1', { pitch: 64, startTick: 120, duration: 120, velocity: 100 }, store))
    expect(manager.redoStack).toHaveLength(0)
  })

  it('连续 undo 逐步撤销', () => {
    const manager = new UndoManager()
    const store = createMockStore()

    manager.execute(new AddNoteCommand('track-1', { pitch: 60, startTick: 0, duration: 120, velocity: 100 }, store))
    manager.execute(new AddNoteCommand('track-1', { pitch: 64, startTick: 120, duration: 120, velocity: 100 }, store))
    expect(getNotes(store)).toHaveLength(2)

    manager.undo()
    expect(getNotes(store)).toHaveLength(1)
    expect(getNotes(store)[0]!.pitch).toBe(60)

    manager.undo()
    expect(getNotes(store)).toHaveLength(0)
  })
})
