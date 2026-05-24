/**
 * 9.1 / 辅助工具函数
 *
 * note 列表展开、工具相关常量。
 */

import type { StoreState } from '@/state/store'
import type { Note } from '@/types'

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
