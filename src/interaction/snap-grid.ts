/**
 * 10.1 / 10.2 / 吸附网格
 *
 * 网格级别常量（全音符到六十四分音符 + 三连音变体，共 9 级）
 * 以及 snapTick 吸附函数。
 */

// ============================================================
// 网格级别定义（基于 PPQ）
// ============================================================

export interface GridLevel {
  /** 显示标签（如 "1/4"、"1/8T"） */
  label: string
  /** 对应的 tick 数（基于 ppq 计算） */
  ticks: number
}

/**
 * 根据 PPQ 生成 9 级网格配置
 */
export function getGridLevels(ppq: number): GridLevel[] {
  return [
    { label: '1/1', ticks: ppq * 4 },
    { label: '1/2', ticks: ppq * 2 },
    { label: '1/4', ticks: ppq },
    { label: '1/8', ticks: ppq / 2 },
    { label: '1/16', ticks: ppq / 4 },
    { label: '1/32', ticks: ppq / 8 },
    { label: '1/64', ticks: ppq / 16 },
    { label: '1/8T', ticks: ppq / 3 },
    { label: '1/16T', ticks: ppq / 6 },
  ]
}

/**
 * 默认网格级别索引（16 分音符）
 */
export const DEFAULT_GRID_INDEX = 4

// ============================================================
// snapTick
// ============================================================

/**
 * 将 tick 值吸附到最近的网格线。
 *
 * @param tick     原始 tick 值
 * @param gridTicks 网格间距（tick 数）
 * @returns 吸附后的 tick 值
 */
export function snapTick(tick: number, gridTicks: number): number {
  if (gridTicks <= 0) return tick
  return Math.round(tick / gridTicks) * gridTicks || 0
}
