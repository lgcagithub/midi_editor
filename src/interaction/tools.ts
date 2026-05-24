/**
 * 9.1 / 辅助工具函数
 *
 * 网格吸附占位实现、note 列表展开、工具相关常量。
 */

import type { StoreState } from '@/state/store'
import type { Note } from '@/types'

/** 默认网格大小：16 分音符 (PPQ=480 → 480/4=120) */
export const DEFAULT_GRID_SIZE = 120

/**
 * 网格吸附占位函数
 * Task 10 会替换为完整的吸附逻辑，目前使用 Math.round 实现相对吸附。
 */
export function snapTick(tick: number, gridSize: number): number {
  if (gridSize <= 0) return tick
  return Math.round(tick / gridSize) * gridSize
}

/**
 * 将 store 中的音轨展开为扁平的 trackIndex + note 列表
 */
export function flattenTrackNotes(
  state: StoreState,
): Array<{ trackIndex: number; note: Note }> {
  const result: Array<{ trackIndex: number; note: Note }> = []
  for (let i = 0; i < state.tracks.length; i++) {
    const track = state.tracks[i]
    if (!track) continue
    for (const note of track.notes) {
      result.push({ trackIndex: i, note })
    }
  }
  return result
}
