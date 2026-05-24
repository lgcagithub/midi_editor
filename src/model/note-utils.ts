import { PITCH_MIN, PITCH_MAX } from '../constants'

/** 黑键在半音阶中的偏移量集合（C#、D#、F#、G#、A#） */
const BLACK_KEY_OFFSETS = new Set([1, 3, 6, 8, 10])

/**
 * 判断给定音高是否为黑键
 * @param pitch MIDI 音高编号
 * @returns 是否为黑键
 */
export function isBlackKey(pitch: number): boolean {
  return BLACK_KEY_OFFSETS.has(pitch % 12)
}

/**
 * 将音高限制在 88 键钢琴范围内（PITCH_MIN ~ PITCH_MAX）
 * @param pitch MIDI 音高编号
 * @returns 限制后的音高
 */
export function clampPitch(pitch: number): number {
  return Math.min(Math.max(pitch, PITCH_MIN), PITCH_MAX)
}
