/**
 * 11.6 UndoManager
 *
 * 管理撤销/重做栈。
 * - undoStack: 已执行的命令栈
 * - redoStack: 已撤销的命令栈
 * - maxDepth: 最大栈深度（默认 200）
 *
 * execute(cmd):   执行命令 → push undoStack, clear redoStack
 * undo():         从 undoStack pop → undo → push redoStack
 * redo():         从 redoStack pop → execute → push undoStack
 * clear():        清空两个栈
 */

import type { Command } from './types'

export class UndoManager {
  undoStack: Command[] = []
  redoStack: Command[] = []
  maxDepth: number = 200

  execute(cmd: Command): void {
    cmd.execute()
    this.undoStack.push(cmd)
    if (this.undoStack.length > this.maxDepth) {
      this.undoStack.shift()
    }
    // 新命令清除 redo 栈
    this.redoStack = []
  }

  undo(): void {
    const cmd = this.undoStack.pop()
    if (!cmd) return
    cmd.undo()
    this.redoStack.push(cmd)
  }

  redo(): void {
    const cmd = this.redoStack.pop()
    if (!cmd) return
    cmd.execute()
    this.undoStack.push(cmd)
    if (this.undoStack.length > this.maxDepth) {
      this.undoStack.shift()
    }
  }

  /** 清空两个栈 */
  clear(): void {
    this.undoStack = []
    this.redoStack = []
  }
}

/** 全局单例 */
export const undoManager = new UndoManager()
