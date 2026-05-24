/**
 * 11.1 Command 接口
 *
 * 所有可撤销操作的统一接口。
 * execute — 执行操作
 * undo   — 撤销操作
 */
export interface Command {
  execute(): void
  undo(): void
}
